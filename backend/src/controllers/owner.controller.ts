import type { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { requireUser } from "../lib/api-auth.js";
import { serializeOwnerDocuments, serializeOwnerProfile } from "../lib/serializers.js";

const OWNER_KYC_TYPES = new Set(["nrc_front", "nrc_back"]);

export const getOwnerProfile = async (req: Request, res: Response) => {
  try {
    const user = await requireUser(req, res, ["OWNER"]);
    if (!user) return;

    const owner = await prisma.user.findUnique({
      where: { id: user.id },
      include: { ownerProfile: true },
    });

    if (!owner) {
      return res.status(404).json({ error: "Owner not found" });
    }

    const ownerProfile = owner.ownerProfile || await prisma.ownerProfile.create({
      data: {
        id: crypto.randomUUID(),
        userId: owner.id,
        address: owner.address,
        nrcText: owner.nrcNumber || "",
        nrcFrontImage: "",
        nrcBackImage: "",
        adminApprovalStatus: "PENDING",
      },
    });

    return res.json({ data: serializeOwnerProfile(ownerProfile, owner) });
  } catch (error: any) {
    console.error("Get owner profile error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateOwnerProfile = async (req: Request, res: Response) => {
  try {
    const user = await requireUser(req, res, ["OWNER"]);
    if (!user) return;

    const nrcText = req.body.nrc_text || req.body.nrc_number || req.body.nrcText || undefined;
    const address = req.body.address || null;
    const city = req.body.city || null;
    const township = req.body.township || null;

    const ownerProfile = await prisma.ownerProfile.upsert({
      where: { userId: user.id },
      create: {
        id: crypto.randomUUID(),
        userId: user.id,
        address,
        nrcText,
        nrcFrontImage: "",
        nrcBackImage: "",
        adminApprovalStatus: "PENDING",
      },
      update: {
        address,
        ...(nrcText !== undefined
          ? { nrcText, adminApprovalStatus: "PENDING", approvedAt: null }
          : {}),
      },
    });

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(nrcText !== undefined ? { nrcNumber: nrcText || null } : {}),
        address,
        city,
        township,
        ...(nrcText !== undefined
          ? { verificationStatus: "PENDING", isVerified: false }
          : {}),
      },
      include: { ownerProfile: true },
    });

    return res.json({ data: serializeOwnerProfile(ownerProfile, updatedUser) });
  } catch (error: any) {
    console.error("Update owner profile error:", error);
    if (error?.code === "P2002") {
      return res.status(400).json({ error: "NRC number is already registered" });
    }
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getOwnerDocuments = async (req: Request, res: Response) => {
  try {
    const user = await requireUser(req, res, ["OWNER"]);
    if (!user) return;

    const ownerProfile = await prisma.ownerProfile.findUnique({
      where: { userId: user.id },
    });

    return res.json({
      data: serializeOwnerDocuments(ownerProfile),
    });
  } catch (error: any) {
    console.error("Get owner documents error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const uploadOwnerDocument = async (req: Request, res: Response) => {
  try {
    const user = await requireUser(req, res, ["OWNER"]);
    if (!user) return;

    const { type, fileSize, fileData } = req.body;

    if (!OWNER_KYC_TYPES.has(type)) {
      return res.status(400).json({ error: "Unsupported owner KYC document type" });
    }

    if (!fileData || typeof fileData !== "string" || !fileData.startsWith("data:")) {
      return res.status(400).json({ error: "Document file data is required" });
    }

    if (typeof fileSize === "number" && fileSize > 5 * 1024 * 1024) {
      return res.status(400).json({ error: "Document file must be smaller than 5MB" });
    }

    const ownerProfile = await prisma.ownerProfile.upsert({
      where: { userId: user.id },
      create: {
        id: crypto.randomUUID(),
        userId: user.id,
        nrcText: "",
        nrcFrontImage: type === "nrc_front" ? fileData : "",
        nrcBackImage: type === "nrc_back" ? fileData : "",
        adminApprovalStatus: "PENDING",
      },
      update: {
        ...(type === "nrc_front" ? { nrcFrontImage: fileData } : {}),
        ...(type === "nrc_back" ? { nrcBackImage: fileData } : {}),
        adminApprovalStatus: "PENDING",
        approvedAt: null,
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationStatus: "PENDING",
        isVerified: false,
      },
    });

    const document = serializeOwnerDocuments(ownerProfile).find((item) => item.type === type);
    return res.json({ data: document });
  } catch (error: any) {
    console.error("Upload owner document error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};