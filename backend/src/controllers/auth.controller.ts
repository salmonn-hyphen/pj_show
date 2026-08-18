import type { Request, Response } from "express";
import { auth } from "../lib/auth.js";
import {
  AuthServiceError,
  createRegistrationRequest,
  getCookieOptions,
  getEmailByPhone,
  loginWithCredentials,
  refreshCustomSession,
  revokeCustomSessionByAccessToken,
  revokeCustomSessionByRefreshToken,
  verifyRegistration,
} from "../../service/authService.js";

function handleError(res: Response, error: unknown) {
  if (error instanceof AuthServiceError) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  const message = error instanceof Error ? error.message : "Internal server error";
  return res.status(500).json({ error: message });
}

export async function registerRequest(req: Request, res: Response) {
  try {
    const result = await createRegistrationRequest(req.body);
    return res.json({
      success: true,
      message: result.message,
      tempToken: result.tempToken,
      code: result.code,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function registerVerify(req: Request, res: Response) {
  try {
    const { tempToken, code } = req.body;
    const result = await verifyRegistration(tempToken, code);

    res.cookie("accessToken", result.tokens.accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie("refreshToken", result.tokens.refreshToken, getCookieOptions(30 * 24 * 60 * 60 * 1000));
    res.cookie("session", result.tokens.accessToken, getCookieOptions(15 * 60 * 1000));

    return res.json({
      success: result.success,
      message: result.message,
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      session: {
        token: result.tokens.accessToken,
        accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: result.tokens.refreshTokenExpiresAt,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getEmailByPhoneController(req: Request, res: Response) {
  try {
    const phone = req.query.phone;
    if (typeof phone !== "string") {
      return res.status(400).json({ error: "Phone number is required" });
    }
    const result = await getEmailByPhone(phone);
    return res.json({ email: result.email });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function login(req: Request, res: Response) {
  try {
    const { email, phone, password } = req.body;
    const result = await loginWithCredentials({ email, phone, password });

    res.cookie("accessToken", result.tokens.accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie("refreshToken", result.tokens.refreshToken, getCookieOptions(30 * 24 * 60 * 60 * 1000));
    res.cookie("session", result.tokens.accessToken, getCookieOptions(15 * 60 * 1000));

    return res.json({
      success: result.success,
      message: result.message,
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      session: {
        token: result.tokens.accessToken,
        accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: result.tokens.refreshTokenExpiresAt,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function refresh(req: Request, res: Response) {
  try {
    const refreshToken = req.body?.refreshToken || req.cookies?.refreshToken;
    const result = await refreshCustomSession(refreshToken || "");

    res.cookie("accessToken", result.tokens.accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie("refreshToken", result.tokens.refreshToken, getCookieOptions(30 * 24 * 60 * 60 * 1000));
    res.cookie("session", result.tokens.accessToken, getCookieOptions(15 * 60 * 1000));

    return res.json({
      success: result.success,
      message: result.message,
      user: result.user,
      accessToken: result.tokens.accessToken,
      refreshToken: result.tokens.refreshToken,
      session: {
        token: result.tokens.accessToken,
        accessTokenExpiresAt: result.tokens.accessTokenExpiresAt,
        refreshTokenExpiresAt: result.tokens.refreshTokenExpiresAt,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const accessToken = req.cookies?.accessToken || req.cookies?.session;
    const refreshToken = req.cookies?.refreshToken;

    await revokeCustomSessionByAccessToken(accessToken || "");
    await revokeCustomSessionByRefreshToken(refreshToken || "");

    try {
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value) {
          if (Array.isArray(value)) {
            value.forEach((v) => headers.append(key, v));
          } else {
            headers.set(key, value as string);
          }
        }
      }
      await auth.api.signOut({ headers });
    } catch (e) {
      console.debug("[authController] auth.api.signOut failed", e);
    }

    res.clearCookie("accessToken", getCookieOptions(0));
    res.clearCookie("refreshToken", getCookieOptions(0));
    res.clearCookie("session", getCookieOptions(0));

    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function session(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const sessionValue = (req as any).session;

    return res.json({
      success: true,
      user,
      session: sessionValue,
    });
  } catch (error) {
    return handleError(res, error);
  }
}
