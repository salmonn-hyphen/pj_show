import crypto from "crypto";
import prisma from "../src/lib/prisma.js";
import { auth } from "../src/lib/auth.js";
import {
  buildSessionTokens,
  persistTokens,
  revokeCustomSession,
  getCookieOptions,
  hashToken,
  type AuthTokens,
} from "../src/lib/auth-service.js";

export type AuthRole = "DRIVER" | "OWNER" | "ADMIN";

export interface RegisterRequestData {
  email: string;
  phone: string;
  password: string;
  name: string;
  role: AuthRole;
  nrc_number?: string;
  city?: string;
  township?: string;
  address?: string;
  license_number?: string;
  license_expiry?: string | number | Date;
  nrc_document_url?: string;
  years_experience?: number;
  [key: string]: unknown;
}

export function getCookieOptionsExport(maxAgeMs: number) {
  return getCookieOptions(maxAgeMs);
}

class AuthServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "AuthServiceError";
    this.statusCode = statusCode;
  }
}

interface PendingRegistration {
  data: RegisterRequestData;
  expiresAt: number;
}

const pendingRegistrations = new Map<string, PendingRegistration>();
const REGISTRATION_TTL_MS = 10 * 60 * 1000;
const OTP_TTL_MS = 5 * 60 * 1000;

let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanupLoop() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [token, registration] of pendingRegistrations.entries()) {
      if (registration.expiresAt <= now) {
        pendingRegistrations.delete(token);
      }
    }
  }, 5 * 60 * 1000);

  if (typeof cleanupTimer.unref === "function") {
    cleanupTimer.unref();
  }
}

startCleanupLoop();

async function getAuthUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      role: true,
      profilePhoto: true,
      isActive: true,
      verificationStatus: true,
      phoneNumberVerified: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) throw new AuthServiceError("Account not found", 404);
  if (!user.isActive) throw new AuthServiceError("Account is disabled", 403);

  return user;
}

function validateRegistrationData(data: RegisterRequestData) {
  if (!data.email || !data.phone || !data.password || !data.name || !data.role) {
    throw new AuthServiceError("Missing required fields", 400);
  }
}

async function assertAccountAvailability(email: string, phone: string) {
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) throw new AuthServiceError("Email is already registered", 400);

  const existingPhone = await prisma.user.findUnique({ where: { phone } });
  if (existingPhone) throw new AuthServiceError("Phone number is already registered", 400);
}

