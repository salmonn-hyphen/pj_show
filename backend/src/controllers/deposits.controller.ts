import type { Request, Response } from 'express';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { requireUser } from '../lib/api-auth.js';
import { serializeDeposit, serializeIncompleteDeposit } from '../lib/serializers.js';
import {
  getBookingDeposit,
  getBookingPayment,
  serializeBookingWithFinancials,
} from '../lib/booking-finance.js';

export async function submitDeposit(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["DRIVER"]);
    if (!authUser) return;

    const application = await prisma.carApplication.findFirst({
      where: {
        id: String(req.params.id),
        driverId: authUser.id,
        ownerApprovalStatus: "APPROVED",
        adminApprovalStatus: "APPROVED",
      },
      include: { car: true },
    }) as any;

    if (!application) {
      return res.status(404).json({ error: "Approved booking not found" });
    }

    const payment = await getBookingPayment(application.id, "DRIVER");
    if (payment?.status !== "confirmed") {
      return res.status(400).json({ error: "Payment must be confirmed before submitting deposit" });
    }

    const method = String(req.body.payment_method || req.body.method || "");
    if (!method) {
      return res.status(400).json({ error: "Deposit payment method is required" });
    }

    const screenshotUrl = req.file ? `/uploads/payments/${req.file.filename}` : null;
    if (!screenshotUrl) {
      return res.status(400).json({ error: "Deposit screenshot is required" });
    }

    await prisma.$executeRaw`
      INSERT INTO booking_deposits (
        id, booking_id, driver_id, amount, status, payment_method, screenshot_url,
        paid_at, created_at, updated_at
      )
      VALUES (
        ${crypto.randomUUID()}::uuid,
        ${application.id}::uuid,
        ${authUser.id}::uuid,
        ${String(application.car.depositAmount || 0)}::decimal,
        'held',
        ${method},
        ${screenshotUrl},
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (booking_id) DO UPDATE SET
        driver_id = EXCLUDED.driver_id,
        amount = EXCLUDED.amount,
        status = 'held',
        payment_method = EXCLUDED.payment_method,
        screenshot_url = EXCLUDED.screenshot_url,
        paid_at = NOW(),
        released_at = NULL,
        deducted_amount = NULL,
        deduction_reason = NULL,
        updated_at = NOW()
    `;

    const deposit = await getBookingDeposit(application.id);
    return res.json({ data: serializeDeposit(deposit) });
  } catch (error: any) {
    console.error("Submit deposit error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getBookingDepositHandler(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const application = await prisma.carApplication.findFirst({
      where: {
        id: String(req.params.id),
        ...(authUser.role === "DRIVER"
          ? { driverId: authUser.id }
          : authUser.role === "OWNER"
            ? { ownerId: authUser.id }
            : {}),
      },
      include: { car: true },
    }) as any;

    if (!application) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const deposit = await getBookingDeposit(application.id);
    return res.json({ data: deposit ? serializeDeposit(deposit) : serializeIncompleteDeposit(application) });
  } catch (error: any) {
    console.error("Get booking deposit error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getDriverDeposits(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["DRIVER", "ADMIN"]);
    if (!authUser) return;

    const deposits = authUser.role === "ADMIN"
      ? await prisma.$queryRaw<Array<any>>`
          SELECT * FROM booking_deposits ORDER BY created_at DESC
        `
      : await prisma.$queryRaw<Array<any>>`
          SELECT * FROM booking_deposits
          WHERE driver_id = ${authUser.id}::uuid
          ORDER BY created_at DESC
        `;

    return res.json({ data: deposits.map(serializeDeposit) });
  } catch (error: any) {
    console.error("Get driver deposits error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getOwnerDeposits(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER", "ADMIN"]);
    if (!authUser) return;

    const deposits = authUser.role === "ADMIN"
      ? await prisma.$queryRaw<Array<any>>`
          SELECT d.* FROM booking_deposits d ORDER BY d.created_at DESC
        `
      : await prisma.$queryRaw<Array<any>>`
          SELECT d.* FROM booking_deposits d
          INNER JOIN car_applications a ON a.id = d.booking_id
          WHERE a.owner_id = ${authUser.id}::uuid
          ORDER BY d.created_at DESC
        `;

    return res.json({ data: deposits.map(serializeDeposit) });
  } catch (error: any) {
    console.error("Get owner deposits error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function freezeDeposit(req: Request, res: Response) {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    await prisma.$executeRaw`
      UPDATE booking_deposits SET status = 'frozen', updated_at = NOW()
      WHERE id = ${req.params.id}::uuid
    `;

    const [deposit] = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM booking_deposits WHERE id = ${req.params.id}::uuid LIMIT 1
    `;

    if (!deposit) return res.status(404).json({ error: "Deposit not found" });
    return res.json({ data: serializeDeposit(deposit) });
  } catch (error: any) {
    console.error("Freeze deposit error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function releaseDeposit(req: Request, res: Response) {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    await prisma.$executeRaw`
      UPDATE booking_deposits
      SET status = 'released', released_at = NOW(), updated_at = NOW()
      WHERE id = ${req.params.id}::uuid
    `;

    const [deposit] = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM booking_deposits WHERE id = ${req.params.id}::uuid LIMIT 1
    `;

    if (!deposit) return res.status(404).json({ error: "Deposit not found" });
    return res.json({ data: serializeDeposit(deposit) });
  } catch (error: any) {
    console.error("Release deposit error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function deductDeposit(req: Request, res: Response) {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    await prisma.$executeRaw`
      UPDATE booking_deposits
      SET status = 'deducted',
          deducted_amount = ${String(req.body.amount || 0)}::decimal,
          deduction_reason = ${req.body.reason || null},
          updated_at = NOW()
      WHERE id = ${req.params.id}::uuid
    `;

    const [deposit] = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM booking_deposits WHERE id = ${req.params.id}::uuid LIMIT 1
    `;

    if (!deposit) return res.status(404).json({ error: "Deposit not found" });
    return res.json({ data: serializeDeposit(deposit) });
  } catch (error: any) {
    console.error("Deduct deposit error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function cancelBooking(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["DRIVER", "OWNER", "ADMIN"]);
    if (!authUser) return;

    const existing = await prisma.carApplication.findFirst({
      where: {
        id: req.params.id,
        ...(authUser.role === "DRIVER"
          ? { driverId: authUser.id }
          : authUser.role === "OWNER"
            ? { ownerId: authUser.id }
            : {}),
      },
      include: { car: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const application = await prisma.carApplication.update({
      where: { id: existing.id },
      data: {
        ownerApprovalStatus: "REJECTED",
        adminApprovalStatus: "REJECTED",
        approvedAt: null,
      },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    return res.json({ data: await serializeBookingWithFinancials(application) });
  } catch (error: any) {
    console.error("Cancel booking error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
