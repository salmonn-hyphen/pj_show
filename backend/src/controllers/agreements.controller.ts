import type { Request, Response } from "express";
import prisma from "../lib/prisma.js";
import { requireUser } from "../lib/api-auth.js";
import { serializeBooking, serializeAgreementWorkflow } from "../lib/serializers.js";
import {
  AGREEMENT_LOCKED_MESSAGE,
  AgreementStatus,
  BookingStatus,
  PaymentStatus,
  ensureWorkflowStorage,
} from "../lib/workflow-status.js";

async function getAgreementSignatureState(applicationId: string) {
  const [agreementStatus] = await prisma.$queryRaw<Array<{
    owner_agreement_agreed_at: Date | null;
    driver_agreement_agreed_at: Date | null;
  }>>`
    SELECT owner_agreement_agreed_at, driver_agreement_agreed_at
    FROM car_applications
    WHERE id = ${applicationId}::uuid
  `;

  return {
    owner_agreement_agreed_at: agreementStatus?.owner_agreement_agreed_at?.toISOString?.() || null,
    driver_agreement_agreed_at: agreementStatus?.driver_agreement_agreed_at?.toISOString?.() || null,
  };
}

export async function listAgreements(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    await ensureWorkflowStorage();

    const applications = await prisma.carApplication.findMany({
      where: {
        agreementSentAt: { not: null },
        ...(authUser.role === "OWNER"
          ? { ownerId: authUser.id }
          : authUser.role === "DRIVER"
            ? { driverId: authUser.id }
            : {}),
      },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
      orderBy: { agreementSentAt: "desc" },
    });

    const data = await Promise.all(applications.map(async (application) => ({
      ...serializeBooking(application),
      ...(await getAgreementSignatureState(application.id)),
    })));

    return res.json({ data });
  } catch (error: any) {
    console.error("Get agreements error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function getAgreement(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res);
    if (!authUser) return;

    await ensureWorkflowStorage();

    const application = await prisma.carApplication.findUnique({
      where: { id: req.params.id },
      include: {
        car: { include: { carImages: true, owner: { include: { ownerProfile: true } } } },
        driver: { include: { driverProfile: true } },
        owner: { include: { ownerProfile: true } },
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Agreement not found" });
    }

    const canView =
      authUser.role === "ADMIN" ||
      application.ownerId === authUser.id ||
      application.driverId === authUser.id;

    if (!canView) {
      return res.status(403).json({ error: "You do not have permission to view this agreement" });
    }

    const isParty =
      (application.ownerId === authUser.id || application.driverId === authUser.id) &&
      authUser.role !== "ADMIN";

    if (isParty && application.commissionPaymentStatus !== PaymentStatus.PAYMENT_VERIFIED) {
      return res.status(403).json({
        error: AGREEMENT_LOCKED_MESSAGE,
        code: "AGREEMENT_LOCKED",
        commission_payment_status: application.commissionPaymentStatus || "PENDING_COMMISSION_PAYMENT",
        is_agreement_locked: true,
      });
    }

    return res.json({
      data: {
        ...serializeBooking(application),
        ...(await getAgreementSignatureState(application.id)),
        owner_profile: {
          nrc_number: application.owner?.nrcNumber || application.owner?.ownerProfile?.nrcText || "",
          address: application.owner?.address || application.owner?.ownerProfile?.address || "",
          city: application.owner?.city || "",
          township: application.owner?.township || "",
          phone: application.owner?.phone || "",
        },
        driver_profile: {
          nrc_number: application.driver?.nrcNumber || application.driver?.driverProfile?.nrcText || "",
          address: application.driver?.address || application.driver?.driverProfile?.address || "",
          city: application.driver?.city || "",
          township: application.driver?.township || "",
          phone: application.driver?.phone || "",
        },
      },
    });
  } catch (error: any) {
    console.error("Get agreement error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function agreeToAgreement(req: Request, res: Response) {
  try {
    const authUser = await requireUser(req, res, ["OWNER", "DRIVER"]);
    if (!authUser) return;

    const application = await prisma.carApplication.findUnique({
      where: { id: req.params.id },
      include: {
        car: true,
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Agreement not found" });
    }

    const isOwner = authUser.role === "OWNER" && application.ownerId === authUser.id;
    const isDriver = authUser.role === "DRIVER" && application.driverId === authUser.id;

    if (!isOwner && !isDriver) {
      return res.status(403).json({ error: "You do not have permission to agree to this agreement" });
    }

    if (
      application.agreementStatus !== AgreementStatus.ACTIVE &&
      application.commissionPaymentStatus !== PaymentStatus.PAYMENT_VERIFIED
    ) {
      return res.status(403).json({
        error: AGREEMENT_LOCKED_MESSAGE,
        code: "AGREEMENT_LOCKED",
        commission_payment_status: application.commissionPaymentStatus || "PENDING_COMMISSION_PAYMENT",
        is_agreement_locked: true,
      });
    }

    const [status] = await prisma.$transaction(async (tx) => {
      if (isOwner) {
        await tx.$executeRaw`
          UPDATE car_applications
          SET owner_agreement_agreed_at = COALESCE(owner_agreement_agreed_at, NOW())
          WHERE id = ${application.id}::uuid
        `;
      }

      if (isDriver) {
        await tx.$executeRaw`
          UPDATE car_applications
          SET driver_agreement_agreed_at = COALESCE(driver_agreement_agreed_at, NOW())
          WHERE id = ${application.id}::uuid
        `;
      }

      const rows = await tx.$queryRaw<Array<{
        owner_agreement_agreed_at: Date | null;
        driver_agreement_agreed_at: Date | null;
      }>>`
        SELECT owner_agreement_agreed_at, driver_agreement_agreed_at
        FROM car_applications
        WHERE id = ${application.id}::uuid
      `;

      const nextStatus = rows[0];
      if (nextStatus?.owner_agreement_agreed_at && nextStatus.driver_agreement_agreed_at) {
        await tx.carApplication.update({
          where: { id: application.id },
          data: { agreementStatus: AgreementStatus.ACTIVE },
        });

        await tx.car.update({
          where: { id: application.carId },
          data: { availabilityStatus: "RENTED" },
        });

        await tx.carApplication.updateMany({
          where: {
            carId: application.carId,
            id: { not: application.id },
            status: { not: BookingStatus.BOOKING_REJECTED },
          },
          data: { status: BookingStatus.BOOKING_REJECTED, adminApprovalStatus: "REJECTED" },
        });
      }

      return rows;
    });

    return res.json({
      data: {
        ...serializeAgreementWorkflow({
          ...application,
          agreementStatus: nextAgreementStatus(
            status || { owner_agreement_agreed_at: null, driver_agreement_agreed_at: null },
            application,
          ),
        }),
        owner_agreement_agreed_at: status?.owner_agreement_agreed_at?.toISOString?.() || null,
        driver_agreement_agreed_at: status?.driver_agreement_agreed_at?.toISOString?.() || null,
      },
    });
  } catch (error: any) {
    console.error("Agree agreement error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

function nextAgreementStatus(
  signatureState: { owner_agreement_agreed_at: Date | null; driver_agreement_agreed_at: Date | null },
  application: { agreementStatus?: string },
): string {
  if (signatureState.owner_agreement_agreed_at && signatureState.driver_agreement_agreed_at) {
    return AgreementStatus.ACTIVE;
  }
  return application.agreementStatus || AgreementStatus.PENDING_COMMISSION_PAYMENT;
}
