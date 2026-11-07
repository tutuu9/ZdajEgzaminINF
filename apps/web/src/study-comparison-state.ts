import {
  MAX_STUDY_CHECKPOINT_BYTES,
  MAX_STUDY_CHECKPOINTS,
  type AttemptSnapshot,
  type ProjectFile,
  type StudyComparisonCheckpoint,
} from '@zdaj/shared';
import { isChangeUnderstandActivity } from './change-understand/learning';

export function getStudyComparisonActivity(
  project: AttemptSnapshot,
  activityId = project.study?.current,
) {
  if (
    project.kind !== 'practice' ||
    project.mode !== 'nauka' ||
    project.submittedAt ||
    !project.study?.guide.project ||
    !activityId ||
    activityId !== project.study.current
  )
    return undefined;
  const { guide } = project.study;
  for (const step of guide.steps) {
    const activity = step.activities?.find(
      (candidate) => `${step.id}/${candidate.id}` === activityId,
    );
    if (activity && isChangeUnderstandActivity(step, activity)) return { guide, step, activity };
  }
  return undefined;
}

export function findStudyCheckpoint(
  project: AttemptSnapshot,
  activityId = project.study?.current,
): StudyComparisonCheckpoint | undefined {
  const guide = project.study?.guide;
  return project.studyComparison?.checkpoints.find(
    (checkpoint) =>
      checkpoint.activityId === activityId &&
      checkpoint.guideId === guide?.id &&
      checkpoint.guideVersion === guide?.version,
  );
}

export function checkpointFilesBytes(files: ProjectFile[]) {
  return files.reduce(
    (total, file) =>
      total +
      (file.encoding === 'base64'
        ? (file.content.length * 3) / 4
        : new TextEncoder().encode(file.content).length),
    0,
  );
}

/** Called once when opening an eligible step, never on a file edit or preview redraw. */
export function withStudyCheckpoint(project: AttemptSnapshot, activityId: string): AttemptSnapshot {
  const context = getStudyComparisonActivity(project, activityId);
  if (!context || findStudyCheckpoint(project, activityId)) return project;
  const files = project.files ?? [];
  const bytes = checkpointFilesBytes(files);
  if (bytes > MAX_STUDY_CHECKPOINT_BYTES)
    throw new Error(
      'Projekt jest większy niż 20 MiB. Punkt porównania nie został zapisany. Twoje pliki pozostają w projekcie; możesz pobrać ich kopię.',
    );
  const checkpoint: StudyComparisonCheckpoint = {
    id: crypto.randomUUID(),
    guideId: context.guide.id,
    guideVersion: context.guide.version,
    activityId,
    createdAt: new Date().toISOString(),
    files: structuredClone(files),
    activeFile: project.workspace?.activeFile ?? files[0]?.path ?? '',
    previewEntry: project.workspace?.previewEntry ?? '',
  };
  const checkpoints = [...(project.studyComparison?.checkpoints ?? []), checkpoint];
  let total = checkpoints.reduce((sum, item) => sum + checkpointFilesBytes(item.files), 0);
  while (checkpoints.length > MAX_STUDY_CHECKPOINTS || total > MAX_STUDY_CHECKPOINT_BYTES) {
    total -= checkpointFilesBytes(checkpoints.shift()!.files);
  }
  return { ...project, studyComparison: { ...project.studyComparison, checkpoints } };
}

export function prepareStudyRestore(
  project: AttemptSnapshot,
  checkpointId: string,
): { restored: AttemptSnapshot; copy: AttemptSnapshot } {
  const checkpoint = findStudyCheckpoint(project);
  if (!getStudyComparisonActivity(project) || checkpoint?.id !== checkpointId)
    throw new Error('Ten punkt nie pasuje do bieżącego kroku nauki. Niczego nie przywrócono.');
  const now = new Date().toISOString();
  const copy = structuredClone(project);
  copy.id = crypto.randomUUID();
  copy.title = `${project.title.slice(0, 215)} — kopia przed przywróceniem`;
  copy.createdAt = now;
  copy.updatedAt = now;
  copy.revision = 0;
  // The detached ticket cannot close or alter the source project's server attempt.
  // A future authorized request renews this absent ticket through the ordinary path.
  copy.ticket = { id: crypto.randomUUID(), token: crypto.randomUUID(), deadlineAt: null };
  copy.deadlineAt = null;
  copy.hintOffset = copy.hintCount;
  delete copy.checkJob;
  delete copy.report;
  delete copy.legacyProjectId;
  const files = structuredClone(checkpoint.files);
  const activeFile = files.some((file) => file.path === checkpoint.activeFile)
    ? checkpoint.activeFile
    : (files[0]?.path ?? '');
  const previewEntry = files.some((file) => file.path === checkpoint.previewEntry)
    ? checkpoint.previewEntry
    : (files.find((file) => /\.(?:html?|php)$/i.test(file.path))?.path ?? '');
  const restored: AttemptSnapshot = {
    ...project,
    files,
    revision: (project.revision ?? 0) + 1,
    updatedAt: now,
    studyComparison: { ...project.studyComparison!, restorationId: crypto.randomUUID() },
    workspace: {
      view: 'study',
      ...project.workspace,
      activeFile,
      previewEntry,
      editors: {},
      studyPanel: 'code',
    },
  };
  return { restored, copy };
}
