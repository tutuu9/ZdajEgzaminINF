import { Prisma, type PrismaClient } from '@prisma/client';
import { runPlayground, type RunnerOptions } from '@zdaj/checker';
import type { ProjectFile } from '@zdaj/shared';

export const RUN_FAILED = 'Środowisko nie ukończyło uruchomienia. Kod i baza nie zostały wykonane.';

/**
 * Executes one learner-initiated run. The input lives in the job row and is cleared in
 * every outcome, so the learner's files do not outlive the run on the server.
 * Returns the runtime of a completed run, or null when the environment failed.
 */
export async function executeRunJob(
  database: PrismaClient,
  job: { id: string; input: unknown },
  options: RunnerOptions,
  run: typeof runPlayground = runPlayground,
): Promise<number | null> {
  try {
    const input = job.input as { run?: unknown; files?: ProjectFile[] } | null;
    if (!input || !Array.isArray(input.files)) throw new Error('Run input unavailable.');
    const result = await run(input.run, input.files, { ...options, jobId: job.id });
    await database.sandboxRunJob.update({
      where: { id: job.id },
      data: {
        status: 'completed',
        result: result as unknown as Prisma.InputJsonValue,
        input: Prisma.DbNull,
        finishedAt: new Date(),
        leaseUntil: null,
      },
    });
    return result.runtimeMs;
  } catch {
    // The cause may quote learner code, so it is neither stored nor logged.
    await database.sandboxRunJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        error: RUN_FAILED,
        input: Prisma.DbNull,
        finishedAt: new Date(),
        leaseUntil: null,
      },
    });
    return null;
  }
}
