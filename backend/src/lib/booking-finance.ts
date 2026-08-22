import crypto from "crypto";
import prisma from "./prisma.js";
import {
  serializeBooking,
  serializeDeposit,
  serializePayment,
} from "./serializers.js";
import { PaymentStatus, ensureWorkflowStorage } from "./workflow-status.js";

const DEFAULT_AGENCY_COMMISSION_RATE = 0.1;
const FIRST_TIME_COMMISSION_RATE = 0.2;

export type PaymentPayerRole = "DRIVER" | "OWNER";

function calculateCommissionAmount(totalAmount: number, rate: number) {
  return Math.round(totalAmount * rate);
}

async function getCommissionRateForUser(userId: string, payerRole: PaymentPayerRole) {
  await ensureBookingPaymentStorage();

  const [row] = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count
    FROM booking_payments
    WHERE user_id = ${userId}::uuid
      AND payer_role = ${payerRole}
      AND status = ${PaymentStatus.PAYMENT_VERIFIED}
  `;

  return Number(row?.count || 0) === 0 ? FIRST_TIME_COMMISSION_RATE : DEFAULT_AGENCY_COMMISSION_RATE;
}

export async function getPaymentQuote(application: any, payerRole: PaymentPayerRole) {
  const userId = payerRole === "OWNER" ? application.ownerId : application.driverId;
  const totalAmount = Number(application.car?.rentalPrice || 0);
  const commissionRate = await getCommissionRateForUser(userId, payerRole);
  const commissionAmount = calculateCommissionAmount(totalAmount, commissionRate);

  return {
    userId,
    payerRole,
    paymentPurpose: payerRole === "OWNER" ? "owner_commission" : "driver_rental_payment",
    amount: payerRole === "OWNER" ? commissionAmount : totalAmount,
    commissionRate,
    commissionAmount,
  };
}

export async function serializeIncompletePayment(application: any, payerRole: PaymentPayerRole) {
  const quote = await getPaymentQuote(application, payerRole);
  const transferFromName = payerRole === "OWNER" ? application.owner?.name : application.driver?.name;

  return {
    id: `incomplete-${payerRole.toLowerCase()}-${application.id}`,
    booking_id: application.id,
    user_id: quote.userId,
    amount: quote.amount,
    method: null,
    payer_role: payerRole,
    payment_purpose: quote.paymentPurpose,
    transfer_from_name: transferFromName || null,
    transfer_to_name: "Taxi Meik Swe Agency",
    driver_name: application.driver?.name || null,
    owner_name: application.owner?.name || null,
    commission_rate: quote.commissionRate,
    commission_amount: quote.commissionAmount,
    transaction_id: null,
    screenshot_url: null,
    status: "incomplete",
    admin_notes: null,
    paid_at: null,
    confirmed_at: null,
    confirmed_by: null,
    created_at: application.createdAt?.toISOString?.() || application.createdAt,
    updated_at: application.updatedAt?.toISOString?.() || application.updatedAt,
  };
}

function isMissingOptionalFinanceTableError(error: any) {
  const message = String(error?.message || "");
  const databaseCode = String(error?.meta?.code || "");

  return databaseCode === "42P01" || /relation .*booking_(payments|deposits).* does not exist/i.test(message);
}

function isTransientDatabaseConnectionError(error: any) {
  const message = String(error?.message || "");
  const metaMessage = String(error?.meta?.message || "");
  const cause = String(error?.meta?.driverAdapterError?.cause?.message || "");

  return (
    error?.code === "P2010" &&
    /server has closed the connection|connectionclosed|connection terminated|econnreset/i.test(`${message} ${metaMessage} ${cause}`)
  );
}

export async function withDatabaseRetry<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (!isTransientDatabaseConnectionError(error)) throw error;
    console.warn("Transient database connection error, retrying once:", error);
    return operation();
  }
}

export async function ensureCarApplicationStorage() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "car_applications"
    ADD COLUMN IF NOT EXISTS "admin_approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS "agreement_sent_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "owner_agreement_agreed_at" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "driver_agreement_agreed_at" TIMESTAMP(3)
  `);
}

let bookingPaymentStorageReady: Promise<void> | null = null;

export async function ensureBookingPaymentStorage() {
  if (!bookingPaymentStorageReady) {
    bookingPaymentStorageReady = (async () => {
      await ensureWorkflowStorage();
      await createBookingPaymentStorage();
    })();
  }
  return bookingPaymentStorageReady;
}

async function createBookingPaymentStorage() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "booking_payments" (
      "id" UUID PRIMARY KEY,
      "booking_id" UUID NOT NULL,
      "user_id" UUID NOT NULL,
      "amount" DECIMAL(12, 2) NOT NULL,
      "method" TEXT NOT NULL,
      "payer_role" TEXT NOT NULL DEFAULT 'DRIVER',
      "payment_purpose" TEXT NOT NULL DEFAULT 'rental_payment',
      "commission_rate" DECIMAL(5, 4) NOT NULL DEFAULT 0.2000,
      "commission_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
      "transaction_id" TEXT,
      "screenshot_url" TEXT,
      "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT_VERIFICATION',
      "admin_notes" TEXT,
      "paid_at" TIMESTAMP(3),
      "confirmed_at" TIMESTAMP(3),
      "confirmed_by" UUID,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "booking_payments_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "car_applications"("id") ON DELETE CASCADE,
      CONSTRAINT "booking_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
    )
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "booking_payments"
    ADD COLUMN IF NOT EXISTS "payer_role" TEXT NOT NULL DEFAULT 'DRIVER',
    ADD COLUMN IF NOT EXISTS "payment_purpose" TEXT NOT NULL DEFAULT 'rental_payment',
    ADD COLUMN IF NOT EXISTS "commission_rate" DECIMAL(5, 4) NOT NULL DEFAULT 0.2000,
    ADD COLUMN IF NOT EXISTS "commission_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "booking_payments"
    DROP CONSTRAINT IF EXISTS "booking_payments_booking_id_key"
  `);

  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "booking_payments_booking_id_payer_role_key"
    ON "booking_payments" ("booking_id", "payer_role")
  `);
}

