import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { isApprovedOwner, serializeCar } from "../lib/serializers.js";

export async function listAvailableCars(_req: Request, res: Response) {
  try {
    const cars = await prisma.car.findMany({
      where: {
        adminApprovalStatus: "APPROVED",
        availabilityStatus: "AVAILABLE",
        owner: {
          OR: [
            { verificationStatus: "APPROVED" },
            {
              ownerProfile: {
                is: { adminApprovalStatus: "APPROVED" },
              },
            },
          ],
        },
      },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
      orderBy: { createdAt: "desc" },
    });

    return res.json({
      data: cars.map(serializeCar),
      meta: { current_page: 1, per_page: cars.length, total: cars.length, last_page: 1 },
    });
  } catch (error: any) {
    console.error("List cars error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getCarById(req: Request, res: Response) {
  try {
    const car = await prisma.car.findUnique({
      where: { id: req.params.carId },
      include: { carImages: true, owner: { include: { ownerProfile: true } } },
    });

    if (
      !car ||
      car.adminApprovalStatus !== "APPROVED" ||
      car.availabilityStatus !== "AVAILABLE" ||
      !isApprovedOwner(car.owner)
    ) {
      return res.status(404).json({ error: "Car not found" });
    }

    return res.json({ data: serializeCar(car) });
  } catch (error: any) {
    console.error("Get car error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
