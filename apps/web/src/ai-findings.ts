import type {
  AttemptSnapshot,
  ProjectFile,
  SandboxRunResult,
  StudyCheckResult,
} from '@zdaj/shared';
import type { CodeDiagnostic } from './code-diagnostic';
import { diagnoseCourseChecks } from './course-diagnostics';
import type { ConsoleEntry } from './preview-console';
import { checkProjectLocally } from './project-checks';

/** Limits mirrored by the request validation of `POST /ai`. */
export const MAX_FINDINGS_CHARACTERS = 3000;
export const MAX_AI_FILE_CHARACTERS = 50_000;
export const MAX_AI_FILES = 12;
export const MAX_AI_PROJECT_CHARACTERS = 200_000;
export const MAX_AI_FILE_NAMES = 60;
const MAX_CHECKED_ACTIVITIES = 25;

export interface CheckFinding {
  /** Title of the course activity the check belongs to. */
  activity: string;
  result: StudyCheckResult;
  diagnostic?: CodeDiagnostic;
}
export interface FindingsInput {
  files: ProjectFile[];
  /** Deliverables listed by the course for this paper. */
  requiredFiles?: string[];
  checks?: CheckFinding[];
  console?: readonly ConsoleEntry[];
  run?: SandboxRunResult | null;
}