export async function createRegistrationRequest(data: RegisterRequestData) {
  validateRegistrationData(data);
  await assertAccountAvailability(data.email, data.phone);

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const tempToken = crypto.randomUUID();

  pendingRegistrations.set(tempToken, {
    data,
    expiresAt: Date.now() + REGISTRATION_TTL_MS,
  });

  await prisma.verification.deleteMany({ where: { identifier: data.phone } });
  await prisma.verification.create({
    data: {
      id: crypto.randomUUID(),
      identifier: data.phone,
      value: otpCode,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  return { tempToken, code: otpCode, message: "OTP sent successfully" };
}

export async function verifyRegistration(tempToken: string, code: string) {
  if (!tempToken || !code) {
    throw new AuthServiceError("Missing verification parameters", 400);
  }

  const registration = pendingRegistrations.get(tempToken);
  if (!registration || registration.expiresAt < Date.now()) {
    throw new AuthServiceError("Registration session expired or invalid", 400);
  }

  const regData = registration.data;
  const verification = await prisma.verification.findFirst({
    where: {
      identifier: regData.phone,
      value: code,
      expiresAt: { gt: new Date() },
    },
  });

  if (!verification) {
    throw new AuthServiceError("Invalid or expired OTP code", 400);
  }

  await prisma.verification.delete({ where: { id: verification.id } });
  pendingRegistrations.delete(tempToken);

  const newUser = await auth.api.signUpEmail({
    body: {
      email: regData.email,
      password: regData.password,
      name: regData.name,
      role: regData.role,
    },
  });

  if (!newUser?.user) {
    throw new AuthServiceError("Failed to create user account", 500);
  }

  const updatedUser = await prisma.user.update({
    where: { id: newUser.user.id },
    data: {
      phone: regData.phone,
      role: regData.role,
      nrcNumber: regData.nrc_number || null,
      city: regData.city || null,
      township: regData.township || null,
      address: regData.address || null,
      phoneNumberVerified: true,
      isVerified: false,
      verificationStatus: "PENDING",
    },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      role: true,
      profilePhoto: true,
      isActive: true,
      verificationStatus: true,
      phoneNumberVerified: true,
      isVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (regData.role === "DRIVER" && regData.license_number) {
    await prisma.driverLicense.create({
      data: {
        id: crypto.randomUUID(),
        userId: updatedUser.id,
        licenseNumber: regData.license_number,
        licenseClass: "B",
        expiryDate: new Date(
          regData.license_expiry || Date.now() + 5 * 365 * 24 * 60 * 60 * 1000
        ),
        documentUrl: (regData.nrc_document_url as string | undefined) || "",
        yearsExperience: (regData.years_experience as number | undefined) || 0,
        status: "PENDING",
      },
    });
  }

  const tokens = buildSessionTokens();
  await persistTokens(updatedUser.id, tokens);

  return {
    success: true,
    message: "Registration completed successfully",
    user: updatedUser,
    tokens,
  };
}

export async function getEmailByPhone(phone: string) {
  if (!phone) throw new AuthServiceError("Phone number is required", 400);

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { email: true },
  });

  if (!user) throw new AuthServiceError("No account found with this phone number", 404);

  return user;
}

export async function loginWithCredentials(params: { email?: string; phone?: string; password: string }) {
  const email = params.email || (params.phone ? (await getEmailByPhone(params.phone)).email : "");
  if (!email) throw new AuthServiceError("Email or phone number is required", 400);

  let response: Awaited<ReturnType<typeof auth.api.signInEmail>>;
  try {
    response = await auth.api.signInEmail({
      body: { email, password: params.password },
    });
  } catch (error) {
    // better-auth throws APIError on invalid credentials; surface it as a proper 401
    if (error instanceof AuthServiceError) throw error;
    throw new AuthServiceError("Invalid email or password", 401);
  }

  if (!response?.user) throw new AuthServiceError("Invalid credentials", 401);

  const user = await getAuthUserById(response.user.id);
  const tokens = buildSessionTokens();
  await persistTokens(user.id, tokens);

  return { success: true, message: "Login successful", user, tokens };
}

export async function refreshCustomSession(refreshToken: string) {
  if (!refreshToken) throw new AuthServiceError("Refresh token is required", 401);

  const hashedRefreshToken = hashToken(refreshToken);
  const account = await prisma.account.findFirst({
    where: {
      refreshToken: hashedRefreshToken,
      refreshTokenExpiresAt: { gt: new Date() },
    },
    select: { userId: true },
  });

  if (!account) throw new AuthServiceError("Invalid or expired refresh token", 401);

  const user = await getAuthUserById(account.userId);
  const tokens = buildSessionTokens();
  await persistTokens(user.id, tokens);

  return { success: true, message: "Session refreshed successfully", user, tokens };
}

export async function revokeCustomSessionByAccessToken(accessToken: string) {
  if (!accessToken) return;

  const account = await prisma.account.findFirst({
    where: { accessToken },
    select: { userId: true },
  });

  if (account) {
    await revokeCustomSession(account.userId);
  }
}

export async function revokeCustomSessionByRefreshToken(refreshToken: string) {
  if (!refreshToken) return;

  const hashed = hashToken(refreshToken);
  const account = await prisma.account.findFirst({
    where: { refreshToken: hashed },
    select: { userId: true },
  });

  if (account) {
    await revokeCustomSession(account.userId);
  }
}

export async function getCustomSession(accessToken?: string) {
  if (!accessToken) throw new AuthServiceError("Unauthorized", 401);

  const account = await prisma.account.findFirst({
    where: {
      accessToken,
      accessTokenExpiresAt: { gt: new Date() },
    },
    select: { userId: true },
  });

  if (!account) throw new AuthServiceError("Unauthorized", 401);

  const user = await getAuthUserById(account.userId);
  return { success: true, user };
}

export function getCookieOptionsExportFn(maxAgeMs: number) {
  return getCookieOptions(maxAgeMs);
}

export function getPendingRegistrationCount() {
  return pendingRegistrations.size;
}

export { AuthServiceError, buildSessionTokens, persistTokens, getCookieOptions, hashToken };
