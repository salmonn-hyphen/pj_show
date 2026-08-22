import type { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { requireUser } from "../lib/api-auth.js";
import { isApprovedOwner, serializeBooking } from "../lib/serializers.js";
import {
  ensureCarApplicationStorage,
  serializeBookingWithFinancials,
  serializeBookingsWithFinancials,
  withDatabaseRetry,
} from "../lib/booking-finance.js";
import {
  AgreementStatus,
  BookingStatus,
  type BookingStatusValue,
  ensureWorkflowStorage,
} from "../lib/workflow-status.js";

export const createDriverBooking = async (req: Request, res: Response) => {
  try {
    const result = await withDatabaseRetry(async () => {
      const authUser = await requireUser(req, res, ["DRIVER"]);
      if (!authUser) return null;

      const carId = req.body.car_id || req.body.carId;
      const driverNotes = req.body.driver_notes || req.body.driverNotes || null;

      if (!carId || typeof carId !== "string") {
        res.status(400).json({ error: "Car ID is required" });
        return null;
      }

      const driver = await prisma.user.findUnique({
        where: { id: authUser.id },
        include: { driverProfile: true },
      });

      if (!driver || !driver.isVerified || driver.verificationStatus !== "APPROVED") {
        res.status(403).json({ error: "Driver KYC must be approved before applying for cars" });
        return null;
      }

      await ensureCarApplicationStorage();
      await ensureWorkflowStorage();

      const car = await prisma.car.findUnique({
        where: { id: carId },
        include: { carImages: true, owner: { include: { ownerProfile: true } } },
      });

      if (
        !car ||
        car.adminApprovalStatus !== "APPROVED" ||
        car.availabilityStatus !== "AVAILABLE" ||
        !isApprovedOwner(car.owner)
      ) {
        res.status(404).json({ error: "Car not found" });
        return null;
      }

      if (car.ownerId === authUser.id) {
        res.status(400).json({ error: "You cannot apply for your own car" });
        return null;
      }

      const application = await prisma.carApplication.upsert({
        where: { carId_driverId: { carId, driverId: authUser.id } },
        update: {
          ownerApprovalStatus: "PENDING",
          adminApprovalStatus: "PENDING",
          status: BookingStatus.REQUESTED,
          agreementStatus: AgreementStatus.PENDING_COMMISSION_PAYMENT,
          commissionPaymentStatus: null,
          approvedAt: null,
          agreementSentAt: null,
          ownerAgreementAgreedAt: null,
          driverAgreementAgreedAt: null,
          wardRecommendationLetter: driverNotes,
        },
        create: {
          id: crypto.randomUUID(),
          ownerId: car.ownerId,
          carId,
          driverId: authUser.id,
          wardRecommendationLetter: driverNotes,
          ownerApprovalStatus: "PENDING",
          adminApprovalStatus: "PENDING",
          status: BookingStatus.REQUESTED,
          agreementStatus: AgreementStatus.PENDING_COMMISSION_PAYMENT,
          commissionPaymentStatus: null,
        },
        include: {
          car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
          driver: { include: { driverProfile: true } },
          owner: { include: { ownerProfile: true } },
        },
      });

      return { application, car, driver, authUser };
    });

    if (!result) return;

    const { application, car, driver, authUser } = result;

    prisma.notification.create({
      data: {
        id: crypto.randomUUID(),
        receiverId: car.ownerId,
        triggerUserId: authUser.id,
        title: "New car borrow request",
        message: `${driver.name} applied to borrow your ${car.brand} ${car.model}.`,
        type: "booking_request",
        entityId: application.id,
      },
    }).catch((notificationError) => {
      console.error("Create booking request notification error:", notificationError);
    });

    return res.status(201).json({ data: serializeBooking(application) });
  } catch (error: any) {
    console.error("Create driver booking request error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const listDriverBookings = async (req: Request, res: Response) => {
  try {
    const authUser = await requireUser(req, res, ["DRIVER"]);
    if (!authUser) return;

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
        driverId: authUser.id,
        ...(status && status !== "all" && statusMap[status] ? { status: statusMap[status] } : {}),
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
    console.error("Get driver bookings error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const getDriverBooking = async (req: Request, res: Response) => {
  try {
    const authUser = await requireUser(req, res, ["DRIVER"]);
    if (!authUser) return;

    const application = await prisma.carApplication.findFirst({
      where: { id: req.params.id, driverId: authUser.id },
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
    console.error("Get driver booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
