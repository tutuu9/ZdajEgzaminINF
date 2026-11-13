import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';
import { hash as passwordHash } from 'bcryptjs';
import type {
  AttemptTicket,
  Bootstrap,
  CheckResponse,
  ExamStudyResponse,
  SandboxRunResponse,
  StudyCheckResponse,
  TheoryResult,
  TheoryTicket,
} from '@zdaj/shared';
import { toPublicQuestion } from '@zdaj/shared';
import { disableServerFeatures } from '../packages/database/src/site-only.js';

loadEnv({ quiet: true });
const originalDatabaseUrl = process.env.DATABASE_URL;
const databaseName = `zdaj_api_test_${randomUUID().replaceAll('-', '')}`;
const dataDir = resolve('data', databaseName);
let control: Pool;
let db: (typeof import('@zdaj/database'))['db'];
let app: Awaited<ReturnType<(typeof import('../apps/api/src/main.js'))['createApp']>>;
let baseUrl = '';
let createdDatabase = false;
const actualFetch = globalThis.fetch;

class Client {
  cookies = new Map<string, string>();
  csrf = '';
  async request<T = Record<string, unknown>>(
    path: string,
    method = 'GET',
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ) {
    const response = await actualFetch(baseUrl + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        Cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '),
        'X-CSRF-Token': this.csrf,
        Origin: 'http://127.0.0.1:5173',
        ...extraHeaders,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const index = pair!.indexOf('=');
      this.cookies.set(pair!.slice(0, index), pair!.slice(index + 1));
    }
    return { status: response.status, data: (await response.json()) as T };
  }
  async init() {
    this.csrf = (await this.request<{ csrfToken: string }>('/session')).data.csrfToken;
    return this;
  }
}
let learner: Client;
let owner: Client;
let seed: typeof import('@zdaj/content');
const joinStudyPath = (id: string) => resolve(dataDir, 'jobs', id, 'project.json');
async function legacyPractice(mode: 'nauka' | 'trening' | 'egzamin' = 'trening') {
  // Existing authored attempts remain valid; public creation is tested separately below.
  const token = randomBytes(32).toString('base64url');
  const deadlineAt = mode === 'egzamin' ? new Date(Date.now() + 150 * 60_000) : null;
  const row = await db.attemptTicket.create({
    data: {
      taskId: 'biblioteka',
      taskVersion: seed.tasks.find((task) => task.id === 'biblioteka')!.version,
      mode,
      level: 'beginner',
      tokenHash: createHash('sha256').update(token).digest('hex'),
      deadlineAt,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  return { id: row.id, token, deadlineAt: deadlineAt?.toISOString() ?? null };
}

async function studyPractice(mode: 'nauka' | 'trening' | 'egzamin' = 'nauka') {
  const token = randomBytes(32).toString('base64url');
  const row = await db.attemptTicket.create({
    data: {
      taskId: 'inf03-01-25-01-sg',
      taskVersion: 1,
      mode,
      level: 'beginner',
      tokenHash: createHash('sha256').update(token).digest('hex'),
      deadlineAt: mode === 'egzamin' ? new Date(Date.now() + 150 * 60_000) : null,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  return { id: row.id, token };
}

async function practice(taskId: string, mode: 'nauka' | 'trening' | 'egzamin' = 'nauka') {
  const token = randomBytes(32).toString('base64url');
  const row = await db.attemptTicket.create({
    data: {
      taskId,
      taskVersion: 1,
      mode,
      level: 'beginner',
      tokenHash: createHash('sha256').update(token).digest('hex'),
      deadlineAt: mode === 'egzamin' ? new Date(Date.now() + 150 * 60_000) : null,
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  return { id: row.id, token };
}

async function enableStudyWorker() {
  await owner.request('/admin/settings', 'PATCH', { checkingEnabled: true, queueLimit: 20 });
  const day = new Date(new Date().toISOString().slice(0, 10));
  await db.metric.upsert({
    where: { key_day: { key: 'worker.local-development.lastSeen', day } },
    create: { key: 'worker.local-development.lastSeen', day, value: Math.floor(Date.now() / 1000) },
    update: { value: Math.floor(Date.now() / 1000) },
  });
}

async function legacyTheory(
  mode: 'nauka' | 'trening' | 'egzamin' = 'egzamin',
  count = 40,
): Promise<TheoryTicket> {
  const selected = seed.questions.slice(0, count);
  const token = randomBytes(32).toString('base64url');
  const deadlineAt = mode === 'egzamin' ? new Date(Date.now() + 3_600_000) : null;
  const row = await db.attemptTicket.create({
    data: {
      mode,
      level: 'beginner',
      tokenHash: createHash('sha256').update(token).digest('hex'),
      deadlineAt,
      expiresAt: new Date(Date.now() + 86_400_000),
      questionRefs: selected.map((q) => ({
        key: q.id,
        version: q.version,
        optionOrder: q.options.map((option) => option.id),
      })),
    },
  });
  return {
    id: row.id,
    token,
    deadlineAt: deadlineAt?.toISOString() ?? null,
    questions: selected.map(toPublicQuestion),
  };
}

beforeAll(async () => {
  if (!originalDatabaseUrl)
    throw new Error(
      'DATABASE_URL must point to the project development PostgreSQL. API tests create and remove a separate test database.',
    );
  control = new Pool({ connectionString: originalDatabaseUrl });
  if (!/^zdaj_api_test_[a-f0-9]+$/.test(databaseName))
    throw new Error('Unsafe test database name.');
  await control.query(`CREATE DATABASE "${databaseName}"`);
  createdDatabase = true;
  const url = new URL(originalDatabaseUrl);
  url.pathname = `/${databaseName}`;
  process.env.DATABASE_URL = url.toString();
  process.env.DATA_DIR = dataDir;
  process.env.API_NO_LISTEN = '1';
  process.env.APP_ORIGIN = 'http://127.0.0.1:5173';
  process.env.DEEPSEEK_API_KEY = 'test-provider-key-never-sent';
  process.env.NODE_ENV = 'test';
  process.env.RUNNER_PROFILE = 'local-development';
  process.env.PUBLIC_SANDBOX_VERIFIED = 'false';
  const testPool = new Pool({ connectionString: url.toString() });
  const migrations = 'packages/database/prisma/migrations';
  for (const directory of (await readdir(migrations, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    await testPool.query(await readFile(`${migrations}/${directory.name}/migration.sql`, 'utf8'));
  }
  await testPool.end();
  ({ db } = await import('@zdaj/database'));
  seed = await import('@zdaj/content');
  for (const [kind, records] of Object.entries({
    task: [...seed.tasks, ...seed.officialTasks],
    lesson: seed.lessons,
    question: [...seed.questions, ...seed.officialQuestions],
    catalog: seed.catalog,
  })) {
    for (const record of records) {
      await db.contentRevision.create({
        data: {
          kind,
          key: record.id,
          version: 'version' in record ? record.version : 1,
          status: 'published',
          payload: JSON.parse(JSON.stringify(record)) as object,
          publishedAt: new Date(),
        },
      });
    }
  }
  const { DEFAULT_SETTINGS } = await import('@zdaj/shared');
  await db.setting.create({ data: { id: 'site', value: { ...DEFAULT_SETTINGS } } });
  await db.aiBudget.create({ data: { id: 'site' } });
  await db.admin.create({
    data: {
      username: 'test-owner',
      passwordHash: await passwordHash('This-is-only-a-test-password!', 12),
    },
  });
  const day = new Date(new Date().toISOString().slice(0, 10));
  await db.metric.create({
    data: { key: 'worker.local-development.lastSeen', day, value: Math.floor(Date.now() / 1000) },
  });
  const { createApp } = await import('../apps/api/src/main.js');
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  baseUrl = `${await app.getUrl()}/api/v1`;
  learner = await new Client().init();
  owner = await new Client().init();
  const login = await owner.request('/admin/login', 'POST', {
    username: 'test-owner',
    password: 'This-is-only-a-test-password!',
  });
  expect(login.status).toBe(201);
}, 180_000);

afterAll(async () => {
  vi.unstubAllGlobals();
  await app?.close();
  await db?.$disconnect();
  if (createdDatabase) await control.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await control?.end();
  const allowed = resolve('data') + sep;
  if (!dataDir.startsWith(allowed)) throw new Error('Unsafe test cleanup path.');
  await rm(dataDir, { recursive: true, force: true });
  if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
}, 180_000);

describe('real Nest API and PostgreSQL boundaries', () => {
  it('disables public server features atomically without resetting budgets or other settings', async () => {
    const original = await db.setting.findUniqueOrThrow({ where: { id: 'site' } });
    const budget = await db.aiBudget.findUniqueOrThrow({ where: { id: 'site' } });
    const configured = {
      ...(original.value as object),
      aiEnabled: true,
      checkingEnabled: true,
      queueLimit: 7,
      futureSetting: 'preserved',
    };
    try {
      await db.setting.update({ where: { id: 'site' }, data: { value: configured } });
      await disableServerFeatures(db);
      await disableServerFeatures(db);
      const updated = await db.setting.findUniqueOrThrow({ where: { id: 'site' } });
      expect(updated.value).toEqual({
        ...configured,
        aiEnabled: false,
        checkingEnabled: false,
        runtimeRunsEnabled: false,
      });
      expect(await db.aiBudget.findUniqueOrThrow({ where: { id: 'site' } })).toEqual(budget);
      expect((await learner.request<Bootstrap>('/bootstrap')).data.features).toEqual({
        aiAvailable: false,
        checkingAvailable: false,
        runsAvailable: false,
      });
      await db.setting.delete({ where: { id: 'site' } });
      await expect(disableServerFeatures(db)).rejects.toThrow('settings are missing');
    } finally {
      await db.setting.upsert({
        where: { id: 'site' },
        create: { id: 'site', value: original.value as object },
        update: { value: original.value as object },
      });
    }
  });

  it('retrieves an immutable requested guide revision and rejects missing versions', async () => {
    const ticket = await studyPractice();
    for (const version of [1, 2, 3]) {
      const response = await learner.request<ExamStudyResponse>(
        `/attempts/${ticket.id}/study`,
        'POST',
        { token: ticket.token, guideVersion: version },
      );
      expect(response.status).toBe(201);
      expect(response.data.guide.version).toBe(version);
      expect(response.data.guide).toEqual(
        seed.allExamStudyGuides.find(
          (guide) => guide.taskId === 'inf03-01-25-01-sg' && guide.version === version,
        ),
      );
    }
    expect(
      (
        await learner.request(`/attempts/${ticket.id}/study`, 'POST', {
          token: ticket.token,
          guideVersion: 99999,
        })
      ).status,
    ).toBe(404);
  });

  it('checks successive learning revisions without closing an attempt and recovers a lost response', async () => {
    await enableStudyWorker();
    const ticket = await studyPractice();
    const path = `/attempts/${ticket.id}/study/checks`;
    const request = {
      token: ticket.token,
      guideVersion: 3,
      activityId: 'calculator/calculator-check',
      projectRevision: 7,
      files: [{ path: 'raty.html', content: '<p>Moja wersja</p>', encoding: 'utf8' }],
    };
    const responses = await Promise.all([
      learner.request<{ id: string; token: string; status: string }>(path, 'POST', request),
      learner.request<{ id: string; token: string; status: string }>(path, 'POST', request),
    ]);
    expect(responses.map((response) => response.status)).toEqual([201, 201]);
    expect(responses[0]!.data).toEqual(responses[1]!.data);
    const job = responses[0]!.data;
    expect(await db.studyCheckJob.count({ where: { attemptId: ticket.id } })).toBe(1);
    expect(
      (await db.attemptTicket.findUniqueOrThrow({ where: { id: ticket.id } })).submittedAt,
    ).toBeNull();
    expect((await learner.request(`/study/checks/${job.id}`)).status).toBe(404);
    expect(
      (
        await learner.request(`/study/checks/${job.id}`, 'GET', undefined, {
          'X-Check-Token': 'wrong',
        })
      ).status,
    ).toBe(404);
    expect(
      (await learner.request(`/study/checks/${job.id}/ack`, 'POST', { token: job.token })).status,
    ).toBe(409);
    expect((await learner.request(path, 'POST', { ...request, projectRevision: 8 })).status).toBe(
      409,
    );
    const row = await db.studyCheckJob.findUniqueOrThrow({ where: { id: job.id } });
    const { studyInputHash } = await import('@zdaj/checker');
    expect(row.inputHash).toBe(
      studyInputHash(request.files as { path: string; content: string; encoding: 'utf8' }[]),
    );
    expect(JSON.parse(await readFile(row.inputPath, 'utf8'))).toEqual(request.files);
    const report = {
      guideId: row.guideId,
      guideVersion: 3,
      activityId: row.activityId,
      projectRevision: 7,
      inputHash: row.inputHash,
      createdAt: new Date().toISOString(),
      status: 'failed',
      results: [
        {
          id: 'calculator',
          title: 'Kalkulator',
          status: 'failed',
          evidence: 'Brak działania.',
          recommendation: 'Sprawdź obsługę kliknięcia.',
        },
      ],
      disclaimer: 'Edukacyjne sprawdzenie.',
    };
    await db.studyCheckJob.update({
      where: { id: job.id },
      data: { status: 'completed', report, finishedAt: new Date() },
    });
    const received = await learner.request<StudyCheckResponse>(
      `/study/checks/${job.id}`,
      'GET',
      undefined,
      { 'X-Check-Token': job.token },
    );
    expect(received.data.report).toEqual(report);
    expect(received.data.report).not.toHaveProperty('percentage');
    const next = await learner.request<{ id: string; token: string }>(path, 'POST', {
      ...request,
      projectRevision: 8,
      files: [{ path: 'raty.html', content: '<p>Druga wersja</p>' }],
    });
    expect(next.status).toBe(201);
    expect(next.data.id).not.toBe(job.id);
    expect(
      (await db.attemptTicket.findUniqueOrThrow({ where: { id: ticket.id } })).submittedAt,
    ).toBeNull();
    await db.studyCheckJob.update({
      where: { id: next.data.id },
      data: { status: 'failed', error: 'Test cleanup' },
    });
    expect(
      (await learner.request(`/study/checks/${job.id}/ack`, 'POST', { token: job.token })).status,
    ).toBe(201);
    expect(await readFile(row.inputPath).catch(() => null)).toBeNull();
    expect(
      (
        await learner.request(`/study/checks/${next.data.id}/ack`, 'POST', {
          token: next.data.token,
        })
      ).status,
    ).toBe(201);
    expect(await db.checkJob.count({ where: { attemptId: ticket.id } })).toBe(0);
  });

  it('enforces study secrets, exam gating, adapter allowlist and unavailable-runtime fallback', async () => {
    const ticket = await studyPractice();
    const request = {
      token: ticket.token,
      guideVersion: 3,
      activityId: 'calculator/calculator-check',
      projectRevision: 0,
      files: [{ path: 'raty.html', content: '<p>Próba</p>' }],
    };
    const path = `/attempts/${ticket.id}/study/checks`;
    expect((await learner.request(path, 'POST', request, { 'X-CSRF-Token': '' })).status).toBe(403);
    expect(
      (await learner.request(path, 'POST', { ...request, token: 'x'.repeat(32) })).status,
    ).toBe(404);
    expect((await learner.request(path, 'POST', { ...request, guideVersion: 999 })).status).toBe(
      404,
    );
    expect(
      (await learner.request(path, 'POST', { ...request, activityId: 'unknown/unknown' })).status,
    ).toBe(404);
    expect(
      (await learner.request(path, 'POST', { ...request, command: 'arbitrary execution' })).status,
    ).toBe(400);
    const guide = seed.examStudyGuides.find((guide) => guide.taskId === 'inf03-01-25-01-sg')!;
    const manual = guide.steps
      .flatMap((step) =>
        step.activities!.map((activity) => ({ id: `${step.id}/${activity.id}`, activity })),
      )
      .find(({ activity }) => !activity.checks?.some((check) => check.kind === 'runtime'))!;
    expect(
      (await learner.request(path, 'POST', { ...request, activityId: manual.id })).status,
    ).toBe(503);
    const exam = await studyPractice('egzamin');
    expect(
      (
        await learner.request(`/attempts/${exam.id}/study/checks`, 'POST', {
          ...request,
          token: exam.token,
        })
      ).status,
    ).toBe(403);
    await owner.request('/admin/settings', 'PATCH', { checkingEnabled: false });
    expect((await learner.request(path, 'POST', request)).status).toBe(503);
    expect(await db.studyCheckJob.count()).toBe(0);
    await enableStudyWorker();
  });

  it('shares one execution slot and queue capacity across final and study jobs', async () => {
    await enableStudyWorker();
    await db.checkJob.deleteMany();
    await db.studyCheckJob.deleteMany();
    const ticket = await studyPractice();
    const finalTicket = await legacyPractice();
    const final = await learner.request<{ id: string }>('/checks', 'POST', {
      attemptId: finalTicket.id,
      attemptToken: finalTicket.token,
      files: [{ path: 'index.php', content: '<?php echo 1;' }],
    });
    expect(final.status).toBe(201);
    const request = {
      token: ticket.token,
      guideVersion: 3,
      activityId: 'calculator/calculator-check',
      projectRevision: 0,
      files: [{ path: 'raty.html', content: '<p>Test</p>' }],
    };
    const study = await learner.request<{ id: string }>(
      `/attempts/${ticket.id}/study/checks`,
      'POST',
      request,
    );
    expect(study.status).toBe(201);
    const { claimJob } = await import('../apps/worker/src/queue.js');
    const claims = await Promise.all([claimJob(db), claimJob(db)]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(claims.find(Boolean)!.kind).toBe('final');
    const claimedFinal = claims.find(Boolean)!;
    expect(
      claimedFinal.leaseUntil!.getTime() - claimedFinal.startedAt!.getTime(),
    ).toBeGreaterThanOrEqual(240000);
    // Slow trusted preflight must not allow another worker to overlap the old
    // three-minute lease boundary while the current four-minute lease is live.
    await db.checkJob.update({
      where: { id: claimedFinal.id },
      data: {
        startedAt: new Date(Date.now() - 185000),
        leaseUntil: new Date(Date.now() + 55000),
      },
    });
    expect(await claimJob(db)).toBeNull();
    await db.checkJob.update({
      where: { id: final.data.id },
      data: { status: 'completed', leaseUntil: null },
    });
    const claimedStudy = await claimJob(db);
    expect(claimedStudy?.kind).toBe('study');
    expect(
      claimedStudy!.leaseUntil!.getTime() - claimedStudy!.startedAt!.getTime(),
    ).toBeGreaterThanOrEqual(240000);
    await db.studyCheckJob.update({
      where: { id: study.data.id },
      data: { status: 'completed', leaseUntil: null },
    });
    const sample = await db.studyCheckJob.findUniqueOrThrow({ where: { id: study.data.id } });
    for (let index = 0; index < 20; index++)
      await db.studyCheckJob.create({
        data: {
          ...sample,
          id: randomUUID(),
          attemptId: randomUUID(),
          status: 'queued',
          inputPath: joinStudyPath(randomUUID()),
          report: undefined,
          createdAt: new Date(),
        },
      });
    const another = await legacyPractice();
    expect(
      (
        await learner.request('/checks', 'POST', {
          attemptId: another.id,
          attemptToken: another.token,
          files: [{ path: 'index.php', content: '<?php echo 1;' }],
        })
      ).status,
    ).toBe(429);
    const anotherStudy = await studyPractice();
    expect(
      (
        await learner.request(`/attempts/${anotherStudy.id}/study/checks`, 'POST', {
          ...request,
          token: anotherStudy.token,
        })
      ).status,
    ).toBe(429);
    expect(
      (await db.attemptTicket.findUniqueOrThrow({ where: { id: anotherStudy.id } })).submittedAt,
    ).toBeNull();
    await db.checkJob.deleteMany();
    await db.studyCheckJob.deleteMany();
  });

  it('removes expired study uploads and reports even without a running worker', async () => {
    const id = randomUUID();
    const inputPath = joinStudyPath(id);
    await mkdir(resolve(inputPath, '..'), { recursive: true });
    await writeFile(inputPath, '[]');
    await db.studyCheckJob.create({
      data: {
        id,
        secretHash: 'test',
        attemptId: randomUUID(),
        taskId: 'inf03-01-25-01-sg',
        taskVersion: 1,
        guideId: 'test',
        guideVersion: 3,
        activityId: 'calculator/calculator-check',
        projectRevision: 0,
        inputHash: 'test',
        adapterId: 'kursy-calculator',
        inputPath,
        expiresAt: new Date(Date.now() - 1000),
        status: 'queued',
      },
    });
    const { cleanupExpiredStudyChecks } = await import('../apps/api/src/study-checks.js');
    await cleanupExpiredStudyChecks();
    expect(await db.studyCheckJob.findUnique({ where: { id } })).toBeNull();
    expect(await readFile(inputPath).catch(() => null)).toBeNull();
  });
  it('queues a learner SQL/PHP run in an open exam, keeps its input in the row and returns the result once', async () => {
    await enableStudyWorker();
    await owner.request('/admin/settings', 'PATCH', { runtimeRunsEnabled: true });
    await db.sandboxRunJob.deleteMany();
    try {
      expect((await learner.request<Bootstrap>('/bootstrap')).data.features.runsAvailable).toBe(
        true,
      );
      const ticket = await practice('inf03-01-24-06-sg', 'egzamin');
      const path = `/attempts/${ticket.id}/runs`;
      const request = {
        token: ticket.token,
        projectRevision: 4,
        run: {
          database: 'motory',
          dumpPath: 'baza.sql',
          sql: 'SELECT 1;',
          php: { entry: 'motor.php', method: 'GET', fields: [['id', '2']] },
          ignored: true,
        },
        files: [
          { path: 'baza.sql', content: 'CREATE TABLE a (id INT);' },
          { path: 'motor.php', content: '<?php echo 1;' },
          { path: 'motor.png', content: 'iVBORw0KGgo=', encoding: 'base64' },
        ],
      };
      type Queued = { id: string; token: string; status: string };
      const responses = await Promise.all([
        learner.request<Queued>(path, 'POST', request),
        learner.request<Queued>(path, 'POST', request),
      ]);
      expect(responses.map((response) => response.status)).toEqual([201, 201]);
      expect(responses[0]!.data).toEqual(responses[1]!.data);
      const job = responses[0]!.data;
      expect(job.status).toBe('queued');
      expect(await db.sandboxRunJob.count({ where: { attemptId: ticket.id } })).toBe(1);
      // Running the code neither submits nor closes the exam attempt.
      expect(
        (await db.attemptTicket.findUniqueOrThrow({ where: { id: ticket.id } })).submittedAt,
      ).toBeNull();
      const row = await db.sandboxRunJob.findUniqueOrThrow({ where: { id: job.id } });
      // Images are dropped and unknown request fields do not reach the worker.
      expect(row.input).toEqual({
        run: {
          database: 'motory',
          dumpPath: 'baza.sql',
          sql: 'SELECT 1;',
          php: { entry: 'motor.php', method: 'GET', fields: [['id', '2']] },
        },
        files: [
          { path: 'baza.sql', content: 'CREATE TABLE a (id INT);', encoding: 'utf8' },
          { path: 'motor.php', content: '<?php echo 1;', encoding: 'utf8' },
        ],
      });
      expect(row.secretHash).not.toContain(job.token);
      expect(await readdir(resolve(dataDir, 'jobs', job.id)).catch(() => null)).toBeNull();

      expect((await learner.request(`/runs/${job.id}`)).status).toBe(404);
      expect(
        (await learner.request(`/runs/${job.id}`, 'GET', undefined, { 'X-Run-Token': 'wrong' }))
          .status,
      ).toBe(404);
      expect(
        (await learner.request(`/runs/${job.id}/ack`, 'POST', { token: job.token })).status,
      ).toBe(409);
      expect(
        (
          await learner.request(path, 'POST', {
            ...request,
            run: { ...request.run, sql: 'SELECT 2;' },
          })
        ).status,
      ).toBe(409);

      const { claimJob } = await import('../apps/worker/src/queue.js');
      const claims = await Promise.all([claimJob(db), claimJob(db)]);
      expect(claims.filter(Boolean)).toHaveLength(1);
      expect(claims.find(Boolean)).toMatchObject({ id: job.id, kind: 'run', status: 'running' });
      const result = {
        database: 'motory',
        import: { ok: true, tables: [{ name: 'a', rows: 0 }] },
        statements: [{ index: 0, text: 'SELECT 1', status: 'rows', columns: ['1'], rows: [['1']] }],
        omittedStatements: 0,
        php: null,
        serverStopped: false,
        runtimeMs: 1400,
        disclaimer: 'To wynik uruchomienia, nie ocena CKE.',
      };
      const { Prisma } = await import('@prisma/client');
      await db.sandboxRunJob.update({
        where: { id: job.id },
        data: { status: 'completed', result, input: Prisma.DbNull, leaseUntil: null },
      });
      const ready = await learner.request<SandboxRunResponse>(`/runs/${job.id}`, 'GET', undefined, {
        'X-Run-Token': job.token,
      });
      expect(ready.data).toEqual({ id: job.id, status: 'completed', result });
      expect(
        (await learner.request(`/runs/${job.id}/ack`, 'POST', { token: job.token })).status,
      ).toBe(201);
      expect(await db.sandboxRunJob.findUnique({ where: { id: job.id } })).toBeNull();
    } finally {
      await db.sandboxRunJob.deleteMany();
      await owner.request('/admin/settings', 'PATCH', { runtimeRunsEnabled: false });
    }
  });

  it('stores a worker run result and clears the learner input in every outcome', async () => {
    const { executeRunJob, RUN_FAILED } = await import('../apps/worker/src/run-job.js');
    const options = { dataDir, profile: 'local-development' as const };
    const input = {
      run: { database: 'motory', dumpPath: null, sql: 'SELECT 1;', php: null },
      files: [{ path: 'kwerendy.txt', content: 'SELECT 1;' }],
    };
    const create = () =>
      db.sandboxRunJob.create({
        data: {
          secretHash: 'test',
          attemptId: randomUUID(),
          taskId: 'inf03-01-24-06-sg',
          taskVersion: 1,
          projectRevision: 0,
          inputHash: randomUUID(),
          status: 'running',
          leaseUntil: new Date(Date.now() + 240_000),
          input,
          expiresAt: new Date(Date.now() + 900_000),
        },
      });
    try {
      const completed = await create();
      const seen: unknown[] = [];
      const result = { database: 'motory', statements: [], runtimeMs: 1234 };
      expect(
        await executeRunJob(db, completed, options, async (run, files, runner) => {
          seen.push(run, files, runner.jobId);
          return result as never;
        }),
      ).toBe(1234);
      expect(seen).toEqual([input.run, input.files, completed.id]);
      expect(
        await db.sandboxRunJob.findUniqueOrThrow({ where: { id: completed.id } }),
      ).toMatchObject({ status: 'completed', result, input: null, leaseUntil: null, error: null });

      const failed = await create();
      expect(
        await executeRunJob(db, failed, options, async () => {
          throw new Error('SELECT secret_from_learner_code');
        }),
      ).toBeNull();
      const row = await db.sandboxRunJob.findUniqueOrThrow({ where: { id: failed.id } });
      expect(row).toMatchObject({ status: 'failed', error: RUN_FAILED, input: null, result: null });
      expect(JSON.stringify(row)).not.toContain('secret_from_learner_code');

      const empty = await create();
      await db.sandboxRunJob.update({ where: { id: empty.id }, data: { input: { files: 'x' } } });
      expect(
        await executeRunJob(
          db,
          await db.sandboxRunJob.findUniqueOrThrow({ where: { id: empty.id } }),
          options,
          async () => {
            throw new Error('The runner must not start without valid input.');
          },
        ),
      ).toBeNull();
    } finally {
      await db.sandboxRunJob.deleteMany();
    }
  });

  it('refuses learner runs when disabled, unauthorised, out of scope, oversized or over capacity', async () => {
    await enableStudyWorker();
    await db.sandboxRunJob.deleteMany();
    const ticket = await practice('inf03-01-24-06-sg');
    const path = `/attempts/${ticket.id}/runs`;
    const files = [{ path: 'baza.sql', content: 'CREATE TABLE a (id INT);' }];
    const request = {
      token: ticket.token,
      projectRevision: 0,
      run: { database: 'motory', dumpPath: 'baza.sql', sql: '', php: null },
      files,
    };
    const submit = (override: object = {}, target = path) =>
      learner.request(target, 'POST', { ...request, ...override }).then(({ status }) => status);
    try {
      // The flag is off by default: nothing is queued and the interface is told so.
      expect(await submit()).toBe(503);
      expect((await learner.request<Bootstrap>('/bootstrap')).data.features.runsAvailable).toBe(
        false,
      );
      await owner.request('/admin/settings', 'PATCH', {
        runtimeRunsEnabled: true,
        checkingEnabled: false,
      });
      expect(await submit()).toBe(503);
      expect(await db.sandboxRunJob.count()).toBe(0);
      await owner.request('/admin/settings', 'PATCH', { checkingEnabled: true });

      expect(await submit({ token: 'x'.repeat(32) })).toBe(404);
      const noDatabasePart = await practice('inf03-01-24-01-sg');
      expect(
        await submit({ token: noDatabasePart.token }, `/attempts/${noDatabasePart.id}/runs`),
      ).toBe(400);
      for (const run of [
        { ...request.run, database: 'mysql' },
        { ...request.run, database: 'a`; DROP DATABASE mysql; --' },
        { ...request.run, dumpPath: 'inna.sql' },
        { ...request.run, dumpPath: '../baza.sql' },
        { ...request.run, php: { entry: 'brak.php', method: 'GET', fields: [] } },
        { database: 'motory', dumpPath: null, sql: '', php: null },
      ])
        expect(await submit({ run }), JSON.stringify(run)).toBe(400);
      expect(
        await submit({ files: [{ path: 'baza.sql', content: 'x'.repeat(2 * 1024 * 1024 + 1) }] }),
      ).toBe(400);
      expect(
        await submit({
          files: [...files, { path: 'dane.txt', content: 'x'.repeat(4 * 1024 * 1024 + 1) }],
        }),
      ).toBe(413);
      expect(await db.sandboxRunJob.count()).toBe(0);

      await owner.request('/admin/settings', 'PATCH', { queueLimit: 1 });
      expect(await submit()).toBe(201);
      const other = await practice('inf03-03-24-06-sg');
      expect(await submit({ token: other.token }, `/attempts/${other.id}/runs`)).toBe(429);
      expect(await db.sandboxRunJob.count()).toBe(1);

      await db.sandboxRunJob.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      const { cleanupExpiredSandboxRuns } = await import('../apps/api/src/sandbox-runs.js');
      await cleanupExpiredSandboxRuns();
      expect(await db.sandboxRunJob.count()).toBe(0);
    } finally {
      await db.sandboxRunJob.deleteMany();
      await owner.request('/admin/settings', 'PATCH', {
        runtimeRunsEnabled: false,
        checkingEnabled: true,
        queueLimit: 20,
      });
    }
  });

  it('offers only reviewed CKE practice and theory while withholding authored exercises and private checks', async () => {
    const { status, data } = await learner.request<Bootstrap>('/bootstrap');
    expect(status).toBe(200);
    expect(data.tasks).toHaveLength(8);
    expect(data.questionCount).toBe(seed.officialQuestions.length);
    expect(data.questionCount).toBeLessThan(40);
    expect(data.exercises).toEqual([]);
    expect(data.tasks.map((task) => task.id).sort()).toEqual(
      seed.officialTasks.map((task) => task.id).sort(),
    );
    expect(data.tasks.some((task) => seed.tasks.some((authored) => authored.id === task.id))).toBe(
      false,
    );
    expect(data.lessons[0]?.id).toBe('pliki-projektu');
    for (const task of data.tasks) {
      expect(task.origin).toBe('exam');
      expect(task.qualification).toBe('INF.03');
      expect(task.sourceCatalogId).toBeTruthy();
      expect(task.supportStatus).toBe('catalog-only');
      expect(task).not.toHaveProperty('hints');
      task.criteria.forEach((criterion) => expect(criterion).not.toHaveProperty('check'));
    }
    expect(data.lessons.every((lesson) => lesson.exerciseIds.length === 0)).toBe(true);
  });

  it('requires CSRF and administrator identity on modifying routes', async () => {
    const missingCsrf = await learner.request('/attempts', 'POST', {}, { 'X-CSRF-Token': '' });
    expect(missingCsrf.status).toBe(403);
    const hostileOrigin = await learner.request(
      '/attempts',
      'POST',
      {},
      { Origin: 'https://attacker.invalid' },
    );
    expect(hostileOrigin.status).toBe(403);
    expect((await learner.request('/admin/dashboard')).status).toBe(401);
    expect((await learner.request('/admin/settings', 'PATCH', { aiEnabled: true })).status).toBe(
      401,
    );
  });

  it('starts official practical work and closes it manually without a fabricated score or checker job', async () => {
    const task = seed.officialTasks[0]!;
    const started = await learner.request<AttemptTicket>('/attempts', 'POST', {
      taskId: task.id,
      taskVersion: task.version,
      mode: 'egzamin',
      level: 'beginner',
    });
    expect(started.status).toBe(201);
    expect(new Date(started.data.deadlineAt!).getTime() - Date.now()).toBeGreaterThan(149 * 60_000);
    const id = started.data.id;
    const token = started.data.token;
    expect(
      (
        await learner.request('/checks', 'POST', {
          attemptId: id,
          attemptToken: token,
          files: [{ path: '../invalid.php', content: 'not executed' }],
        })
      ).status,
    ).toBe(503);
    expect(await db.checkJob.count({ where: { attemptId: id } })).toBe(0);
    expect((await db.attemptTicket.findUniqueOrThrow({ where: { id } })).submittedAt).toBeNull();
    expect(
      (await learner.request(`/attempts/${id}/complete`, 'POST', { token }, { 'X-CSRF-Token': '' }))
        .status,
    ).toBe(403);
    expect(
      (await learner.request(`/attempts/${id}/complete`, 'POST', { token: 'wrong-secret' })).status,
    ).toBe(404);
    const completed = await learner.request<{ submittedAt: string }>(
      `/attempts/${id}/complete`,
      'POST',
      { token },
    );
    expect(completed.status).toBe(201);
    expect(Object.keys(completed.data)).toEqual(['submittedAt']);
    expect(Number.isFinite(new Date(completed.data.submittedAt).getTime())).toBe(true);
    expect((await learner.request(`/attempts/${id}/complete`, 'POST', { token })).data).toEqual(
      completed.data,
    );
    expect(await db.checkJob.count({ where: { attemptId: id } })).toBe(0);
    const authored = seed.tasks[0]!;
    expect((await learner.request(`/tasks/${authored.id}`)).status).toBe(404);
    expect(
      (await learner.request(`/tasks/${authored.id}?version=${authored.version}`)).status,
    ).toBe(200);
    expect(
      (
        await learner.request('/attempts', 'POST', {
          taskId: authored.id,
          taskVersion: authored.version,
          mode: 'nauka',
          level: 'beginner',
        })
      ).status,
    ).toBe(403);
  });

  it('reveals source-specific study guides only through a valid matching attempt secret', async () => {
    expect(seed.examStudyGuides).toHaveLength(seed.officialTasks.length);
    const publicData = (await learner.request<Bootstrap>('/bootstrap')).data;
    const publicJson = JSON.stringify(publicData);
    expect(publicData).not.toHaveProperty('examStudyGuides');
    for (const guide of seed.examStudyGuides) {
      const task = seed.officialTasks.find(
        (task) => task.id === guide.taskId && task.version === guide.taskVersion,
      )!;
      expect(task).toBeDefined();
      const publicTask = await learner.request(`/tasks/${task.id}?version=${task.version}`);
      const publicTaskJson = JSON.stringify(publicTask.data);
      for (const resource of guide.resources.filter(
        (resource) => resource.kind === 'solution-archive',
      )) {
        expect(publicJson).not.toContain(resource.url);
        expect(publicTaskJson).not.toContain(resource.url);
      }
      for (const step of guide.steps.filter((step) => step.code.length > 60)) {
        const code = JSON.stringify(step.code).slice(1, -1);
        expect(publicJson).not.toContain(code);
        expect(publicTaskJson).not.toContain(code);
      }
      for (const mode of ['nauka', 'trening'] as const) {
        const started = await learner.request<AttemptTicket>('/attempts', 'POST', {
          taskId: task.id,
          taskVersion: task.version,
          mode,
          level: 'beginner',
        });
        expect(started.status).toBe(201);
        const path = `/attempts/${started.data.id}/study`;
        expect(
          (
            await learner.request(
              path,
              'POST',
              { token: started.data.token },
              { 'X-CSRF-Token': '' },
            )
          ).status,
        ).toBe(403);
        expect((await learner.request(path, 'POST', { token: 'wrong-secret' })).status).toBe(404);
        expect(
          (
            await learner.request(path, 'POST', {
              token: started.data.token,
              taskId: 'a-different-task',
            })
          ).status,
        ).toBe(400);
        const revealed = await learner.request<ExamStudyResponse>(path, 'POST', {
          token: started.data.token,
        });
        expect(revealed.status).toBe(201);
        expect(revealed.data.guide).toEqual(guide);
        expect(revealed.data.guide.taskId).toBe(task.id);
        expect(revealed.data.guide.taskVersion).toBe(task.version);
        expect(revealed.data.hintCount).toBe(1);
      }
    }
    const guide = seed.examStudyGuides[0]!;
    const token = randomBytes(32).toString('base64url');
    const mismatched = await db.attemptTicket.create({
      data: {
        taskId: guide.taskId,
        taskVersion: guide.taskVersion + 1000,
        mode: 'nauka',
        level: 'beginner',
        tokenHash: createHash('sha256').update(token).digest('hex'),
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    expect(
      (await learner.request(`/attempts/${mismatched.id}/study`, 'POST', { token })).status,
    ).toBe(404);
    expect(
      (await db.attemptTicket.findUniqueOrThrow({ where: { id: mismatched.id } })).hintCount,
    ).toBe(0);
  });

  it('blocks study solutions during an open exam and permits review without changing historical aid counts', async () => {
    const guide = seed.examStudyGuides[0]!;
    const started = await learner.request<AttemptTicket>('/attempts', 'POST', {
      taskId: guide.taskId,
      taskVersion: guide.taskVersion,
      mode: 'egzamin',
      level: 'advanced',
    });
    expect(started.status).toBe(201);
    const path = `/attempts/${started.data.id}/study`;
    const body = { token: started.data.token };
    expect((await learner.request(path, 'POST', body)).status).toBe(403);
    expect(
      (await db.attemptTicket.findUniqueOrThrow({ where: { id: started.data.id } })).hintCount,
    ).toBe(0);
    expect(
      (await learner.request(`/attempts/${started.data.id}/complete`, 'POST', body)).status,
    ).toBe(201);
    const revealed = await learner.request<ExamStudyResponse>(path, 'POST', body);
    expect(revealed.status).toBe(201);
    expect(revealed.data.guide).toEqual(guide);
    expect(revealed.data.hintCount).toBe(0);
    expect((await learner.request<ExamStudyResponse>(path, 'POST', body)).data.hintCount).toBe(0);
  });

  it('uses only verified CKE question references and disables a misleading exam with source answers available', async () => {
    const exam = await learner.request('/theory/start', 'POST', { mode: 'egzamin', count: 40 });
    expect(exam.status).toBe(503);
    const started = await learner.request<TheoryTicket>('/theory/start', 'POST', {
      mode: 'trening',
      count: 40,
    });
    expect(started.status).toBe(201);
    expect(started.data.deadlineAt).toBeNull();
    expect(started.data.questions).toHaveLength(seed.officialQuestions.length);
    const officialById = new Map(seed.officialQuestions.map((question) => [question.id, question]));
    for (const question of started.data.questions) {
      const source = officialById.get(question.id)!;
      expect(source).toBeDefined();
      expect(question.source).toEqual(source.source);
      expect(question.source?.catalogId).toBe('cke-inf03-informator-2022');
      expect(question.source?.url).toBe('https://bip.cke.gov.pl/attachments/download/8580');
      expect(question.options.map((option) => option.id)).toEqual(
        source.options.map((option) => option.id),
      );
      expect(question).not.toHaveProperty('correctOptionId');
      expect(question.options.every((option) => !('explanation' in option))).toBe(true);
    }
    const answers = Object.fromEntries(
      started.data.questions.map((question) => [
        question.id,
        officialById.get(question.id)!.correctOptionId,
      ]),
    );
    const result = await learner.request<TheoryResult>(
      `/theory/${started.data.id}/submit`,
      'POST',
      { token: started.data.token, answers },
    );
    expect(result.status).toBe(201);
    expect(result.data.correct).toBe(seed.officialQuestions.length);
    expect(
      result.data.results.every(
        (result) => result.question.source?.catalogId === 'cke-inf03-informator-2022',
      ),
    ).toBe(true);
  });

  it('preserves existing exam attempts and enforces hint restrictions with idempotent grading', async () => {
    const started = { data: await legacyTheory() };
    expect(started.data.questions).toHaveLength(40);
    for (const question of started.data.questions) {
      expect(question).not.toHaveProperty('correctOptionId');
      question.options.forEach((option) => expect(option).not.toHaveProperty('explanation'));
    }
    const practical = await legacyPractice('egzamin');
    expect(
      (
        await learner.request('/hints', 'POST', {
          attemptId: practical.id,
          attemptToken: practical.token,
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await learner.request('/ai', 'POST', {
          attemptId: practical.id,
          attemptToken: practical.token,
          prompt: 'Pomóż mi.',
          code: '',
          consent: true,
        })
      ).status,
    ).toBe(403);
    const answers = Object.fromEntries(
      started.data.questions.map((q) => [
        q.id,
        seed.questions.find((original) => original.id === q.id)!.correctOptionId,
      ]),
    );
    const result = await learner.request<TheoryResult>(
      `/theory/${started.data.id}/submit`,
      'POST',
      { token: started.data.token, answers },
    );
    expect(result.data.correct).toBe(40);
    expect(result.data.passed).toBe(true);
    expect(result.data.results[0]?.optionExplanations).toBeDefined();
    const retry = await learner.request<TheoryResult>(`/theory/${started.data.id}/submit`, 'POST', {
      token: started.data.token,
      answers: {},
    });
    expect(retry.data).toEqual(result.data);
  });

  it('preserves late work but explicitly does not pass an expired exam', async () => {
    const started = await legacyTheory();
    await db.attemptTicket.update({
      where: { id: started.id },
      data: { deadlineAt: new Date(Date.now() - 60_000) },
    });
    const answers = Object.fromEntries(
      started.questions.map((q) => [
        q.id,
        seed.questions.find((original) => original.id === q.id)!.correctOptionId,
      ]),
    );
    const result = (
      await learner.request<TheoryResult>(`/theory/${started.id}/submit`, 'POST', {
        token: started.token,
        answers,
      })
    ).data;
    expect(result.correct).toBe(40);
    expect(result.timedOut).toBe(true);
    expect(result.passed).toBe(false);
  });

  it('recovers a lost check submission response without changing submitted files or its secret', async () => {
    const ticket = await legacyPractice();
    const files = seed.tasks[0]!.starterFiles;
    const first = await learner.request<{ id: string; token: string; status: string }>(
      '/checks',
      'POST',
      { attemptId: ticket.id, attemptToken: ticket.token, files },
    );
    expect(first.status).toBe(201);
    const retry = await learner.request<{ id: string; token: string; status: string }>(
      '/checks',
      'POST',
      {
        attemptId: ticket.id,
        attemptToken: ticket.token,
        files: [{ path: 'changed.txt', content: 'should not replace submission' }],
      },
    );
    expect(retry.data).toEqual(first.data);
    const job = await db.checkJob.findUniqueOrThrow({ where: { id: first.data.id } });
    expect(JSON.parse(await readFile(job.inputPath, 'utf8'))).toEqual(
      files.map((file) => ({ ...file, encoding: file.encoding ?? 'utf8' })),
    );
    expect(
      (await learner.request(`/checks/${job.id}`, 'GET', undefined, { 'X-Check-Token': 'wrong' }))
        .status,
    ).toBe(404);
    const status = await learner.request<CheckResponse>(`/checks/${job.id}`, 'GET', undefined, {
      'X-Check-Token': first.data.token,
    });
    expect(status.data.status).toBe('queued');
  });

  it('publishes a new question revision without changing a started theory attempt', async () => {
    const started = await legacyTheory('trening', 1);
    const original = seed.questions.find((q) => q.id === started.questions[0]!.id)!;
    const newCorrect = original.options.find(
      (option) => option.id !== original.correctOptionId,
    )!.id;
    const draft = await owner.request<{ id: string; version: number }>(
      '/admin/content/drafts',
      'POST',
      { kind: 'question', key: original.id, payload: { ...original, correctOptionId: newCorrect } },
    );
    expect(draft.status).toBe(201);
    expect(draft.data.version).toBe(original.version + 1);
    expect(
      (await owner.request(`/admin/content/${draft.data.id}/publish`, 'POST', {})).status,
    ).toBe(201);
    expect(
      (await owner.request(`/admin/content/${draft.data.id}/publish`, 'POST', {})).status,
    ).toBe(409);
    const graded = await learner.request<TheoryResult>(`/theory/${started.id}/submit`, 'POST', {
      token: started.token,
      answers: { [original.id]: original.correctOptionId },
    });
    expect(graded.data.correct).toBe(1);
  });

  it('detects source duplicates and only imports validated metadata', async () => {
    const preview = await owner.request<{ duplicates: string[] }>(
      '/admin/sources/preview',
      'POST',
      { entries: [seed.catalog[0]] },
    );
    expect(preview.data.duplicates).toContain(seed.catalog[0]!.id);
    expect(
      (await owner.request('/admin/sources/import', 'POST', { entries: [seed.catalog[0]] })).status,
    ).toBe(409);
    expect(
      (
        await owner.request('/admin/sources/preview', 'POST', {
          entries: [{ ...seed.catalog[0], sourceUrl: 'http://127.0.0.1/private' }],
        })
      ).status,
    ).toBe(400);
  });

  it('rejects ambiguous options and references to nonexistent curriculum items before publication', async () => {
    const question = seed.questions[0]!;
    const duplicateText = {
      ...question,
      options: question.options.map((option, index) =>
        index === 1 ? { ...option, text: question.options[0]!.text } : option,
      ),
    };
    expect(
      (
        await owner.request('/admin/content/drafts', 'POST', {
          kind: 'question',
          key: 'invalid-duplicate',
          payload: duplicateText,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await owner.request('/admin/content/drafts', 'POST', {
          kind: 'question',
          key: 'invalid-topic',
          payload: { ...question, topicId: 'not-a-topic' },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await owner.request('/admin/content/drafts', 'POST', {
          kind: 'lesson',
          key: 'invalid-exercise',
          payload: { ...seed.lessons[0], exerciseIds: ['missing-exercise'] },
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await owner.request('/admin/content/drafts', 'POST', {
          kind: 'task',
          key: 'invalid-starter',
          payload: {
            ...seed.tasks[0],
            starterFiles: [{ path: '../outside.php', content: '<?php' }],
          },
        })
      ).status,
    ).toBe(400);
  });

  it('atomically reserves the AI budget, blocks concurrent calls and accounts for uncertain calls', async () => {
    await owner.request('/admin/settings', 'PATCH', { aiEnabled: true });
    const ticket = await legacyPractice();
    const body = {
      attemptId: ticket.id,
      attemptToken: ticket.token,
      prompt: 'Wyjaśnij pierwszy krok.',
      code: '',
      consent: true,
    };
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let providerCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        providerCalls++;
        await gate;
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: 'Zacznij od utworzenia tabel.' } }],
            usage: { prompt_tokens: 100, completion_tokens: 20 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );
    const first = learner.request('/ai', 'POST', body);
    await vi.waitFor(() => expect(providerCalls).toBe(1));
    const during = await db.aiBudget.findUniqueOrThrow({ where: { id: 'site' } });
    expect(during.reservedMicroUsd).toBeGreaterThan(0);
    expect((await learner.request('/ai', 'POST', body)).status).toBe(429);
    release();
    expect((await first).status).toBe(201);
    expect(providerCalls).toBe(1);
    const completed = await db.aiBudget.findUniqueOrThrow({ where: { id: 'site' } });
    expect(completed.spentMicroUsd).toBe(54);
    expect(completed.reservedMicroUsd).toBe(0);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('simulated provider timeout');
      }),
    );
    expect((await learner.request('/ai', 'POST', body)).status).toBe(503);
    const uncertain = await db.aiBudget.findUniqueOrThrow({ where: { id: 'site' } });
    expect(uncertain.reservedMicroUsd).toBeGreaterThan(0);
    expect((await learner.request('/ai', 'POST', body)).status).toBe(429);
    expect((await owner.request('/admin/ai/settle-uncertain', 'POST', {})).status).toBe(201);
    const settled = await db.aiBudget.findUniqueOrThrow({ where: { id: 'site' } });
    expect(settled.reservedMicroUsd).toBe(0);
    expect(settled.spentMicroUsd).toBe(completed.spentMicroUsd + uncertain.reservedMicroUsd);
    vi.unstubAllGlobals();
  });

  it('does not debit a reservation twice when a delayed response follows conservative admin settlement', async () => {
    await db.rateLimit.deleteMany({ where: { key: { startsWith: 'ai:' } } });
    const ticket = await legacyPractice();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const provider = vi.fn(async () => {
      await gate;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Sprawdź typy kolumn.' } }],
          usage: { prompt_tokens: 100, completion_tokens: 20 },
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', provider);
    const pending = learner.request('/ai', 'POST', {
      attemptId: ticket.id,
      attemptToken: ticket.token,
      prompt: 'Wyjaśnij typy kolumn.',
      code: '',
      consent: true,
    });
    await vi.waitFor(() => expect(provider).toHaveBeenCalledOnce());
    await db.aiUsage.updateMany({
      where: { status: 'reserved' },
      data: { createdAt: new Date(Date.now() - 130_000) },
    });
    expect((await owner.request('/admin/ai/settle-uncertain', 'POST', {})).status).toBe(201);
    const settled = await db.aiBudget.findUniqueOrThrow({ where: { id: 'site' } });
    release();
    expect((await pending).status).toBe(201);
    const after = await db.aiBudget.findUniqueOrThrow({ where: { id: 'site' } });
    expect(after.reservedMicroUsd).toBe(0);
    expect(after.spentMicroUsd).toBe(settled.spentMicroUsd);
    expect(await db.aiUsage.count({ where: { status: 'uncertain' } })).toBe(0);
    vi.unstubAllGlobals();
  });

  it('never contacts the AI provider after the kill switch or when the remaining budget is insufficient', async () => {
    await db.rateLimit.deleteMany({ where: { key: { startsWith: 'ai:' } } });
    const ticket = await legacyPractice();
    const body = {
      attemptId: ticket.id,
      attemptToken: ticket.token,
      prompt: 'Pomóż w zadaniu.',
      code: '',
      consent: true,
    };
    const provider = vi.fn();
    vi.stubGlobal('fetch', provider);
    await owner.request('/admin/settings', 'PATCH', { aiEnabled: false });
    expect((await learner.request('/ai', 'POST', body)).status).toBe(503);
    await owner.request('/admin/settings', 'PATCH', { aiEnabled: true });
    await db.aiBudget.update({
      where: { id: 'site' },
      data: { limitMicroUsd: 2_000_000, spentMicroUsd: 1_999_999 },
    });
    expect((await learner.request('/ai', 'POST', body)).status).toBe(429);
    expect(provider).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('bounds a concurrent HTTP submission burst at 20 queued jobs and claims only one job at a time', async () => {
    const { claimJob } = await import('../apps/worker/src/queue.js');
    await db.checkJob.deleteMany();
    await db.rateLimit.deleteMany({
      where: { OR: [{ key: { startsWith: 'check:' } }, { key: { startsWith: 'attempt:' } }] },
    });
    await db.metric.updateMany({
      where: { key: 'worker.local-development.lastSeen' },
      data: { value: Math.floor(Date.now() / 1000) },
    });
    await owner.request('/admin/settings', 'PATCH', { checkingEnabled: true, queueLimit: 20 });
    const tickets = await Promise.all(Array.from({ length: 24 }, () => legacyPractice()));
    const started = performance.now();
    const timings: number[] = [];
    const responses = await Promise.all(
      tickets.map(async (ticket) => {
        const requestStarted = performance.now();
        const response = await learner.request('/checks', 'POST', {
          attemptId: ticket.id,
          attemptToken: ticket.token,
          files: [{ path: 'index.php', content: '<?php echo "synthetic burst";' }],
        });
        timings.push(performance.now() - requestStarted);
        return response;
      }),
    );
    const durationMs = Math.round(performance.now() - started);
    expect(responses.filter((response) => response.status === 201)).toHaveLength(20);
    expect(responses.filter((response) => response.status === 429)).toHaveLength(4);
    expect(await db.checkJob.count({ where: { status: 'queued' } })).toBe(20);
    expect(
      await db.attemptTicket.count({
        where: { id: { in: tickets.map((ticket) => ticket.id) }, submittedAt: null },
      }),
    ).toBe(4);
    const claimed = await Promise.all([
      claimJob(db, 'local-development'),
      claimJob(db, 'local-development'),
    ]);
    expect(claimed.filter(Boolean)).toHaveLength(1);
    expect(await db.checkJob.count({ where: { status: 'running' } })).toBe(1);
    expect(await claimJob(db, 'local-development')).toBeNull();
    await db.checkJob.update({
      where: { id: claimed.find(Boolean)!.id },
      data: { status: 'completed', leaseUntil: null },
    });
    expect(await claimJob(db, 'local-development')).not.toBeNull();
    const readsStarted = performance.now();
    const reads = await Promise.all(
      Array.from({ length: 30 }, () => learner.request('/bootstrap')),
    );
    expect(reads.every((response) => response.status === 200)).toBe(true);
    timings.sort((a, b) => a - b);
    await mkdir('artifacts', { recursive: true });
    await writeFile(
      'artifacts/api-load-report.json',
      JSON.stringify(
        {
          recordedAt: new Date().toISOString(),
          environment:
            'Local real HTTP/Nest/PostgreSQL; synthetic inputs; no code execution or paid AI',
          submissionBurst: {
            concurrentRequests: 24,
            accepted: 20,
            rejectedWith429: 4,
            durationMs,
            p50Ms: Math.round(timings[11]!),
            p95Ms: Math.round(timings[22]!),
          },
          contentBurst: {
            concurrentRequests: 30,
            successful: reads.length,
            durationMs: Math.round(performance.now() - readsStarted),
          },
          concurrentClaimers: 2,
          maximumActiveJobs: 1,
        },
        null,
        2,
      ),
    );
    await db.checkJob.deleteMany();
  });

  it('requires verified public isolation and its matching heartbeat and never hands a public job to a local worker', async () => {
    const { config: apiConfig } = await import('../apps/api/src/config.js');
    const { claimJob } = await import('../apps/worker/src/queue.js');
    const previousProfile = apiConfig.runnerProfile;
    const previousVerified = apiConfig.publicSandboxVerified;
    const day = new Date(new Date().toISOString().slice(0, 10));
    const key = 'worker.public-sandbox.lastSeen';
    try {
      apiConfig.runnerProfile = 'public-sandbox';
      apiConfig.publicSandboxVerified = false;
      await db.metric.upsert({
        where: { key_day: { key, day } },
        create: { key, day, value: Math.floor(Date.now() / 1000) },
        update: { value: Math.floor(Date.now() / 1000) },
      });
      const ticket = await legacyPractice();
      const body = {
        attemptId: ticket.id,
        attemptToken: ticket.token,
        files: [{ path: 'index.php', content: '<?php echo "public profile probe";' }],
      };
      expect((await learner.request<Bootstrap>('/bootstrap')).data.features.checkingAvailable).toBe(
        false,
      );
      expect((await learner.request('/checks', 'POST', body)).status).toBe(503);
      apiConfig.publicSandboxVerified = true;
      await db.metric.updateMany({
        where: { key },
        data: { value: Math.floor(Date.now() / 1000) - 60 },
      });
      expect((await learner.request<Bootstrap>('/bootstrap')).data.features.checkingAvailable).toBe(
        false,
      );
      expect((await learner.request('/checks', 'POST', body)).status).toBe(503);
      await db.metric.updateMany({
        where: { key },
        data: { value: Math.floor(Date.now() / 1000) },
      });
      expect((await learner.request<Bootstrap>('/bootstrap')).data.features.checkingAvailable).toBe(
        true,
      );
      const submitted = await learner.request<{ id: string }>('/checks', 'POST', body);
      expect(submitted.status).toBe(201);
      expect(
        (await db.checkJob.findUniqueOrThrow({ where: { id: submitted.data.id } }))
          .executionProfile,
      ).toBe('public-sandbox');
      expect(await claimJob(db, 'local-development')).toBeNull();
      expect((await claimJob(db, 'public-sandbox'))?.id).toBe(submitted.data.id);
    } finally {
      apiConfig.runnerProfile = previousProfile;
      apiConfig.publicSandboxVerified = previousVerified;
      await db.checkJob.deleteMany();
    }
  });

  it('serves every HTML route with a fresh matching CSP nonce without requiring a frontend build', async () => {
    const { createApp } = await import('../apps/api/src/main.js');
    const webDist = resolve(dataDir, 'synthetic-web');
    await mkdir(resolve(webDist, 'assets'), { recursive: true });
    await writeFile(
      resolve(webDist, 'index.html'),
      '<!doctype html><html lang="pl"><head><meta name="csp-nonce" content="__CSP_NONCE__"></head><body>Próba CSP<script src="/assets/app.js"></script></body></html>',
    );
    await writeFile(
      resolve(webDist, 'assets', 'index.html'),
      '<p>UNPROCESSED_HTML __CSP_NONCE__</p>',
    );
    await writeFile(resolve(webDist, 'assets', 'app.js'), 'window.syntheticAssetLoaded = true;');
    const previousServeWeb = process.env.SERVE_WEB;
    let webApp: typeof app | undefined;
    try {
      process.env.SERVE_WEB = 'true';
      webApp = await createApp({ webDist });
      await webApp.listen(0, '127.0.0.1');
      const webBase = await webApp.getUrl();
      const nonces = new Set<string>();
      const routes = [
        '/',
        '/index.html',
        '/%69ndex.html',
        '/INDEX.HTML',
        '/assets/index.html',
        '/assets/index.htm%6c',
        '/theory',
      ];
      for (const route of routes) {
        const response = await actualFetch(webBase + route);
        expect(response.status, route).toBe(200);
        expect(response.headers.get('content-type'), route).toContain('text/html');
        expect(response.headers.get('cache-control'), route).toBe('no-store');
        const html = await response.text();
        const nonce = html.match(/name="csp-nonce" content="([A-Za-z0-9+/=]+)"/)?.[1];
        expect(nonce, route).toMatch(/^[A-Za-z0-9+/]{32}$/);
        expect(html, route).not.toContain('__CSP_NONCE__');
        expect(html, route).not.toContain('UNPROCESSED_HTML');
        const scriptPolicy = response.headers
          .get('content-security-policy')
          ?.split(';')
          .find((directive) => directive.trim().startsWith('script-src '));
        expect(scriptPolicy, route).toContain(`'nonce-${nonce}'`);
        expect(scriptPolicy, route).toContain("'self'");
        expect(scriptPolicy, route).not.toMatch(/unsafe-inline|unsafe-eval|blob:/);
        nonces.add(nonce!);
      }
      expect(nonces.size).toBe(routes.length);
      const asset = await actualFetch(`${webBase}/assets/app.js`);
      expect(asset.status).toBe(200);
      expect(await asset.text()).toBe('window.syntheticAssetLoaded = true;');
      const health = await actualFetch(`${webBase}/api/v1/health`);
      expect(health.status).toBe(200);
      expect(await health.json()).toMatchObject({ ok: true });
      const missing = await actualFetch(`${webBase}/api/v1/not-a-route`);
      expect(missing.status).toBe(404);
      expect(missing.headers.get('content-type')).toContain('application/json');
    } finally {
      await webApp?.close();
      if (previousServeWeb === undefined) delete process.env.SERVE_WEB;
      else process.env.SERVE_WEB = previousServeWeb;
    }
  });

  it('serves readable Polish task PDFs with immutable versions and no private hints or check specifications', async () => {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const readSheet = async (taskId: string, version?: number) => {
      const response = await actualFetch(
        `${baseUrl}/tasks/${taskId}/sheet.pdf${version === undefined ? '' : `?version=${version}`}`,
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('application/pdf');
      expect(response.headers.get('content-disposition')).toMatch(
        /^inline; filename="[a-zA-Z0-9._-]+-v\d+\.pdf"$/,
      );
      const bytes = new Uint8Array(await response.arrayBuffer());
      expect(Buffer.from(bytes.subarray(0, 5)).toString('ascii')).toBe('%PDF-');
      const loadingTask = getDocument({ data: bytes, useSystemFonts: false });
      const document = await loadingTask.promise;
      try {
        expect(document.numPages).toBeGreaterThanOrEqual(3);
        expect(document.numPages).toBeLessThanOrEqual(4);
        const text: string[] = [];
        for (let number = 1; number <= document.numPages; number++) {
          const page = await document.getPage(number);
          const content = await page.getTextContent();
          const pageText = content.items
            .map((item) => ('str' in item ? item.str : ''))
            .join(' ')
            .replace(/\s+/g, ' ');
          expect(
            pageText.length,
            `Page ${number} must contain actual task content rather than only an overflow footer.`,
          ).toBeGreaterThan(250);
          expect(pageText).toContain(`Strona ${number} z ${document.numPages}`);
          text.push(pageText);
        }
        return { text: text.join(' '), version: response.headers.get('x-task-version') };
      } finally {
        await loadingTask.destroy();
      }
    };
    for (const task of seed.tasks) {
      const sheet = await readSheet(task.id, task.version);
      expect(sheet.version).toBe(String(task.version));
      expect(sheet.text).toContain(task.title);
      expect(sheet.text).toContain('Autorskie zadanie szkoleniowe');
      expect(sheet.text).toContain('nie jest oficjalnym arkuszem CKE');
      expect(sheet.text).toContain(`${task.durationMinutes} minut`);
      for (const requirement of task.requirements)
        expect(sheet.text).toContain(requirement.replace(/\s+/g, ' '));
      for (const hint of task.hints) expect(sheet.text).not.toContain(hint);
      expect(sheet.text).not.toContain('expectedRows');
      expect(sheet.text).not.toContain('queryIndex');
    }
    const original = seed.tasks[0]!;
    const updated = {
      ...original,
      version: original.version + 1,
      requirements: ['Nowa opublikowana wersja: sprawdź zażółć gęślą jaźń.'],
      hints: ['PRIVATE_PDF_HINT_SENTINEL'],
      criteria: original.criteria.map((criterion) => ({
        ...criterion,
        check: { ...criterion.check, privateSentinel: 'PRIVATE_PDF_CHECK_SENTINEL' },
      })),
    };
    await db.contentRevision.create({
      data: {
        kind: 'task',
        key: original.id,
        version: updated.version,
        status: 'published',
        payload: JSON.parse(JSON.stringify(updated)) as object,
        publishedAt: new Date(),
      },
    });
    const pinned = await readSheet(original.id, original.version);
    expect(pinned.text).toContain(original.requirements[0]);
    expect(pinned.text).not.toContain(updated.requirements[0]);
    const latest = await readSheet(original.id, updated.version);
    expect(latest.version).toBe(String(updated.version));
    expect(latest.text).toContain(updated.requirements[0]);
    expect(latest.text).not.toContain('PRIVATE_PDF_HINT_SENTINEL');
    expect(latest.text).not.toContain('PRIVATE_PDF_CHECK_SENTINEL');
    expect((await actualFetch(`${baseUrl}/tasks/${original.id}/sheet.pdf`)).status).toBe(404);
    expect(
      (await actualFetch(`${baseUrl}/tasks/${original.id}/sheet.pdf?version=99999`)).status,
    ).toBe(404);
    expect((await actualFetch(`${baseUrl}/tasks/not-a-task/sheet.pdf?version=1`)).status).toBe(404);
    expect((await actualFetch(`${baseUrl}/tasks/${original.id}/sheet.pdf?version=0`)).status).toBe(
      400,
    );
  });

  it('proxies only reviewed original sheets without rewriting bytes or accepting an arbitrary URL', async () => {
    const { REVIEWED_EXAM_PDFS } = await import('../apps/api/src/exam-pdf.js');
    const originalBytes = Buffer.from('%PDF-1.7\nsynthetic source bytes\n%%EOF');
    const provider = vi.fn(
      async () => new Response(originalBytes, { headers: { 'Content-Type': 'application/pdf' } }),
    );
    vi.stubGlobal('fetch', provider);
    try {
      for (const [id, source] of Object.entries(REVIEWED_EXAM_PDFS)) {
        const response = await actualFetch(`${baseUrl}/catalog/${id}/sheet.pdf`);
        if (source.sha256) {
          expect(response.status).toBe(502);
          expect(((await response.json()) as { message: string }).message).toContain('zmienił się');
          continue;
        }
        expect(response.status).toBe(200);
        expect(response.headers.get('content-type')).toContain('application/pdf');
        expect(response.headers.get('content-disposition')).toBe(
          `inline; filename="${id}-original.pdf"`,
        );
        expect(response.headers.get('x-pdf-source-url')).toBe(source.url);
        expect(response.headers.get('x-pdf-provenance')).toBe(source.provenance);
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect(Buffer.from(await response.arrayBuffer())).toEqual(originalBytes);
        expect(provider).toHaveBeenLastCalledWith(
          source.url,
          expect.objectContaining({ redirect: 'manual', signal: expect.any(AbortSignal) }),
        );
      }
      for (const task of seed.officialTasks) {
        const response = await actualFetch(
          `${baseUrl}/tasks/${task.id}/sheet.pdf?version=${task.version}`,
        );
        if (REVIEWED_EXAM_PDFS[task.sourceCatalogId!]!.sha256) {
          // The task alias must enforce the same reviewed-byte pin as the catalogue route.
          expect(response.status).toBe(502);
          expect(((await response.json()) as { message: string }).message).toContain('zmienił się');
          continue;
        }
        expect(response.status).toBe(200);
        expect(response.headers.get('content-disposition')).toBe(
          `inline; filename="${task.sourceCatalogId}-original.pdf"`,
        );
        expect(response.headers.get('x-pdf-source-url')).toBe(
          REVIEWED_EXAM_PDFS[task.sourceCatalogId!]!.url,
        );
        expect(Buffer.from(await response.arrayBuffer())).toEqual(originalBytes);
      }
      const calls = provider.mock.calls.length;
      expect((await actualFetch(`${baseUrl}/catalog/not-reviewed/sheet.pdf`)).status).toBe(404);
      expect(
        (
          await actualFetch(
            `${baseUrl}/catalog/cke-wedkowanie/sheet.pdf?url=http://127.0.0.1/private`,
          )
        ).status,
      ).toBe(400);
      expect(provider).toHaveBeenCalledTimes(calls);
      const bootstrap = (await learner.request<Bootstrap>('/bootstrap')).data;
      expect(
        bootstrap.catalog.find((entry) => entry.id === 'cke-wedkowanie')?.sourcePdf?.sourceKind,
      ).toBe('official-source');
      expect(
        bootstrap.catalog.find((entry) => entry.id === 'inf03-01-25-01-sg')?.sourcePdf?.sourceKind,
      ).toBe('archive-copy');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('rejects PDF-source redirects, invalid content, oversized streams and timeouts, and recovers', async () => {
    const request = () => actualFetch(`${baseUrl}/catalog/cke-wedkowanie/sheet.pdf`);
    try {
      const redirect = vi.fn(
        async () =>
          new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/private' } }),
      );
      vi.stubGlobal('fetch', redirect);
      expect((await request()).status).toBe(502);
      expect(redirect).toHaveBeenCalledOnce();
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response('<html>not a PDF</html>', { headers: { 'Content-Type': 'text/html' } }),
        ),
      );
      expect((await request()).status).toBe(502);
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () => new Response('not a PDF', { headers: { 'Content-Type': 'application/pdf' } }),
        ),
      );
      expect((await request()).status).toBe(502);
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response('%PDF-1.7', {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Length': String(10 * 1024 * 1024 + 1),
              },
            }),
        ),
      );
      expect((await request()).status).toBe(502);
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response(
              new ReadableStream({
                start(controller) {
                  controller.enqueue(new Uint8Array(6 * 1024 * 1024));
                  controller.enqueue(new Uint8Array(6 * 1024 * 1024));
                  controller.close();
                },
              }),
              { headers: { 'Content-Type': 'application/pdf' } },
            ),
        ),
      );
      expect((await request()).status).toBe(502);
      vi.stubGlobal(
        'fetch',
        vi.fn(async () => {
          throw new DOMException('synthetic timeout', 'TimeoutError');
        }),
      );
      expect((await request()).status).toBe(503);
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async () =>
            new Response('%PDF-1.7\n%%EOF', { headers: { 'Content-Type': 'application/pdf' } }),
        ),
      );
      expect((await request()).status).toBe(200);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('bounds simultaneous original-PDF downloads and releases slots after completion', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const provider = vi.fn(async () => {
      await gate;
      return new Response('%PDF-1.7\n%%EOF', { headers: { 'Content-Type': 'application/pdf' } });
    });
    vi.stubGlobal('fetch', provider);
    const request = () => actualFetch(`${baseUrl}/catalog/cke-wedkowanie/sheet.pdf`);
    const pending = [request(), request()];
    try {
      await vi.waitFor(() => expect(provider).toHaveBeenCalledTimes(2));
      expect((await request()).status).toBe(429);
    } finally {
      release();
    }
    try {
      expect((await Promise.all(pending)).map((response) => response.status)).toEqual([200, 200]);
      expect((await request()).status).toBe(200);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
