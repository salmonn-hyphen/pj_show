/*
  Warnings:

  - You are about to drop the `booking_deposits` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `booking_payments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "booking_deposits" DROP CONSTRAINT "booking_deposits_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_deposits" DROP CONSTRAINT "booking_deposits_driver_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_payments" DROP CONSTRAINT "booking_payments_booking_id_fkey";

-- DropForeignKey
ALTER TABLE "booking_payments" DROP CONSTRAINT "booking_payments_user_id_fkey";

-- AlterTable
ALTER TABLE "car_applications" ADD COLUMN     "admin_approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "agreement_sent_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "driver_profiles" ADD COLUMN     "driving_license_back_url" TEXT,
ADD COLUMN     "driving_license_front_url" TEXT,
ADD COLUMN     "driving_license_url" TEXT,
ADD COLUMN     "kyc_status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "nrc_back_url" TEXT,
ADD COLUMN     "nrc_front_url" TEXT,
ADD COLUMN     "selfie_url" TEXT,
ALTER COLUMN "driver_license_image" DROP NOT NULL;

-- DropTable
DROP TABLE "booking_deposits";

-- DropTable
DROP TABLE "booking_payments";
