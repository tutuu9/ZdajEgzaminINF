import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { db, Prisma } from '@zdaj/database';
import type { AdminDashboard, CatalogEntry, SiteSettings } from '@zdaj/shared';
import { admin, rateLimit, requestIpKey, setAdminSession } from './security.js';
import { parse, validateContent, catalogSchema } from './validation.js';
import { published, settings } from './content.js';

export async function login(body: unknown, req: Request, res: Response) {
  const value = parse(
    z
      .object({
        username: z.string().min(1).max(100),
        password: z
          .string()
          .min(1)
          .max(200)
          .refine(
            (password) => Buffer.byteLength(password, 'utf8') <= 72,
            'Hasło może mieć maksymalnie 72 bajty UTF-8.',
          ),
      })
      .strict(),
    body,
  );
  await rateLimit(`login:${requestIpKey(req)}`, 8, 15 * 60_000);
  await rateLimit('login:global', 30, 60_000);
  const account = await db.admin.findUnique({ where: { username: value.username } });
  // Fixed dummy hash keeps an unknown username on the same slow password path.
  const valid = await compare(
    value.password,
    account?.passwordHash ?? '$2b$12$1DFJbI8deGj4jp75w5GdnOwmo5LVAFS/1cfjlfFzYB8VhW0Dqn1Cu',
  );
  if (!account || !valid) throw new UnauthorizedException('Nieprawidłowy login lub hasło.');
  await setAdminSession(account.id, res);
  return { authenticated: true, username: account.username };
}
export async function dashboard(): Promise<AdminDashboard> {
  const [options, budget, stats, events, jobs, studyJobs] = await Promise.all([
    settings(),
    db.aiBudget.findUnique({ where: { id: 'site' } }),
    db.metric.groupBy({
      by: ['key'],
      where: { NOT: { key: { startsWith: 'worker.' } } },
      _sum: { value: true },
    }),
    db.event.findMany({ orderBy: { createdAt: 'desc' }, take: 40 }),
    db.checkJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: { id: true, status: true, taskId: true, createdAt: true },
    }),
    db.studyCheckJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      select: { id: true, status: true, taskId: true, createdAt: true },
    }),
  ]);
  return {
    settings: options,
    budget: {
      spentUsd: (budget?.spentMicroUsd ?? 0) / 1_000_000,
      reservedUsd: (budget?.reservedMicroUsd ?? 0) / 1_000_000,
      limitUsd: (budget?.limitMicroUsd ?? 2_000_000) / 1_000_000,
    },
    stats: Object.fromEntries(stats.map((row) => [row.key, row._sum.value ?? 0])),
    events: events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
    jobs: [...jobs, ...studyJobs]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 40)
      .map((job) => ({ ...job, createdAt: job.createdAt.toISOString() })),
  };
}
const settingsSchema = z
  .object({
    aiEnabled: z.boolean(),
    checkingEnabled: z.boolean(),
    aiBudgetUsd: z.number().finite().min(0).max(1000),
    aiDailyLimit: z.number().int().min(1).max(100),
    aiInputTokenLimit: z.number().int().min(1000).max(12000),
    aiOutputTokenLimit: z.number().int().min(100).max(1500),
    aiInputPricePerMillion: z.number().finite().positive().max(100),
    aiOutputPricePerMillion: z.number().finite().positive().max(100),
    queueLimit: z.number().int().min(1).max(20),
  })
  .partial()
  .strict();
