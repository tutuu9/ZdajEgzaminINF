import type { PrismaClient } from '@prisma/client';
import { DEFAULT_SETTINGS, type SiteSettings } from '@zdaj/shared';

export async function claimJob(database: PrismaClient, profile = 'local-development') {
  return database.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(847392)::text`;
    const setting = await transaction.setting.findUnique({ where: { id: 'site' } });
    const settings = { ...DEFAULT_SETTINGS, ...(setting?.value as Partial<SiteSettings>) };
    if (!settings.checkingEnabled) return null;
    if (
      await transaction.checkJob.count({
        where: { status: 'running', leaseUntil: { gt: new Date() } },
      })
    )
      return null;
    const jobs = await transaction.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "CheckJob" WHERE "status" = 'queued' AND "executionProfile" = ${profile} AND "expiresAt" > NOW() ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
    if (!jobs[0]) return null;
    return transaction.checkJob.update({
      where: { id: jobs[0].id },
      data: { status: 'running', startedAt: new Date(), leaseUntil: new Date(Date.now() + 180000) },
    });
  });
}
