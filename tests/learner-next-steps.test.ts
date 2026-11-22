import { describe, expect, it } from 'vitest';
import {
  toPublicQuestion,
  toPublicTask,
  type AttemptSnapshot,
  type QuestionRevision,
} from '@zdaj/shared';
import { readProgressBackup } from '../apps/web/src/backup-merge';
import { practiceStepForResult } from '../apps/web/src/practice-results';
import { dailyStudyAction, daysUntilExam } from '../apps/web/src/study-plan';
import { studySequence } from '../apps/web/src/study-progress';
import { theoryReviewQuestions } from '../apps/web/src/theory-review';
import {
  catalog,
  examStudyGuides,
  officialQuestions,
  officialTasks,
  questions,
} from '../packages/content/src/index';

const paper = toPublicTask(officialTasks.find(({ id }) => id === 'inf03-08-25-06-sg')!);
const guide = examStudyGuides.find(({ taskId }) => taskId === paper.id)!;
const today = '2027-01-12';
const time = `${today}T12:00:00.000Z`;
const ticket = { id: 'local-attempt', token: 'local-attempt-token-000000000', deadlineAt: null };

function theory(
  id: string,
  submittedAt: string,
  results: [QuestionRevision, boolean | null][],
): AttemptSnapshot {
  const correct = results.filter(([, answer]) => answer === true).length;
  return {
    id,
    kind: 'theory',
    title: 'Przykłady CKE',
    mode: 'trening',
    level: 'beginner',
    createdAt: submittedAt,
    updatedAt: submittedAt,
    submittedAt,
    deadlineAt: null,
    ticket: { ...ticket, id },
    hintCount: 0,
    theoryResult: {
      correct,
      total: results.length,
      percentage: 0,
      passed: false,
      submittedAt,
      results: results.map(([question, answer]) => ({
        question: toPublicQuestion(question),
        selectedOptionId:
          answer === null
            ? null
            : answer
              ? question.correctOptionId
              : question.options.find((option) => option.id !== question.correctOptionId)!.id,
        correct: answer === true,
        correctOptionId: question.correctOptionId,
        explanation: question.explanation,
        optionExplanations: {},
      })),
    },
  };
}

describe('repeat incorrect CKE answers', () => {
  it('uses the last answered result, excludes unavailable or legacy questions and caps the round', () => {
    const [fixed, omitted, unavailable, ...remaining] = officialQuestions.slice(0, 9);
    const original = theory('older', '2027-01-11T12:00:00Z', [
      ...[fixed!, omitted!, unavailable!, ...remaining].map(
        (question): [QuestionRevision, false] => [question, false],
      ),
      [questions[0]!, false],
    ]);
    const newer = theory('newer', time, [
      [fixed!, true],
      [omitted!, null],
    ]);
    const available = [fixed!, omitted!, ...remaining, questions[0]!].map(({ id }) => id);
    const queue = theoryReviewQuestions([original, newer], available);
    expect(queue).toHaveLength(5);
    expect(queue).toContain(omitted!.id);
    expect(queue).not.toContain(fixed!.id);
    expect(queue).not.toContain(unavailable!.id);
    expect(queue).not.toContain(questions[0]!.id);
    expect(new Set(queue).size).toBe(queue.length);
    expect(theoryReviewQuestions([newer], available)).toEqual([]);
  });
});

