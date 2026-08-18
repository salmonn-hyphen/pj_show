import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';
import { requireUser } from '../lib/api-auth.js';
import { serializeUser } from '../lib/serializers.js';

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
