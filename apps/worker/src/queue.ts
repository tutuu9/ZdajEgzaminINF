import type { PrismaClient } from '@prisma/client';
import { DEFAULT_SETTINGS, type SiteSettings } from '@zdaj/shared';

export async function claimJob(database: PrismaClient, profile = 'local-development') {
  return database.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(847392)::text`;
    const setting = await transaction.setting.findUnique({ where: { id: 'site' } });
    const settings = { ...DEFAULT_SETTINGS, ...(setting?.value as Partial<SiteSettings>) };
    if (!settings.checkingEnabled) return null;
    const running = { status: 'running', leaseUntil: { gt: new Date() } };
    if (
      (await transaction.checkJob.count({ where: running })) +
      (await transaction.studyCheckJob.count({ where: running })) +
      (await transaction.sandboxRunJob.count({ where: running }))
    )
      return null;
    const jobs = await transaction.$queryRaw<
      { id: string; kind: 'final' | 'study' | 'run' }[]
    >`SELECT "id", "kind" FROM (
      SELECT "id", "createdAt", 'final' AS "kind" FROM "CheckJob"
        WHERE "status" = 'queued' AND "executionProfile" = ${profile} AND "expiresAt" > NOW()
      UNION ALL
      SELECT "id", "createdAt", 'study' AS "kind" FROM "StudyCheckJob"
        WHERE "status" = 'queued' AND "executionProfile" = ${profile} AND "expiresAt" > NOW()
      UNION ALL
      SELECT "id", "createdAt", 'run' AS "kind" FROM "SandboxRunJob"
        WHERE "status" = 'queued' AND "executionProfile" = ${profile} AND "expiresAt" > NOW()
    ) AS "pending" ORDER BY "createdAt", "id" LIMIT 1`;
    if (!jobs[0]) return null;
    const update = {
      where: { id: jobs[0].id },
      // Two trusted preflight probes (30 s each), execution (120 s), cleanup
      // and reporting must all remain inside the global single-worker lease.
      data: { status: 'running', startedAt: new Date(), leaseUntil: new Date(Date.now() + 240000) },
    };
    if (jobs[0].kind === 'run')
      return { ...(await transaction.sandboxRunJob.update(update)), kind: 'run' as const };
    return jobs[0].kind === 'study'
      ? { ...(await transaction.studyCheckJob.update(update)), kind: 'study' as const }
      : { ...(await transaction.checkJob.update(update)), kind: 'final' as const };
  });
}
