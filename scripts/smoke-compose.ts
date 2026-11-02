import assert from 'node:assert/strict';
import { tasks } from '@zdaj/content';
import { validSolutions } from '../fixtures/content/index.js';
import type { AttemptTicket, CheckResponse } from '@zdaj/shared';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.SMOKE_ORIGIN ?? 'http://localhost:8080';
const base = `${origin}/api/v1`;
const session = await fetch(`${base}/session`);
assert.equal(session.status, 200);
const cookie = session.headers
  .getSetCookie()
  .map((value) => value.split(';')[0])
  .join('; ');
const { csrfToken } = (await session.json()) as { csrfToken: string };
const post = async (path: string, body: unknown) => {
  const response = await fetch(base + path, {
    method: 'POST',
    headers: {
      Origin: origin,
      Cookie: cookie,
      'x-csrf-token': csrfToken,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok)
    throw new Error(`Smoke request ${path}: ${response.status} ${await response.text()}`);
  return response.json();
};
const task = tasks.find((task) => task.id === 'biblioteka')!;
const ticket = (await post('/attempts', {
  taskId: task.id,
  taskVersion: task.version,
  mode: 'trening',
  level: 'beginner',
})) as AttemptTicket;
const job = (await post('/checks', {
  attemptId: ticket.id,
  attemptToken: ticket.token,
  files: validSolutions.biblioteka[1],
})) as { id: string; token: string };
let result: CheckResponse | undefined;
for (let count = 0; count < 150; count++) {
  const response = await fetch(`${base}/checks/${job.id}`, {
    headers: { 'x-check-token': job.token },
  });
  assert.equal(response.status, 200);
  result = (await response.json()) as CheckResponse;
  if (result.status === 'completed' || result.status === 'failed') break;
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
assert.equal(result?.status, 'completed', result?.error ?? 'No report before timeout');
assert.ok(result.report);
assert.equal(
  result.report.results.filter((item) => !['passed', 'manual'].includes(item.status)).length,
  0,
);
assert.equal(result.report.percentage, null);
await mkdir('artifacts', { recursive: true });
await writeFile(
  'artifacts/compose-smoke-report.json',
  JSON.stringify(
    {
      recordedAt: new Date().toISOString(),
      origin,
      taskId: task.id,
      taskVersion: task.version,
      runtimeMs: result.report.runtimeMs,
      results: result.report.results.map(({ criterionId, status }) => ({ criterionId, status })),
    },
    null,
    2,
  ),
);
await post(`/checks/${job.id}/ack`, { token: job.token });
const removed = await fetch(`${base}/checks/${job.id}`, {
  headers: { 'x-check-token': job.token },
});
assert.equal(removed.status, 404);
console.log(
  `Compose smoke passed: ${task.id} v${task.version}, ${result.report.runtimeMs} ms; report acknowledged and removed.`,
);
