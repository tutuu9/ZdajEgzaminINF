import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { db } from '@zdaj/database';
import { allExamStudyGuides } from '@zdaj/content';
import type { SiteSettings } from '@zdaj/shared';
import { parse } from './validation.js';
import { config, DAY_MS } from './config.js';
import { guest, rateLimit, requestIpKey } from './security.js';
import { getAttempt, metric } from './attempts.js';
import { isCkeTask, settings, taskVersion } from './content.js';
import { AiInputTooLargeError, buildAiMessages, type AiContext } from './ai-context.js';
import { examSheetText } from './exam-text.js';

export function maximumCostMicroUsd(
  inputTokens: number,
  outputTokens: number,
  inputPrice: number,
  outputPrice: number,
): number {
  return Math.ceil(inputTokens * inputPrice + outputTokens * outputPrice);
}
// A path is quoted inside the prompt, so it may not carry line breaks or block brackets.
const pathSchema = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[^\p{Cc}[\]<>"|?*\\]+$/u);
const MAX_PROJECT_CHARACTERS = 200_000;
const requestSchema = z
  .object({
    attemptId: z.string(),
    attemptToken: z.string().max(100),
    prompt: z.string().min(3).max(4000),
    /** Content of the file open in the editor. */
    code: z.string().max(50_000).default(''),
    codePath: pathSchema.optional(),
    /** Other text files of the project; the server decides how many fit. */
    files: z
      .array(z.object({ path: pathSchema, content: z.string().max(50_000) }).strict())
      .max(12)
      .default([])
      .refine(
        (files) =>
          files.reduce((sum, file) => sum + file.content.length, 0) <= MAX_PROJECT_CHARACTERS,
      ),
    fileNames: z.array(pathSchema).max(60).default([]),
    /** Earlier turns kept by the browser; the server stores none of them. */
    history: z
      .array(
        z
          .object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(6000) })
          .strict(),
      )
      .max(8)
      .default([]),
    /** `step/activity` of the course position the learner has open. */
    activity: z
      .string()
      .max(160)
      .regex(/^\w[\w-]*\/\w[\w-]*$/)
      .optional(),
    guideVersion: z.number().int().positive().optional(),
    /** Findings of the browser's own checks; untrusted text. */
    diagnostics: z.string().max(3000).default(''),
    consent: z.literal(true),
  })
  .strict();

function lessonFor(
  taskId: string | null,
  version: number | null,
  position: string | undefined,
  guideVersion: number | undefined,
) {
  if (!taskId || !version || !position) return undefined;
  const [stepId, activityId] = position.split('/');
  const guide = allExamStudyGuides
    .filter(
      (item) =>
        item.taskId === taskId &&
        item.taskVersion === version &&
        (guideVersion === undefined || item.version === guideVersion),
    )
    .sort((a, b) => b.version - a.version)[0];
  const step = guide?.steps.find((item) => item.id === stepId);
  const activity = step?.activities?.find((item) => item.id === activityId);
  return step && activity ? { step, activity } : undefined;
}

