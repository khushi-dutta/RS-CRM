/*
  Warnings:

  - The `status` column on the `EscalationLog` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('PENDING', 'ACKNOWLEDGED', 'RESOLVED');

-- AlterTable
ALTER TABLE "EscalationLog" DROP COLUMN "status",
ADD COLUMN     "status" "EscalationStatus" NOT NULL DEFAULT 'PENDING';

-- CreateIndex
CREATE INDEX "EscalationLog_status_idx" ON "EscalationLog"("status");
