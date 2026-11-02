import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { readdir, readFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { Pool } from 'pg';
import { hash } from 'bcryptjs';
import type { ContentDraft, FaqResponse, FaqRevision } from '@zdaj/shared';

loadEnv({ quiet: true });
const originalDatabaseUrl = process.env.DATABASE_URL;
const databaseName = `zdaj_faq_test_${randomUUID().replaceAll('-', '')}`;
const dataDir = resolve('data', databaseName);
let control: Pool;
let createdDatabase = false;
let db: (typeof import('@zdaj/database'))['db'];
let app: Awaited<ReturnType<(typeof import('../apps/api/src/main.js'))['createApp']>>;
let baseUrl = '';
let seed: FaqRevision[];

class Client {
  cookies = new Map<string, string>();
  csrf = '';
  async request<T = Record<string, unknown>>(
    path: string,
    method = 'GET',
    body?: unknown,
    headers: Record<string, string> = {},
  ) {
    const response = await fetch(baseUrl + path, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        Cookie: [...this.cookies].map(([key, value]) => `${key}=${value}`).join('; '),
        'X-CSRF-Token': this.csrf,
        Origin: 'http://127.0.0.1:5173',
        ...headers,
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
let owner: Client;
let learner: Client;

beforeAll(async () => {
  if (!originalDatabaseUrl)
    throw new Error('DATABASE_URL is required; FAQ tests create an isolated PostgreSQL database.');
  if (!/^zdaj_faq_test_[a-f0-9]+$/.test(databaseName)) throw new Error('Unsafe database name.');
  control = new Pool({ connectionString: originalDatabaseUrl });
  await control.query(`CREATE DATABASE "${databaseName}"`);
  createdDatabase = true;
  const url = new URL(originalDatabaseUrl);
  url.pathname = `/${databaseName}`;
  process.env.DATABASE_URL = url.toString();
  process.env.DATA_DIR = dataDir;
  process.env.API_NO_LISTEN = '1';
  process.env.APP_ORIGIN = 'http://127.0.0.1:5173';
  process.env.NODE_ENV = 'test';
  process.env.DEEPSEEK_API_KEY = '';
  const pool = new Pool({ connectionString: url.toString() });
  const migrations = 'packages/database/prisma/migrations';
  for (const directory of (await readdir(migrations, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    await pool.query(await readFile(`${migrations}/${directory.name}/migration.sql`, 'utf8'));
  }
  await pool.end();
  ({ db } = await import('@zdaj/database'));
  seed = (await import('@zdaj/content')).faq;
  for (const entry of seed) {
    await db.contentRevision.create({
      data: {
        kind: 'faq',
        key: entry.id,
        version: entry.version,
        status: 'published',
        publishedAt: new Date(),
        payload: JSON.parse(JSON.stringify(entry)) as object,
      },
    });
  }
  await db.admin.create({
    data: { username: 'faq-owner', passwordHash: await hash('FAQ-test-password-only!', 12) },
  });
  const { createApp } = await import('../apps/api/src/main.js');
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  baseUrl = `${await app.getUrl()}/api/v1`;
  learner = await new Client().init();
  owner = await new Client().init();
  expect(
    (
      await owner.request('/admin/login', 'POST', {
        username: 'faq-owner',
        password: 'FAQ-test-password-only!',
      })
    ).status,
  ).toBe(201);
}, 180_000);

afterAll(async () => {
  await app?.close();
  await db?.$disconnect();
  if (createdDatabase) await control.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  await control?.end();
  if (!dataDir.startsWith(resolve('data') + sep)) throw new Error('Unsafe test cleanup path.');
  await rm(dataDir, { recursive: true, force: true });
  if (originalDatabaseUrl) process.env.DATABASE_URL = originalDatabaseUrl;
}, 180_000);

describe('FAQ publication through the real API and PostgreSQL', () => {
  it('serves reviewed answers publicly in category and editorial order without requiring a session', async () => {
    const response = await new Client().request<FaqResponse>('/faq');
    expect(response.status).toBe(200);
    expect(response.data.entries).toEqual(seed);
    expect(response.data.entries).toHaveLength(35);
  });

  it('requires administrator rights and CSRF for both draft creation and publication', async () => {
    const body = { kind: 'faq', key: seed[0]!.id, payload: seed[0] };
    expect((await learner.request('/admin/content/drafts', 'POST', body)).status).toBe(401);
    expect(
      (await owner.request('/admin/content/drafts', 'POST', body, { 'X-CSRF-Token': '' })).status,
    ).toBe(403);
    const draft = await owner.request<ContentDraft>('/admin/content/drafts', 'POST', body);
    expect(draft.status).toBe(201);
    expect(
      (await learner.request(`/admin/content/${draft.data.id}/publish`, 'POST', {})).status,
    ).toBe(401);
    expect(
      (
        await owner.request(
          `/admin/content/${draft.data.id}/publish`,
          'POST',
          {},
          { 'X-CSRF-Token': 'wrong' },
        )
      ).status,
    ).toBe(403);
    expect(
      (await new Client().request<FaqResponse>('/faq')).data.entries.find(
        (entry) => entry.id === seed[0]!.id,
      )?.version,
    ).toBe(1);
  });

  it('keeps drafts private, publishes only the latest version and preserves previous payloads', async () => {
    const original = seed[1]!;
    const payload = {
      ...original,
      answer: `${original.answer}\n\nSprawdzona aktualizacja testowa.`,
    };
    const draft = (
      await owner.request<ContentDraft>('/admin/content/drafts', 'POST', {
        kind: 'faq',
        key: original.id,
        payload,
      })
    ).data;
    expect(draft.version).toBe(2);
    let published = (await learner.request<FaqResponse>('/faq')).data.entries;
    expect(published.find((entry) => entry.id === original.id)).toEqual(original);
    expect((await owner.request(`/admin/content/${draft.id}/publish`, 'POST', {})).status).toBe(
      201,
    );
    published = (await learner.request<FaqResponse>('/faq')).data.entries;
    expect(published.filter((entry) => entry.id === original.id)).toHaveLength(1);
    expect(published.find((entry) => entry.id === original.id)).toMatchObject({
      version: 2,
      answer: payload.answer,
    });
    const old = await db.contentRevision.findUniqueOrThrow({
      where: { kind_key_version: { kind: 'faq', key: original.id, version: 1 } },
    });
    expect(old.payload).toEqual(original);
    expect((await owner.request(`/admin/content/${draft.id}/publish`, 'POST', {})).status).toBe(
      409,
    );
    const newerDraft = await owner.request<ContentDraft>('/admin/content/drafts', 'POST', {
      kind: 'faq',
      key: original.id,
      payload: { ...payload, answer: 'Nowszy, ale jeszcze nieopublikowany szkic.' },
    });
    expect(newerDraft.data.version).toBe(3);
    expect(
      (await learner.request<FaqResponse>('/faq')).data.entries.find(
        (entry) => entry.id === original.id,
      )?.version,
    ).toBe(2);
  });

  it('rejects publishing an older draft after a newer version is already public', async () => {
    const original = seed[3]!;
    const drafts: ContentDraft[] = [];
    for (const answer of ['Starszy zapisany szkic.', 'Nowsza opublikowana odpowiedź.']) {
      const response = await owner.request<ContentDraft>('/admin/content/drafts', 'POST', {
        kind: 'faq',
        key: original.id,
        payload: { ...original, answer },
      });
      expect(response.status).toBe(201);
      drafts.push(response.data);
    }
    expect(drafts.map((draft) => draft.version)).toEqual([2, 3]);
    expect(
      (await owner.request(`/admin/content/${drafts[1]!.id}/publish`, 'POST', {})).status,
    ).toBe(201);
    const rejected = await owner.request(`/admin/content/${drafts[0]!.id}/publish`, 'POST', {});
    expect(rejected.status).toBe(409);
    expect(rejected.data.message).toContain('nowszą wersję');
    const current = (await learner.request<FaqResponse>('/faq')).data.entries.find(
      (entry) => entry.id === original.id,
    );
    expect(current).toMatchObject({ version: 3, answer: 'Nowsza opublikowana odpowiedź.' });
    const olderDraft = await db.contentRevision.findUniqueOrThrow({ where: { id: drafts[0]!.id } });
    expect(olderDraft.status).toBe('draft');
    expect(olderDraft.publishedAt).toBeNull();
    expect(olderDraft.payload).toMatchObject({ version: 2, answer: 'Starszy zapisany szkic.' });
    expect(
      await db.event.count({
        where: { type: 'content.published', detail: { path: ['key'], equals: original.id } },
      }),
    ).toBe(1);
  });

  it('rejects invalid source links, unsupported categories and impossible review dates on the server', async () => {
    for (const payload of [
      { ...seed[2], sources: [{ title: 'Unsafe', section: 'Test', url: 'javascript:alert(1)' }] },
      { ...seed[2], categoryId: 'unknown' },
      { ...seed[2], reviewedAt: '2026-02-30' },
      { ...seed[2], sources: [] },
    ]) {
      expect(
        (
          await owner.request('/admin/content/drafts', 'POST', {
            kind: 'faq',
            key: seed[2]!.id,
            payload,
          })
        ).status,
      ).toBe(400);
    }
    expect(await db.contentRevision.count({ where: { kind: 'faq', key: seed[2]!.id } })).toBe(1);
  });
});
