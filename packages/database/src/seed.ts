import {
  officialTasks as tasks,
  lessons,
  officialQuestions as questions,
  catalog,
  faq,
} from '@zdaj/content';
import { DEFAULT_SETTINGS } from '@zdaj/shared';
import { db, Prisma } from './index.js';

async function seed() {
  const groups = { task: tasks, lesson: lessons, question: questions, catalog, faq };
  for (const [kind, records] of Object.entries(groups)) {
    for (const record of records) {
      const version = 'version' in record ? record.version : kind === 'catalog' ? 3 : 1;
      await db.contentRevision.upsert({
        where: { kind_key_version: { kind, key: record.id, version } },
        create: {
          kind,
          key: record.id,
          version,
          status: 'published',
          payload: record as unknown as Prisma.InputJsonValue,
          publishedAt: new Date(),
        },
        update: {},
      });
    }
  }
  await db.setting.upsert({
    where: { id: 'site' },
    create: { id: 'site', value: DEFAULT_SETTINGS as unknown as Prisma.InputJsonValue },
    update: {},
  });
  await db.aiBudget.upsert({
    where: { id: 'site' },
    create: { id: 'site', limitMicroUsd: 2_000_000 },
    update: {},
  });
  console.log(
    `Seeded ${tasks.length} projects, ${lessons.length} lessons, ${questions.length} questions, ${catalog.length} sources and ${faq.length} FAQ answers. Existing published content was preserved.`,
  );
}
seed().finally(() => db.$disconnect());
