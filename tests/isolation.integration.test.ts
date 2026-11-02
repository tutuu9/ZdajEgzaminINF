import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { command, runProject, type RunnerOptions } from '@zdaj/checker';
import type { CheckReport, TaskVersion } from '@zdaj/shared';

const suiteId = randomUUID();
const dataDir = path.resolve('data', `isolation-${suiteId}`);
const hostCanary = path.join(dataDir, 'host-only.txt');
const neighborCanary = path.join(dataDir, 'neighbor-attempt', 'private.txt');
const canary = `synthetic-isolation-canary-${suiteId}`;
const previousCanary = process.env.ZDAJ_ISOLATION_CANARY;
const samples: { name: string; durationMs: number; outcome: string; memoryLimit?: string }[] = [];
const probeTask: TaskVersion = {
  id: 'isolation-probe',
  version: 1,
  title: 'Kontrola izolacji',
  summary: 'Synthetic integration fixture',
  qualification: 'INF.03',
  topicIds: ['php'],
  technologies: ['PHP'],
  durationMinutes: 1,
  difficulty: 'advanced',
  runtimeProfile: 'web',
  requirements: ['Render the probe marker.'],
  starterFiles: [],
  guidance: { beginner: [], intermediate: [], advanced: [] },
  hints: [],
  criteria: [
    {
      id: 'probe',
      title: 'Probe response',
      description: 'The synthetic PHP probe must respond.',
      method: 'php',
      source: 'educational',
      points: 1,
      check: { type: 'php', path: 'probe.php', selector: '#probe', text: 'PROBE_OK' },
    },
  ],
  followUp: '',
  origin: 'original',
};
type Outcome = { report: CheckReport; error?: never } | { error: Error; report?: never };
const phpString = (value: string) => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

beforeAll(async () => {
  await mkdir(path.dirname(neighborCanary), { recursive: true });
  await writeFile(hostCanary, canary);
  await writeFile(neighborCanary, canary);
  process.env.ZDAJ_ISOLATION_CANARY = canary;
});

afterAll(async () => {
  if (previousCanary === undefined) delete process.env.ZDAJ_ISOLATION_CANARY;
  else process.env.ZDAJ_ISOLATION_CANARY = previousCanary;
  await mkdir('artifacts', { recursive: true });
  await writeFile(
    'artifacts/isolation-report.json',
    JSON.stringify(
      {
        recordedAt: new Date().toISOString(),
        profile: 'local-development',
        scope:
          'Docker Desktop/runc local isolation probes. This does not certify public gVisor isolation.',
        samples,
      },
      null,
      2,
    ),
  );
  const allowedRoot = path.resolve('data') + path.sep;
  if (!dataDir.startsWith(allowedRoot) || path.basename(dataDir) !== `isolation-${suiteId}`)
    throw new Error('Unsafe isolation fixture cleanup path.');
  await rm(dataDir, { recursive: true, force: true });
});

async function cleanJob(jobId: string) {
  const containers = await command(['ps', '-aq', '--filter', `label=zdaj.job=${jobId}`]);
  expect(containers.code).toBe(0);
  expect(containers.stdout.trim(), 'The owned sandbox container must be removed.').toBe('');
  expect(
    await readdir(path.join(dataDir, 'sandbox')).catch(() => []),
    'The owned scratch directory must be empty.',
  ).toEqual([]);
}

function startProbe(php: string, options: Partial<RunnerOptions> = {}) {
  const jobId = randomUUID();
  const started = Date.now();
  const outcome: Promise<Outcome> = runProject(
    probeTask,
    [
      { path: 'index.html', content: '<!doctype html><title>Ready</title>' },
      { path: 'probe.php', content: `<?php ${php}` },
    ],
    { dataDir, profile: 'local-development', jobId, timeoutMs: 30_000, ...options },
  ).then(
    (report) => ({ report }),
    (error) => ({ error: error instanceof Error ? error : new Error(String(error)) }),
  );
  return { jobId, started, outcome };
}

async function ordinaryJob() {
  const run = startProbe('echo \'<p id="probe">PROBE_OK</p>\';');
  const outcome = await run.outcome;
  expect(outcome.error).toBeUndefined();
  expect(outcome.report?.results[0]?.status).toBe('passed');
  expect(outcome.report?.percentage).toBe(100);
  await cleanJob(run.jobId);
}

async function recordBoundedFailure(
  name: string,
  php: string,
  options: Partial<RunnerOptions>,
  infrastructure: boolean,
) {
  const run = startProbe(php, options);
  const outcome = await run.outcome;
  const durationMs = Date.now() - run.started;
  samples.push({
    name,
    durationMs,
    outcome: outcome.error
      ? 'runner-rejected'
      : outcome.report.results.map((result) => result.status).join(','),
    ...(options.memory ? { memoryLimit: options.memory } : {}),
  });
  expect(durationMs, 'Limits and cleanup must return control to the worker.').toBeLessThan(
    (options.timeoutMs ?? 30_000) + 18_000,
  );
  if (outcome.report) {
    expect(outcome.report.results.some((result) => result.status === 'passed')).toBe(false);
    if (infrastructure) {
      expect(outcome.report.results[0]?.status).toBe('error');
      expect(outcome.report.percentage).toBeNull();
      expect(outcome.report.complete).toBe(false);
    }
  } else {
    expect(outcome.error.message).toMatch(/czas|limit|Środowisko|raport/i);
  }
  await cleanJob(run.jobId);
  await ordinaryJob();
}

