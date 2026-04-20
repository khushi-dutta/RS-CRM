/*
  Warnings:

  - You are about to drop the column `managerId` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_managerId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "managerId";

-- CreateTable
CREATE TABLE "team_hierarchy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "supervisorId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT NOT NULL DEFAULT '/',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_hierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "team_hierarchy_userId_key" ON "team_hierarchy"("userId");

-- CreateIndex
CREATE INDEX "team_hierarchy_supervisorId_idx" ON "team_hierarchy"("supervisorId");

-- CreateIndex
CREATE INDEX "team_hierarchy_level_idx" ON "team_hierarchy"("level");

-- CreateIndex
CREATE INDEX "team_hierarchy_path_idx" ON "team_hierarchy"("path");

-- CreateIndex
CREATE INDEX "team_hierarchy_isActive_idx" ON "team_hierarchy"("isActive");

-- AddForeignKey
ALTER TABLE "team_hierarchy" ADD CONSTRAINT "team_hierarchy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_hierarchy" ADD CONSTRAINT "team_hierarchy_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
