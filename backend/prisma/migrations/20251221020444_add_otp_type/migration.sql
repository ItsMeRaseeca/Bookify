-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('VERIFICATION', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "Otp" ADD COLUMN     "type" "OtpType" NOT NULL DEFAULT 'VERIFICATION';

-- CreateIndex
CREATE INDEX "Otp_type_idx" ON "Otp"("type");