describe.sequential('real local sandbox isolation and bounded failure recovery', () => {
  it('blocks outbound networking, host credentials and neighboring attempt files', async () => {
    expect(await readFile(hostCanary, 'utf8')).toBe(canary);
    expect(await readFile(neighborCanary, 'utf8')).toBe(canary);
    const paths = [
      hostCanary,
      neighborCanary,
      '/data/.env',
      '/app/.env',
      '/workspace/.env',
      '/var/run/docker.sock',
      '/proc/1/environ',
      '/proc/1/root/var/run/docker.sock',
      '/project/../neighbor-attempt/private.txt',
      '/data/neighbor-attempt/private.txt',
    ];
    const php = `
      $ok = true;
      foreach (json_decode(${phpString(JSON.stringify(paths))}, true) as $file) {
        if (@file_get_contents($file) !== false) $ok = false;
      }
      foreach (['DATABASE_URL', 'SESSION_SECRET', 'APP_SECRET', 'DEEPSEEK_API_KEY', 'IP_HASH_SECRET', 'ZDAJ_ISOLATION_CANARY'] as $name) {
        if (getenv($name) !== false) $ok = false;
      }
      foreach (['tcp://192.0.2.1:80', 'tcp://172.17.0.1:3001', 'tcp://host.docker.internal:3001'] as $target) {
        $socket = @stream_socket_client($target, $code, $message, 0.5);
        if ($socket !== false) { $ok = false; fclose($socket); }
      }
      echo '<p id="probe">' . ($ok ? 'PROBE_OK' : 'ISOLATION_FAILURE') . '</p>';
    `;
    const run = startProbe(php);
    let containerId = '';
    for (let index = 0; index < 30 && !containerId; index++) {
      const found = await command(['ps', '-q', '--filter', `label=zdaj.job=${run.jobId}`]);
      containerId = found.stdout.trim();
      if (!containerId) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    expect(containerId).toMatch(/^[a-f0-9]+$/);
    const inspected = await command(['inspect', containerId, '--format', '{{json .HostConfig}}']);
    const host = JSON.parse(inspected.stdout) as {
      NetworkMode: string;
      ReadonlyRootfs: boolean;
      Privileged: boolean;
      Memory: number;
      PidsLimit: number;
      NanoCpus: number;
      SecurityOpt: string[];
    };
    expect(host.NetworkMode).toBe('none');
    expect(host.ReadonlyRootfs).toBe(true);
    expect(host.Privileged).toBe(false);
    expect(host.Memory).toBe(2 * 1024 ** 3);
    expect(host.PidsLimit).toBe(256);
    expect(host.NanoCpus).toBe(1_000_000_000);
    expect(host.SecurityOpt).toContain('no-new-privileges=true');
    const outcome = await run.outcome;
    expect(outcome.error).toBeUndefined();
    expect(outcome.report?.results[0]?.status).toBe('passed');
    samples.push({
      name: 'network-host-neighbor-boundaries',
      durationMs: Date.now() - run.started,
      outcome: outcome.report?.results[0]?.status ?? 'runner-rejected',
    });
    await cleanJob(run.jobId);
  });

  it('bounds an infinite PHP loop and accepts the next ordinary job', async () => {
    await recordBoundedFailure('infinite-loop', 'while (true) {}', { timeoutMs: 25_000 }, false);
  });

  it('enforces container memory even after PHP disables its own memory limit', async () => {
    await recordBoundedFailure(
      'memory-exhaustion',
      "ini_set('memory_limit', '-1'); $chunks = []; while (true) { $chunks[] = str_repeat('m', 16 * 1024 * 1024); }",
      { memory: '512m', timeoutMs: 30_000 },
      true,
    );
  });

  it('caps diagnostic output without inventing a student percentage', async () => {
    await recordBoundedFailure(
      'diagnostic-output-limit',
      "$stream = fopen('php://stderr', 'wb'); for ($i = 0; $i < 400; $i++) { fwrite($stream, str_repeat('d', 8192)); } echo '<p id=\"probe\">PROBE_OK</p>';",
      { timeoutMs: 25_000 },
      true,
    );
  });

  it('removes the container and scratch directory after a forced runner timeout', async () => {
    const run = startProbe('sleep(60);', { timeoutMs: 4000 });
    const outcome = await run.outcome;
    expect(outcome.report).toBeUndefined();
    expect(outcome.error?.message).toMatch(/czas/i);
    expect(Date.now() - run.started).toBeLessThan(20_000);
    samples.push({
      name: 'forced-runner-timeout',
      durationMs: Date.now() - run.started,
      outcome: 'runner-rejected',
    });
    await cleanJob(run.jobId);
    await ordinaryJob();
  });
});
