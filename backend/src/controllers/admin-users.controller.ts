import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireUser } from "../lib/api-auth.js";
import { serializeUser } from "../lib/serializers.js";

export const listUsers = async (req: Request, res: Response) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const role = typeof req.query.role === "string" ? req.query.role : null;

    const users = await prisma.user.findMany({
      where: role ? { role: role.toUpperCase() as any } : {},
      include: {
        ownerProfile: { select: { adminApprovalStatus: true } },
        driverProfile: { select: { kycStatus: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ data: users.map(serializeUser) });
  } catch (error) {
    console.error("List users error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getUser = async (req: Request, res: Response) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        ownerProfile: { select: { adminApprovalStatus: true } },
        driverProfile: { select: { kycStatus: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ data: serializeUser(user) });
  } catch (error) {
    console.error("Get user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const suspendUser = async (req: Request, res: Response) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ error: "Suspension reason is required" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isActive: false,
        verificationStatus: "REJECTED",
      },
      include: {
        ownerProfile: { select: { adminApprovalStatus: true } },
        driverProfile: { select: { kycStatus: true } },
      },
    });

    return res.json({ data: serializeUser(updated, reason) });
  } catch (error) {
    console.error("Suspend user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const unsuspendUser = async (req: Request, res: Response) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        isActive: true,
        verificationStatus: user.isVerified ? "APPROVED" : "PENDING",
      },
      include: {
        ownerProfile: { select: { adminApprovalStatus: true } },
        driverProfile: { select: { kycStatus: true } },
      },
    });

    return res.json({ data: serializeUser(updated) });
  } catch (error) {
    console.error("Unsuspend user error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
