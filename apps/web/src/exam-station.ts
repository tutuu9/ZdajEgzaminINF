/**
 * The simulated exam workstation: the 10-minute reading time before the clock, the practice
 * candidate number that names the results folder, and the folder ZIP. The reading time and the
 * number stay in this browser only (localStorage), so attempt snapshots and backups keep their
 * existing format.
 */
import type { ProjectFile } from '@zdaj/shared';

/** The reading time printed on INF.03 papers; it is not counted in the 150 minutes. */
export const READING_MINUTES = 10;
const READING_MS = READING_MINUTES * 60_000;
/** A reading phase left open much longer than its 10 minutes is treated as abandoned. */
const READING_STALE_MS = READING_MS + 60 * 60_000;

const readingKey = (taskId: string, version: number) => `zdaj:exam-reading:${taskId}:${version}`;
const stationKey = (attemptId: string) => `zdaj:exam-station:${attemptId}`;

export interface ReadingPhase {
  startedAt: string;
  candidate: string;
}
export interface StationRecord {
  candidate: string;
  /** Whole minutes spent in the reading phase before the clock started. */
  readingMinutes: number;
}

function readJson<T>(key: string): T | undefined {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}
function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Without storage the phase still works for this visit. */
  }
}
function remove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* Nothing to remove without storage. */
  }
}

/** Letters, digits, "-" and "_", so the number is a valid folder and archive name. */
export function candidateProblem(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 'Wpisz numer, którym nazwiesz folder z wynikami.';
  if (/^\d{11}$/.test(trimmed))
    return 'To wygląda jak numer PESEL. Ćwicząc, użyj numeru zastępczego, np. Z042317.';
  if (!/^[A-Za-z0-9_-]{1,20}$/.test(trimmed))
    return 'Użyj od 1 do 20 liter bez polskich znaków, cyfr, „-” lub „_”.';
  return undefined;
}

export function practiceCandidate(random: () => number = Math.random) {
  return `Z${Math.floor(random() * 1_000_000)
    .toString()
    .padStart(6, '0')}`;
}

export function readReading(
  taskId: string,
  version: number,
  now = Date.now(),
): ReadingPhase | undefined {
  const phase = readJson<ReadingPhase>(readingKey(taskId, version));
  if (!phase || typeof phase.startedAt !== 'string' || typeof phase.candidate !== 'string')
    return undefined;
  const started = Date.parse(phase.startedAt);
  if (!Number.isFinite(started) || now - started > READING_STALE_MS || started > now + 60_000) {
    remove(readingKey(taskId, version));
    return undefined;
  }
  return candidateProblem(phase.candidate) ? undefined : phase;
}
export function saveReading(taskId: string, version: number, phase: ReadingPhase) {
  writeJson(readingKey(taskId, version), phase);
}
export function clearReading(taskId: string, version: number) {
  remove(readingKey(taskId, version));
}
export function readingDeadline(phase: ReadingPhase) {
  return new Date(Date.parse(phase.startedAt) + READING_MS).toISOString();
}

export function readStation(attemptId: string): StationRecord | undefined {
  const record = readJson<StationRecord>(stationKey(attemptId));
  if (!record || typeof record.candidate !== 'string' || candidateProblem(record.candidate))
    return undefined;
  return {
    candidate: record.candidate,
    readingMinutes: Number.isFinite(record.readingMinutes) ? record.readingMinutes : 0,
  };
}
export function saveStation(attemptId: string, record: StationRecord) {
  writeJson(stationKey(attemptId), record);
}

/** The results folder as it would be burnt on the disc: every file inside "<number>/". */
export function folderFiles(files: ProjectFile[], candidate: string): ProjectFile[] {
  return files.map((file) => ({ ...file, path: `${candidate}/${file.path}` }));
}

/** Remaining time as the station clock shows it: h:mm:ss. */
export function stationClock(milliseconds: number) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function fileSize(file: ProjectFile) {
  const bytes =
    file.encoding === 'base64'
      ? Math.floor((file.content.replace(/=+$/, '').length * 3) / 4)
      : new TextEncoder().encode(file.content).length;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}
