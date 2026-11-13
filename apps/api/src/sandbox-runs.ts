import { createHash, createHmac, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  GoneException,
  HttpException,
  NotFoundException,
  PayloadTooLargeException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@zdaj/database';
import {
  fileBuffer,
  studyInputHash,
  validateProjectFiles,
  validateRunRequest,
} from '@zdaj/checker';
import {
  MAX_RUN_INPUT_BYTES,
  type ProjectFile,
  type SandboxRunRequest,
  type SandboxRunResponse,
  type SandboxRunResult,
} from '@zdaj/shared';
import { getAttempt, metric } from './attempts.js';
import { config } from './config.js';
import { settings, taskVersion, workerAvailable } from './content.js';
import { hash, rateLimit, requestIpKey, safeEqual } from './security.js';
import { parse } from './validation.js';

/** A run result is a transient view of the learner's own data, not a stored report. */
const RESULT_LIFETIME_MS = 15 * 60_000;

const requestSchema = z
  .object({
    token: z.string().min(16).max(100),
    projectRevision: z.number().int().min(0).max(2_147_483_647),
    run: z.unknown(),
    files: z.unknown(),
  })
  .strict();

function resultToken(attemptToken: string, id: string) {
  return createHmac('sha256', attemptToken).update(`sandbox-run:${id}`).digest('base64url');
}

export async function submitSandboxRun(attemptId: string, body: unknown, req: Request) {
  const value = parse(requestSchema, body);
  // A run replaces the examination station's local server. It reveals no teaching
  // material and no assessment, so it is available in every mode, including Egzamin.
  const attempt = await getAttempt(attemptId, value.token);
  if (!attempt.taskId || !attempt.taskVersion)
    throw new BadRequestException('To nie jest próba praktyczna.');
  const task = await taskVersion(attempt.taskId, attempt.taskVersion);
  if (!task.technologies.some((technology) => technology === 'SQL' || technology === 'PHP'))
    throw new BadRequestException('Ten arkusz nie zawiera części SQL ani PHP.');
  let files: ProjectFile[];
  let run: SandboxRunRequest;
  try {
    // Images are not needed to execute SQL or PHP and would not fit the job row.
    files = validateProjectFiles(value.files as ProjectFile[]).filter(
      (file) => file.encoding !== 'base64',
    );
    if (files.reduce((total, file) => total + fileBuffer(file).length, 0) > MAX_RUN_INPUT_BYTES)
      throw new PayloadTooLargeException(
        'Pliki tekstowe projektu przekraczają limit 4 MiB dla jednego uruchomienia.',
      );
    run = validateRunRequest(value.run, files);
  } catch (error) {
    if (error instanceof HttpException) throw error;
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Niepoprawne żądanie uruchomienia.',
    );
  }
  const inputHash = createHash('sha256')
    .update(studyInputHash(files))
    .update(JSON.stringify(run))
    .digest('hex');
  const identity = { attemptId, inputHash };
  const existing = await db.sandboxRunJob.findFirst({ where: identity });
  if (existing && existing.expiresAt > new Date())
    return {
      id: existing.id,
      token: resultToken(value.token, existing.id),
      status: existing.status,
    };
  const options = await settings();
  if (!options.checkingEnabled || !options.runtimeRunsEnabled || !(await workerAvailable()))
    throw new ServiceUnavailableException(
      'Uruchamianie SQL i PHP jest teraz niedostępne. Pliki pozostają lokalnie; uruchom je we własnym środowisku.',
    );
  await rateLimit(`sandbox-run:${requestIpKey(req)}`, 30, 3_600_000);
  const id = randomUUID();
  const token = resultToken(value.token, id);
  const queued = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(74620401)::text`;
    if (existing) await tx.sandboxRunJob.deleteMany({ where: { id: existing.id } });
    const duplicate = await tx.sandboxRunJob.findFirst({
      where: { ...identity, expiresAt: { gt: new Date() } },
    });
    if (duplicate) return duplicate;
    const waiting =
      (await tx.checkJob.count({ where: { status: 'queued' } })) +
      (await tx.studyCheckJob.count({ where: { status: 'queued' } })) +
      (await tx.sandboxRunJob.count({ where: { status: 'queued' } }));
    if (waiting >= options.queueLimit)
      throw new HttpException(
        'Kolejka jest pełna. Pliki pozostały zapisane lokalnie; spróbuj ponownie później.',
        429,
      );
    if (
      await tx.sandboxRunJob.count({
        where: {
          attemptId,
          status: { in: ['queued', 'running'] },
          expiresAt: { gt: new Date() },
        },
      })
    )
      throw new ConflictException('Poprzednie uruchomienie tego projektu jeszcze trwa.');
    return tx.sandboxRunJob.create({
      data: {
        ...identity,
        id,
        secretHash: hash(token),
        taskId: attempt.taskId!,
        taskVersion: attempt.taskVersion!,
        projectRevision: value.projectRevision,
        executionProfile: config.runnerProfile,
        input: { run, files } as unknown as Prisma.InputJsonValue,
        expiresAt: new Date(Date.now() + RESULT_LIFETIME_MS),
      },
    });
  });
  if (queued.id === id) await metric('runs.submitted');
  return { id: queued.id, token: resultToken(value.token, queued.id), status: queued.status };
}

async function owner(id: string, token: string) {
  const job = await db.sandboxRunJob.findUnique({ where: { id } });
  if (!job || !token || !safeEqual(hash(token), job.secretHash))
    throw new NotFoundException('Nie znaleziono wyniku uruchomienia.');
  if (job.expiresAt < new Date())
    throw new GoneException('Tymczasowy wynik został usunięty. Uruchom projekt ponownie.');
  return job;
}
export async function getSandboxRun(id: string, token: string): Promise<SandboxRunResponse> {
  const job = await owner(id, token);
  return {
    id: job.id,
    status: job.status as SandboxRunResponse['status'],
    ...(job.result ? { result: job.result as unknown as SandboxRunResult } : {}),
    ...(job.error ? { error: job.error } : {}),
  };
}
export async function acknowledgeSandboxRun(id: string, token: string) {
  const job = await owner(id, token);
  if (!['completed', 'failed'].includes(job.status))
    throw new ConflictException('Uruchomienie jeszcze trwa.');
  await db.sandboxRunJob.delete({ where: { id } });
  return { ok: true };
}

/** API cleanup also runs while execution is disabled or the worker is offline. */
export async function cleanupExpiredSandboxRuns(now = new Date()) {
  await db.sandboxRunJob.deleteMany({
    where: { expiresAt: { lt: now }, status: { not: 'running' } },
  });
}
