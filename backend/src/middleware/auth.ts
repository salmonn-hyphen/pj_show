import { auth } from "../lib/auth.js";
import prisma from "../lib/prisma.js";
import { getCookieOptions, revokeCustomSession, hashToken } from "../lib/auth-service.js";
import type { Request, Response, NextFunction } from "express";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    const session = await auth.api.getSession({ headers });

    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
      });

      if (!user || !user.isActive) {
        return res.status(403).json({ error: "Forbidden" });
      }

      (req as any).user = user;
      (req as any).session = session.session;
      return next();
    }

    const accessToken = req.cookies?.accessToken || req.cookies?.session;
    if (!accessToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const account = await prisma.account.findFirst({
      where: {
        accessToken,
        accessTokenExpiresAt: { gt: new Date() },
      },
      select: {
        userId: true,
      },
    });

    if (account) {
      const user = await prisma.user.findUnique({
        where: { id: account.userId },
      });
      if (!user || !user.isActive) {
        return res.status(403).json({ error: "Forbidden" });
      }
      (req as any).user = user;
      (req as any).session = { token: accessToken };
      return next();
    }

    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const hashedRefreshToken = hashToken(refreshToken);
    const refreshAccount = await prisma.account.findFirst({
      where: {
        refreshToken: hashedRefreshToken,
        refreshTokenExpiresAt: { gt: new Date() },
      },
      select: {
        userId: true,
      },
    });

    if (!refreshAccount) {
      res.clearCookie("accessToken", getCookieOptions(0));
      res.clearCookie("refreshToken", getCookieOptions(0));
      res.clearCookie("session", getCookieOptions(0));
      return res.status(401).json({ error: "Session expired. Please log in again." });
    }

    const { buildSessionTokens, persistTokens } = await import("../lib/auth-service.js");
    const newTokens = buildSessionTokens();
    await persistTokens(refreshAccount.userId, newTokens);

    const user = await prisma.user.findUnique({
      where: { id: refreshAccount.userId },
    });
    if (!user || !user.isActive) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.cookie("accessToken", newTokens.accessToken, getCookieOptions(15 * 60 * 1000));
    res.cookie("refreshToken", newTokens.refreshToken, getCookieOptions(30 * 24 * 60 * 60 * 1000));
    res.cookie("session", newTokens.accessToken, getCookieOptions(15 * 60 * 1000));

    (req as any).user = user;
    (req as any).session = { token: newTokens.accessToken };
    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
