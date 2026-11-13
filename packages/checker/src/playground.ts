import {
  MAX_RUN_DUMP_BYTES,
  MAX_RUN_FIELDS,
  MAX_RUN_FIELD_CHARACTERS,
  MAX_RUN_SQL_CHARACTERS,
  type ProjectFile,
  type SandboxRunRequest,
  type SandboxRunResult,
  type SandboxRunStatement,
} from '@zdaj/shared';
import { fileBuffer, validatePath, validateProjectFiles } from './archive.js';
import { runSandbox, type RunnerOptions } from './runner.js';
import { validateDatabaseName } from './spec.js';

const RUN_FAILURE = 'Środowisko nie ukończyło uruchomienia. Kod i baza nie zostały wykonane.';
export const RUN_DISCLAIMER =
  'To wynik uruchomienia Twojego kodu i Twojej bazy, nie ocena CKE. Poprawność sprawdź z arkuszem.';

/** Validates a run against the submitted files and returns a normalised copy. */
export function validateRunRequest(value: unknown, files: ProjectFile[]): SandboxRunRequest {
  if (!value || typeof value !== 'object') throw new Error('Nieprawidłowe żądanie uruchomienia.');
  const input = value as Partial<SandboxRunRequest>;
  const database = validateDatabaseName(input.database);
  const find = (target: string) => files.find((file) => file.path === target);
  let dumpPath: string | null = null;
  if (input.dumpPath !== null && input.dumpPath !== undefined) {
    if (typeof input.dumpPath !== 'string') throw new Error('Nieprawidłowa ścieżka pliku bazy.');
    dumpPath = validatePath(input.dumpPath);
    const dump = find(dumpPath);
    if (!/\.sql$/i.test(dumpPath) || !dump)
      throw new Error('Wskaż plik .sql, który znajduje się w projekcie.');
    if (fileBuffer(dump).length > MAX_RUN_DUMP_BYTES)
      throw new Error('Plik bazy może mieć maksymalnie 2 MiB.');
  }
  const sql = input.sql ?? '';
  if (typeof sql !== 'string' || sql.length > MAX_RUN_SQL_CHARACTERS)
    throw new Error('Zapytania mogą mieć łącznie maksymalnie 64 KiB.');
  let php: SandboxRunRequest['php'] = null;
  if (input.php !== null && input.php !== undefined) {
    const page = input.php as Partial<NonNullable<SandboxRunRequest['php']>>;
    if (typeof page !== 'object' || typeof page.entry !== 'string')
      throw new Error('Nieprawidłowe żądanie strony.');
    const entry = validatePath(page.entry);
    if (!/\.(php|html?)$/i.test(entry) || !find(entry))
      throw new Error('Wskaż stronę .php lub .html, która znajduje się w projekcie.');
    if (page.method !== 'GET' && page.method !== 'POST')
      throw new Error('Strona może zostać wywołana metodą GET albo POST.');
    const fields = page.fields ?? [];
    if (
      !Array.isArray(fields) ||
      fields.length > MAX_RUN_FIELDS ||
      fields.some(
        (field) =>
          !Array.isArray(field) ||
          field.length !== 2 ||
          field.some(
            (part) => typeof part !== 'string' || part.length > MAX_RUN_FIELD_CHARACTERS,
          ) ||
          !field[0],
      )
    )
      throw new Error('Formularz może zawierać maksymalnie 20 nazwanych pól tekstowych.');
    php = { entry, method: page.method, fields: fields.map(([name, text]) => [name, text]) };
  }
  if (!dumpPath && !sql.trim() && !php)
    throw new Error('Wybierz plik bazy, zapytania albo stronę do uruchomienia.');
  return { database, dumpPath, sql, php };
}

const text = (value: unknown, limit: number) => String(value ?? '').slice(0, limit);
const count = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

/** The controller's report is data: only known fields are kept and every string is bounded. */
function normaliseResult(payload: unknown, database: string, runtimeMs: number): SandboxRunResult {
  const run = (payload as { run?: Record<string, unknown> } | null)?.run;
  if (!run || typeof run !== 'object' || !Array.isArray(run.statements))
    throw new Error('Nieprawidłowy raport środowiska.');
  const statements = (run.statements as Record<string, unknown>[])
    .slice(0, 30)
    .map((item, index) => {
      const status = ['rows', 'ok', 'error', 'skipped'].includes(String(item.status))
        ? (item.status as SandboxRunStatement['status'])
        : 'error';
      const result: SandboxRunStatement = { index, text: text(item.text, 300), status };
      if (status === 'rows') {
        result.columns = (Array.isArray(item.columns) ? item.columns : [])
          .slice(0, 50)
          .map((name) => text(name, 256));
        result.rows = (Array.isArray(item.rows) ? item.rows : [])
          .slice(0, 200)
          .map((row) =>
            (Array.isArray(row) ? row : [])
              .slice(0, 50)
              .map((cell) => (cell === null ? null : text(cell, 4096))),
          );
        result.rowCount = count(item.rowCount) ?? result.rows.length;
        result.truncated = item.truncated === true;
      }
      if (status === 'ok') result.affectedRows = count(item.affectedRows);
      if (status === 'error') {
        const error = (item.error ?? {}) as Record<string, unknown>;
        result.error = {
          code: count(error.code),
          sqlState: typeof error.sqlState === 'string' ? error.sqlState.slice(0, 5) : null,
          message: text(error.message, 2000),
        };
      }
      return result;
    });
  const imported = run.import as Record<string, unknown> | null;
  const page = run.php as Record<string, unknown> | null;
  return {
    database,
    import: imported
      ? {
          ok: imported.ok === true,
          ...(imported.ok === true ? {} : { error: text(imported.error, 2000) }),
          tables: Array.isArray(imported.tables)
            ? (imported.tables as Record<string, unknown>[])
                .slice(0, 50)
                .map((table) => ({ name: text(table.name, 64), rows: count(table.rows) }))
            : null,
        }
      : null,
    statements,
    omittedStatements: count(run.omittedStatements) ?? 0,
    php: page
      ? {
          status: count(page.status),
          contentType: page.contentType === null ? null : text(page.contentType, 200),
          html: text(page.html, 512 * 1024),
          truncated: page.truncated === true,
          finalPath: page.finalPath === null ? null : text(page.finalPath, 2000),
          ...(typeof page.redirect === 'string' ? { redirect: text(page.redirect, 2000) } : {}),
          ...(page.error === 'timeout' || page.error === 'unavailable'
            ? { error: page.error }
            : {}),
          messages: text(page.messages, 8192),
        }
      : null,
    serverStopped: run.serverStopped === true,
    runtimeMs,
    disclaimer: RUN_DISCLAIMER,
  };
}

/**
 * Runs the learner's own dump, statements and page in a throwaway sandbox. Nothing is
 * compared with an expected answer, so the result contains no score.
 */
export async function runPlayground(
  request: unknown,
  input: ProjectFile[],
  options: RunnerOptions,
): Promise<SandboxRunResult> {
  const files = validateProjectFiles(input);
  const run = validateRunRequest(request, files);
  const { stdout, runtimeMs } = await runSandbox(
    files,
    JSON.stringify({ mode: 'run', ...run }),
    options,
    {
      // No Chromium in this mode: MariaDB, the PHP server and the controller only.
      memory: options.memory ?? '768m',
      pids: 128,
      tmpBytes: 384 * 1024 * 1024,
      timeoutMs: options.timeoutMs ?? 60000,
    },
    RUN_FAILURE,
  );
  return normaliseResult(JSON.parse(stdout), run.database, runtimeMs);
}
