import { NotFoundException } from '@nestjs/common';
import { db } from '@zdaj/database';
import { topics, lessons as seedLessons } from '@zdaj/content';
import {
  DEFAULT_SETTINGS,
  toPublicTask,
  type SiteSettings,
  type TaskVersion,
  type Bootstrap,
  type Lesson,
  type CatalogEntry,
  type QuestionRevision,
} from '@zdaj/shared';
import { config } from './config.js';
import { REVIEWED_EXAM_PDFS } from './exam-pdf.js';

export async function settings(): Promise<SiteSettings> {
  const row = await db.setting.findUnique({ where: { id: 'site' } });
  return { ...DEFAULT_SETTINGS, ...(row?.value as Partial<SiteSettings> | null) };
}
export async function workerAvailable(): Promise<boolean> {
  if (config.runnerProfile === 'public-sandbox' && !config.publicSandboxVerified) return false;
  const heartbeat = await db.metric.findFirst({
    where: { key: `worker.${config.runnerProfile}.lastSeen` },
    orderBy: { day: 'desc' },
  });
  return Boolean(heartbeat && Math.abs(Date.now() / 1000 - heartbeat.value) < 30);
}
export async function published<T>(kind: string): Promise<T[]> {
  const rows = await db.contentRevision.findMany({
    where: { kind, status: 'published' },
    orderBy: [{ key: 'asc' }, { version: 'desc' }],
  });
  const seen = new Set<string>();
  return rows
    .filter((row) => {
      if (seen.has(row.key)) return false;
      seen.add(row.key);
      return true;
    })
    .map((row) => row.payload as T);
}
export async function taskVersion(id: string, version?: number): Promise<TaskVersion> {
  const row = await db.contentRevision.findFirst({
    where: { kind: 'task', key: id, status: 'published', ...(version ? { version } : {}) },
    orderBy: { version: 'desc' },
  });
  if (!row) throw new NotFoundException('Nie znaleziono tej wersji zadania.');
  return row.payload as unknown as TaskVersion;
}
export function isCkeTask(task: TaskVersion): boolean {
  return (
    task.qualification === 'INF.03' &&
    task.origin === 'exam' &&
    Boolean(task.sourceCatalogId && Object.hasOwn(REVIEWED_EXAM_PDFS, task.sourceCatalogId))
  );
}
export function isCkeQuestion(question: QuestionRevision): boolean {
  const source = question.source && REVIEWED_EXAM_PDFS[question.source.catalogId];
  return Boolean(
    source && source.provenance === 'official-source' && source.url === question.source?.url,
  );
}
export async function bootstrap(): Promise<Bootstrap> {
  const [tasks, lessons, catalog, questions, options] = await Promise.all([
    published<TaskVersion>('task'),
    published<Lesson>('lesson'),
    published<CatalogEntry>('catalog'),
    published<QuestionRevision>('question'),
    settings(),
  ]);
  const levels = { beginner: 0, intermediate: 1, advanced: 2 };
  tasks.sort(
    (a, b) => levels[a.difficulty] - levels[b.difficulty] || a.title.localeCompare(b.title, 'pl'),
  );
  const lessonOrder = (lesson: Lesson) =>
    lesson.order ??
    (seedLessons.some((original) => original.id === lesson.id)
      ? seedLessons.findIndex((original) => original.id === lesson.id)
      : 999);
  lessons.sort(
    (a, b) =>
      topics.findIndex((topic) => topic.id === a.topicId) -
        topics.findIndex((topic) => topic.id === b.topicId) ||
      lessonOrder(a) - lessonOrder(b) ||
      a.title.localeCompare(b.title, 'pl'),
  );
  return {
    topics,
    tasks: tasks.filter(isCkeTask).map(toPublicTask),
    lessons: lessons.map((lesson) => ({ ...lesson, exerciseIds: [] })),
    catalog: catalog.map(({ sourcePdf: _untrustedSourcePdf, ...entry }) => {
      const source = Object.hasOwn(REVIEWED_EXAM_PDFS, entry.id)
        ? REVIEWED_EXAM_PDFS[entry.id]
        : undefined;
      return {
        ...entry,
        ...(source
          ? {
              sourcePdf: {
                url: source.url,
                sourceLabel: source.sourceLabel,
                sourceKind: source.provenance,
              },
            }
          : {}),
      };
    }),
    exercises: [],
    questionCount: questions.filter(isCkeQuestion).length,
    features: {
      aiAvailable: options.aiEnabled && Boolean(config.deepseekKey),
      checkingAvailable: options.checkingEnabled && (await workerAvailable()),
    },
  };
}
