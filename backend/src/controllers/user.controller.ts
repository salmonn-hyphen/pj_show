import type { Request, Response } from 'express';
import { hashPassword, verifyPassword } from 'better-auth/crypto';
import prisma from '../lib/prisma.js';
import { requireUser } from '../lib/api-auth.js';
import { serializeUser } from '../lib/serializers.js';
import { revokeCustomSession, getCookieOptions } from '../lib/auth-service.js';

function clearAuthCookies(res: Response) {
  res.clearCookie("accessToken", getCookieOptions(0));
  res.clearCookie("refreshToken", getCookieOptions(0));
  res.clearCookie("session", getCookieOptions(0));
  res.clearCookie("better-auth.session_token", getCookieOptions(0));
}

function validateNewPassword(password: string): string | null {
  if (!password || password.length < 8) {
    return "New password must be at least 8 characters";
  }
  if (!/[A-Z]/.test(password)) return "New password must include an uppercase letter";
  if (!/[a-z]/.test(password)) return "New password must include a lowercase letter";
  if (!/[0-9]/.test(password)) return "New password must include a number";
  if (!/[^A-Za-z0-9]/.test(password)) return "New password must include a special character";
  return null;
}

export async function changePassword(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const { currentPassword, newPassword } = req.body ?? {};

    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({ error: "Current password is required" });
    }

    const newPasswordError = validateNewPassword(newPassword);
    if (newPasswordError) {
      return res.status(400).json({ error: newPasswordError });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: "New password must be different from the current password" });
    }

    const account = await prisma.account.findFirst({
      where: { userId: authUser.id, providerId: "credential" },
      select: { id: true, password: true },
    });

    if (!account?.password) {
      return res.status(404).json({ error: "No password credential found for this account" });
    }

    const isCurrentPasswordValid = await verifyPassword({
      password: currentPassword,
      hash: account.password,
    });

    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    await prisma.account.update({
      where: { id: account.id },
      data: { password: await hashPassword(newPassword) },
    });

    // Security: revoke every active session so all devices must sign in again
    await revokeCustomSession(authUser.id);
    clearAuthCookies(res);

    return res.json({ message: "Password changed successfully. Please sign in with your new password." });
  } catch (error: any) {
    console.error("Change password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getUserProfile(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { ownerProfile: true, driverProfile: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ data: serializeUser(user) });
  } catch (error: any) {
    console.error("Get user profile error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateUserProfile(req: Request, res: Response) {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { name, phone, password, address, city, township } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    // Strict security: password changes are only allowed via /user/change-password,
    // which verifies the current password before applying the new one.
    if (password !== undefined && String(password).trim() !== "") {
      return res.status(400).json({ error: "Password changes must use the change-password endpoint" });
    }

    const currentUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    if (phone !== undefined && phone !== currentUser.phone) {
      return res.status(400).json({ error: "Phone number cannot be changed after registration" });
    }

    const data: any = { name };
    if (address !== undefined) data.address = address;
    if (city !== undefined) data.city = city;
    if (township !== undefined) data.township = township;

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data,
      include: { ownerProfile: true, driverProfile: true },
    });

    return res.json({ data: serializeUser(updatedUser) });
  } catch (error: any) {
    console.error("Update user profile error:", error);
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "Phone number is already registered" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function uploadProfilePhotoHandler(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    if (!req.file) {
      return res.status(400).json({ error: "Profile photo is required" });
    }

    const photoUrl = `/uploads/profile/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: { profilePhoto: photoUrl, image: photoUrl },
      include: { ownerProfile: true, driverProfile: true },
    });

    return res.json({ data: serializeUser(user) });
  } catch (error: any) {
    console.error("Upload profile photo error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
