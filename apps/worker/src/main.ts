import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { rm, mkdir, readdir, stat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '@zdaj/database';
import {
  checkRuntime,
  command,
  readProject,
  runProject,
  runStudyProject,
  type RunnerOptions,
} from '@zdaj/checker';
import { type TaskVersion } from '@zdaj/shared';
import { allExamStudyGuides } from '@zdaj/content';
import { Prisma } from '@prisma/client';
import { claimJob } from './queue.js';

config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const dataDir = path.resolve(process.env.DATA_DIR ?? 'data');
const profile = process.env.RUNNER_PROFILE ?? 'local-development';
if (!['local-development', 'public-sandbox'].includes(profile))
  throw new Error('Invalid RUNNER_PROFILE.');
const options: RunnerOptions = {
  dataDir,
  hostDataDir: process.env.SANDBOX_HOST_DATA_DIR,
  profile: profile as RunnerOptions['profile'],
  image: process.env.SANDBOX_IMAGE ?? 'zdaj-inf-sandbox:0.2.0',
  publicReady: process.env.PUBLIC_SANDBOX_VERIFIED === 'true',
};
let stopping = false;
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    stopping = true;
  });
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const day = () => new Date(new Date().toISOString().slice(0, 10));
async function metric(key: string, amount = 1) {
  await db.metric
    .upsert({
      where: { key_day: { key, day: day() } },
      create: { key, day: day(), value: amount },
      update: { value: { increment: amount } },
    })
    .catch(() => undefined);
}
async function discard(inputPath: string) {
  const directory = path.resolve(path.dirname(inputPath));
  const jobsRoot = path.resolve(dataDir, 'jobs');
  if (
    !directory.startsWith(`${jobsRoot}${path.sep}`) ||
    !/^[-a-f\d]{36}$/i.test(path.basename(directory))
  )
    throw new Error('Refusing cleanup outside job directory.');
  await rm(directory, { recursive: true, force: true });
}
async function maintain() {
  const now = new Date();
  const staleWhere = { status: 'running', leaseUntil: { lt: now } };
  const stale = [
    ...(await db.checkJob.findMany({ where: staleWhere })).map((job) => ({
      ...job,
      kind: 'final' as const,
    })),
    ...(await db.studyCheckJob.findMany({ where: staleWhere })).map((job) => ({
      ...job,
      kind: 'study' as const,
    })),
  ];
  for (const job of stale) {
    const containers = await command(['ps', '-aq', '--filter', `label=zdaj.job=${job.id}`]).catch(
      () => null,
    );
    for (const id of containers?.stdout.trim().split(/\s+/).filter(Boolean) ?? [])
      if (/^[a-f\d]{12,64}$/.test(id)) await command(['rm', '-f', id]).catch(() => undefined);
    await discard(job.inputPath);
    const update = {
      where: { id: job.id },
      data: {
        status: 'failed',
        error: 'Sprawdzanie zostało przerwane. Pliki pozostały lokalnie; ponów sprawdzenie.',
        finishedAt: now,
        leaseUntil: null,
      },
    };
    if (job.kind === 'study') await db.studyCheckJob.update(update);
    else await db.checkJob.update(update);
  }
  const expiredWhere = { expiresAt: { lt: now }, status: { not: 'running' } };
  const expired = [
    ...(await db.checkJob.findMany({ where: expiredWhere })).map((job) => ({
      ...job,
      kind: 'final' as const,
    })),
    ...(await db.studyCheckJob.findMany({ where: expiredWhere })).map((job) => ({
      ...job,
      kind: 'study' as const,
    })),
  ];
  for (const job of expired) {
    await discard(job.inputPath);
    if (job.kind === 'study') await db.studyCheckJob.deleteMany({ where: { id: job.id } });
    else await db.checkJob.deleteMany({ where: { id: job.id } });
  }
  const sandboxRoot = path.resolve(dataDir, 'sandbox');
  for (const entry of await readdir(sandboxRoot, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory() || !/^[-a-f\d]{36}$/i.test(entry.name)) continue;
    const directory = path.resolve(sandboxRoot, entry.name);
    if (!directory.startsWith(`${sandboxRoot}${path.sep}`)) continue;
    if (Date.now() - (await stat(directory)).mtimeMs < 180000) continue;
    const marker = await readFile(path.join(directory, 'run.json'), 'utf8')
      .then((text) => JSON.parse(text) as { jobId?: string })
      .catch(() => null);
    if (marker?.jobId) {
      const activeWhere = { id: marker.jobId, status: 'running', leaseUntil: { gt: new Date() } };
      const active =
        (await db.checkJob.findFirst({ where: activeWhere })) ??
        (await db.studyCheckJob.findFirst({ where: activeWhere }));
      if (active) continue;
    }
    // Names and paths were resolved and checked above; only this worker's expired scratch directory is removed.
    await command(['rm', '-f', `zdaj-check-${entry.name}`]).catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
  await Promise.all([
    db.attemptTicket.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.session.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.rateLimit.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.event.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 7 * 86400000) } } }),
  ]);
}
await mkdir(dataDir, { recursive: true });
await checkRuntime(options);
console.log(`Checking worker ready (${profile}); one job at a time.`);
const heartbeatKey = `worker.${profile}.lastSeen`;
const heartbeat = async () => {
  await db.metric.upsert({
    where: { key_day: { key: heartbeatKey, day: day() } },
    create: { key: heartbeatKey, day: day(), value: Math.floor(Date.now() / 1000) },
    update: { value: Math.floor(Date.now() / 1000) },
  });
};
await heartbeat();
const heartbeatTimer = setInterval(() => {
  heartbeat().catch(() => undefined);
}, 10000);
heartbeatTimer.unref();
let maintenanceAt = 0;
while (!stopping) {
  try {
    if (Date.now() > maintenanceAt) {
      await maintain();
      await heartbeat();
      maintenanceAt = Date.now() + 10000;
    }
    const job = await claimJob(db, profile);
    if (!job) {
      await pause(1000);
      continue;
    }
    try {
      const source = path.resolve(job.inputPath);
      if (!source.startsWith(`${path.resolve(dataDir, 'jobs')}${path.sep}`))
        throw new Error('Invalid job source.');
      if (job.kind === 'study') {
        const guide = allExamStudyGuides.find(
          (item) =>
            item.id === job.guideId &&
            item.version === job.guideVersion &&
            item.taskId === job.taskId &&
            item.taskVersion === job.taskVersion,
        );
        const [stepId, activityId] = job.activityId.split('/');
        const activity = guide?.steps
          .find((step) => step.id === stepId)
          ?.activities?.find((item) => item.id === activityId);
        const check = activity?.checks?.find(
          (item) => item.kind === 'runtime' && item.adapter === job.adapterId,
        );
        if (!guide || !check) throw new Error('Study revision unavailable.');
        const report = await runStudyProject(
          { ...job, criterionId: check.id, criterionTitle: check.title },
          await readProject(source),
          { ...options, jobId: job.id },
        );
        await db.studyCheckJob.update({
          where: { id: job.id },
          data: {
            status: 'completed',
            report: report as unknown as Prisma.InputJsonValue,
            finishedAt: new Date(),
            leaseUntil: null,
          },
        });
        await metric('study.checks.completed');
        await metric(`study.results.${report.status}`);
        console.log('Educational check completed.');
        continue;
      }
      const revision = await db.contentRevision.findUnique({
        where: { kind_key_version: { kind: 'task', key: job.taskId, version: job.taskVersion } },
      });
      if (!revision || revision.status !== 'published')
        throw new Error('Task revision unavailable.');
      const report = await runProject(
        revision.payload as unknown as TaskVersion,
        await readProject(source),
        { ...options, jobId: job.id },
      );
      const attempt = await db.attemptTicket.findUnique({ where: { id: job.attemptId } });
      if (
        attempt?.deadlineAt &&
        attempt.submittedAt &&
        attempt.submittedAt.getTime() > attempt.deadlineAt.getTime() + 15000
      ) {
        report.timedOut = true;
        report.disclaimer += ' Pracę oddano po upływie limitu czasu.';
      }
      await db.checkJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          report: report as unknown as Prisma.InputJsonValue,
          finishedAt: new Date(),
          leaseUntil: null,
        },
      });
      await metric('checks.completed');
      await metric('checks.durationMs', report.runtimeMs);
      for (const status of new Set(report.results.map((result) => result.status)))
        await metric(
          `criteria.${status}`,
          report.results.filter((result) => result.status === status).length,
        );
      console.log('Check completed.');
    } catch {
      const update = {
        where: { id: job.id },
        data: {
          status: 'failed',
          error: 'Środowisko nie ukończyło sprawdzania. Rozwiązanie nie zostało ocenione.',
          finishedAt: new Date(),
          leaseUntil: null,
        },
      };
      if (job.kind === 'study') await db.studyCheckJob.update(update);
      else await db.checkJob.update(update);
      await metric(job.kind === 'study' ? 'study.checks.failed' : 'checks.failed');
      await db.event
        .create({ data: { type: 'check.failed', detail: { taskId: job.taskId } } })
        .catch(() => undefined);
      console.error('Check failed; no student code was logged.');
    } finally {
      await discard(job.inputPath);
    }
  } catch {
    console.error('Worker maintenance unavailable; retrying.');
    await pause(5000);
  }
}
clearInterval(heartbeatTimer);
await db.$disconnect();
