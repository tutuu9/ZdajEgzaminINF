import type { ExamStudyGuide, ExamStudyStep, StudyActivity } from '@zdaj/shared';

export type StudyPhase = 'explain' | 'write' | 'compare';
export interface StudyProgress {
  format: 1;
  guideId: string;
  guideVersion: number;
  current: string;
  completed: string[];
  drafts: Record<string, string>;
  phases: Record<string, StudyPhase>;
  selfChecks: Record<string, boolean>;
}
export interface StudyPosition {
  id: string;
  step: ExamStudyStep;
  activity: StudyActivity;
  indexInStep: number;
}

export function studySequence(guide: ExamStudyGuide): StudyPosition[] {
  return guide.steps.flatMap((step) =>
    (step.activities ?? []).map((activity, indexInStep) => ({
      id: `${step.id}/${activity.id}`,
      step,
      activity,
      indexInStep,
    })),
  );
}

export function initialStudyProgress(guide: ExamStudyGuide): StudyProgress {
  const first = studySequence(guide)[0];
  if (!first) throw new Error('Ten przewodnik nie zawiera jeszcze małych kroków nauki.');
  return {
    format: 1,
    guideId: guide.id,
    guideVersion: guide.version,
    current: first.id,
    completed: [],
    drafts: {},
    phases: {},
    selfChecks: {},
  };
}

export function serializeStudyProgress(progress: StudyProgress): string {
  const raw = JSON.stringify(progress);
  if (
    Object.values(progress.drafts).some((draft) => draft.length > 100_000) ||
    raw.length > 2_000_000
  )
    throw new Error(
      'Notatnik jest zbyt duży: limit to 100 000 znaków na mały krok i 2 miliony na cały przewodnik. Skróć tekst lub pobierz jego kopię. Poprzedni zapis pozostaje bez zmian.',
    );
  return raw;
}

/** A damaged backup must not unlock future activities or overwrite existing notebooks. */
export function parseStudyProgress(raw: string, guide: ExamStudyGuide): StudyProgress {
  const invalid = () => {
    throw new Error(
      'Zapis postępu tego przewodnika jest uszkodzony albo pochodzi z innej wersji. Zachowaliśmy go bez zmian.',
    );
  };
  if (raw.length > 2_000_000) return invalid();
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return invalid();
  }
  const record = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
    return value as Record<string, unknown>;
  };
  const state = record(input);
  const fields = [
    'format',
    'guideId',
    'guideVersion',
    'current',
    'completed',
    'drafts',
    'phases',
    'selfChecks',
  ];
  if (
    Object.keys(state).some((key) => !fields.includes(key)) ||
    state.format !== 1 ||
    state.guideId !== guide.id ||
    state.guideVersion !== guide.version
  )
    return invalid();
  const sequence = studySequence(guide);
  const ids = sequence.map((item) => item.id);
  if (
    !Array.isArray(state.completed) ||
    state.completed.length > ids.length ||
    state.completed.some((id, index) => id !== ids[index])
  )
    return invalid();
  const reachable = new Set(ids.slice(0, state.completed.length + 1));
  if (typeof state.current !== 'string' || !reachable.has(state.current)) return invalid();
  const drafts: Record<string, string> = {},
    phases: Record<string, StudyPhase> = {},
    selfChecks: Record<string, boolean> = {};
  for (const [id, value] of Object.entries(record(state.drafts))) {
    if (!reachable.has(id) || typeof value !== 'string' || value.length > 100_000) return invalid();
    drafts[id] = value;
  }
  for (const [id, value] of Object.entries(record(state.phases))) {
    if (
      !reachable.has(id) ||
      typeof value !== 'string' ||
      !['explain', 'write', 'compare'].includes(value)
    )
      return invalid();
    phases[id] = value as StudyPhase;
  }
  for (const [id, value] of Object.entries(record(state.selfChecks))) {
    if (!reachable.has(id) || typeof value !== 'boolean') return invalid();
    selfChecks[id] = value;
  }
  return {
    format: 1,
    guideId: guide.id,
    guideVersion: guide.version,
    current: state.current,
    completed: state.completed as string[],
    drafts,
    phases,
    selfChecks,
  };
}

export function canVisitActivity(progress: StudyProgress, sequence: StudyPosition[], id: string) {
  const index = sequence.findIndex((item) => item.id === id);
  return index >= 0 && index <= progress.completed.length;
}

export function hasWrittenAttempt(progress: StudyProgress, position: StudyPosition) {
  const draft = progress.drafts[position.id];
  return (
    typeof draft === 'string' &&
    draft.trim().length > 0 &&
    draft.trim() !== position.activity.starterCode.trim()
  );
}

export function completeStudyActivity(
  progress: StudyProgress,
  sequence: StudyPosition[],
): StudyProgress {
  const index = sequence.findIndex((item) => item.id === progress.current);
  const position = sequence[index];
  if (!position || !canVisitActivity(progress, sequence, position.id))
    throw new Error('Najpierw przejdź poprzedni krok.');
  if (
    !progress.completed.includes(position.id) &&
    (!hasWrittenAttempt(progress, position) ||
      !progress.selfChecks[position.id] ||
      (progress.phases[position.id] ?? 'explain') === 'explain')
  )
    throw new Error('Najpierw napisz własny fragment i potwierdź samodzielne sprawdzenie.');
  const completed = progress.completed.includes(position.id)
    ? progress.completed
    : [...progress.completed, position.id];
  return { ...progress, completed, current: sequence[index + 1]?.id ?? position.id };
}
