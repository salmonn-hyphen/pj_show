-- Workflow refactor: booking lifecycle, agreement locking, commission payment statuses

-- CreateEnum (idempotent for drifted databases)
DO $$ BEGIN
  CREATE TYPE "BookingStatus" AS ENUM ('REQUESTED', 'PENDING_ADMIN_APPROVAL', 'BOOKING_APPROVED', 'BOOKING_REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AgreementStatus" AS ENUM ('PENDING_COMMISSION_PAYMENT', 'ACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING_PAYMENT_VERIFICATION', 'PAYMENT_VERIFIED', 'PAYMENT_REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add workflow columns to car_applications
ALTER TABLE "car_applications"
  ADD COLUMN IF NOT EXISTS "status" "BookingStatus" NOT NULL DEFAULT 'REQUESTED',
  ADD COLUMN IF NOT EXISTS "agreement_status" "AgreementStatus" NOT NULL DEFAULT 'PENDING_COMMISSION_PAYMENT',
  ADD COLUMN IF NOT EXISTS "commission_payment_status" "PaymentStatus";

-- Backfill booking lifecycle status from legacy approval columns
UPDATE "car_applications" SET "status" = CASE
  WHEN owner_approval_status = 'REJECTED' OR admin_approval_status = 'REJECTED' THEN 'BOOKING_REJECTED'::"BookingStatus"
  WHEN admin_approval_status = 'APPROVED' THEN 'BOOKING_APPROVED'::"BookingStatus"
  WHEN owner_approval_status = 'APPROVED' THEN 'PENDING_ADMIN_APPROVAL'::"BookingStatus"
  ELSE 'REQUESTED'::"BookingStatus"
END
WHERE "status" = 'REQUESTED'
  AND (
    owner_approval_status = 'REJECTED'
    OR admin_approval_status = 'REJECTED'
    OR admin_approval_status = 'APPROVED'
    OR owner_approval_status = 'APPROVED'
  );

-- Legacy signed agreements stay ACTIVE and unlocked
UPDATE "car_applications" SET "agreement_status" = 'ACTIVE'::"AgreementStatus"
WHERE owner_agreement_agreed_at IS NOT NULL
  AND driver_agreement_agreed_at IS NOT NULL
  AND "agreement_status" = 'PENDING_COMMISSION_PAYMENT';

UPDATE "car_applications" SET "commission_payment_status" = 'PAYMENT_VERIFIED'::"PaymentStatus"
WHERE owner_agreement_agreed_at IS NOT NULL
  AND driver_agreement_agreed_at IS NOT NULL
  AND ("commission_payment_status" IS DISTINCT FROM 'PAYMENT_VERIFIED'::"PaymentStatus");

-- Migrate legacy free-text payment statuses (table is runtime-managed)
DO $$ BEGIN
  IF to_regclass('public.booking_payments') IS NOT NULL THEN
    UPDATE booking_payments SET status = CASE status
      WHEN 'under_review' THEN 'PENDING_PAYMENT_VERIFICATION'
      WHEN 'confirmed' THEN 'PAYMENT_VERIFIED'
      WHEN 'failed' THEN 'PAYMENT_REJECTED'
      ELSE status
    END
    WHERE status IN ('under_review', 'confirmed', 'failed');

    UPDATE car_applications ca SET commission_payment_status = agg.next_status
    FROM (
      SELECT
        p.booking_id,
        CASE
          WHEN COUNT(*) FILTER (
            WHERE p.payer_role IN ('DRIVER', 'OWNER') AND p.status = 'PAYMENT_REJECTED'
          ) > 0 THEN 'PAYMENT_REJECTED'::"PaymentStatus"
          WHEN COUNT(DISTINCT p.payer_role) FILTER (
            WHERE p.payer_role IN ('DRIVER', 'OWNER') AND p.status = 'PAYMENT_VERIFIED'
          ) >= 2 THEN 'PAYMENT_VERIFIED'::"PaymentStatus"
          WHEN COUNT(*) FILTER (
            WHERE p.payer_role IN ('DRIVER', 'OWNER') AND p.status = 'PENDING_PAYMENT_VERIFICATION'
          ) > 0 THEN 'PENDING_PAYMENT_VERIFICATION'::"PaymentStatus"
          ELSE NULL::"PaymentStatus"
        END AS next_status
      FROM booking_payments p
      GROUP BY p.booking_id
    ) agg
    WHERE agg.booking_id = ca.id
      AND NOT (ca.owner_agreement_agreed_at IS NOT NULL AND ca.driver_agreement_agreed_at IS NOT NULL);
  END IF;
END $$;
