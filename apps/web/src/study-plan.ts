import type { AttemptSnapshot, Bootstrap } from '@zdaj/shared';
import { loadReview } from './exam-report';
import { practiceSkillForResult } from './practice-results';
import { resumeHref, resumeStep, studyStageHref } from './resume';
import { studySequence } from './study-progress';
import { theoryReviewQuestions } from './theory-review';

export interface StudyPlan {
  examDate: string;
  minutesPerDay: number;
}

type DailyAction =
  | { kind: 'review'; questionIds: string[] }
  | { kind: 'follow-up'; title: string; href: string }
  | { kind: 'course' | 'practice'; title: string; href: string };

type StudyPlanContent = Pick<Bootstrap, 'tasks' | 'reviewQuestionIds'> &
  Partial<Pick<Bootstrap, 'catalog' | 'groupByPractice' | 'postPractice'>>;

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
  return studySequence(study.guide, study.focusStepId, study.focusActivityId).some(
    ({ id }) => !study.completed[id],
  );
}

function examFollowUp(
  attempts: AttemptSnapshot[],
  data: StudyPlanContent,
): DailyAction | undefined {
  const exam = attempts
    .filter(
      (attempt) => attempt.kind === 'practice' && attempt.mode === 'egzamin' && attempt.submittedAt,
    )
    .sort((a, b) => Date.parse(b.submittedAt!) - Date.parse(a.submittedAt!))[0];
  if (!exam?.submittedAt) return;
  const examTime = Date.parse(exam.submittedAt);
  const source = data.tasks.find((task) => task.id === exam.taskId);
  const paper = data.catalog?.find(({ id }) => id === source?.sourceCatalogId);
  if (!paper?.handIn || !source) return;

  const { results } = loadReview(exam.id);
  const skills = new Set(
    paper.handIn.results
      .filter((result) => results[result] === 'partial' || results[result] === 'missing')
      .map((result) => practiceSkillForResult(paper.id, result, source.technologies)),
  );
  const options = [
    {
      skill: 'sql',
      catalogId: data.groupByPractice?.exercise.source.catalogId,
      stepId: 'queries',
      activityId: 'group',
      title: 'Pogrupuj notatki za pomocą GROUP BY',
    },
    {
      skill: 'sql',
      catalogId: 'inf03-03-24-06-sg',
      stepId: 'queries',
      activityId: 'query-two',
      title: 'Połącz pomiary z wodowskazami za pomocą JOIN',
    },
    {
      skill: 'php',
      catalogId: data.postPractice?.source.catalogId,
      stepId: 'php-form',
      activityId: 'read-option',
      title: 'Odczytaj wybór przesłany przez POST',
    },
    {
      skill: 'php',
      catalogId: 'inf03-08-25-06-sg',
      stepId: 'php-filter',
      activityId: 'guard',
      title: 'Sprawdź, czy formularz przesłał pole w POST',
    },
  ] as const;
  for (const { skill, catalogId, stepId, activityId, title } of options) {
    if (!skills.has(skill) || !catalogId || catalogId === paper.id) continue;
    const course = data.tasks.find((task) => task.sourceCatalogId === catalogId);
    if (!course) continue;
    const code = `${stepId}/${activityId}`;
    if (
      attempts.some((attempt) => {
        const completed = attempt.study?.completed[code]?.checkedAt;
        return attempt.taskId === course.id && completed && Date.parse(completed) >= examTime;
      })
    ) {
      skills.delete(skill);
      continue;
    }
    const draft = attempts.find(
      (attempt) =>
        attempt.taskId === course.id &&
        !attempt.submittedAt &&
        attempt.study?.focusStepId === stepId &&
        attempt.study.focusActivityId === activityId,
    );
    return {
      kind: 'follow-up',
      title: `${title} · ${course.title}`,
      href: draft ? resumeHref(draft, 'study') : studyStageHref(course.id, stepId, activityId),
    };
  }
}

export function dailyStudyAction(
  plan: StudyPlan,
  today: string,
  attempts: AttemptSnapshot[],
  data: StudyPlanContent,
): DailyAction | undefined {
  const days = daysUntilExam(plan.examDate, today);
  if (days < 0) return undefined;
  const followUp = examFollowUp(attempts, data);
  if (followUp) return followUp;
  const { tasks, reviewQuestionIds } = data;
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
