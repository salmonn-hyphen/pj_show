import type { Request, Response } from "express";
import { updateProfile as updateProfileService } from "../../service/driverService.js";

export async function updateProfile(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.role !== "DRIVER") {
      return res.status(403).json({ error: "Forbidden: Only drivers can update driver profiles" });
    }

    const { name, phone, password, address, bio } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const updatedUser = await updateProfileService(user.id, {
      name,
      phone,
      password,
      address,
      bio,
    });

    return res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (error: any) {
    console.error("Driver update profile controller error:", error);
    return res.status(400).json({ error: error.message || "Internal server error" });
  }
}
