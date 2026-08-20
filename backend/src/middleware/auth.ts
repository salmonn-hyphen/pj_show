import { getAuthUser } from "../lib/api-auth.js";
import type { Request, Response, NextFunction } from "express";

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await getAuthUser(req, res);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Forbidden" });
    }

    (req as any).user = user;
    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}