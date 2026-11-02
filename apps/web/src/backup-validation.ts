import { MAX_EXTRACTED_BYTES, type AttemptSnapshot, type PublicQuestion } from '@zdaj/shared';
import { validateProjectFiles, validateProjectState } from './backup-guide-validation';

const fail = (): never => {
  throw new Error('Kopia zawiera nieprawidłowe dane próby. Nie zaimportowano żadnych zmian.');
};
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : fail();
const text = (value: unknown, max = 20000): string =>
  typeof value === 'string' && value.length <= max ? value : fail();
const identifier = (value: unknown) => {
  const result = text(value, 128);
  return /^[a-z0-9][a-z0-9._-]*$/i.test(result) &&
    !['constructor', 'prototype', '__proto__'].includes(result)
    ? result
    : fail();
};
const token = (value: unknown) => {
  const result = text(value, 300);
  return result.length >= 16 && /^[a-z0-9_-]+$/i.test(result) ? result : fail();
};
const numeric = (value: unknown, max = 1000000) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max
    ? value
    : fail();
const integer = (value: unknown, max = 1000000) => {
  const result = numeric(value, max);
  return Number.isInteger(result) ? result : fail();
};
const date = (value: unknown) => {
  const result = text(value, 40);
  return Number.isFinite(Date.parse(result)) ? result : fail();
};
const array = (value: unknown, max: number) =>
  Array.isArray(value) && value.length <= max ? value : fail();
const member = (value: unknown, allowed: string[]) =>
  typeof value === 'string' && allowed.includes(value) ? value : fail();

function validateQuestion(value: unknown): PublicQuestion {
  const q = record(value);
  identifier(q.id);
  integer(q.version);
  identifier(q.topicId);
  member(q.level, ['beginner', 'intermediate', 'advanced']);
  text(q.prompt);
  const options = array(q.options, 4);
  if (options.length !== 4) fail();
  const ids = new Set<string>();
  for (const raw of options) {
    const option = record(raw);
    const id = identifier(option.id);
    if (ids.has(id)) fail();
    ids.add(id);
    text(option.text);
  }
  if (q.source !== undefined) {
    const source = record(q.source);
    identifier(source.catalogId);
    const sourceUrl = text(source.url, 2000);
    try {
      if (new URL(sourceUrl).protocol !== 'https:') fail();
    } catch {
      fail();
    }
    if (!integer(source.page, 500) || !integer(source.questionNumber, 1000)) fail();
    if (source.top !== undefined) numeric(source.top, 1);
    if (source.bottom !== undefined) numeric(source.bottom, 1);
    if (
      source.top !== undefined &&
      source.bottom !== undefined &&
      Number(source.top) >= Number(source.bottom)
    )
      fail();
  }
  return value as PublicQuestion;
}

function validateReport(value: unknown) {
  const report = record(value);
  identifier(report.taskId);
  integer(report.taskVersion);
  date(report.createdAt);
  text(report.disclaimer);
  numeric(report.runtimeMs, 86400000);
  numeric(report.confirmedPoints);
  numeric(report.checkedPoints);
  numeric(report.totalPoints);
  if (typeof report.complete !== 'boolean') fail();
  if (report.percentage !== null) numeric(report.percentage, 100);
  for (const raw of array(report.results, 500)) {
    const item = record(raw);
    identifier(item.criterionId);
    text(item.title);
    member(item.method, ['file', 'dom', 'style', 'javascript', 'php', 'sql', 'image', 'manual']);
    member(item.source, ['official', 'educational']);
    numeric(item.points);
    member(item.status, ['passed', 'failed', 'manual', 'unchecked', 'error']);
    text(item.evidence, 1048576);
    text(item.recommendation);
  }
}

