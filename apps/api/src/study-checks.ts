import { createHmac, randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { db } from '@zdaj/database';
import { allExamStudyGuides } from '@zdaj/content';
import { studyInputHash, studyRuntimeAdapter, validateProjectFiles } from '@zdaj/checker';
import type { ProjectFile, StudyCheckReport, StudyCheckResponse } from '@zdaj/shared';
import { getAttempt, metric } from './attempts.js';
import { config, DAY_MS } from './config.js';
import { settings, workerAvailable } from './content.js';
import { hash, rateLimit, requestIpKey, safeEqual } from './security.js';
import { parse } from './validation.js';

const requestSchema = z
  .object({
    token: z.string().min(16).max(100),
    guideVersion: z.number().int().positive(),
    activityId: z
      .string()
      .regex(/^[a-z0-9-]+\/[a-z0-9-]+$/)
      .max(200),
    projectRevision: z.number().int().min(0).max(2_147_483_647),
    files: z.unknown(),
  })
  .strict();

function resultToken(attemptToken: string, id: string) {
  return createHmac('sha256', attemptToken).update(`study-check:${id}`).digest('base64url');
}

async function discard(id: string) {
  if (!/^[a-f\d-]{36}$/i.test(id)) throw new Error('Invalid study job directory.');
  const base = resolve(config.dataDir, 'jobs');
  const directory = resolve(base, id);
  if (!directory.startsWith(base + sep)) throw new Error('Invalid study job path.');
  await rm(directory, { recursive: true, force: true });
}

export async function submitStudyCheck(attemptId: string, body: unknown, req: Request) {
  const value = parse(requestSchema, body);
  const attempt = await getAttempt(attemptId, value.token);
  if (attempt.mode === 'egzamin' && !attempt.submittedAt)
    throw new ForbiddenException(
      'Sprawdzanie edukacyjne jest dostępne dopiero po oddaniu egzaminu.',
    );
  if (!attempt.taskId || !attempt.taskVersion)
    throw new BadRequestException('To nie jest próba praktyczna.');
  const guide = allExamStudyGuides.find(
    (item) =>
      item.taskId === attempt.taskId &&
      item.taskVersion === attempt.taskVersion &&
      item.version === value.guideVersion,
  );
  if (!guide) throw new NotFoundException('Nie znaleziono tej wersji przewodnika.');
  const [stepId, activityId] = value.activityId.split('/');
  const activity = guide.steps
    .find((step) => step.id === stepId)
    ?.activities?.find((item) => item.id === activityId);
  if (!activity) throw new NotFoundException('Nie znaleziono tego kroku nauki.');
  const adapter = studyRuntimeAdapter(attempt.taskId, guide.version, value.activityId);
  const check = activity.checks?.find((item) => item.kind === 'runtime');
  if (
    !adapter ||
    !check ||
    check.kind !== 'runtime' ||
    check.adapter !== adapter.id ||
    check.entry !== adapter.entry
  )
    throw new ServiceUnavailableException(
      'Ten krok wymaga sprawdzenia w przeglądarce lub samodzielnej kontroli. Nie ma serwerowego adaptera wykonania.',
    );
  await rateLimit(`study-check:${requestIpKey(req)}`, 60, 3_600_000);
  let files: ProjectFile[];
  try {
    files = validateProjectFiles(value.files as ProjectFile[]);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Niepoprawne pliki projektu.',
    );
  }
  const inputHash = studyInputHash(files);
  const identity = {
    attemptId,
    guideVersion: guide.version,
    activityId: value.activityId,
    projectRevision: value.projectRevision,
    inputHash,
  };
  const existing = await db.studyCheckJob.findFirst({ where: identity });
  if (existing && existing.expiresAt > new Date())
    return {
      id: existing.id,
      token: resultToken(value.token, existing.id),
      status: existing.status,
    };
  const options = await settings();
  if (!options.checkingEnabled || !(await workerAvailable()))
    throw new ServiceUnavailableException(
      'Środowisko JavaScript jest teraz niedostępne. Kod pozostaje lokalnie; skorzystaj z opisanej kontroli ręcznej.',
    );
  const id = randomUUID();
  const token = resultToken(value.token, id);
  const inputPath = join(config.dataDir, 'jobs', id, 'project.json');
  let queued: { id: string; status: string } | null = null;
  try {
    await mkdir(dirname(inputPath), { recursive: true });
    await writeFile(inputPath, JSON.stringify(files), { encoding: 'utf8', mode: 0o600 });
    queued = await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(74620401)::text`;
      const duplicate = await tx.studyCheckJob.findFirst({
        where: { ...identity, expiresAt: { gt: new Date() } },
      });
      if (duplicate) return duplicate;
      const waiting =
        (await tx.checkJob.count({ where: { status: 'queued' } })) +
        (await tx.studyCheckJob.count({ where: { status: 'queued' } }));
      if (waiting >= options.queueLimit)
        throw new HttpException(
          'Kolejka jest pełna. Kod pozostał zapisany lokalnie; spróbuj ponownie później.',
          429,
        );
      if (
        await tx.studyCheckJob.count({
          where: {
            attemptId,
            status: { in: ['queued', 'running'] },
            expiresAt: { gt: new Date() },
          },
        })
      )
        throw new ConflictException('Poprzednie sprawdzenie tego projektu jeszcze trwa.');
      return tx.studyCheckJob.create({
        data: {
          ...identity,
          id,
          secretHash: hash(token),
          taskId: attempt.taskId!,
          taskVersion: attempt.taskVersion!,
          guideId: guide.id,
          adapterId: adapter.id,
          executionProfile: config.runnerProfile,
          inputPath,
          expiresAt: new Date(Date.now() + DAY_MS),
        },
      });
    });
  } catch (error) {
    await discard(id);
    throw error;
  }
  if (queued.id !== id) await discard(id);
  else await metric('study.checks.submitted');
  return { id: queued.id, token: resultToken(value.token, queued.id), status: queued.status };
}

async function owner(id: string, token: string) {
  const job = await db.studyCheckJob.findUnique({ where: { id } });
  if (!job || !token || !safeEqual(hash(token), job.secretHash))
    throw new NotFoundException('Nie znaleziono wyniku nauki.');
  if (job.expiresAt < new Date())
    throw new GoneException('Tymczasowy wynik został usunięty. Sprawdź lokalny zapis kroku.');
  return job;
}
export async function getStudyCheck(id: string, token: string): Promise<StudyCheckResponse> {
  const job = await owner(id, token);
  return {
    id: job.id,
    status: job.status as StudyCheckResponse['status'],
    ...(job.report ? { report: job.report as unknown as StudyCheckReport } : {}),
    ...(job.error ? { error: job.error } : {}),
  };
}
export async function acknowledgeStudyCheck(id: string, token: string) {
  const job = await owner(id, token);
  if (!['completed', 'failed'].includes(job.status))
    throw new ConflictException('Sprawdzanie jeszcze trwa.');
  await db.studyCheckJob.delete({ where: { id } });
  await discard(id);
  return { ok: true };
}

/** API cleanup also runs while execution is disabled or the worker is offline. */
export async function cleanupExpiredStudyChecks(now = new Date()) {
  const expired = await db.studyCheckJob.findMany({
    where: { expiresAt: { lt: now }, status: { not: 'running' } },
    select: { id: true },
  });
  for (const job of expired) {
    await discard(job.id);
    await db.studyCheckJob.deleteMany({ where: { id: job.id, status: { not: 'running' } } });
  }
}
