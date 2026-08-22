import prisma from "./prisma.js";

export const BookingStatus = {
  REQUESTED: "REQUESTED",
  PENDING_ADMIN_APPROVAL: "PENDING_ADMIN_APPROVAL",
  BOOKING_APPROVED: "BOOKING_APPROVED",
  BOOKING_REJECTED: "BOOKING_REJECTED",
} as const;
export type BookingStatusValue = (typeof BookingStatus)[keyof typeof BookingStatus];

export const AgreementStatus = {
  PENDING_COMMISSION_PAYMENT: "PENDING_COMMISSION_PAYMENT",
  ACTIVE: "ACTIVE",
} as const;
export type AgreementStatusValue = (typeof AgreementStatus)[keyof typeof AgreementStatus];

export const PaymentStatus = {
  PENDING_PAYMENT_VERIFICATION: "PENDING_PAYMENT_VERIFICATION",
  PAYMENT_VERIFIED: "PAYMENT_VERIFIED",
  PAYMENT_REJECTED: "PAYMENT_REJECTED",
} as const;
export type PaymentStatusValue = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const AGREEMENT_LOCKED_MESSAGE = "Commission payment is required before viewing this agreement.";

const LEGACY_PAYMENT_STATUS_MAP: Record<string, PaymentStatusValue> = {
  under_review: PaymentStatus.PENDING_PAYMENT_VERIFICATION,
  pending: PaymentStatus.PENDING_PAYMENT_VERIFICATION,
  confirmed: PaymentStatus.PAYMENT_VERIFIED,
  failed: PaymentStatus.PAYMENT_REJECTED,
  rejected: PaymentStatus.PAYMENT_REJECTED,
};

export function normalizePaymentStatus(status?: string | null): PaymentStatusValue | null {
  if (!status) return null;
  if (status === "incomplete") return null;
  return LEGACY_PAYMENT_STATUS_MAP[status] || (status as PaymentStatusValue);
}

export function deriveBookingStatus(
  ownerApprovalStatus?: string | null,
  adminApprovalStatus?: string | null,
): BookingStatusValue {
  if (ownerApprovalStatus === "REJECTED" || adminApprovalStatus === "REJECTED") return BookingStatus.BOOKING_REJECTED;
  if (adminApprovalStatus === "APPROVED") return BookingStatus.BOOKING_APPROVED;
  if (ownerApprovalStatus === "APPROVED") return BookingStatus.PENDING_ADMIN_APPROVAL;
  return BookingStatus.REQUESTED;
}

export function isAgreementUnlocked(application: any): boolean {
  return application?.commissionPaymentStatus === PaymentStatus.PAYMENT_VERIFIED;
}

let workflowStorageReady: Promise<void> | null = null;

export async function ensureWorkflowStorage() {
  if (!workflowStorageReady) {
    workflowStorageReady = createWorkflowStorage();
  }
  return workflowStorageReady;
}

