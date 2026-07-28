-- AlterTable
ALTER TABLE "Personnel" ADD COLUMN     "userId" TEXT,
ALTER COLUMN "agency" SET DEFAULT '';

-- CreateTable
CREATE TABLE "CrewStatusType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortCode" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#8b9dc3',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CrewStatusType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrewStatusEvent" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "crewId" TEXT NOT NULL,
    "statusTypeId" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrewStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrewStatusType_name_key" ON "CrewStatusType"("name");

-- CreateIndex
CREATE INDEX "CrewStatusEvent_missionId_createdAt_idx" ON "CrewStatusEvent"("missionId", "createdAt");

-- CreateIndex
CREATE INDEX "CrewStatusEvent_crewId_createdAt_idx" ON "CrewStatusEvent"("crewId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Personnel_userId_key" ON "Personnel"("userId");

-- AddForeignKey
ALTER TABLE "Personnel" ADD CONSTRAINT "Personnel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewStatusEvent" ADD CONSTRAINT "CrewStatusEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewStatusEvent" ADD CONSTRAINT "CrewStatusEvent_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "MissionCrew"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewStatusEvent" ADD CONSTRAINT "CrewStatusEvent_statusTypeId_fkey" FOREIGN KEY ("statusTypeId") REFERENCES "CrewStatusType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrewStatusEvent" ADD CONSTRAINT "CrewStatusEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

