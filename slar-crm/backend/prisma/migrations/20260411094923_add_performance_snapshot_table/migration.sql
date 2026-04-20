-- CreateTable
CREATE TABLE "performance_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "taskCompletionRate" DOUBLE PRECISION NOT NULL,
    "averageResponseTime" DOUBLE PRECISION NOT NULL,
    "overdueTaskCount" INTEGER NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "performance_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "performance_snapshots_userId_idx" ON "performance_snapshots"("userId");

-- CreateIndex
CREATE INDEX "performance_snapshots_snapshotDate_idx" ON "performance_snapshots"("snapshotDate");

-- CreateIndex
CREATE INDEX "performance_snapshots_calculatedAt_idx" ON "performance_snapshots"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "performance_snapshots_userId_snapshotDate_key" ON "performance_snapshots"("userId", "snapshotDate");

-- AddForeignKey
ALTER TABLE "performance_snapshots" ADD CONSTRAINT "performance_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
