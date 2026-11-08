-- CreateTable
CREATE TABLE "MissionMedicalDirector" (
    "missionId" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionMedicalDirector_pkey" PRIMARY KEY ("missionId","personnelId")
);

-- AddForeignKey
ALTER TABLE "MissionMedicalDirector" ADD CONSTRAINT "MissionMedicalDirector_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionMedicalDirector" ADD CONSTRAINT "MissionMedicalDirector_personnelId_fkey" FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