export async function serializeBookingsWithFinancials(applications: any[]) {
  if (applications.length === 0) return [];

  const ids = applications.map((application) => application.id);

  const paymentsPromise = prisma.$queryRaw<Array<any>>`
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
    WHERE p.booking_id = ANY(${ids}::uuid[])
  `.catch((error) => {
    if (isMissingOptionalFinanceTableError(error)) return [] as any[];
    throw error;
  });

  const depositsPromise = prisma.$queryRaw<Array<any>>`
    SELECT * FROM booking_deposits WHERE booking_id = ANY(${ids}::uuid[])
  `.catch((error) => {
    if (isMissingOptionalFinanceTableError(error)) return [] as any[];
    throw error;
  });

  const [payments, deposits] = await Promise.all([paymentsPromise, depositsPromise]);

  return applications.map((application) => {
    const payment = payments.find((p) => p.booking_id === application.id && p.payer_role === "DRIVER") || null;
    const ownerPayment = payments.find((p) => p.booking_id === application.id && p.payer_role === "OWNER") || null;
    const deposit = deposits.find((d) => d.booking_id === application.id) || null;
    const booking = serializeBooking({ ...application, payment }) as any;
    return {
      ...booking,
      payment: serializePayment(payment),
      owner_payment: serializePayment(ownerPayment),
      deposit: serializeDeposit(deposit),
      payment_status: payment?.status || "incomplete",
      owner_payment_status: ownerPayment?.status || "incomplete",
      deposit_status: deposit?.status || "incomplete",
    };
  });
}

export async function serializeBookingWithFinancials(application: any) {
  const [result] = await serializeBookingsWithFinancials([application]);
  return result;
}

export async function getBookingPayment(applicationId: string, payerRole: PaymentPayerRole = "DRIVER") {
  try {
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
      WHERE p.booking_id = ${applicationId}::uuid
        AND p.payer_role = ${payerRole}
      LIMIT 1
    `;

    return payment || null;
  } catch (error) {
    if (isMissingOptionalFinanceTableError(error)) return null;
    throw error;
  }
}

export async function recomputeCommissionPaymentStatus(applicationId: string) {
  const [row] = await prisma.$queryRaw<Array<{ next_status: string | null }>>`
    SELECT CASE
      WHEN COUNT(*) FILTER (
        WHERE p.payer_role IN ('DRIVER', 'OWNER') AND p.status = 'PAYMENT_REJECTED'
      ) > 0 THEN 'PAYMENT_REJECTED'
      WHEN COUNT(DISTINCT p.payer_role) FILTER (
        WHERE p.payer_role IN ('DRIVER', 'OWNER') AND p.status = 'PAYMENT_VERIFIED'
      ) >= 2 THEN 'PAYMENT_VERIFIED'
      WHEN COUNT(*) FILTER (
        WHERE p.payer_role IN ('DRIVER', 'OWNER') AND p.status = 'PENDING_PAYMENT_VERIFICATION'
      ) > 0 THEN 'PENDING_PAYMENT_VERIFICATION'
      ELSE NULL
    END AS next_status
    FROM booking_payments p
    WHERE p.booking_id = ${applicationId}::uuid
  `.catch((error) => {
    if (isMissingOptionalFinanceTableError(error)) return [] as Array<{ next_status: string | null }>;
    throw error;
  });

  await prisma.$executeRaw`
    UPDATE car_applications
    SET commission_payment_status = ${row?.next_status || null}::"PaymentStatus",
        updated_at = NOW()
    WHERE id = ${applicationId}::uuid
      AND NOT (owner_agreement_agreed_at IS NOT NULL AND driver_agreement_agreed_at IS NOT NULL)
  `;
}

export async function getBookingDeposit(applicationId: string) {
  try {
    const [deposit] = await prisma.$queryRaw<Array<any>>`
      SELECT * FROM booking_deposits WHERE booking_id = ${applicationId}::uuid LIMIT 1
    `;

    return deposit || null;
  } catch (error) {
    if (isMissingOptionalFinanceTableError(error)) return null;
    throw error;
  }
}

export async function notifyAdminsAboutPayment(application: any, payerRole: PaymentPayerRole, payment: any) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });

  if (admins.length === 0) return;

  const payer = await prisma.user.findUnique({
    where: { id: payerRole === "OWNER" ? application.ownerId : application.driverId },
    select: { name: true },
  });
  const carName = [application.car?.brand, application.car?.model].filter(Boolean).join(" ") || "a booking";
  const paymentKind = payerRole === "OWNER" ? "owner commission" : "driver payment";
  const amount = Number(payment?.amount || 0).toLocaleString("en-US");

  await prisma.notification.createMany({
    data: admins.map((adminUser) => ({
      id: crypto.randomUUID(),
      receiverId: adminUser.id,
      triggerUserId: payerRole === "OWNER" ? application.ownerId : application.driverId,
      title: "Payment proof submitted",
      message: `${payer?.name || payerRole} submitted ${paymentKind} proof for ${carName} (${amount} MMK).`,
      type: payerRole === "OWNER" ? "owner_payment_submitted" : "driver_payment_submitted",
      entityId: application.id,
    })),
  });
}