function validateTheory(value: unknown) {
  const result = record(value);
  integer(result.correct, 40);
  integer(result.total, 40);
  numeric(result.percentage, 100);
  if (typeof result.passed !== 'boolean') fail();
  date(result.submittedAt);
  const results = array(result.results, 40);
  if (result.total !== results.length) fail();
  let correct = 0;
  for (const raw of results) {
    const item = record(raw);
    const question = validateQuestion(item.question);
    const ids = question.options.map((option) => option.id);
    member(item.correctOptionId, ids);
    if (item.selectedOptionId !== null) member(item.selectedOptionId, ids);
    if (
      typeof item.correct !== 'boolean' ||
      item.correct !== (item.selectedOptionId === item.correctOptionId)
    )
      fail();
    if (item.correct) correct++;
    text(item.explanation);
    const explanations = record(item.optionExplanations);
    for (const option of question.options) text(explanations[option.id]);
  }
  if (result.correct !== correct) fail();
}

export function validateBackupAttempts(value: unknown): AttemptSnapshot[] {
  const attempts = array(value, 1000);
  const ids = new Set<string>();
  for (const raw of attempts) {
    const item = record(raw),
      id = identifier(item.id);
    if (ids.has(id)) fail();
    ids.add(id);
    text(item.title, 250);
    member(item.kind, ['practice', 'theory']);
    member(item.mode, ['nauka', 'trening', 'egzamin']);
    member(item.level, ['beginner', 'intermediate', 'advanced']);
    date(item.createdAt);
    date(item.updatedAt);
    if (item.deadlineAt !== null) date(item.deadlineAt);
    if (item.submittedAt !== undefined) date(item.submittedAt);
    integer(item.hintCount, 1000);
    const ticket = record(item.ticket);
    identifier(ticket.id);
    token(ticket.token);
    if (ticket.deadlineAt !== null) date(ticket.deadlineAt);
    if (ticket.deadlineAt !== item.deadlineAt) fail();
    if (item.revealedHints !== undefined)
      for (const hint of array(item.revealedHints, 1000)) text(hint);
    if (item.kind === 'practice') {
      identifier(item.taskId);
      integer(item.taskVersion);
      if (item.files === undefined) fail();
    }
    if (item.files !== undefined) validateProjectFiles(item.files);
    if (item.kind === 'theory' && item.questions === undefined) fail();
    if (item.questions !== undefined) {
      const questions = array(item.questions, 40).map(validateQuestion);
      if (!questions.length) fail();
      const questionIds = new Set(questions.map((q) => q.id));
      if (questionIds.size !== questions.length) fail();
      if (item.answers !== undefined)
        for (const [questionId, answer] of Object.entries(record(item.answers))) {
          const question = questions.find((q) => q.id === questionId);
          if (!question) fail();
          member(
            answer,
            question!.options.map((option) => option.id),
          );
        }
    }
    if (item.checkJob !== undefined) {
      const job = record(item.checkJob);
      identifier(job.id);
      token(job.token);
    }
    if (item.report !== undefined) validateReport(item.report);
    if (item.theoryResult !== undefined) validateTheory(item.theoryResult);
    validateProjectState(item);
  }
  return attempts as AttemptSnapshot[];
}

export function validateBackupLearning(
  value: unknown,
  completedValue: unknown,
): {
  completed: string[];
  exercises: Record<string, string>;
  records: Record<string, { completedAt: string }>;
} {
  const completed = array(completedValue, 10000).map(identifier);
  const exercises: Record<string, string> = Object.create(null) as Record<string, string>;
  const records: Record<string, { completedAt: string }> = Object.create(null) as Record<
    string,
    { completedAt: string }
  >;
  if (value !== undefined) {
    const entries = Object.entries(record(value));
    if (entries.length > 10000) fail();
    for (const [key, item] of entries) {
      if (key.startsWith('exercise:')) {
        identifier(key.slice(9));
        exercises[key] = text(item, MAX_EXTRACTED_BYTES);
      } else {
        identifier(key);
        records[key] = { completedAt: date(record(item).completedAt) };
      }
    }
  }
  return { completed: [...new Set([...completed, ...Object.keys(records)])], exercises, records };
}
