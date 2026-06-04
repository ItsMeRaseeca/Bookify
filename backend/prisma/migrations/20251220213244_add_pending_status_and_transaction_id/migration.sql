-- AlterEnum (needs to be committed first before use)
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'PENDING';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "transactionId" TEXT;