export async function updateSettings(body: unknown) {
  const updates = parse(settingsSchema, body);
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(74620402)::text`;
    const row = await tx.setting.findUniqueOrThrow({ where: { id: 'site' } });
    const next = { ...(row.value as unknown as SiteSettings), ...updates };
    const budget = await tx.aiBudget.findUniqueOrThrow({ where: { id: 'site' } });
    const limit = Math.round(next.aiBudgetUsd * 1_000_000);
    if (limit < budget.spentMicroUsd + budget.reservedMicroUsd)
      throw new BadRequestException(
        'Limit nie może być niższy od już rozliczonych kosztów i rezerwacji.',
      );
    await tx.aiBudget.update({ where: { id: 'site' }, data: { limitMicroUsd: limit } });
    await tx.setting.update({
      where: { id: 'site' },
      data: { value: next as unknown as Prisma.InputJsonValue },
    });
    await tx.event.create({
      data: { type: 'settings.updated', detail: { fields: Object.keys(updates) } },
    });
    return next;
  });
}
export async function contentRows() {
  const rows = await db.contentRevision.findMany({
    orderBy: [{ kind: 'asc' }, { key: 'asc' }, { version: 'desc' }],
  });
  return rows.map((row) => ({
    ...row,
    createdAt: row.createdAt.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
  }));
}
export async function createDraft(body: unknown) {
  const value = parse(
    z
      .object({
        kind: z.enum(['task', 'lesson', 'question', 'catalog']),
        key: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,100}$/i),
        payload: z.unknown(),
      })
      .strict(),
    body,
  );
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(74620403)::text`;
    const previous = await tx.contentRevision.findFirst({
      where: { kind: value.kind, key: value.key },
      orderBy: { version: 'desc' },
    });
    const version = (previous?.version ?? 0) + 1;
    if (!value.payload || typeof value.payload !== 'object' || Array.isArray(value.payload))
      throw new BadRequestException('Materiał musi być obiektem JSON.');
    const candidate = {
      ...value.payload,
      id: value.key,
      ...(value.kind === 'catalog' ? {} : { version }),
    };
    const payload = validateContent(value.kind, candidate);
    return tx.contentRevision.create({
      data: {
        kind: value.kind,
        key: value.key,
        version,
        payload: payload as Prisma.InputJsonValue,
      },
    });
  });
}
export async function publishDraft(id: string) {
  const row = await db.contentRevision.findUnique({ where: { id } });
  if (!row || row.status !== 'draft')
    throw new ConflictException('Można opublikować tylko istniejący szkic.');
  validateContent(row.kind, row.payload);
  const published = await db.contentRevision.updateMany({
    where: { id, status: 'draft' },
    data: { status: 'published', publishedAt: new Date() },
  });
  if (!published.count) throw new ConflictException('Ten szkic został już opublikowany.');
  await db.event.create({
    data: {
      type: 'content.published',
      detail: { kind: row.kind, key: row.key, version: row.version },
    },
  });
  return db.contentRevision.findUniqueOrThrow({ where: { id } });
}
export function duplicateSources(entries: CatalogEntry[], existing: CatalogEntry[]): string[] {
  const seen = [...existing];
  const duplicates: string[] = [];
  for (const entry of entries) {
    const same = seen.some(
      (other) =>
        other.id === entry.id ||
        other.sourceUrl === entry.sourceUrl ||
        (entry.identifier &&
          other.identifier === entry.identifier &&
          other.qualification === entry.qualification &&
          other.formula === entry.formula) ||
        entry.attachments.some(
          (a) => a.sha256 && other.attachments.some((b) => b.sha256 === a.sha256),
        ),
    );
    if (same) duplicates.push(entry.id);
    else seen.push(entry);
  }
  return duplicates;
}
export async function previewSources(body: unknown) {
  const value = parse(z.object({ entries: z.array(catalogSchema).min(1).max(100) }).strict(), body);
  const existing = await published<CatalogEntry>('catalog');
  return {
    entries: value.entries,
    duplicates: duplicateSources(value.entries, existing),
    issues: value.entries
      .filter((e) => e.rightsStatus === 'unknown')
      .map(
        (e) => `${e.id}: status praw nieustalony; import obejmie wyłącznie metadane i odnośniki.`,
      ),
  };
}
export async function importSources(body: unknown) {
  const preview = await previewSources(body);
  if (preview.duplicates.length)
    throw new ConflictException(`Usuń duplikaty przed importem: ${preview.duplicates.join(', ')}`);
  let imported = 0;
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(74620403)::text`;
    const rows = await tx.contentRevision.findMany({
      where: { kind: 'catalog', status: 'published' },
    });
    if (
      duplicateSources(
        preview.entries,
        rows.map((row) => row.payload as unknown as CatalogEntry),
      ).length
    )
      throw new ConflictException('Katalog zmienił się. Ponownie sprawdź podgląd importu.');
    for (const entry of preview.entries) {
      const previous = await tx.contentRevision.findFirst({
        where: { kind: 'catalog', key: entry.id },
        orderBy: { version: 'desc' },
      });
      await tx.contentRevision.create({
        data: {
          kind: 'catalog',
          key: entry.id,
          version: (previous?.version ?? 0) + 1,
          status: 'published',
          payload: { ...entry, importStatus: 'metadata-only' },
          publishedAt: new Date(),
        },
      });
      imported++;
    }
  });
  await db.event.create({ data: { type: 'sources.imported', detail: { count: imported } } });
  return { imported };
}
export async function whoAmI(req: Request) {
  try {
    const account = await admin(req);
    return { authenticated: true, username: account.username };
  } catch {
    return { authenticated: false };
  }
}
