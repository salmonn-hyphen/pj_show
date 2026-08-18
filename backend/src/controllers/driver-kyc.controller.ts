import type { Request, Response } from "express";
import { getDriverKyc, submitKyc } from "../../service/driverService.js";

export async function getKyc(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.role !== "DRIVER") {
      return res
        .status(403)
        .json({ error: "Forbidden: Only drivers can query driver KYC status" });
    }

    const kycProfile = await getDriverKyc(user.id);
    return res.json({
      success: true,
      data: kycProfile,
    });
  } catch (error: any) {
    console.error("Get KYC controller error:", error);
    return res
      .status(400)
      .json({ error: error.message || "Internal server error" });
  }
}

export async function uploadKyc(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.role !== "DRIVER") {
      return res
        .status(403)
        .json({ error: "Forbidden: Only drivers can upload driver KYC" });
    }

    const files = (req as any).files as
      | { [fieldname: string]: any[] }
      | undefined;

    const nrcFront = files?.nrcFront?.[0];
    const nrcBack = files?.nrcBack?.[0];
    const selfie = files?.selfie?.[0];
    const drivingLicenseFront = files?.drivingLicenseFront?.[0];
    const drivingLicenseBack = files?.drivingLicenseBack?.[0];

    if (
      !nrcFront ||
      !nrcBack ||
      !selfie ||
      !drivingLicenseFront ||
      !drivingLicenseBack
    ) {
      return res
        .status(400)
        .json({
          error:
            "Missing required KYC documents (nrcFront, nrcBack, selfie, drivingLicenseFront, drivingLicenseBack)",
        });
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (
      nrcFront.size > MAX_SIZE ||
      nrcBack.size > MAX_SIZE ||
      selfie.size > MAX_SIZE ||
      drivingLicenseFront.size > MAX_SIZE ||
      drivingLicenseBack.size > MAX_SIZE
    ) {
      return res.status(400).json({ error: "File size exceeds 5MB limit" });
    }

    const updatedProfile = await submitKyc(user.id, {
      nrcFront,
      nrcBack,
      selfie,
      drivingLicenseFront,
      drivingLicenseBack,
    });

    return res.json({
      success: true,
      message: "KYC documents submitted successfully",
      data: updatedProfile,
    });
  } catch (error: any) {
    console.error("Upload KYC controller error:", error);
    return res
      .status(400)
      .json({ error: error.message || "Internal server error" });
  }
}
