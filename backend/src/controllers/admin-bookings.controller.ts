import type { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { requireUser } from "../lib/api-auth.js";
import { serializeBooking, serializeAgreementWorkflow } from "../lib/serializers.js";
import { serializeBookingsWithFinancials } from "../lib/booking-finance.js";
import {
  AgreementStatus,
  BookingStatus,
  type BookingStatusValue,
  ensureWorkflowStorage,
} from "../lib/workflow-status.js";

export const listAdminBookings = async (req: Request, res: Response) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const status = typeof req.query.status === "string" ? req.query.status : null;
    const statusMap: Record<string, BookingStatusValue> = {
      requested: BookingStatus.REQUESTED,
      pending_admin_approval: BookingStatus.PENDING_ADMIN_APPROVAL,
      approved: BookingStatus.BOOKING_APPROVED,
      accepted: BookingStatus.BOOKING_APPROVED,
      rejected: BookingStatus.BOOKING_REJECTED,
      cancelled: BookingStatus.BOOKING_REJECTED,
    };

    await ensureWorkflowStorage();

    const applications = await prisma.carApplication.findMany({
      where: {
        ownerApprovalStatus: "APPROVED",
        ...(status && status !== "all" && statusMap[status] ? { status: statusMap[status] } : {}),
      },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
      orderBy: { updatedAt: "desc" },
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
    console.error("Get admin bookings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const acceptAdminBooking = async (req: Request, res: Response) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: req.params.id, ownerApprovalStatus: "APPROVED" },
      include: { car: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Owner-approved booking request not found" });
    }

    const application = await prisma.$transaction(async (tx) => {
      const app = await tx.carApplication.update({
        where: { id: existing.id },
        data: {
          adminApprovalStatus: "APPROVED",
          status: BookingStatus.BOOKING_APPROVED,
        },
        include: {
          car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
          driver: { include: { driverProfile: true } },
          owner: { include: { ownerProfile: true } },
        },
      });

      await tx.notification.createMany({
        data: [
          {
            id: crypto.randomUUID(),
            receiverId: app.ownerId,
            triggerUserId: admin.id,
            title: "Booking approved by admin",
            message: `Admin approved the booking for ${app.car.brand} ${app.car.model}.`,
            type: "booking_admin_approved",
            entityId: app.id,
          },
          {
            id: crypto.randomUUID(),
            receiverId: app.driverId,
            triggerUserId: admin.id,
            title: "Booking approved by admin",
            message: `Admin approved your booking for ${app.car.brand} ${app.car.model}.`,
            type: "booking_admin_approved",
            entityId: app.id,
          },
        ],
      });

      return app;
    });

    return res.json({ data: serializeBooking(application) });
  } catch (error: any) {
    console.error("Admin accept booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const rejectAdminBooking = async (req: Request, res: Response) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: req.params.id, ownerApprovalStatus: "APPROVED" },
    });

    if (!existing) {
      return res.status(404).json({ error: "Owner-approved booking request not found" });
    }

    const application = await prisma.carApplication.update({
      where: { id: existing.id },
      data: {
        adminApprovalStatus: "REJECTED",
        status: BookingStatus.BOOKING_REJECTED,
      },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    await prisma.notification.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          receiverId: application.ownerId,
          triggerUserId: admin.id,
          title: "Booking rejected by admin",
          message: req.body.reason || `Admin rejected the booking for ${application.car.brand} ${application.car.model}.`,
          type: "booking_admin_rejected",
          entityId: application.id,
        },
        {
          id: crypto.randomUUID(),
          receiverId: application.driverId,
          triggerUserId: admin.id,
          title: "Booking rejected by admin",
          message: req.body.reason || `Admin rejected your booking for ${application.car.brand} ${application.car.model}.`,
          type: "booking_admin_rejected",
          entityId: application.id,
        },
      ],
    });

    return res.json({ data: serializeBooking(application) });
  } catch (error: any) {
    console.error("Admin reject booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const sendAgreement = async (req: Request, res: Response) => {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const existing = await prisma.carApplication.findFirst({
      where: { id: req.params.id, ownerApprovalStatus: "APPROVED", adminApprovalStatus: "APPROVED" },
    });

    if (!existing) {
      return res.status(404).json({ error: "Admin-approved booking request not found" });
    }

    const application = await prisma.carApplication.update({
      where: { id: existing.id },
      data: {
        agreementSentAt: existing.agreementSentAt || new Date(),
        agreementStatus: AgreementStatus.PENDING_COMMISSION_PAYMENT,
      },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    await prisma.notification.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          receiverId: application.ownerId,
          triggerUserId: admin.id,
          title: "Agreement form sent",
          message: `Admin sent the agreement form for ${application.car.brand} ${application.car.model}.`,
          type: "agreement_sent",
          entityId: application.id,
        },
        {
          id: crypto.randomUUID(),
          receiverId: application.driverId,
          triggerUserId: admin.id,
          title: "Agreement form sent",
          message: `Admin sent the agreement form for your ${application.car.brand} ${application.car.model} booking. Complete the commission payment to unlock it.`,
          type: "agreement_sent",
          entityId: application.id,
        },
      ],
    });

    return res.json({
      data: {
        ...serializeBooking(application),
        ...serializeAgreementWorkflow(application),
      },
    });
  } catch (error: any) {
    console.error("Send agreement error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
