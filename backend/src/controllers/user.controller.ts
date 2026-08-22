import type { Request, Response } from 'express';
import { hashPassword } from 'better-auth/crypto';
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

export async function updateUserProfile(req: Request, res: Response) {
  try {
    const user = await requireUser(req, res);
    if (!user) return;

    const { name, phone, password, address, city, township } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
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
    if (password && password.trim() !== "") {
      data.passwordHash = await hashPassword(password);
    }

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
