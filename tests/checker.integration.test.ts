import { afterAll, describe, it, expect } from 'vitest';
import { mkdir, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { tasks } from '@zdaj/content';
import { runProject, checkRuntime, command } from '@zdaj/checker';
import { fixtureManifest, invalidSolutions } from '../fixtures/content/index.js';

const dataDir = path.resolve('data', 'checker-tests');
const metrics: { taskId: string; fixture: string; durationMs: number; sampledPeakMiB: number }[] =
  [];
afterAll(async () => {
  await mkdir('artifacts', { recursive: true });
  await writeFile(
    'artifacts/checker-benchmark.json',
    JSON.stringify(
      {
        environment: {
          profile: 'local-development',
          platform: process.platform,
          ci: Boolean(process.env.CI),
          concurrency: 1,
        },
        recordedAt: new Date().toISOString(),
        samples: metrics,
      },
      null,
      2,
    ),
  );
});
describe('real PHP/MariaDB/Chromium checker', () => {
  for (const fixture of fixtureManifest)
    it(`${fixture.taskId} accepts ${fixture.name}`, async () => {
      let peak = 0;
      const task = tasks.find((task) => task.id === fixture.taskId)!;
      const report = await runProject(task, fixture.files, {
        dataDir,
        profile: 'local-development',
        diagnostics: true,
        onResourceSample: (bytes) => {
          peak = Math.max(peak, bytes);
        },
      });
      metrics.push({
        taskId: task.id,
        fixture: fixture.name,
        durationMs: report.runtimeMs,
        sampledPeakMiB: Math.round((peak / 1048576) * 10) / 10,
      });
      const failures = report.results.filter(
        (result) => result.status !== 'passed' && result.status !== 'manual',
      );
      expect(failures, JSON.stringify(failures)).toEqual([]);
      expect(report.percentage).toBeNull();
      expect(report.results.some((result) => result.status === 'manual')).toBe(true);
    });
  for (const [taskId, fixtures] of Object.entries(invalidSolutions))
    for (const fixture of fixtures)
      it(`${taskId} identifies ${fixture.name}`, async () => {
        const report = await runProject(
          tasks.find((task) => task.id === taskId)!,
          fixture.files,
          { dataDir, profile: 'local-development', diagnostics: true },
        );
        for (const id of fixture.expectedFailures)
          expect(report.results.find((result) => result.criterionId === id)?.status, id).toBe(
            'failed',
          );
      });
  it('fails closed when the public isolation profile is not verified', async () => {
    await expect(
      checkRuntime({ dataDir, profile: 'public-sandbox', publicReady: false }),
    ).rejects.toThrow(/Profil publiczny/);
  });
  it('cleans owned containers and temporary directories after runs', async () => {
    const active = await command(['ps', '-q', '--filter', 'label=zdaj.role=sandbox']);
    expect(active.stdout.trim()).toBe('');
    const dirs = await readdir(path.join(dataDir, 'sandbox')).catch(() => []);
    expect(dirs).toEqual([]);
  });
});
