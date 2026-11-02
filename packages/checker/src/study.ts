import { createHash } from 'node:crypto';
import { parser as phpParser } from '@lezer/php';
import type { ProjectFile, StudyCheckReport, StudyCheckResult, TaskVersion } from '@zdaj/shared';
import { runProject, type RunnerOptions } from './runner.js';
import { fileBuffer } from './archive.js';

export interface StudyRuntimeAdapter {
  id: 'kursy-calculator' | 'smoki-tabs';
  taskId: string;
  guideVersion: number;
  activityId: string;
  entry: string;
  title: string;
}
const adapters: readonly StudyRuntimeAdapter[] = [
  {
    id: 'kursy-calculator',
    taskId: 'inf03-01-25-01-sg',
    guideVersion: 3,
    activityId: 'calculator/calculator-check',
    entry: 'raty.html',
    title: 'Działanie kalkulatora rat',
  },
  {
    id: 'smoki-tabs',
    taskId: 'inf03-08-25-06-sg',
    guideVersion: 3,
    activityId: 'tabs/tabs-check',
    entry: 'smoki.php',
    title: 'Przełączanie trzech widoków',
  },
];

/** Executable adapter selection is compiled into the platform, never supplied by the learner. */
export function studyRuntimeAdapter(taskId: string, guideVersion: number, activityId: string) {
  return adapters.find(
    (adapter) =>
      adapter.taskId === taskId &&
      adapter.guideVersion === guideVersion &&
      adapter.activityId === activityId,
  );
}

export function studyInputHash(files: ProjectFile[]): string {
  return createHash('sha256')
    .update(
      JSON.stringify(
        files
          .map((file) => ({
            path: file.path,
            content: file.content,
            encoding: file.encoding ?? 'utf8',
          }))
          .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0)),
      ),
    )
    .digest('hex');
}

export function staticPhpTemplate(source: string): string {
  const fragments: string[] = [];
  phpParser
    .configure({ top: 'Template' })
    .parse(source)
    .iterate({
      enter(node) {
        if (node.name === 'Text') fragments.push(source.slice(node.from, node.to));
      },
    });
  return fragments.join('');
}

export interface StudyRuntimeInput {
  guideId: string;
  guideVersion: number;
  taskId: string;
  taskVersion: number;
  activityId: string;
  projectRevision: number;
  inputHash: string;
  criterionId: string;
  criterionTitle: string;
}

export async function runStudyProject(
  input: StudyRuntimeInput,
  files: ProjectFile[],
  options: RunnerOptions,
): Promise<StudyCheckReport> {
  const adapter = studyRuntimeAdapter(input.taskId, input.guideVersion, input.activityId);
  if (!adapter) throw new Error('Unsupported study adapter.');
  if (studyInputHash(files) !== input.inputHash)
    throw new Error('Study source integrity mismatch.');
  const original = files.find((file) => file.path === adapter.entry);
  const entry = adapter.entry.endsWith('.php') ? '__study_smoki.html' : adapter.entry;
  // The JS lesson never executes uploaded PHP, even through fetch or a navigation.
  const project = files.filter(
    (file) =>
      /\.(html?|css|js|mjs|json|txt|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf)$/i.test(file.path) &&
      !(adapter.entry.endsWith('.php') && file.path === entry),
  );
  if (original && /\.php$/i.test(adapter.entry)) {
    const template = fileBuffer(original).toString('utf8');
    if (template.length > 1_000_000)
      return {
        guideId: input.guideId,
        guideVersion: input.guideVersion,
        activityId: input.activityId,
        projectRevision: input.projectRevision,
        inputHash: input.inputHash,
        createdAt: new Date().toISOString(),
        status: 'unsupported',
        results: [
          {
            id: input.criterionId,
            title: input.criterionTitle,
            status: 'unsupported',
            evidence: 'Szablon PHP przekracza limit miliona znaków dla tej kontroli JavaScript.',
            recommendation: 'Sprawdź przełączanie widoków ręcznie w lokalnym środowisku.',
          },
        ],
        disclaimer:
          'Nie wykonano kodu ani nie przypisano oceny. Kod PHP i SQL wymaga osobnego sprawdzenia.',
      };
    project.push({ path: entry, content: staticPhpTemplate(template), encoding: 'utf8' });
  }
  const task: TaskVersion = {
    id: input.taskId,
    version: input.taskVersion,
    title: adapter.title,
    summary: 'Kontrola edukacyjna JavaScript.',
    qualification: 'INF.03',
    topicIds: ['javascript'],
    technologies: ['HTML', 'JavaScript'],
    durationMinutes: 150,
    difficulty: 'beginner',
    runtimeProfile: 'web',
    requirements: [],
    starterFiles: [],
    guidance: { beginner: [], intermediate: [], advanced: [] },
    hints: [],
    followUp: '',
    origin: 'original',
    criteria: [
      {
        id: input.criterionId,
        title: input.criterionTitle,
        description: 'Porównaj zachowanie swojego projektu z opisem kroku i oryginalnym PDF.',
        method: 'javascript',
        source: 'educational',
        points: 1,
        check: { type: 'javascript', path: entry, action: adapter.id },
      },
    ],
  };
  const checked = await runProject(task, project, options);
  const results: StudyCheckResult[] = checked.results.map((result) => ({
    id: result.criterionId,
    title: result.title,
    status: result.status === 'unchecked' ? 'unsupported' : result.status,
    evidence: result.evidence,
    recommendation: result.recommendation,
  }));
  const status = results.some((result) => result.status === 'error')
    ? 'error'
    : results.some((result) => result.status === 'failed')
      ? 'failed'
      : results.every((result) => result.status === 'passed')
        ? 'passed'
        : 'unsupported';
  return {
    guideId: input.guideId,
    guideVersion: input.guideVersion,
    activityId: input.activityId,
    projectRevision: input.projectRevision,
    inputHash: input.inputHash,
    createdAt: new Date().toISOString(),
    status,
    results,
    disclaimer:
      'Edukacyjne sprawdzenie JavaScript dla tego kroku, nie ocena całego arkusza CKE. Kod PHP i zapytania SQL nie są wykonywane ani oceniane.',
  };
}
