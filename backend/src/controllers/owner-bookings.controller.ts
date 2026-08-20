import type { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { requireUser } from "../lib/api-auth.js";
import { serializeBooking } from "../lib/serializers.js";
import { serializeBookingWithFinancials, serializeBookingsWithFinancials } from "../lib/booking-finance.js";

export async function listOwnerBookings(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const status = typeof req.query.status === "string" ? req.query.status : null;
    const statusMap: Record<string, "PENDING" | "APPROVED" | "REJECTED"> = {
      requested: "PENDING",
      accepted: "APPROVED",
      active: "APPROVED",
      cancelled: "REJECTED",
    };

    const applications = await prisma.carApplication.findMany({
      where: {
        ownerId: authUser.id,
        ...(status && status !== "all" && statusMap[status] ? { ownerApprovalStatus: statusMap[status] } : {}),
      },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = await serializeBookingsWithFinancials(applications);

    return res.json({
      data,
      current_page: 1,
      per_page: applications.length,
      total: applications.length,
      last_page: 1,
    });
  } catch (error: any) {
    console.error("Get owner bookings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getOwnerBooking(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const application = await prisma.carApplication.findFirst({
      where: { id: req.params.id, ownerId: authUser.id },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Booking not found" });
    }

    return res.json({ data: await serializeBookingWithFinancials(application) });
  } catch (error: any) {
    console.error("Get owner booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function acceptBooking(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: req.params.id, ownerId: authUser.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Booking request not found" });
    }

    const application = await prisma.carApplication.update({
      where: { id: existing.id },
      data: { ownerApprovalStatus: "APPROVED", approvedAt: new Date() },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        receiverId: application.driverId,
        triggerUserId: authUser.id,
        title: "Borrow request accepted",
        message: `${application.owner.name} accepted your request for ${application.car.brand} ${application.car.model}.`,
        type: "booking_accepted",
        entityId: application.id,
      },
    });

    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((adminUser) => ({
          id: crypto.randomUUID(),
          receiverId: adminUser.id,
          triggerUserId: authUser.id,
          title: "Booking request approved by owner",
          message: `${application.owner.name} approved ${application.driver.name}'s request for ${application.car.brand} ${application.car.model}.`,
          type: "booking_accepted",
          entityId: application.id,
        })),
      });
    }

    return res.json({ data: serializeBooking(application) });
  } catch (error: any) {
    console.error("Accept booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function rejectBooking(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: req.params.id, ownerId: authUser.id },
    });

    if (!existing) {
      return res.status(404).json({ error: "Booking request not found" });
    }

    const application = await prisma.carApplication.update({
      where: { id: existing.id },
      data: { ownerApprovalStatus: "REJECTED", approvedAt: null },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    await prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        receiverId: application.driverId,
        triggerUserId: authUser.id,
        title: "Borrow request rejected",
        message: req.body.reason || `${application.owner.name} rejected your request for ${application.car.brand} ${application.car.model}.`,
        type: "booking_rejected",
        entityId: application.id,
      },
    });

    return res.json({ data: serializeBooking(application) });
  } catch (error: any) {
    console.error("Reject booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
