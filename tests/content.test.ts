import { describe, expect, it } from 'vitest';
import {
  catalog,
  exercises,
  lessons,
  questions,
  tasks,
  topics,
  officialTasks,
  officialQuestions,
} from '@zdaj/content';
import { toPublicQuestion, toPublicTask } from '@zdaj/shared';

describe('legacy authored fixtures and lesson integrity', () => {
  it('contains a connected learning path for all six topics', () => {
    expect(topics).toHaveLength(6);
    expect(tasks).toHaveLength(3);
    expect(exercises).toHaveLength(12);
    expect(lessons.length).toBeGreaterThanOrEqual(12);
    const topicIds = new Set(topics.map((topic) => topic.id));
    const exerciseIds = new Set(exercises.map((exercise) => exercise.id));
    for (const lesson of lessons) {
      expect(topicIds.has(lesson.topicId)).toBe(true);
      expect(lesson.body.length).toBeGreaterThan(600);
      expect(lesson.objectives.length).toBeGreaterThanOrEqual(3);
      for (const id of lesson.exerciseIds) expect(exerciseIds.has(id)).toBe(true);
    }
    for (const topic of topics) {
      expect(questions.filter((q) => q.topicId === topic.id).length).toBeGreaterThanOrEqual(8);
      expect(lessons.filter((l) => l.topicId === topic.id).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('has at least 80 distinct, fully explained questions with an unambiguous key', () => {
    expect(questions.length).toBeGreaterThanOrEqual(80);
    expect(new Set(questions.map((q) => q.id)).size).toBe(questions.length);
    expect(new Set(questions.map((q) => q.prompt)).size).toBe(questions.length);
    for (const question of questions) {
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options.map((o) => o.text)).size).toBe(4);
      expect(question.options.filter((o) => o.id === question.correctOptionId)).toHaveLength(1);
      expect(question.explanation.length).toBeGreaterThan(20);
      expect(new URL(question.reference).protocol).toBe('https:');
      for (const option of question.options) expect(option.explanation.length).toBeGreaterThan(20);
    }
  });

  it('does not leak answer keys or grading probes into public DTOs', () => {
    for (const question of questions) {
      const publicQuestion = toPublicQuestion(question);
      expect(publicQuestion).not.toHaveProperty('correctOptionId');
      expect(publicQuestion).not.toHaveProperty('explanation');
      expect(publicQuestion.options.every((o) => !('explanation' in o))).toBe(true);
    }
    for (const task of tasks) {
      const publicTask = toPublicTask(task);
      expect(publicTask).not.toHaveProperty('hints');
      expect(publicTask.criteria.every((c) => !('check' in c))).toBe(true);
    }
  });

  it('keeps unsupported original examinations clearly separate from original projects', () => {
    expect(catalog).toHaveLength(officialTasks.length);
    expect(catalog.every((entry) => entry.supportStatus === 'catalog-only')).toBe(true);
    expect(catalog.every((entry) => entry.rightsStatus === 'unknown')).toBe(true);
    expect(tasks.every((task) => task.origin === 'original')).toBe(true);
    expect(catalog.find((entry) => entry.id === 'cke-wedkowanie')?.year).toBeNull();
  });

  it('defines all learning levels and manual limits for each project', () => {
    for (const task of tasks) {
      for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
        expect(task.guidance[level].length).toBeGreaterThan(0);
      }
      expect(task.hints).toHaveLength(3);
      expect(task.criteria.some((criterion) => criterion.method === 'manual')).toBe(true);
      expect(new Set(task.criteria.map((criterion) => criterion.id)).size).toBe(
        task.criteria.length,
      );
      expect(new Set(task.starterFiles.map((file) => file.path)).size).toBe(
        task.starterFiles.length,
      );
      expect(task.followUp.length).toBeGreaterThan(30);
    }
  });
});

describe('published CKE INF.03 learning set', () => {
  it('offers only original papers with explicit manual-check boundaries', () => {
    expect(officialTasks.length).toBeGreaterThanOrEqual(3);
    for (const task of officialTasks) {
      expect(task.origin).toBe('exam');
      expect(task.qualification).toBe('INF.03');
      expect(catalog.some((entry) => entry.id === task.sourceCatalogId)).toBe(true);
      expect(task.supportStatus).toBe('catalog-only');
      expect(task.criteria).toHaveLength(0);
      expect(task.starterFiles).toHaveLength(0);
      expect(tasks.some((legacy) => legacy.id === task.id)).toBe(false);
    }
  });
  it('preserves exact published example identity, fixed A–D letters and reviewed crop bounds', () => {
    expect(officialQuestions).toHaveLength(25);
    expect(new Set(officialQuestions.map((question) => question.id)).size).toBe(25);
    expect(
      officialQuestions.map((question) => question.source?.questionNumber).sort((a, b) => a! - b!),
    ).toEqual(
      Array.from({ length: 26 }, (_, index) => index + 1).filter((number) => number !== 12),
    );
    for (const question of officialQuestions) {
      expect(question.source?.url).toBe('https://bip.cke.gov.pl/attachments/download/8580');
      expect(question.source?.catalogId).toBe('cke-inf03-informator-2022');
      expect(question.source?.page).toBeGreaterThanOrEqual(6);
      expect(question.source?.page).toBeLessThanOrEqual(17);
      expect(question.source?.top).toBeGreaterThanOrEqual(0);
      expect(question.source?.bottom).toBeLessThanOrEqual(1);
      expect(question.source!.top!).toBeLessThan(question.source!.bottom!);
      expect(question.options.map((option) => option.text)).toEqual(['A', 'B', 'C', 'D']);
      expect(
        question.options.filter((option) => option.id === question.correctOptionId),
      ).toHaveLength(1);
      expect(toPublicQuestion(question)).not.toHaveProperty('correctOptionId');
      expect(toPublicQuestion(question)).not.toHaveProperty('explanation');
    }
  });
});