const isText = (file: ProjectFile) => file.encoding !== 'base64';
const one = (text: string, max = 300) => {
  const line = text.replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max)}…` : line;
};

export function lineAt(content: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < Math.min(offset, content.length); index++)
    if (content.charCodeAt(index) === 10) line++;
  return line;
}

function resolvePath(from: string, target: string): string | null {
  const parts = from.split('/').slice(0, -1);
  for (const part of target.split('/')) {
    if (!part || part === '.') continue;
    if (part === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else parts.push(part);
  }
  return parts.join('/');
}

export interface MissingReference {
  path: string;
  line: number;
  source: string;
  target: string;
  /** A file whose name differs only by letter case: a mistake a Linux server does not forgive. */
  similar?: string;
}

/** Links to project files that do not exist. Addresses outside the project are ignored. */
export function missingReferences(files: ProjectFile[]): MissingReference[] {
  const paths = new Set(files.map((file) => file.path));
  const lower = new Map(files.map((file) => [file.path.toLowerCase(), file.path]));
  const found: MissingReference[] = [];
  for (const file of files.filter(isText)) {
    const markup = /\.(?:html?|php)$/i.test(file.path);
    if (!markup && !/\.css$/i.test(file.path)) continue;
    const pattern = markup
      ? /\b(href|src|action)\s*=\s*(["'])([^"'<>]*)\2/gi
      : /\b(url)\(\s*(["']?)([^"')]*)\2\s*\)/gi;
    for (const match of file.content.matchAll(pattern)) {
      const raw = match[3]!.trim();
      const target = raw.split(/[?#]/)[0]!;
      // Empty, dynamic and external addresses say nothing about the project's files.
      if (!target || /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/)/i.test(raw) || /[<{$]/.test(raw)) continue;
      let decoded = target;
      try {
        decoded = decodeURIComponent(target);
      } catch {
        /* Keep the literal text of a malformed escape. */
      }
      const resolved = resolvePath(file.path, decoded);
      if (resolved === null || !resolved || paths.has(resolved)) continue;
      const similar = lower.get(resolved.toLowerCase());
      found.push({
        path: file.path,
        line: lineAt(file.content, match.index),
        source: `${match[1]!.toLowerCase()}="${one(raw, 80)}"`,
        target: resolved,
        ...(similar ? { similar } : {}),
      });
    }
  }
  return found;
}

/**
 * Facts about the project for the assistant, most decisive first. They describe what the
 * browser observed; they are neither a score nor a list of everything that may be wrong.
 */
export function collectFindings(input: FindingsInput): string {
  const sections: string[][] = [];
  const names = new Set(input.files.map((file) => file.path.toLowerCase()));
  const absent = (input.requiredFiles ?? []).filter((path) => !names.has(path.toLowerCase()));
  if (absent.length)
    sections.push([`Wymagane pliki, których jeszcze nie ma w projekcie: ${absent.join(', ')}`]);
  const empty = input.files.filter((file) => isText(file) && !file.content.trim());
  if (empty.length) sections.push([`Puste pliki: ${empty.map((file) => file.path).join(', ')}`]);

  const references = missingReferences(input.files);
  if (references.length)
    sections.push([
      'Odwołania do plików, których nie ma w projekcie:',
      ...references
        .slice(0, 8)
        .map(
          (item) =>
            `- ${item.path}:${item.line} ${item.source} → brak pliku ${item.target}` +
            (item.similar ? ` (jest ${item.similar}: inna wielkość liter)` : ''),
        ),
    ]);

  const failed = (input.checks ?? []).filter(({ result }) =>
    ['failed', 'error'].includes(result.status),
  );
  if (failed.length)
    sections.push([
      'Niezaliczone kontrole kursu:',
      ...failed.slice(0, 10).map(({ activity, result, diagnostic }) => {
        const file = diagnostic && input.files.find((item) => item.path === diagnostic.path);
        const place = diagnostic
          ? ` [${diagnostic.path}${
              file && diagnostic.range ? `:${lineAt(file.content, diagnostic.range.from)}` : ''
            }: ${one(diagnostic.explanation)}]`
          : '';
        return `- „${one(activity, 80)}” · ${one(result.title, 120)}: ${one(
          `${result.evidence} ${result.recommendation}`,
        )}${place}`;
      }),
    ]);

  const errors = (input.console ?? [])
    .filter((entry) => entry.level === 'error' || entry.level === 'warn')
    .slice(-6);
  if (errors.length)
    sections.push([
      'Konsola podglądu (ostatnie komunikaty JavaScript):',
      ...errors.map(
        (entry) =>
          `- ${entry.level}: ${one(entry.text)}` +
          (entry.file ? ` (${entry.file}${entry.line ? `:${entry.line}` : ''})` : ''),
      ),
    ]);

  const run = input.run;
  if (run) {
    const lines: string[] = [];
    if (run.import && !run.import.ok)
      lines.push(`- import bazy ${run.database}: ${one(run.import.error ?? 'nieudany')}`);
    for (const statement of run.statements.filter((item) => item.status === 'error').slice(0, 5))
      lines.push(
        `- zapytanie ${statement.index + 1} „${one(statement.text, 120)}”: ` +
          `${statement.error?.code ? `[${statement.error.code}] ` : ''}${one(
            statement.error?.message ?? 'błąd',
          )}`,
      );
    if (run.serverStopped) lines.push('- instrukcje ucznia zatrzymały serwer bazy danych');
    if (run.php) {
      if (run.php.error) lines.push(`- strona PHP: ${run.php.error}`);
      else if (run.php.status && run.php.status >= 400)
        lines.push(`- strona PHP odpowiedziała kodem ${run.php.status}`);
      if (run.php.messages.trim()) lines.push(`- komunikaty PHP: ${one(run.php.messages, 500)}`);
    }
    if (lines.length) sections.push(['Ostatnie uruchomienie SQL/PHP:', ...lines]);
  }

  const kept: string[] = [];
  let length = 0;
  let dropped = 0;
  for (const line of sections.flat()) {
    if (length + line.length + 1 > MAX_FINDINGS_CHARACTERS - 40) dropped++;
    else {
      kept.push(line);
      length += line.length + 1;
    }
  }
  if (dropped) kept.push(`(pominięto dalsze pozycje: ${dropped})`);
  return kept.join('\n');
}

/** The server quotes a path inside the prompt and refuses characters that could break out. */
const sendable = (path: string) => /^[^\p{Cc}[\]<>"|?*\\]{1,120}$/u.test(path);

/** The text files the assistant may read, within the limits of one request. */
export function selectAiFiles(files: ProjectFile[], activePath: string) {
  files = files.filter((file) => sendable(file.path));
  const active = files.find(
    (file) =>
      file.path === activePath && isText(file) && file.content.length <= MAX_AI_FILE_CHARACTERS,
  );
  const others: { path: string; content: string }[] = [];
  let total = active?.content.length ?? 0;
  for (const file of files
    .filter((item) => item !== active && isText(item) && item.content.trim())
    .sort((a, b) => a.content.length - b.content.length)) {
    if (others.length >= MAX_AI_FILES) break;
    if (file.content.length > MAX_AI_FILE_CHARACTERS) continue;
    if (total + file.content.length > MAX_AI_PROJECT_CHARACTERS) break;
    total += file.content.length;
    others.push({ path: file.path, content: file.content });
  }
  return {
    active: active ? { path: active.path, content: active.content } : undefined,
    files: others,
    fileNames: files.map((file) => file.path).slice(0, MAX_AI_FILE_NAMES),
  };
}

/**
 * Runs the course's own browser checks for the open activity and for the activities the
 * learner already completed, so a later edit that broke earlier work is noticed as well.
 */
export async function courseCheckFindings(project: AttemptSnapshot): Promise<CheckFinding[]> {
  const guide = project.study?.guide;
  if (!guide || !project.study) return [];
  const files = project.files ?? [];
  const positions = guide.steps.flatMap((step) =>
    (step.activities ?? []).map((activity) => ({
      id: `${step.id}/${activity.id}`,
      step,
      activity,
    })),
  );
  const completed = project.study.completed;
  const current = project.study.current;
  const chosen = positions
    .filter((position) => position.id === current || completed[position.id])
    .slice(-MAX_CHECKED_ACTIVITIES);
  const findings: CheckFinding[] = [];
  for (const position of chosen) {
    const checks = position.activity.checks ?? [];
    if (!checks.length) continue;
    try {
      const results = await checkProjectLocally(files, checks);
      const index = positions.indexOf(position);
      let diagnostics: (CodeDiagnostic | undefined)[] = [];
      try {
        diagnostics = diagnoseCourseChecks(
          files,
          checks,
          results,
          position.activity.targetFiles ?? [position.step.fileName],
          positions.slice(0, index).flatMap((prior) => prior.activity.checks ?? []),
        );
      } catch {
        /* A check result is still useful without a pointer into the code. */
      }
      results.forEach((result, at) => {
        if (result.status === 'failed')
          findings.push({ activity: position.activity.title, result, diagnostic: diagnostics[at] });
      });
    } catch {
      /* One unreadable activity must not hide the findings of the others. */
    }
  }
  // The open activity is what the learner is asking about: report it first.
  const title = positions.find((position) => position.id === current)?.activity.title;
  return findings.sort((a, b) => Number(b.activity === title) - Number(a.activity === title));
}
