import type { AttemptSnapshot, Bootstrap } from '@zdaj/shared';
import { resumeHref, resumeStep } from './resume';
import { studySequence } from './study-progress';
import { theoryReviewQuestions } from './theory-review';

export interface StudyPlan {
  examDate: string;
  minutesPerDay: number;
}

type DailyAction =
  | { kind: 'review'; questionIds: string[] }
  | { kind: 'course' | 'practice'; title: string; href: string };

const storageKey = 'zdaj:study-plan';
const dayMs = 86_400_000;

export function localStudyDay(date = new Date()): string {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, '0'))
    .join('-');
}

function dayNumber(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NaN;
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date
    ? time / dayMs
    : NaN;
}

export function daysUntilExam(examDate: string, today: string): number {
  return dayNumber(examDate) - dayNumber(today);
}

export function validStudyMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes > 0 && minutes <= 1440;
}

export function readStudyPlan(): StudyPlan | null {
  try {
    const plan: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (
      plan &&
      typeof plan === 'object' &&
      'examDate' in plan &&
      typeof plan.examDate === 'string' &&
      Number.isFinite(dayNumber(plan.examDate)) &&
      'minutesPerDay' in plan &&
      typeof plan.minutesPerDay === 'number' &&
      validStudyMinutes(plan.minutesPerDay)
    )
      return { examDate: plan.examDate, minutesPerDay: plan.minutesPerDay };
  } catch {
    // The plan is optional when browser storage is unavailable.
  }
  return null;
}

export function saveStudyPlan(plan: StudyPlan | null) {
  if (plan) localStorage.setItem(storageKey, JSON.stringify(plan));
  else localStorage.removeItem(storageKey);
}

function hasUnfinishedStep(study: NonNullable<AttemptSnapshot['study']>) {
  return studySequence(study.guide, study.focusStepId).some(({ id }) => !study.completed[id]);
}

export function dailyStudyAction(
  plan: StudyPlan,
  today: string,
  attempts: AttemptSnapshot[],
  { tasks, reviewQuestionIds }: Pick<Bootstrap, 'tasks' | 'reviewQuestionIds'>,
): DailyAction | undefined {
  const days = daysUntilExam(plan.examDate, today);
  if (days < 0) return undefined;
  const drafts = attempts.filter((attempt) => attempt.kind === 'practice' && !attempt.submittedAt);
  if (days > 0 && days <= 7 && plan.minutesPerDay >= 30) {
    const sqlTasks = tasks.filter((task) => task.topicIds.includes('sql'));
    const training = drafts.find(
      (attempt) =>
        attempt.mode === 'trening' && sqlTasks.some((task) => task.id === attempt.taskId),
    );
    if (training) return { kind: 'practice', title: training.title, href: resumeHref(training) };
    const task = sqlTasks.find((item) => item.id === drafts[0]?.taskId) ?? sqlTasks[0];
    if (task)
      return {
        kind: 'practice',
        title: task.title,
        href: `/praktyka/${encodeURIComponent(task.id)}?tryb=trening`,
      };
  }

  const questionIds = theoryReviewQuestions(attempts, reviewQuestionIds).slice(
    0,
    Math.max(1, Math.floor(plan.minutesPerDay / 2)),
  );
  if (questionIds.length) return { kind: 'review', questionIds };
  const course = drafts.find(
    ({ mode, study }) => mode === 'nauka' && study && hasUnfinishedStep(study),
  );
  if (course)
    return {
      kind: 'course',
      title: resumeStep(course) ?? course.title,
      href: resumeHref(course, 'study'),
    };

  const completedTasks = new Set(
    attempts
      .filter(
        ({ kind, mode, study, submittedAt }) =>
          kind === 'practice' &&
          mode === 'nauka' &&
          !study?.focusStepId &&
          (submittedAt || (study?.guide.project && !hasUnfinishedStep(study))),
      )
      .map((attempt) => attempt.taskId),
  );
  const task = tasks.find((item) => !completedTasks.has(item.id)) ?? tasks[0];
  if (task)
    return {
      kind: 'course',
      title: task.title,
      href: `/praktyka/${encodeURIComponent(task.id)}?tryb=nauka&widok=nauka`,
    };
}
