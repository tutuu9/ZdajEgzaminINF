ALTER TABLE "CheckJob" ADD COLUMN "executionProfile" TEXT NOT NULL DEFAULT 'local-development';
ALTER TABLE "CheckJob" ADD CONSTRAINT "CheckJob_executionProfile_check"
  CHECK ("executionProfile" IN ('local-development', 'public-sandbox'));
CREATE INDEX "CheckJob_executionProfile_status_createdAt_idx" ON "CheckJob"("executionProfile", "status", "createdAt");
