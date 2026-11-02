import { createHmac, randomInt, randomUUID } from 'node:crypto';
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
import { db, Prisma } from '@zdaj/database';
import { validateProjectFiles } from '@zdaj/checker';
import {
  toPublicQuestion,
  type AttemptTicket,
  type ProjectFile,
  type QuestionRevision,
  type TheoryTicket,
  type TheoryResult,
  type CheckResponse,
  type CheckReport,
} from '@zdaj/shared';
import { config, DAY_MS } from './config.js';
import { hash, rateLimit, requestIpKey, safeEqual, secretToken } from './security.js';
import { modeSchema, levelSchema, parse } from './validation.js';
import {
  isCkeQuestion,
  isCkeTask,
  published,
  settings,
  taskVersion,
  workerAvailable,
} from './content.js';

export async function getAttempt(id: string, token: string) {
  if (!id || !token) throw new ForbiddenException('Brakuje klucza próby.');
  const row = await db.attemptTicket.findUnique({ where: { id } });
  if (!row || !safeEqual(hash(token), row.tokenHash))
    throw new NotFoundException('Nie znaleziono próby.');
  if (row.expiresAt < new Date())
    throw new GoneException(
      'Dane serwerowe tej próby wygasły. Utwórz nową próbę; lokalne pliki pozostały na urządzeniu.',
    );
  return row;
}
export async function createAttempt(body: unknown, req: Request): Promise<AttemptTicket> {
  const value = parse(
    z
      .object({
        taskId: z.string(),
        taskVersion: z.number().int().positive(),
        mode: modeSchema,
        level: levelSchema,
      })
      .strict(),
    body,
  );
  await rateLimit(`attempt:${requestIpKey(req)}`, 60, 3_600_000);
  const task = await taskVersion(value.taskId, value.taskVersion);
  if (!isCkeTask(task))
    throw new ForbiddenException(
      'Nowe próby są dostępne wyłącznie dla zadań CKE INF.03. Zachowano wcześniejsze lokalne pliki.',
    );
  const token = secretToken();
  const deadlineAt =
    value.mode === 'egzamin' ? new Date(Date.now() + task.durationMinutes * 60_000) : null;
  const row = await db.attemptTicket.create({
    data: {
      ...value,
      tokenHash: hash(token),
      deadlineAt,
      expiresAt: new Date(Date.now() + DAY_MS),
    },
  });
  return { id: row.id, token, deadlineAt: deadlineAt?.toISOString() ?? null };
}
export async function completePractice(
  id: string,
  body: unknown,
): Promise<{ submittedAt: string }> {
  const value = parse(z.object({ token: z.string().max(100) }).strict(), body);
  const attempt = await getAttempt(id, value.token);
  if (!attempt.taskId || !attempt.taskVersion)
    throw new BadRequestException('To nie jest próba praktyczna.');
  const task = await taskVersion(attempt.taskId, attempt.taskVersion);
  if (task.supportStatus !== 'catalog-only')
    throw new BadRequestException('To zadanie wymaga oddania przez właściwą ścieżkę sprawdzania.');
  if (!attempt.submittedAt)
    await db.attemptTicket.updateMany({
      where: { id, submittedAt: null },
      data: { submittedAt: new Date() },
    });
  const closed = await db.attemptTicket.findUniqueOrThrow({ where: { id } });
  return { submittedAt: closed.submittedAt!.toISOString() };
}
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}
export async function startTheory(body: unknown, req: Request): Promise<TheoryTicket> {
  const value = parse(
    z
      .object({
        mode: modeSchema,
        topicId: z.string().optional(),
        count: z.number().int().min(1).max(40).optional(),
        level: levelSchema.optional(),
      })
      .strict(),
    body,
  );
  await rateLimit(`theory:${requestIpKey(req)}`, 60, 3_600_000);
  const pool = (await published<QuestionRevision>('question')).filter(
    (q) =>
      isCkeQuestion(q) &&
      (value.mode === 'egzamin' || !value.topicId || q.topicId === value.topicId),
  );
  if (value.mode === 'egzamin')
    throw new ServiceUnavailableException(
      'Opublikowane przykłady CKE zawierają odpowiedzi w dokumencie źródłowym. Są dostępne do nauki i treningu; pełny egzamin z ukrytym kluczem nie jest jeszcze dostępny.',
    );
  const count = Math.min(value.count ?? 10, pool.length);
  if (pool.length < count || count === 0)
    throw new ServiceUnavailableException('Brakuje opublikowanych pytań dla tego zestawu.');
  const selected = shuffle(pool)
    .slice(0, count)
    .map((q) => ({ ...q, options: q.source ? q.options : shuffle(q.options) }));
  const token = secretToken();
  const deadlineAt = null;
  const row = await db.attemptTicket.create({
    data: {
      tokenHash: hash(token),
      mode: value.mode,
      level: value.level ?? 'beginner',
      questionRefs: selected.map((q) => ({
        key: q.id,
        version: q.version,
        optionOrder: q.options.map((o) => o.id),
      })),
      deadlineAt,
      expiresAt: new Date(Date.now() + DAY_MS),
    },
  });
  return {
    id: row.id,
    token,
    deadlineAt: null,
    questions: selected.map(toPublicQuestion),
  };
}
type QuestionRef = { key: string; version: number; optionOrder: string[] };
export async function submitTheory(id: string, body: unknown): Promise<TheoryResult> {
  const value = parse(
    z
      .object({ token: z.string().max(100), answers: z.record(z.string(), z.string().max(100)) })
      .strict(),
    body,
  );
  const attempt = await getAttempt(id, value.token);
  if (!attempt.questionRefs) throw new BadRequestException('To nie jest próba teoretyczna.');
  if (attempt.submittedAt && attempt.result) return attempt.result as unknown as TheoryResult;
  const refs = attempt.questionRefs as unknown as QuestionRef[];
  const knownIds = new Set(refs.map((ref) => ref.key));
  if (Object.keys(value.answers).some((key) => !knownIds.has(key)))
    throw new BadRequestException('Odpowiedź nie należy do tej próby.');
  const records = await db.contentRevision.findMany({
    where: {
      kind: 'question',
      status: 'published',
      OR: refs.map((ref) => ({ key: ref.key, version: ref.version })),
    },
  });
  const results = refs.map((ref) => {
    const row = records.find((record) => record.key === ref.key && record.version === ref.version);
    if (!row) throw new ServiceUnavailableException('Brakuje wersji pytania użytej w tej próbie.');
    const q = row.payload as unknown as QuestionRevision;
    const ordered = {
      ...q,
      options: ref.optionOrder.map((optionId) => q.options.find((o) => o.id === optionId)!),
    };
    const selectedOptionId = value.answers[q.id] ?? null;
    if (selectedOptionId && !q.options.some((o) => o.id === selectedOptionId))
      throw new BadRequestException('Nieznany wariant odpowiedzi.');
    return {
      question: toPublicQuestion(ordered),
      selectedOptionId,
      correctOptionId: q.correctOptionId,
      correct: selectedOptionId === q.correctOptionId,
      explanation: q.explanation,
      optionExplanations: Object.fromEntries(q.options.map((o) => [o.id, o.explanation])),
    };
  });
  const correct = results.filter((r) => r.correct).length;
  const timedOut = Boolean(
    attempt.deadlineAt && Date.now() > attempt.deadlineAt.getTime() + 15_000,
  );
  const result: TheoryResult = {
    correct,
    total: results.length,
    percentage: Math.round((correct / results.length) * 100),
    passed: !timedOut && correct / results.length >= 0.5,
    results,
    submittedAt: new Date().toISOString(),
    timedOut,
  };
  const updated = await db.attemptTicket.updateMany({
    where: { id, submittedAt: null },
    data: {
      submittedAt: new Date(result.submittedAt),
      result: result as unknown as Prisma.InputJsonValue,
    },
  });
  if (updated.count === 0) {
    const existing = await db.attemptTicket.findUniqueOrThrow({ where: { id } });
    return existing.result as unknown as TheoryResult;
  }
  await metric('theory.submitted');
  return result;
}
export async function preparedHint(body: unknown) {
  const value = parse(
    z.object({ attemptId: z.string(), attemptToken: z.string().max(100) }).strict(),
    body,
  );
  const attempt = await getAttempt(value.attemptId, value.attemptToken);
  if (attempt.mode === 'egzamin' && !attempt.submittedAt)
    throw new ForbiddenException('Podpowiedzi są dostępne dopiero po oddaniu egzaminu.');
  if (!attempt.taskId || !attempt.taskVersion)
    throw new BadRequestException('Ta próba nie ma podpowiedzi praktycznych.');
  const task = await taskVersion(attempt.taskId, attempt.taskVersion);
  const current = await db.attemptTicket.update({
    where: { id: attempt.id },
    data: { hintCount: { increment: 1 } },
  });
  const index = Math.min(current.hintCount - 1, task.hints.length - 1);
  return {
    hint: task.hints[index] ?? 'Sprawdź wymagania zadania i wykonaj mały test każdego kroku.',
    index,
    remaining: Math.max(0, task.hints.length - current.hintCount),
  };
}
export async function submitCheck(
  attemptId: string,
  attemptToken: string,
  rawFiles: unknown,
  req: Request,
) {
  const attempt = await getAttempt(attemptId, attemptToken);
  if (!attempt.taskId || !attempt.taskVersion)
    throw new BadRequestException('To nie jest próba praktyczna.');
  if (attempt.submittedAt) return recoverCheck(attemptId, attemptToken);
  const task = await taskVersion(attempt.taskId, attempt.taskVersion);
  if (task.supportStatus === 'catalog-only')
    throw new ServiceUnavailableException(
      'Ten oryginalny arkusz nie ma jeszcze zweryfikowanego adaptera. Pliki pozostają lokalnie; zakończ próbę do samodzielnego przeglądu.',
    );
  const options = await settings();
  if (!options.checkingEnabled)
    throw new ServiceUnavailableException(
      'Sprawdzanie jest obecnie wyłączone. Twoje pliki pozostają zapisane lokalnie.',
    );
  if (!(await workerAvailable()))
    throw new ServiceUnavailableException(
      'Sprawdzanie jest chwilowo niedostępne. Pliki pozostają na urządzeniu.',
    );
  await rateLimit(`check:${requestIpKey(req)}`, 30, 3_600_000);
  let files: ProjectFile[];
  try {
    files = validateProjectFiles(rawFiles as ProjectFile[]);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Niepoprawne pliki projektu.',
    );
  }
  const id = randomUUID();
  const token = checkToken(attemptToken, id);
  const inputPath = join(config.dataDir, 'jobs', id, 'project.json');
  try {
    await mkdir(dirname(inputPath), { recursive: true });
    await writeFile(inputPath, JSON.stringify(files), { encoding: 'utf8', mode: 0o600 });
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(74620401)::text`;
      const count =
        (await tx.checkJob.count({ where: { status: 'queued' } })) +
        (await tx.studyCheckJob.count({ where: { status: 'queued' } }));
      if (count >= options.queueLimit)
        throw new HttpException(
          'Kolejka jest pełna. Spróbuj ponownie za chwilę; pliki pozostają na urządzeniu.',
          429,
        );
      const claimed = await tx.attemptTicket.updateMany({
        where: { id: attempt.id, submittedAt: null },
        data: { submittedAt: new Date() },
      });
      if (!claimed.count) throw new ConflictException('Ta próba została już oddana.');
      await tx.checkJob.create({
        data: {
          id,
          secretHash: hash(token),
          attemptId: attempt.id,
          taskId: attempt.taskId!,
          taskVersion: attempt.taskVersion!,
          executionProfile: config.runnerProfile,
          inputPath,
          expiresAt: new Date(Date.now() + DAY_MS),
        },
      });
    });
  } catch (error) {
    await cleanupJobFolder(id);
    if (error instanceof ConflictException) return recoverCheck(attemptId, attemptToken);
    throw error;
  }
  await metric('checks.submitted');
  return { id, token, status: 'queued' as const };
}
function checkToken(attemptToken: string, jobId: string): string {
  return createHmac('sha256', attemptToken).update(`check:${jobId}`).digest('base64url');
}
async function recoverCheck(attemptId: string, attemptToken: string) {
  const existing = await db.checkJob.findUnique({ where: { attemptId } });
  if (!existing || existing.expiresAt < new Date())
    throw new GoneException(
      'Wynik tej oddanej próby został już usunięty z serwera. Sprawdź lokalną historię lub utwórz nową próbę.',
    );
  return { id: existing.id, token: checkToken(attemptToken, existing.id), status: existing.status };
}
async function cleanupJobFolder(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid job directory.');
  const base = resolve(config.dataDir, 'jobs');
  const target = resolve(base, id);
  if (!target.startsWith(base + sep)) throw new Error('Invalid job directory.');
  await rm(target, { recursive: true, force: true });
}
export async function getCheck(id: string, token: string): Promise<CheckResponse> {
  const row = await checkOwner(id, token);
  return {
    id: row.id,
    status: row.status as CheckResponse['status'],
    ...(row.report ? { report: row.report as unknown as CheckReport } : {}),
    ...(row.error ? { error: row.error } : {}),
  };
}
async function checkOwner(id: string, token: string) {
  const row = await db.checkJob.findUnique({ where: { id } });
  if (!row || !token || !safeEqual(hash(token), row.secretHash))
    throw new NotFoundException('Nie znaleziono wyniku.');
  if (row.expiresAt < new Date())
    throw new GoneException('Wynik został usunięty z serwera. Sprawdź lokalną historię.');
  return row;
}
export async function acknowledgeCheck(id: string, token: string) {
  const row = await checkOwner(id, token);
  if (!['completed', 'failed'].includes(row.status))
    throw new ConflictException('Sprawdzanie jeszcze trwa.');
  await db.checkJob.delete({ where: { id } });
  await cleanupJobFolder(row.id);
  return { ok: true };
}
export async function metric(key: string, increment = 1) {
  const day = new Date(new Date().toISOString().slice(0, 10));
  try {
    await db.metric.upsert({
      where: { key_day: { key, day } },
      create: { key, day, value: increment },
      update: { value: { increment } },
    });
  } catch {
    console.warn('[api] A non-critical metric could not be saved.');
  }
}
