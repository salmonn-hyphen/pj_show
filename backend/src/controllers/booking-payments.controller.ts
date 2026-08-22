import type { Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/prisma.js";
import { requireUser } from "../lib/api-auth.js";
import { serializePayment } from "../lib/serializers.js";
import {
  ensureBookingPaymentStorage,
  getBookingPayment,
  getPaymentQuote,
  notifyAdminsAboutPayment,
  recomputeCommissionPaymentStatus,
  serializeIncompletePayment,
  type PaymentPayerRole,
} from "../lib/booking-finance.js";
import { BookingStatus, PaymentStatus, ensureWorkflowStorage } from "../lib/workflow-status.js";

export async function submitPayment(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["DRIVER", "OWNER"]);
    if (!authUser) return;
    const bookingId = String(req.params.id);
    const payerRole: PaymentPayerRole = authUser.role === "OWNER" ? "OWNER" : "DRIVER";

    await ensureWorkflowStorage();

    const application = await prisma.carApplication.findFirst({
      where: {
        id: bookingId,
        ...(payerRole === "OWNER" ? { ownerId: authUser.id } : { driverId: authUser.id }),
        status: BookingStatus.BOOKING_APPROVED,
        agreementSentAt: { not: null },
      },
      include: { car: true, driver: true, owner: true },
    }) as any;

    if (!application) {
      const anyApplication = await prisma.carApplication.findFirst({
        where: {
          id: bookingId,
          ...(payerRole === "OWNER" ? { ownerId: authUser.id } : { driverId: authUser.id }),
        },
        select: { id: true },
      });

      if (!anyApplication) {
        return res.status(404).json({ error: "Booking not found" });
      }

      return res.status(403).json({
        error: "Commission payment can only be submitted after the admin approves this booking",
        code: "BOOKING_NOT_APPROVED",
      });
    }

    const method = String(req.body.method || "");
    if (!method) {
      return res.status(400).json({ error: "Payment method is required" });
    }

    const screenshotUrl = req.file ? `/uploads/payments/${req.file.filename}` : null;
    if (!screenshotUrl) {
      return res.status(400).json({ error: "Payment screenshot is required" });
    }

    await ensureBookingPaymentStorage();
    const quote = await getPaymentQuote(application, payerRole);

    await prisma.$executeRaw`
      INSERT INTO booking_payments (
        id, booking_id, user_id, amount, method, payer_role, payment_purpose,
        commission_rate, commission_amount, transaction_id, screenshot_url,
        status, paid_at, created_at, updated_at
      )
      VALUES (
        ${crypto.randomUUID()}::uuid,
        ${application.id}::uuid,
        ${quote.userId}::uuid,
        ${String(quote.amount)}::decimal,
        ${method},
        ${payerRole},
        ${quote.paymentPurpose},
        ${String(quote.commissionRate)}::decimal,
        ${String(quote.commissionAmount)}::decimal,
        ${req.body.transaction_id || null},
        ${screenshotUrl},
        ${PaymentStatus.PENDING_PAYMENT_VERIFICATION},
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (booking_id, payer_role) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        amount = EXCLUDED.amount,
        method = EXCLUDED.method,
        payment_purpose = EXCLUDED.payment_purpose,
        commission_rate = EXCLUDED.commission_rate,
        commission_amount = EXCLUDED.commission_amount,
        transaction_id = EXCLUDED.transaction_id,
        screenshot_url = EXCLUDED.screenshot_url,
        status = ${PaymentStatus.PENDING_PAYMENT_VERIFICATION},
        admin_notes = NULL,
        paid_at = NOW(),
        confirmed_at = NULL,
        confirmed_by = NULL,
        updated_at = NOW()
    `;

    await recomputeCommissionPaymentStatus(application.id);

    const payment = await getBookingPayment(application.id, payerRole);
    try {
      await notifyAdminsAboutPayment(application, payerRole, payment);
    } catch (notificationError) {
      console.error("Payment notification error:", notificationError);
    }
    return res.json({ data: serializePayment(payment) });
  } catch (error: any) {
    console.error("Submit payment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getBookingPayments(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    const application = await prisma.carApplication.findFirst({
      where: {
        id: req.params.id,
        ...(authUser.role === "DRIVER"
          ? { driverId: authUser.id }
          : authUser.role === "OWNER"
            ? { ownerId: authUser.id }
            : {}),
      },
      include: { car: true, driver: true, owner: true },
    });

    if (!application) {
      return res.status(404).json({ error: "Booking not found" });
    }

    const payerRole: PaymentPayerRole = authUser.role === "OWNER" ? "OWNER" : "DRIVER";
    const payment = await getBookingPayment(application.id, payerRole);
    return res.json({ data: payment ? serializePayment(payment) : await serializeIncompletePayment(application, payerRole) });
  } catch (error: any) {
    console.error("Get booking payment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getDriverPayments(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["DRIVER"]);
    if (!authUser) return;

    const applications = await prisma.carApplication.findMany({
      where: {
        driverId: authUser.id,
        status: BookingStatus.BOOKING_APPROVED,
        agreementSentAt: { not: null },
      },
      include: { car: true, driver: true, owner: true },
      orderBy: { updatedAt: "desc" },
    });

    const data = await Promise.all(applications.map(async (application) => {
      const payment = await getBookingPayment(application.id, "DRIVER");
      return payment ? serializePayment(payment) : await serializeIncompletePayment(application, "DRIVER");
    }));

    return res.json({
      data,
      current_page: 1,
      per_page: data.length,
      total: data.length,
      last_page: 1,
    });
  } catch (error: any) {
    console.error("Get driver payments error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getOwnerPayments(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER"]);
    if (!authUser) return;

    const applications = await prisma.carApplication.findMany({
      where: {
        ownerId: authUser.id,
        status: BookingStatus.BOOKING_APPROVED,
        agreementSentAt: { not: null },
      },
      include: { car: true, driver: true, owner: true },
      orderBy: { updatedAt: "desc" },
    });

    const data = await Promise.all(applications.map(async (application) => {
      const payment = await getBookingPayment(application.id, "OWNER");
      return payment ? serializePayment(payment) : await serializeIncompletePayment(application, "OWNER");
    }));

    return res.json({
      data,
      current_page: 1,
      per_page: data.length,
      total: data.length,
      last_page: 1,
    });
  } catch (error: any) {
    console.error("Get owner payments error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getPendingPayments(req: Request, res: Response) {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    const payments = await prisma.$queryRaw<Array<any>>`
      SELECT
        p.*,
        payer.full_name AS transfer_from_name,
        'Taxi Meik Swe Agency' AS transfer_to_name,
        driver.full_name AS driver_name,
        owner.full_name AS owner_name
      FROM booking_payments p
      INNER JOIN car_applications a ON a.id = p.booking_id
      LEFT JOIN users payer ON payer.id = p.user_id
      LEFT JOIN users driver ON driver.id = a.driver_id
      LEFT JOIN users owner ON owner.id = a.owner_id
      WHERE p.status = ${PaymentStatus.PENDING_PAYMENT_VERIFICATION}
      ORDER BY p.paid_at ASC NULLS LAST, p.created_at ASC
    `;

    return res.json({ data: payments.map(serializePayment) });
  } catch (error: any) {
    console.error("Get pending payments error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function confirmPayment(req: Request, res: Response) {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    await prisma.$executeRaw`
      UPDATE booking_payments
      SET status = ${PaymentStatus.PAYMENT_VERIFIED},
          admin_notes = ${req.body.notes || null},
          confirmed_at = NOW(),
          confirmed_by = ${admin.id}::uuid,
          updated_at = NOW()
      WHERE id = ${req.params.id}::uuid
    `;

    const [payment] = await prisma.$queryRaw<Array<any>>`
      SELECT
        p.*,
        payer.full_name AS transfer_from_name,
        'Taxi Meik Swe Agency' AS transfer_to_name,
        driver.full_name AS driver_name,
        owner.full_name AS owner_name
      FROM booking_payments p
      INNER JOIN car_applications a ON a.id = p.booking_id
      LEFT JOIN users payer ON payer.id = p.user_id
      LEFT JOIN users driver ON driver.id = a.driver_id
      LEFT JOIN users owner ON owner.id = a.owner_id
      WHERE p.id = ${req.params.id}::uuid
      LIMIT 1
    `;

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    await recomputeCommissionPaymentStatus(payment.booking_id);

    const application = await prisma.carApplication.findUnique({
      where: { id: payment.booking_id },
      include: { car: true },
    });

    if (application?.commissionPaymentStatus === PaymentStatus.PAYMENT_VERIFIED && application.agreementSentAt) {
      const carName = [application.car?.brand, application.car?.model].filter(Boolean).join(" ") || "your booking";
      await prisma.notification.createMany({
        data: [
          {
            id: crypto.randomUUID(),
            receiverId: application.driverId,
            triggerUserId: admin.id,
            title: "Agreement unlocked",
            message: `Commission payment verified. You can now open and sign the agreement for ${carName}.`,
            type: "agreement_unlocked",
            entityId: application.id,
          },
          {
            id: crypto.randomUUID(),
            receiverId: application.ownerId,
            triggerUserId: admin.id,
            title: "Agreement unlocked",
            message: `Commission payment verified. You can now open and sign the agreement for ${carName}.`,
            type: "agreement_unlocked",
            entityId: application.id,
          },
        ],
      }).catch((notificationError) => {
        console.error("Agreement unlock notification error:", notificationError);
      });
    }

    return res.json({ data: serializePayment(payment) });
  } catch (error: any) {
    console.error("Confirm payment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function rejectPayment(req: Request, res: Response) {
  try {
    const admin = await requireUser(req, res, ["ADMIN"]);
    if (!admin) return;

    await prisma.$executeRaw`
      UPDATE booking_payments
      SET status = ${PaymentStatus.PAYMENT_REJECTED},
          admin_notes = ${req.body.reason || "Payment rejected"},
          confirmed_at = NULL,
          confirmed_by = ${admin.id}::uuid,
          updated_at = NOW()
      WHERE id = ${req.params.id}::uuid
    `;

    const [payment] = await prisma.$queryRaw<Array<any>>`
      SELECT
        p.*,
        payer.full_name AS transfer_from_name,
        'Taxi Meik Swe Agency' AS transfer_to_name,
        driver.full_name AS driver_name,
        owner.full_name AS owner_name
      FROM booking_payments p
      INNER JOIN car_applications a ON a.id = p.booking_id
      LEFT JOIN users payer ON payer.id = p.user_id
      LEFT JOIN users driver ON driver.id = a.driver_id
      LEFT JOIN users owner ON owner.id = a.owner_id
      WHERE p.id = ${req.params.id}::uuid
      LIMIT 1
    `;

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    await recomputeCommissionPaymentStatus(payment.booking_id);

    return res.json({ data: serializePayment(payment) });
  } catch (error: any) {
    console.error("Reject payment error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
