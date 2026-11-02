CREATE TABLE "StudyCheckJob" (
  "id" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "taskVersion" INTEGER NOT NULL,
  "guideId" TEXT NOT NULL,
  "guideVersion" INTEGER NOT NULL,
  "activityId" TEXT NOT NULL,
  "projectRevision" INTEGER NOT NULL,
  "inputHash" TEXT NOT NULL,
  "adapterId" TEXT NOT NULL,
  "executionProfile" TEXT NOT NULL DEFAULT 'local-development',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "inputPath" TEXT NOT NULL,
  "report" JSONB,
  "error" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyCheckJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StudyCheckJob_request_key" ON "StudyCheckJob"("attemptId", "guideVersion", "activityId", "projectRevision", "inputHash");
CREATE INDEX "StudyCheckJob_executionProfile_status_createdAt_idx" ON "StudyCheckJob"("executionProfile", "status", "createdAt");
CREATE INDEX "StudyCheckJob_attemptId_status_idx" ON "StudyCheckJob"("attemptId", "status");
CREATE INDEX "StudyCheckJob_expiresAt_idx" ON "StudyCheckJob"("expiresAt");
