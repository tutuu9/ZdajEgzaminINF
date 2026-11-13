CREATE TABLE "SandboxRunJob" (
  "id" TEXT NOT NULL,
  "secretHash" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "taskVersion" INTEGER NOT NULL,
  "projectRevision" INTEGER NOT NULL,
  "inputHash" TEXT NOT NULL,
  "executionProfile" TEXT NOT NULL DEFAULT 'local-development',
  "status" TEXT NOT NULL DEFAULT 'queued',
  "input" JSONB,
  "result" JSONB,
  "error" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SandboxRunJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SandboxRunJob_request_key" ON "SandboxRunJob"("attemptId", "inputHash");
CREATE INDEX "SandboxRunJob_executionProfile_status_createdAt_idx" ON "SandboxRunJob"("executionProfile", "status", "createdAt");
CREATE INDEX "SandboxRunJob_attemptId_status_idx" ON "SandboxRunJob"("attemptId", "status");
CREATE INDEX "SandboxRunJob_expiresAt_idx" ON "SandboxRunJob"("expiresAt");
