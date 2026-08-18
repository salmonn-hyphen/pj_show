import type { Request, Response } from "express";
import { getSubmittedKYCDrivers, reviewDriverKYC, getKYCHistory } from "../../service/adminService.js";

export async function getPendingVerifications(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden: Admins only" });

    const drivers = await getSubmittedKYCDrivers();
    return res.json({ success: true, data: drivers });
  } catch (error: any) {
    console.error("getPendingVerifications error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

export async function getKYCHistoryController(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden: Admins only" });

    const history = await getKYCHistory();
    return res.json({ success: true, data: history });
  } catch (error: any) {
    console.error("getKYCHistory error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}

export async function reviewDriverKYCController(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden: Admins only" });

    const id = String(req.params.id);
    const { status, rejectionReason } = req.body;

    if (!id) return res.status(400).json({ error: "Driver profile ID is required" });
    if (!status) return res.status(400).json({ error: "Status is required (APPROVED or REJECTED)" });

    const updated = await reviewDriverKYC(id, status, rejectionReason);
    return res.json({
      success: true,
      message: `Driver KYC has been ${status.toLowerCase()}.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("reviewDriverKYC error:", error);
    return res.status(400).json({ error: error.message || "Internal server error" });
  }
}
