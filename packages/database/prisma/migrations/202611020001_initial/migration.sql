CREATE TABLE "ContentRevision" (
  "id" TEXT NOT NULL, "kind" TEXT NOT NULL, "key" TEXT NOT NULL, "version" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft', "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "publishedAt" TIMESTAMP(3),
  CONSTRAINT "ContentRevision_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ContentRevision_kind_key_version_key" ON "ContentRevision"("kind", "key", "version");
CREATE INDEX "ContentRevision_kind_status_idx" ON "ContentRevision"("kind", "status");
CREATE TABLE "Admin" (
  "id" TEXT NOT NULL, "username" TEXT NOT NULL, "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");
CREATE TABLE "Session" (
  "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "csrfHash" TEXT NOT NULL, "kind" TEXT NOT NULL DEFAULT 'guest',
  "adminId" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
CREATE TABLE "AttemptTicket" (
  "id" TEXT NOT NULL, "tokenHash" TEXT NOT NULL, "taskId" TEXT, "taskVersion" INTEGER,
  "mode" TEXT NOT NULL, "level" TEXT NOT NULL DEFAULT 'beginner', "questionRefs" JSONB, "result" JSONB,
  "hintCount" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deadlineAt" TIMESTAMP(3), "submittedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AttemptTicket_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AttemptTicket_expiresAt_idx" ON "AttemptTicket"("expiresAt");
CREATE TABLE "CheckJob" (
  "id" TEXT NOT NULL, "secretHash" TEXT NOT NULL, "attemptId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL, "taskVersion" INTEGER NOT NULL, "status" TEXT NOT NULL DEFAULT 'queued',
  "inputPath" TEXT NOT NULL, "report" JSONB, "error" TEXT, "leaseUntil" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "startedAt" TIMESTAMP(3), "finishedAt" TIMESTAMP(3), "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CheckJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CheckJob_attemptId_key" ON "CheckJob"("attemptId");
CREATE INDEX "CheckJob_status_createdAt_idx" ON "CheckJob"("status", "createdAt");
CREATE INDEX "CheckJob_expiresAt_idx" ON "CheckJob"("expiresAt");
CREATE TABLE "Setting" (
  "id" TEXT NOT NULL, "value" JSONB NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AiBudget" (
  "id" TEXT NOT NULL, "limitMicroUsd" INTEGER NOT NULL DEFAULT 2000000,
  "spentMicroUsd" INTEGER NOT NULL DEFAULT 0, "reservedMicroUsd" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AiBudget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiBudget_nonnegative" CHECK ("limitMicroUsd" >= 0 AND "spentMicroUsd" >= 0 AND "reservedMicroUsd" >= 0)
);
CREATE TABLE "AiUsage" (
  "id" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'reserved', "reservedMicroUsd" INTEGER NOT NULL,
  "chargedMicroUsd" INTEGER, "promptTokens" INTEGER, "completionTokens" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "completedAt" TIMESTAMP(3),
  CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AiUsage_status_idx" ON "AiUsage"("status");
CREATE TABLE "RateLimit" (
  "key" TEXT NOT NULL, "count" INTEGER NOT NULL DEFAULT 1, "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");
CREATE TABLE "Metric" (
  "key" TEXT NOT NULL, "day" DATE NOT NULL, "value" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Metric_pkey" PRIMARY KEY ("key", "day")
);
CREATE TABLE "Event" (
  "id" TEXT NOT NULL, "type" TEXT NOT NULL, "detail" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Event_createdAt_idx" ON "Event"("createdAt");