async function createEnumIfMissing(enumName: string, values: string[]) {
  const enumValues = values.map((value) => `'${value}'`).join(", ");
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "${enumName}" AS ENUM (${enumValues});
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

async function backfillBookingPaymentStatuses() {
  await prisma.$executeRawUnsafe(`
    UPDATE booking_payments SET status = CASE status
      WHEN 'under_review' THEN 'PENDING_PAYMENT_VERIFICATION'
      WHEN 'confirmed' THEN 'PAYMENT_VERIFIED'
      WHEN 'failed' THEN 'PAYMENT_REJECTED'
      ELSE status
    END
    WHERE status IN ('under_review', 'confirmed', 'failed')
  `);
}

async function recomputeCommissionPaymentStatusForAll() {
  await prisma.$executeRawUnsafe(`
    UPDATE car_applications ca SET commission_payment_status = agg.next_status
    FROM (
      SELECT
        p.booking_id,
        CASE
          WHEN COUNT(*) FILTER (
            WHERE p.payer_role IN ('DRIVER', 'OWNER') AND p.status = 'PAYMENT_REJECTED'
          ) > 0 THEN 'PAYMENT_REJECTED'::\"PaymentStatus\"
          WHEN COUNT(DISTINCT p.payer_role) FILTER (
            WHERE p.payer_role IN ('DRIVER', 'OWNER') AND p.status = 'PAYMENT_VERIFIED'
          ) >= 2 THEN 'PAYMENT_VERIFIED'::\"PaymentStatus\"
          WHEN COUNT(*) FILTER (
            WHERE p.payer_role IN ('DRIVER', 'OWNER') AND p.status = 'PENDING_PAYMENT_VERIFICATION'
          ) > 0 THEN 'PENDING_PAYMENT_VERIFICATION'::\"PaymentStatus\"
          ELSE NULL::\"PaymentStatus\"
        END AS next_status
      FROM booking_payments p
      GROUP BY p.booking_id
    ) agg
    WHERE agg.booking_id = ca.id
      AND NOT (ca.owner_agreement_agreed_at IS NOT NULL AND ca.driver_agreement_agreed_at IS NOT NULL)
  `);
}

async function backfillApplicationStatuses() {
  await prisma.$executeRawUnsafe(`
    UPDATE car_applications SET status = CASE
      WHEN owner_approval_status = 'REJECTED' OR admin_approval_status = 'REJECTED' THEN 'BOOKING_REJECTED'::\"BookingStatus\"
      WHEN admin_approval_status = 'APPROVED' THEN 'BOOKING_APPROVED'::\"BookingStatus\"
      WHEN owner_approval_status = 'APPROVED' THEN 'PENDING_ADMIN_APPROVAL'::\"BookingStatus\"
      ELSE 'REQUESTED'::\"BookingStatus\"
    END
    WHERE status = 'REQUESTED'
      AND (
        owner_approval_status = 'REJECTED' OR admin_approval_status = 'REJECTED'
        OR admin_approval_status = 'APPROVED' OR owner_approval_status = 'APPROVED'
      )
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE car_applications SET agreement_status = 'ACTIVE'::\"AgreementStatus\"
    WHERE owner_agreement_agreed_at IS NOT NULL
      AND driver_agreement_agreed_at IS NOT NULL
      AND agreement_status = 'PENDING_COMMISSION_PAYMENT'
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE car_applications SET commission_payment_status = 'PAYMENT_VERIFIED'::\"PaymentStatus\"
    WHERE owner_agreement_agreed_at IS NOT NULL
      AND driver_agreement_agreed_at IS NOT NULL
  `);

  await prisma.$executeRawUnsafe(`
    UPDATE car_applications ca SET agreement_status = 'PENDING_COMMISSION_PAYMENT'::\"AgreementStatus\"
    WHERE agreement_sent_at IS NOT NULL
      AND (owner_agreement_agreed_at IS NULL OR driver_agreement_agreed_at IS NULL)
      AND NOT EXISTS (
        SELECT 1 FROM booking_payments p
        WHERE p.booking_id = ca.id AND p.status IN ('PENDING_PAYMENT_VERIFICATION', 'PAYMENT_VERIFIED')
      )
  `).catch(() => undefined);
}

async function createWorkflowStorage() {
  await createEnumIfMissing("BookingStatus", Object.values(BookingStatus));
  await createEnumIfMissing("AgreementStatus", Object.values(AgreementStatus));
  await createEnumIfMissing("PaymentStatus", Object.values(PaymentStatus));

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "car_applications"
    ADD COLUMN IF NOT EXISTS "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
    ADD COLUMN IF NOT EXISTS "agreement_status" "AgreementStatus" NOT NULL DEFAULT 'PENDING_COMMISSION_PAYMENT',
    ADD COLUMN IF NOT EXISTS "commission_payment_status" "PaymentStatus"
  `);

  await backfillApplicationStatuses();

  try {
    await backfillBookingPaymentStatuses();
    await recomputeCommissionPaymentStatusForAll();
  } catch (error) {
    console.warn("Skipped booking_payments workflow backfill (table may not exist yet):", error);
  }
}
