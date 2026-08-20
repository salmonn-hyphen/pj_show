import type { Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";
import prisma from "./prisma.js";
import { buildSessionTokens, getCookieOptions, hashToken, persistTokens } from "./auth-service.js";

export type AuthUser = {
  id: string;
  role: "OWNER" | "DRIVER" | "ADMIN";
  isActive: boolean;
};

const BETTER_AUTH_SESSION_COOKIE = "better-auth.session_token";

export async function getAuthUser(req: Request, res: Response): Promise<AuthUser | null> {
  const hasBetterAuthCookie = Boolean(req.headers.cookie?.includes(BETTER_AUTH_SESSION_COOKIE));

  if (hasBetterAuthCookie) {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session?.user?.id) {
      return prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, role: true, isActive: true },
      });
    }
  }

  const accessToken = req.cookies?.accessToken || req.cookies?.session;
  if (accessToken) {
    const account = await prisma.account.findFirst({
      where: {
        accessToken,
        accessTokenExpiresAt: { gt: new Date() },
      },
      select: {
        user: { select: { id: true, role: true, isActive: true } },
      },
    });

    if (account?.user) {
      return account.user;
    }
  }

  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) return null;

  const refreshAccount = await prisma.account.findFirst({
    where: {
      refreshToken: hashToken(refreshToken),
      refreshTokenExpiresAt: { gt: new Date() },
    },
    select: {
      user: { select: { id: true, role: true, isActive: true } },
    },
  });

  if (!refreshAccount?.user) {
    res.clearCookie("accessToken", getCookieOptions(0));
    res.clearCookie("refreshToken", getCookieOptions(0));
    res.clearCookie("session", getCookieOptions(0));
    return null;
  }

  const tokens = buildSessionTokens();
  await persistTokens(refreshAccount.user.id, tokens);
  res.cookie("accessToken", tokens.accessToken, getCookieOptions(15 * 60 * 1000));
  res.cookie("refreshToken", tokens.refreshToken, getCookieOptions(30 * 24 * 60 * 60 * 1000));
  res.cookie("session", tokens.accessToken, getCookieOptions(15 * 60 * 1000));

  return refreshAccount.user;
}

export async function requireUser(req: Request, res: Response, roles?: AuthUser["role"][]) {
  const existing = (req as any).user as AuthUser | undefined;
  const user = existing ?? (await getAuthUser(req, res));

  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "Account is disabled" });
    return null;
  }

  if (roles && !roles.includes(user.role)) {
    res.status(403).json({ error: "You do not have permission to access this resource" });
    return null;
  }

  return user;
}