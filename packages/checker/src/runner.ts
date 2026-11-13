import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import type { CheckReport, CriterionResult, ProjectFile, TaskVersion } from '@zdaj/shared';
import { validateProjectFiles, fileBuffer } from './archive.js';
import { validateTaskChecks } from './spec.js';

export interface RunnerOptions {
  dataDir: string;
  hostDataDir?: string;
  jobId?: string;
  profile: 'local-development' | 'public-sandbox';
  image?: string;
  timeoutMs?: number;
  memory?: string;
  publicReady?: boolean;
  diagnostics?: boolean;
  onResourceSample?: (memoryBytes: number) => void;
}
export interface CommandResult {
  code: number;
  stdout: string;
  stderr: string;
}
export function command(
  args: string[],
  timeoutMs = 10000,
  maxOutput = 1024 * 1024,
  input?: string,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', args, {
      windowsHide: true,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    // A container that exits early closes the pipe; its exit status reports the failure.
    child.stdin.on('error', () => undefined);
    child.stdin.end(input ?? '');
    let stdout = '';
    let stderr = '';
    let bytes = 0;
    let done = false;
    const timer = setTimeout(() => {
      child.kill();
      finish(new Error('Przekroczono czas oczekiwania na środowisko.'));
    }, timeoutMs);
    const finish = (error?: Error, result?: CommandResult) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result!);
    };
    const collect = (target: 'stdout' | 'stderr', chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > maxOutput) {
        child.kill();
        finish(new Error('Przekroczono limit komunikatów środowiska.'));
        return;
      }
      if (target === 'stdout') stdout += chunk.toString();
      else stderr += chunk.toString();
    };
    child.stdout.on('data', (chunk: Buffer) => collect('stdout', chunk));
    child.stderr.on('data', (chunk: Buffer) => collect('stderr', chunk));
    child.on('error', (error) => finish(error));
    child.on('close', (code) => finish(undefined, { code: code ?? 1, stdout, stderr }));
  });
}
export async function checkRuntime(options: RunnerOptions): Promise<void> {
  // Docker Desktop can need more than ten seconds to answer trusted control
  // probes. This does not extend the separate deadline for executing user code.
  const result = await command(['info', '--format', '{{json .}}'], 30000);
  if (result.code !== 0) throw new Error('Docker nie jest dostępny.');
  const info = JSON.parse(result.stdout) as {
    OSType?: string;
    Runtimes?: Record<string, unknown>;
    MemoryLimit?: boolean;
    PidsLimit?: boolean;
    CpuCfsQuota?: boolean;
    CgroupVersion?: string;
  };
  if (info.OSType !== 'linux') throw new Error('Wymagane są kontenery Linux.');
  if (!info.MemoryLimit || !info.PidsLimit || !info.CpuCfsQuota)
    throw new Error('Host nie zapewnia wymaganych limitów zasobów.');
  if (options.profile === 'public-sandbox') {
    if (!options.publicReady)
      throw new Error(
        'Profil publiczny wymaga potwierdzonych testów izolacji (PUBLIC_SANDBOX_VERIFIED).',
      );
    if (!info.Runtimes?.runsc || info.CgroupVersion !== '2')
      throw new Error(
        'Brak wymaganego runsc/gVisor lub cgroup v2. Uruchomienie zostało zablokowane.',
      );
  }
  const image = await command(
    ['image', 'inspect', options.image ?? 'zdaj-inf-sandbox:0.3.1', '--format', '{{.Id}}'],
    30000,
  );
  if (image.code !== 0) throw new Error('Brak obrazu środowiska. Uruchom npm run sandbox:build.');
}
export function makeReport(
  task: TaskVersion,
  results: CriterionResult[],
  runtimeMs: number,
): CheckReport {
  const confirmedPoints = results
    .filter((result) => result.status === 'passed')
    .reduce((sum, result) => sum + result.points, 0);
  const checkedPoints = results
    .filter((result) => ['passed', 'failed'].includes(result.status))
    .reduce((sum, result) => sum + result.points, 0);
  const totalPoints = task.criteria.reduce((sum, criterion) => sum + criterion.points, 0);
  const complete =
    results.length === task.criteria.length &&
    results.every((result) => ['passed', 'failed'].includes(result.status));
  return {
    taskId: task.id,
    taskVersion: task.version,
    createdAt: new Date().toISOString(),
    results,
    confirmedPoints,
    checkedPoints,
    totalPoints,
    complete,
    percentage: complete && totalPoints ? Math.round((100 * confirmedPoints) / totalPoints) : null,
    runtimeMs,
    disclaimer:
      'To wynik ćwiczenia, nie oficjalna ocena CKE. Niezweryfikowane kryteria nie są zaliczane ani uznawane za błędy.',
  };
}
export interface SandboxLimits {
  memory: string;
  pids: number;
  tmpBytes: number;
  timeoutMs: number;
}
/**
 * Starts one fixed sandbox container over validated project files and returns the
 * controller's standard output. Isolation flags are not configurable by callers.
 */
