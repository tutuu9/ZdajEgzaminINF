import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import { db } from '@zdaj/database';
import { examStudyGuides } from '@zdaj/content';
import type { ExamStudyResponse } from '@zdaj/shared';
import { getAttempt, metric } from './attempts.js';
import { parse } from './validation.js';

/** A secret-bearing attempt is the only route to supplemental code and solution resources. */
export async function revealStudyGuide(id: string, body: unknown): Promise<ExamStudyResponse> {
  const { token } = parse(z.object({ token: z.string().max(100) }).strict(), body);
  const attempt = await getAttempt(id, token);
  if (!attempt.taskId || !attempt.taskVersion)
    throw new BadRequestException('To nie jest próba praktyczna.');
  if (attempt.mode === 'egzamin' && !attempt.submittedAt) {
    throw new ForbiddenException('Nauka z rozwiązaniami jest dostępna po zakończeniu egzaminu.');
  }
  const guide = examStudyGuides
    .filter((guide) => guide.taskId === attempt.taskId && guide.taskVersion === attempt.taskVersion)
    .sort((a, b) => b.version - a.version)[0];
  if (!guide)
    throw new NotFoundException('Dla tej wersji arkusza nie opublikowano jeszcze przewodnika.');
  // Closed attempts retain the assistance count recorded before submission.
  if (!attempt.submittedAt) {
    await db.attemptTicket.updateMany({
      where: { id, submittedAt: null },
      data: { hintCount: { increment: 1 } },
    });
  }
  const current = await db.attemptTicket.findUniqueOrThrow({ where: { id } });
  await metric('study.revealed');
  return { guide, hintCount: current.hintCount };
}
