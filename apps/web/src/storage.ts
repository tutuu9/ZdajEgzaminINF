import { openDB } from 'idb';
import { strFromU8, strToU8, zipSync } from 'fflate';
import {
  MAX_EXTRACTED_BYTES,
  MAX_PROJECT_FILES,
  MAX_UPLOAD_BYTES,
  type AttemptSnapshot,
  type Level,
  type ProjectFile,
} from '@zdaj/shared';
import { extractBrowserZip, safePath } from './safe-zip';
import { validateBackupAttempts, validateBackupLearning } from './backup-validation';
export { safePath } from './safe-zip';

const database = () =>
  openDB('zdaj-egzamin-inf', 1, {
    upgrade(db) {
      db.createObjectStore('attempts', { keyPath: 'id' });
      db.createObjectStore('preferences');
      db.createObjectStore('learning');
    },
  });

export async function listAttempts(): Promise<AttemptSnapshot[]> {
  const db = await database();
  return ((await db.getAll('attempts')) as AttemptSnapshot[]).sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}
export async function readAttempt(id: string): Promise<AttemptSnapshot | undefined> {
  return (await database()).get('attempts', id);
}
export async function saveAttempt(attempt: AttemptSnapshot): Promise<void> {
  try {
    await (await database()).put('attempts', structuredClone(attempt));
  } catch {
    throw new Error(
      'Nie udało się zapisać próby w przeglądarce. Sprawdź wolne miejsce i wyeksportuj postęp przed zamknięciem strony.',
    );
  }
}
export async function removeAttempt(id: string): Promise<void> {
  await (await database()).delete('attempts', id);
}
export async function getLevel(): Promise<Level> {
  return ((await (await database()).get('preferences', 'level')) as Level) || 'beginner';
}
export async function storeLevel(level: Level): Promise<void> {
  await (await database()).put('preferences', level, 'level');
}
export async function completedLessons(): Promise<string[]> {
  return ((await (await database()).getAllKeys('learning')) as string[]).filter(
    (key) => !key.startsWith('exercise:'),
  );
}
export async function readExercise(id: string): Promise<string | undefined> {
  return (await database()).get('learning', `exercise:${id}`);
}
export async function saveExercise(id: string, code: string): Promise<void> {
  await (await database()).put('learning', code, `exercise:${id}`);
}
export async function markLesson(id: string, completed: boolean): Promise<void> {
  const db = await database();
  if (completed) await db.put('learning', { completedAt: new Date().toISOString() }, id);
  else await db.delete('learning', id);
}

const binaryExtensions = /\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|otf)$/i;
export function bytesToFile(path: string, bytes: Uint8Array): ProjectFile {
  safePath(path);
  if (binaryExtensions.test(path)) {
    let content = '';
    for (let i = 0; i < bytes.length; i += 16384)
      content += String.fromCharCode(...bytes.subarray(i, i + 16384));
    return { path, content: btoa(content), encoding: 'base64' };
  }
  return {
    path,
    content: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
    encoding: 'utf8',
  };
}
export function fileBytes(file: ProjectFile): Uint8Array {
  return file.encoding === 'base64'
    ? Uint8Array.from(atob(file.content), (c) => c.charCodeAt(0))
    : strToU8(file.content);
}
export async function importProject(files: FileList | File[]): Promise<ProjectFile[]> {
  const list = Array.from(files);
  if (list.reduce((n, file) => n + file.size, 0) > MAX_UPLOAD_BYTES)
    throw new Error('Przesyłane pliki mogą zajmować maksymalnie 10 MiB.');
  if (list.length === 1 && /\.zip$/i.test(list[0]!.name)) {
    const unpacked = await extractBrowserZip(new Uint8Array(await list[0]!.arrayBuffer()));
    return Object.entries(unpacked).map(([path, bytes]) => bytesToFile(path, bytes));
  }
  if (list.length > MAX_PROJECT_FILES)
    throw new Error('Projekt może zawierać maksymalnie 500 plików.');
  if (list.some((file) => /\.(zip|7z|rar|tar|gz)$/i.test(file.name)))
    throw new Error('Wybierz pojedynczy plik ZIP albo pliki projektu.');
  const result = await Promise.all(
    list.map(async (file) => bytesToFile(file.name, new Uint8Array(await file.arrayBuffer()))),
  );
  if (new Set(result.map((file) => file.path.toLocaleLowerCase('pl'))).size !== result.length)
    throw new Error('Nazwy plików nie mogą się powtarzać.');
  return result;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export function downloadProject(files: ProjectFile[], filename: string): void {
  const zip = zipSync(
    Object.fromEntries(files.map((file) => [safePath(file.path), fileBytes(file)])),
  );
  downloadBlob(new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }), filename);
}

export async function exportProgress(): Promise<void> {
  const db = await database();
  const learningKeys = await db.getAllKeys('learning');
  const learning = Object.fromEntries(
    await Promise.all(
      learningKeys.map(async (key) => [String(key), await db.get('learning', key)]),
    ),
  );
  const payload = {
    format: 'zdaj-egzamin-inf',
    version: 1,
    exportedAt: new Date().toISOString(),
    attempts: await listAttempts(),
    level: await getLevel(),
    completedLessons: await completedLessons(),
    learning,
  };
  const bytes = strToU8(JSON.stringify(payload));
  if (bytes.length > MAX_EXTRACTED_BYTES)
    throw new Error(
      'Postęp przekracza limit 50 MiB jednej kopii. Pobierz duże projekty osobno przed usunięciem ich starych prób.',
    );
  const zip = zipSync({ 'postep.json': bytes });
  downloadBlob(
    new Blob([zip as Uint8Array<ArrayBuffer>], { type: 'application/zip' }),
    `zdaj-inf-postep-${new Date().toISOString().slice(0, 10)}.zip`,
  );
}
export async function importProgress(file: File): Promise<number> {
  if (file.size > MAX_EXTRACTED_BYTES)
    throw new Error('Kopia postępu jest zbyt duża (limit 50 MiB).');
  const unzipped = await extractBrowserZip(new Uint8Array(await file.arrayBuffer()));
  if (!unzipped['postep.json'] || Object.keys(unzipped).length !== 1)
    throw new Error('To nie jest kopia postępu Zdaj Egzamin INF.');
  const data = JSON.parse(strFromU8(unzipped['postep.json'])) as Record<string, unknown>;
  if (
    data.format !== 'zdaj-egzamin-inf' ||
    data.version !== 1 ||
    !Array.isArray(data.attempts) ||
    data.attempts.length > 1000
  )
    throw new Error('Nieobsługiwany format kopii postępu.');
  const attempts = validateBackupAttempts(data.attempts);
  const learning = validateBackupLearning(data.learning, data.completedLessons);
  if (!['beginner', 'intermediate', 'advanced'].includes(String(data.level)))
    throw new Error('Kopia zawiera nieprawidłowy poziom nauki.');
  const db = await database();
  const tx = db.transaction(['attempts', 'preferences', 'learning'], 'readwrite');
  for (const attempt of attempts) {
    const old = (await tx.objectStore('attempts').get(attempt.id)) as AttemptSnapshot | undefined;
    if (!old || old.updatedAt < attempt.updatedAt) await tx.objectStore('attempts').put(attempt);
  }
  await tx.objectStore('preferences').put(data.level, 'level');
  for (const id of learning.completed)
    await tx.objectStore('learning').put({ completedAt: new Date().toISOString() }, id);
  for (const [key, value] of Object.entries(learning.exercises))
    await tx.objectStore('learning').put(value, key);
  await tx.done;
  return data.attempts.length;
}