describe('practice from a self-review', () => {
  it('points every printed result to an existing course stage', () => {
    for (const { taskId, steps } of examStudyGuides) {
      const handIn = catalog.find((entry) => entry.id === taskId)!.handIn!;
      for (const result of handIn.results) {
        const stepId = practiceStepForResult(taskId, result);
        expect(
          steps.find(({ id }) => id === stepId)?.activities?.length,
          `${taskId}: ${result}`,
        ).toBeGreaterThan(0);
      }
    }
    expect(practiceStepForResult(paper.id, 'skrypty')).toBe('php-filter');
    expect(practiceStepForResult(paper.id, 'niesklasyfikowany rezultat')).toBeUndefined();
  });

  it('round-trips a focused course stage and rejects a step outside the stage', () => {
    const focusStepId = 'php-filter';
    const [step] = studySequence(guide, focusStepId);
    const attempt: AttemptSnapshot = {
      id: ticket.id,
      ticket,
      title: paper.title,
      taskId: paper.id,
      taskVersion: guide.taskVersion,
      kind: 'practice',
      mode: 'nauka',
      level: 'beginner',
      createdAt: time,
      updatedAt: time,
      deadlineAt: null,
      hintCount: 0,
      files: guide.project!.starterFiles,
      study: { guide, current: step!.id, focusStepId, completed: {}, viewedExamples: [] },
    };
    const backup = {
      format: 'zdaj-egzamin-inf',
      version: 2,
      exportedAt: time,
      attempts: [attempt],
      level: 'beginner',
      completedLessons: [],
      learning: {},
    };
    expect(readProgressBackup(JSON.parse(JSON.stringify(backup))).attempts[0]?.study).toEqual(
      attempt.study,
    );
    attempt.study!.current = studySequence(guide)[0]!.id;
    expect(() => readProgressBackup(backup)).toThrow();
  });
});

describe('the daily study plan', () => {
  it('counts calendar days across a timezone change and rejects imaginary dates', () => {
    expect(daysUntilExam('2027-03-29', '2027-03-27')).toBe(2);
    expect(daysUntilExam('2027-02-29', '2027-02-28')).toBeNaN();
  });

  it('chooses review, a course step or an SQL section based on time and progress', () => {
    const question = officialQuestions[0]!;
    const data = { tasks: [paper], reviewQuestionIds: [question.id] };
    const history = [theory('older', time, [[question, false]])];
    expect(
      dailyStudyAction({ examDate: '2027-02-01', minutesPerDay: 10 }, today, history, data),
    ).toEqual({ kind: 'review', questionIds: [question.id] });
    expect(
      dailyStudyAction({ examDate: '2027-02-01', minutesPerDay: 10 }, today, [], data),
    ).toMatchObject({ kind: 'course', href: expect.stringContaining('tryb=nauka') });
    expect(
      dailyStudyAction({ examDate: '2027-01-15', minutesPerDay: 30 }, today, history, data),
    ).toMatchObject({ kind: 'practice', href: expect.stringContaining('tryb=trening') });
    expect(
      dailyStudyAction({ examDate: '2027-01-11', minutesPerDay: 30 }, today, history, data),
    ).toBeUndefined();
  });

  it('resumes the saved step and advances to another paper after a course is complete', () => {
    const next = toPublicTask(officialTasks.find(({ id }) => id !== paper.id)!);
    const positions = studySequence(guide);
    const study = { guide, current: positions[1]!.id, completed: {}, viewedExamples: [] };
    const attempt: AttemptSnapshot = {
      id: ticket.id,
      ticket,
      title: paper.title,
      taskId: paper.id,
      taskVersion: guide.taskVersion,
      kind: 'practice',
      mode: 'nauka',
      level: 'beginner',
      createdAt: time,
      updatedAt: time,
      deadlineAt: null,
      hintCount: 0,
      files: guide.project!.starterFiles,
      workspace: { view: 'preview', activeFile: '', previewEntry: '', editors: {} },
      study,
    };
    const data = { tasks: [paper, next], reviewQuestionIds: [] };
    const plan = { examDate: '2027-02-01', minutesPerDay: 20 };
    expect(dailyStudyAction(plan, today, [attempt], data)).toEqual({
      kind: 'course',
      title: positions[1]!.activity.title,
      href: `/praktyka/${paper.id}?proba=${attempt.id}&widok=nauka`,
    });
    attempt.study = {
      ...study,
      completed: Object.fromEntries(
        positions.map(({ id }) => [
          id,
          {
            status: 'manual',
            checkedAt: time,
            revision: 0,
            filesHash: '0'.repeat(64),
            evidence: '',
          },
        ]),
      ),
    };
    expect(dailyStudyAction(plan, today, [attempt], data)).toMatchObject({
      kind: 'course',
      title: next.title,
    });
  });
});