export async function runSandbox(
  files: ProjectFile[],
  configuration: string,
  options: RunnerOptions,
  limits: SandboxLimits,
  failure: string,
): Promise<{ stdout: string; runtimeMs: number }> {
  await checkRuntime(options);
  const started = Date.now();
  const runId = randomUUID();
  const directory = path.resolve(options.dataDir, 'sandbox', runId);
  const source = path.join(directory, 'project');
  const containerName = `zdaj-check-${runId}`;
  await mkdir(source, { recursive: true });
  try {
    await writeFile(
      path.join(directory, 'run.json'),
      JSON.stringify({ jobId: options.jobId ?? null, createdAt: new Date().toISOString() }),
    );
    for (const file of files) {
      const destination = path.resolve(source, ...file.path.split('/'));
      if (!destination.startsWith(`${source}${path.sep}`)) throw new Error('Niedozwolona ścieżka.');
      await mkdir(path.dirname(destination), { recursive: true });
      await writeFile(destination, fileBuffer(file));
    }
    const runtime = options.profile === 'public-sandbox' ? 'runsc' : 'runc';
    const hostPath = (localPath: string) =>
      options.hostDataDir
        ? `${options.hostDataDir.replace(/[/\\]+$/, '')}/${path.relative(options.dataDir, localPath).replaceAll('\\', '/')}`
        : localPath;
    const args = [
      'run',
      '--rm',
      '--interactive',
      '--name',
      containerName,
      '--label',
      'zdaj.role=sandbox',
      '--label',
      `zdaj.job=${options.jobId ?? runId}`,
      '--network',
      'none',
      '--runtime',
      runtime,
      '--read-only',
      '--cap-drop',
      'ALL',
      '--cap-add',
      'SETUID',
      '--cap-add',
      'SETGID',
      '--cap-add',
      'CHOWN',
      '--cap-add',
      'KILL',
      '--security-opt',
      'no-new-privileges=true',
      '--memory',
      limits.memory,
      '--memory-swap',
      limits.memory,
      '--cpus',
      '1',
      '--pids-limit',
      String(limits.pids),
      '--ulimit',
      'nofile=1024:1024',
      '--tmpfs',
      `/tmp:rw,nosuid,nodev,size=${limits.tmpBytes}`,
      '--tmpfs',
      '/run:rw,nosuid,nodev,size=33554432',
      '--shm-size',
      '128m',
      '--mount',
      `type=bind,source=${hostPath(source)},target=/project,readonly`,
      ...(options.diagnostics ? ['--env', 'CHECKER_DEBUG=1'] : []),
      options.image ?? 'zdaj-inf-sandbox:0.3.1',
    ];
    let sampling = false;
    const sampler = options.onResourceSample
      ? setInterval(() => {
          if (sampling) return;
          sampling = true;
          void command(['stats', '--no-stream', '--format', '{{.MemUsage}}', containerName], 4000)
            .then((result) => {
              const match = result.stdout.match(/([\d.]+)([KMGT]?i?B)/);
              if (match) {
                const units: Record<string, number> = {
                  B: 1,
                  kB: 1000,
                  KB: 1000,
                  KiB: 1024,
                  MB: 1000000,
                  MiB: 1048576,
                  GB: 1000000000,
                  GiB: 1073741824,
                };
                options.onResourceSample!(Number(match[1]) * (units[match[2]] ?? 1));
              }
            })
            .catch(() => undefined)
            .finally(() => {
              sampling = false;
            });
        }, 2000)
      : undefined;
    let output: CommandResult;
    try {
      output = await command(args, limits.timeoutMs, undefined, configuration);
    } finally {
      if (sampler) clearInterval(sampler);
    }
    if (output.code !== 0) throw new Error(options.diagnostics ? output.stderr : failure);
    return { stdout: output.stdout, runtimeMs: Date.now() - started };
  } finally {
    await command(['rm', '--force', containerName], 10000).catch(() => undefined);
    await rm(directory, { recursive: true, force: true });
  }
}
export async function runProject(
  task: TaskVersion,
  input: ProjectFile[],
  options: RunnerOptions,
): Promise<CheckReport> {
  validateTaskChecks(task);
  const files = validateProjectFiles(input);
  const seed = task.starterFiles.find((file) => file.path === 'baza.sql')?.content ?? '';
  // Expected results travel on the controller's standard input, not through a mount:
  // a mounted file would be readable by the learner's PHP process.
  const configuration = JSON.stringify({
    taskId: task.id,
    runtimeProfile: task.runtimeProfile,
    criteria: task.criteria,
    seed,
  });
  {
    const { stdout, runtimeMs } = await runSandbox(
      files,
      configuration,
      options,
      {
        memory: options.memory ?? '2g',
        pids: 256,
        tmpBytes: 536870912,
        timeoutMs: options.timeoutMs ?? 120000,
      },
      'Środowisko nie ukończyło sprawdzania. Rozwiązanie nie zostało ocenione.',
    );
    const payload = JSON.parse(stdout) as { results: CriterionResult[] };
    if (!Array.isArray(payload.results) || payload.results.length !== task.criteria.length)
      throw new Error('Nieprawidłowy raport środowiska.');
    // Grade weights and method metadata always come from the published task, never from a submission.
    const results = task.criteria.map((criterion) => {
      const result = payload.results.find((item) => item.criterionId === criterion.id);
      if (!result || !['passed', 'failed', 'manual', 'unchecked', 'error'].includes(result.status))
        throw new Error('Niepełny raport środowiska.');
      return {
        ...result,
        criterionId: criterion.id,
        title: criterion.title,
        points: criterion.points,
        method: criterion.method,
        source: criterion.source,
        evidence: String(result.evidence).slice(0, 4000),
        recommendation: String(result.recommendation).slice(0, 2000),
      };
    });
    return makeReport(task, results, runtimeMs);
  }
}
export async function readProject(filePath: string): Promise<ProjectFile[]> {
  return validateProjectFiles(JSON.parse(await readFile(filePath, 'utf8')));
}
