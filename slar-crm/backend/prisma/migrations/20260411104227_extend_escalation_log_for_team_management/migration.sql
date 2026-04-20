/*
  Warnings:

  - You are about to drop the column `assignedTo` on the `EscalationLog` table. All the data in the column will be lost.
  - You are about to drop the column `notifiedTo` on the `EscalationLog` table. All the data in the column will be lost.
  - Added the required column `fromUserId` to the `EscalationLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `toUserId` to the `EscalationLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EscalationLog" DROP CONSTRAINT "EscalationLog_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "EscalationLog" DROP CONSTRAINT "EscalationLog_notifiedTo_fkey";

-- DropIndex
DROP INDEX "EscalationLog_assignedTo_idx";

-- DropIndex
DROP INDEX "EscalationLog_resolved_idx";

-- AlterTable
ALTER TABLE "EscalationLog" DROP COLUMN "assignedTo",
DROP COLUMN "notifiedTo",
ADD COLUMN     "escalationLevel" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "fromUserId" TEXT NOT NULL,
ADD COLUMN     "reason" TEXT NOT NULL DEFAULT 'OVERDUE_TASK',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "taskId" TEXT,
ADD COLUMN     "toUserId" TEXT NOT NULL,
ADD COLUMN     "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "taskType" DROP NOT NULL,
ALTER COLUMN "delayDays" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "EscalationLog_taskId_idx" ON "EscalationLog"("taskId");

-- CreateIndex
CREATE INDEX "EscalationLog_fromUserId_idx" ON "EscalationLog"("fromUserId");

-- CreateIndex
CREATE INDEX "EscalationLog_toUserId_idx" ON "EscalationLog"("toUserId");

-- CreateIndex
CREATE INDEX "EscalationLog_status_idx" ON "EscalationLog"("status");

-- CreateIndex
CREATE INDEX "EscalationLog_escalationLevel_idx" ON "EscalationLog"("escalationLevel");

-- CreateIndex
CREATE INDEX "EscalationLog_triggeredAt_idx" ON "EscalationLog"("triggeredAt");

-- AddForeignKey
ALTER TABLE "EscalationLog" ADD CONSTRAINT "EscalationLog_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationLog" ADD CONSTRAINT "EscalationLog_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscalationLog" ADD CONSTRAINT "EscalationLog_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
