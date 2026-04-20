-- CreateEnum
CREATE TYPE "AICallStatus" AS ENUM ('PENDING', 'QUEUED', 'CALLING', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'WRONG_NUMBER');

-- CreateEnum
CREATE TYPE "AICallDisposition" AS ENUM ('INTERESTED', 'NOT_INTERESTED', 'CALLBACK', 'WRONG_NUMBER', 'NO_ANSWER', 'VOICEMAIL', 'DO_NOT_CALL');

-- CreateTable
CREATE TABLE "AIVoiceCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scriptTemplate" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "dealerId" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "completedCalls" INTEGER NOT NULL DEFAULT 0,
    "successfulCalls" INTEGER NOT NULL DEFAULT 0,
    "failedCalls" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIVoiceCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIVoiceCall" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "city" TEXT,
    "address" TEXT,
    "status" "AICallStatus" NOT NULL DEFAULT 'PENDING',
    "disposition" "AICallDisposition",
    "callDuration" INTEGER,
    "transcript" TEXT,
    "recordingUrl" TEXT,
    "qualificationScore" INTEGER,
    "propertyOwnership" BOOLEAN,
    "monthlyBill" DOUBLE PRECISION,
    "interestLevel" TEXT,
    "timeline" TEXT,
    "notes" TEXT,
    "convertedToRawLead" BOOLEAN NOT NULL DEFAULT false,
    "rawLeadId" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "calledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIVoiceCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIVoiceCampaign_createdBy_idx" ON "AIVoiceCampaign"("createdBy");

-- CreateIndex
CREATE INDEX "AIVoiceCampaign_dealerId_idx" ON "AIVoiceCampaign"("dealerId");

-- CreateIndex
CREATE INDEX "AIVoiceCampaign_status_idx" ON "AIVoiceCampaign"("status");

-- CreateIndex
CREATE INDEX "AIVoiceCall_campaignId_idx" ON "AIVoiceCall"("campaignId");

-- CreateIndex
CREATE INDEX "AIVoiceCall_status_idx" ON "AIVoiceCall"("status");

-- CreateIndex
CREATE INDEX "AIVoiceCall_phone_idx" ON "AIVoiceCall"("phone");

-- CreateIndex
CREATE INDEX "AIVoiceCall_rawLeadId_idx" ON "AIVoiceCall"("rawLeadId");

-- AddForeignKey
ALTER TABLE "AIVoiceCampaign" ADD CONSTRAINT "AIVoiceCampaign_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIVoiceCampaign" ADD CONSTRAINT "AIVoiceCampaign_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "Dealer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIVoiceCall" ADD CONSTRAINT "AIVoiceCall_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "AIVoiceCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIVoiceCall" ADD CONSTRAINT "AIVoiceCall_rawLeadId_fkey" FOREIGN KEY ("rawLeadId") REFERENCES "RawLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
