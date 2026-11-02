import type { AttemptSnapshot, Level } from '@zdaj/shared';
import { validateBackupAttempts, validateBackupLearning } from './backup-validation';

export type LearningValue = string | { completedAt: string };
export interface ProgressBackup {
  format: 'zdaj-egzamin-inf';
  version: 1 | 2;
  exportedAt: string;
  attempts: AttemptSnapshot[];
  level: Level;
  completedLessons: string[];
  learning: Record<string, LearningValue>;
}

export function readProgressBackup(value: unknown): ProgressBackup {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Nieobsługiwany format kopii postępu.');
  const data = value as Record<string, unknown>;
  if (data.format !== 'zdaj-egzamin-inf' || (data.version !== 1 && data.version !== 2))
    throw new Error('Nieobsługiwany format kopii postępu.');
  if (typeof data.exportedAt !== 'string' || !Number.isFinite(Date.parse(data.exportedAt)))
    throw new Error('Kopia zawiera nieprawidłową datę eksportu.');
  if (
    typeof data.level !== 'string' ||
    !['beginner', 'intermediate', 'advanced'].includes(data.level)
  )
    throw new Error('Kopia zawiera nieprawidłowy poziom nauki.');
  const attempts = validateBackupAttempts(data.attempts);
  const validated = validateBackupLearning(data.learning, data.completedLessons);
  const learning: Record<string, LearningValue> = { ...validated.records, ...validated.exercises };
  for (const id of validated.completed) learning[id] ??= { completedAt: data.exportedAt };
  return {
    format: 'zdaj-egzamin-inf',
    version: data.version,
    exportedAt: data.exportedAt,
    attempts,
    level: data.level as Level,
    completedLessons: validated.completed,
    learning,
  };
}

function stableValue(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`;
  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`)
      .join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
function projectIdentity(project: AttemptSnapshot): string {
  const { id: _id, legacyProjectId: _legacyProjectId, ...content } = project;
  return stableValue(content);
}

/** Creates additions only. The caller commits them atomically in one IndexedDB transaction. */
export function planBackupMerge(
  existing: AttemptSnapshot[],
  existingLearning: Record<string, LearningValue>,
  incoming: ProgressBackup,
  makeId: () => string = () => crypto.randomUUID(),
): { attempts: AttemptSnapshot[]; learning: Record<string, LearningValue>; conflicts: number } {
  const attempts: AttemptSnapshot[] = [],
    learning: Record<string, LearningValue> = Object.create(null) as Record<string, LearningValue>;
  const known = new Map(existing.map((attempt) => [attempt.id, attempt]));
  const identities = new Map<string, AttemptSnapshot[]>();
  const remember = (attempt: AttemptSnapshot) => {
    const fingerprint = projectIdentity(attempt);
    identities.set(fingerprint, [...(identities.get(fingerprint) ?? []), attempt]);
  };
  existing.forEach(remember);
  let conflicts = 0;
  for (const source of incoming.attempts) {
    const fingerprint = projectIdentity(source);
    const duplicate = identities
      .get(fingerprint)
      ?.find(
        (saved) =>
          saved.id === source.id ||
          saved.legacyProjectId === source.id ||
          saved.id === source.legacyProjectId ||
          (source.legacyProjectId !== undefined &&
            saved.legacyProjectId === source.legacyProjectId),
      );
    if (duplicate) continue;
    let imported = structuredClone(source);
    if (known.has(source.id)) {
      let nextId = '';
      for (let tries = 0; tries < 20; tries++) {
        const candidate = makeId();
        if (/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(candidate) && !known.has(candidate)) {
          nextId = candidate;
          break;
        }
      }
      if (!nextId)
        throw new Error(
          'Nie udało się utworzyć oddzielnej kopii projektu. Nie zmieniono lokalnych danych.',
        );
      imported = { ...imported, id: nextId, legacyProjectId: source.legacyProjectId ?? source.id };
      conflicts++;
    }
    known.set(imported.id, imported);
    remember(imported);
    attempts.push(imported);
  }
  const allLearning = { ...existingLearning };
  for (const [key, value] of Object.entries(incoming.learning)) {
    const old = allLearning[key];
    if (old === undefined) {
      learning[key] = value;
      allLearning[key] = value;
      continue;
    }
    if (stableValue(old) === stableValue(value)) continue;
    // Notes retain their original project prefix so the archived-notebook reader finds copies.
    const base = key.startsWith('exercise:') ? key.slice(9) : `lesson-${key}`;
    const prefix = `exercise:${base.slice(0, 102)}-import-`;
    const storedValue: LearningValue =
      typeof value === 'string' ? value : JSON.stringify({ originalKey: key, ...value });
    if (
      Object.entries(allLearning).some(
        ([storedKey, item]) =>
          storedKey.startsWith(prefix) && stableValue(item) === stableValue(storedValue),
      )
    )
      continue;
    let copyKey = '';
    for (let tries = 0; tries < 20; tries++) {
      const suffix = makeId()
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 18);
      const candidate = `${prefix}${suffix}`;
      if (suffix && allLearning[candidate] === undefined) {
        copyKey = candidate;
        break;
      }
    }
    if (!copyKey)
      throw new Error(
        'Nie udało się zachować oddzielnej kopii notatnika. Nie zmieniono lokalnych danych.',
      );
    learning[copyKey] = storedValue;
    allLearning[copyKey] = storedValue;
    conflicts++;
  }
  return { attempts, learning, conflicts };
}
