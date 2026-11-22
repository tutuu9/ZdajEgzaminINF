import {
  THEORY_REVIEW_LIMIT,
  type AttemptSnapshot,
  type TheoryStartRequest,
  type TheoryTicket,
} from '@zdaj/shared';
import { api } from './api';
import { saveAttempt } from './storage';

export const theoryReviewTitle = 'Powtórka błędów CKE';

export function theoryReviewQuestions(
  attempts: AttemptSnapshot[],
  availableQuestionIds: string[] = [],
): string[] {
  const available = new Set(availableQuestionIds);
  const latestAnswers = new Map<string, boolean>();
  const submitted = attempts
    .filter((attempt) => attempt.kind === 'theory' && attempt.theoryResult && attempt.submittedAt)
    .sort((left, right) => Date.parse(left.submittedAt!) - Date.parse(right.submittedAt!));
  for (const attempt of submitted)
    for (const { question, selectedOptionId, correct } of attempt.theoryResult!.results) {
      if (!question.source || !selectedOptionId || !available.has(question.id)) continue;
      latestAnswers.delete(question.id);
      latestAnswers.set(question.id, correct);
    }
  return [...latestAnswers]
    .filter(([, correct]) => !correct)
    .slice(0, THEORY_REVIEW_LIMIT)
    .map(([id]) => id);
}

export async function createTheoryAttempt(
  body: TheoryStartRequest,
  title: string,
): Promise<AttemptSnapshot> {
  const { questions, ...ticket } = await api<TheoryTicket>('/theory/start', {
    method: 'POST',
    body,
  });
  const now = new Date().toISOString();
  const snapshot: AttemptSnapshot = {
    id: ticket.id,
    kind: 'theory',
    title,
    mode: body.mode,
    level: body.level,
    createdAt: now,
    updatedAt: now,
    deadlineAt: ticket.deadlineAt,
    ticket,
    questions,
    answers: {},
    hintCount: 0,
  };
  await saveAttempt(snapshot);
  return snapshot;
}