export async function askAi(body: unknown, req: Request) {
  const value = parse(requestSchema, body);
  const attempt = await getAttempt(value.attemptId, value.attemptToken);
  if (attempt.mode === 'egzamin' && !attempt.submittedAt)
    throw new ForbiddenException('AI jest wyłączone do zakończenia egzaminu.');
  const options = await settings();
  if (!options.aiEnabled || !config.deepseekKey)
    throw new ServiceUnavailableException(
      'AI jest niedostępne. Skorzystaj z przygotowanych podpowiedzi.',
    );
  const session = await guest(req);
  await rateLimit(`ai:guest:${session.id}`, options.aiDailyLimit, DAY_MS);
  await rateLimit(`ai:ip:${requestIpKey(req)}`, options.aiDailyLimit * 3, DAY_MS);
  const task =
    attempt.taskId && attempt.taskVersion
      ? await taskVersion(attempt.taskId, attempt.taskVersion)
      : null;
  // Everything the model reads is gathered before any money is reserved. A paper that
  // cannot be fetched only narrows the answer; it never blocks or charges the learner.
  const sheetText =
    task && isCkeTask(task) && task.sourceCatalogId
      ? await examSheetText(task.sourceCatalogId)
      : null;
  let context: AiContext;
  try {
    context = buildAiMessages(
      {
        task,
        sheetText,
        mode: attempt.mode,
        level: attempt.level,
        submitted: Boolean(attempt.submittedAt),
        lesson: lessonFor(attempt.taskId, attempt.taskVersion, value.activity, value.guideVersion),
        activeFile:
          value.codePath || value.code
            ? { path: value.codePath ?? 'wybrany fragment', content: value.code }
            : undefined,
        files: value.files,
        fileNames: value.fileNames,
        diagnostics: value.diagnostics,
        history: value.history,
        prompt: value.prompt,
        marker: randomBytes(4).toString('hex'),
      },
      // Each UTF-8 byte is an upper bound on one byte-level token.
      options.aiInputTokenLimit,
    );
  } catch (error) {
    if (error instanceof AiInputTooLargeError) throw new BadRequestException(error.message);
    throw error;
  }
  const { inputBound } = context;
  const reserved = maximumCostMicroUsd(
    inputBound,
    options.aiOutputTokenLimit,
    options.aiInputPricePerMillion,
    options.aiOutputPricePerMillion,
  );
  const usage = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(74620402)::text`;
    const current = await tx.setting.findUnique({ where: { id: 'site' } });
    const snapshot = current?.value as unknown as SiteSettings | undefined;
    if (!snapshot?.aiEnabled) throw new ServiceUnavailableException('Administrator wyłączył AI.');
    if (
      snapshot.aiInputPricePerMillion !== options.aiInputPricePerMillion ||
      snapshot.aiOutputPricePerMillion !== options.aiOutputPricePerMillion ||
      snapshot.aiInputTokenLimit !== options.aiInputTokenLimit ||
      snapshot.aiOutputTokenLimit !== options.aiOutputTokenLimit
    )
      throw new ConflictException(
        'Ustawienia AI zmieniły się. Spróbuj ponownie; nie wykonano płatnego zapytania.',
      );
    const active = await tx.aiUsage.count({ where: { status: { in: ['reserved', 'uncertain'] } } });
    if (active)
      throw new HttpException(
        'AI obsługuje inne zapytanie lub oczekuje na rozliczenie. Spróbuj później.',
        429,
      );
    const budget = await tx.aiBudget.findUnique({ where: { id: 'site' } });
    if (!budget || budget.spentMicroUsd + budget.reservedMicroUsd + reserved > budget.limitMicroUsd)
      throw new HttpException('Wyczerpano budżet AI. Pozostałe funkcje nadal działają.', 429);
    await tx.aiBudget.update({
      where: { id: 'site' },
      data: { reservedMicroUsd: { increment: reserved } },
    });
    return tx.aiUsage.create({ data: { reservedMicroUsd: reserved } });
  });
  let sent = false;
  try {
    if (!(await settings()).aiEnabled) {
      throw new ServiceUnavailableException('Administrator wyłączył AI.');
    }
    sent = true;
    const response = await fetch(`${config.deepseekBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.deepseekKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.deepseekModel,
        messages: context.messages,
        max_tokens: options.aiOutputTokenLimit,
        thinking: { type: 'disabled' },
        stream: false,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) {
      // HTTP failures may have been processed upstream; never assume they are free.
      throw new Error(`provider_status_${response.status}`);
    }
    const result = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const answer = result.choices?.[0]?.message?.content;
    const input = result.usage?.prompt_tokens;
    const output = result.usage?.completion_tokens;
    if (
      !answer ||
      !Number.isInteger(input) ||
      !Number.isInteger(output) ||
      input! < 0 ||
      output! < 0
    )
      throw new Error('provider_response_incomplete');
    const charged = maximumCostMicroUsd(
      input!,
      output!,
      options.aiInputPricePerMillion,
      options.aiOutputPricePerMillion,
    );
    if (charged > reserved) throw new Error('provider_usage_exceeds_reservation');
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(74620402)::text`;
      const current = await tx.aiUsage.findUniqueOrThrow({ where: { id: usage.id } });
      // An operator may have settled an old reservation during a process stall.
      // Preserve that conservative charge instead of subtracting the reservation twice.
      if (current.status === 'settled-conservatively') return;
      if (current.status !== 'reserved') throw new Error('reservation_already_closed');
      await tx.aiUsage.update({
        where: { id: usage.id },
        data: {
          status: 'completed',
          chargedMicroUsd: charged,
          promptTokens: input,
          completionTokens: output,
          completedAt: new Date(),
        },
      });
      await tx.aiBudget.update({
        where: { id: 'site' },
        data: { reservedMicroUsd: { decrement: reserved }, spentMicroUsd: { increment: charged } },
      });
    });
    await metric('ai.completed');
    return { text: answer, used: context.used };
  } catch (error) {
    if (!sent) {
      await releaseUnsent(usage.id);
      throw error;
    }
    await db.aiUsage.updateMany({
      where: { id: usage.id, status: 'reserved' },
      data: { status: 'uncertain' },
    });
    await db.event.create({
      data: {
        type: 'ai.uncertain',
        detail: {
          usageId: usage.id,
          reason: 'provider_or_network_failure',
          reservationMicroUsd: reserved,
        },
      },
    });
    throw new ServiceUnavailableException(
      'Nie udało się bezpiecznie rozliczyć odpowiedzi AI. Nie powtarzamy automatycznie płatnego zapytania. Skorzystaj z przygotowanych podpowiedzi.',
    );
  }
}
async function releaseUnsent(id: string) {
  await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(74620402)::text`;
    const current = await tx.aiUsage.findUniqueOrThrow({ where: { id } });
    if (current.status !== 'reserved') return;
    await tx.aiUsage.update({
      where: { id },
      data: { status: 'cancelled', chargedMicroUsd: 0, completedAt: new Date() },
    });
    await tx.aiBudget.update({
      where: { id: 'site' },
      data: { reservedMicroUsd: { decrement: current.reservedMicroUsd } },
    });
  });
}
export async function settleUncertain() {
  return db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(74620402)::text`;
    const stale = await tx.aiUsage.findMany({
      where: {
        OR: [
          { status: 'uncertain' },
          { status: 'reserved', createdAt: { lt: new Date(Date.now() - 120_000) } },
        ],
      },
    });
    const amount = stale.reduce((sum, row) => sum + row.reservedMicroUsd, 0);
    if (stale.length) {
      for (const row of stale) {
        await tx.aiUsage.update({
          where: { id: row.id },
          data: {
            status: 'settled-conservatively',
            chargedMicroUsd: row.reservedMicroUsd,
            completedAt: new Date(),
          },
        });
      }
      await tx.aiBudget.update({
        where: { id: 'site' },
        data: { reservedMicroUsd: { decrement: amount }, spentMicroUsd: { increment: amount } },
      });
      await tx.event.create({
        data: {
          type: 'ai.reservations_settled',
          detail: { count: stale.length, microUsd: amount },
        },
      });
    }
    return { settled: stale.length, chargedUsd: amount / 1_000_000 };
  });
}
export async function providerBalance() {
  if (!config.deepseekKey) return { available: false, reason: 'Brak klucza API.' };
  try {
    const response = await fetch(`${config.deepseekBaseUrl}/user/balance`, {
      headers: { Authorization: `Bearer ${config.deepseekKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { available: false, reason: 'Nie udało się pobrać salda dostawcy.' };
    return { available: true, data: await response.json() };
  } catch {
    return { available: false, reason: 'Nie udało się połączyć z dostawcą.' };
  }
}
