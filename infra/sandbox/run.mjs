// Learner-initiated run: import the learner's own dump, execute their statements and
// optionally request one PHP page. It reports what happened; it never grades.
import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import mariadb from 'mariadb';
import {
  task,
  SOCKET,
  SYSTEM_SCHEMAS,
  ClientCommandError,
  InfrastructureError,
  delay,
  hexColumn,
  prepareScratch,
  quoteIdentifier,
  sql,
  startDatabase,
  startPhp,
  statements,
  stopProcesses,
} from './runtime.mjs';

const LIMITS = {
  dumpBytes: 2 * 1024 * 1024,
  statements: 30,
  statementCharacters: 8192,
  statementsMs: 15000,
  rows: 200,
  columns: 50,
  cellCharacters: 4096,
  resultCharacters: 256 * 1024,
  tables: 50,
  fields: 20,
  redirects: 3,
  requestMs: 10000,
  htmlBytes: 512 * 1024,
  messageCharacters: 8192,
};
const ORIGIN = 'http://127.0.0.1:8080';

function projectFile(relative, extensions) {
  if (
    typeof relative !== 'string' ||
    !relative ||
    relative.length > 240 ||
    !extensions.some((extension) => relative.toLowerCase().endsWith(extension))
  )
    throw new InfrastructureError('Invalid project path.');
  const resolved = path.posix.resolve('/project', relative);
  if (!resolved.startsWith('/project/')) throw new InfrastructureError('Invalid project path.');
  return resolved;
}
function validated() {
  const { database, dumpPath = null, sql: source = '', php = null } = task;
  if (
    typeof database !== 'string' ||
    !/^[A-Za-z0-9_]{1,64}$/.test(database) ||
    SYSTEM_SCHEMAS.includes(database.toLowerCase())
  )
    throw new InfrastructureError('Invalid database name.');
  if (typeof source !== 'string') throw new InfrastructureError('Invalid statements.');
  if (php) {
    if (
      !['GET', 'POST'].includes(php.method) ||
      !Array.isArray(php.fields) ||
      php.fields.length > LIMITS.fields ||
      php.fields.some(
        (field) =>
          !Array.isArray(field) || field.length !== 2 || field.some((v) => typeof v !== 'string'),
      )
    )
      throw new InfrastructureError('Invalid page request.');
    projectFile(php.entry, ['.php', '.html', '.htm']);
  }
  return {
    database,
    dump: dumpPath === null ? null : projectFile(dumpPath, ['.sql']),
    source,
    php,
  };
}

async function importDump(database, dumpFile) {
  const dump = await readFile(dumpFile);
  if (dump.length > LIMITS.dumpBytes)
    return { ok: false, error: 'Plik bazy przekracza limit 2 MiB.', tables: null };
  try {
    // Same confined client as every other call: --sandbox and an unprivileged user.
    await sql(dump.toString('utf8'), database, false, 15000);
  } catch (error) {
    if (error instanceof InfrastructureError) throw error;
    return {
      ok: false,
      error:
        error instanceof ClientCommandError
          ? 'Plik zawiera polecenie klienta bazy (np. \\!, system lub source), a nie instrukcję SQL. Import przerwano.'
          : String(error.message).trim().slice(0, 2000),
      tables: null,
    };
  }
  return { ok: true, tables: await describeTables(database) };
}
/** The platform's own look at the result uses the SELECT-only account. */
async function describeTables(database) {
  try {
    const names = hexColumn(
      await sql(
        `SELECT HEX(TABLE_NAME) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${database}' ORDER BY TABLE_NAME LIMIT ${LIMITS.tables};`,
        undefined,
        true,
      ),
    );
    if (!names.length) return [];
    const counted = await sql(
      names.map((name) => `SELECT COUNT(*) FROM ${quoteIdentifier(name)};`).join('\n'),
      database,
      true,
    );
    const values = counted
      .trim()
      .split('\n')
      .filter((_, index) => index % 2 === 1);
    return names.map((name, index) => ({
      name,
      rows: /^\d+$/.test(values[index] ?? '') ? Number(values[index]) : null,
    }));
  } catch {
    return null;
  }
}

function cell(value, state) {
  if (value === null || value === undefined) return null;
  let text;
  if (Buffer.isBuffer(value)) text = `0x${value.subarray(0, 2048).toString('hex')}`;
  else if (value instanceof Date) text = value.toISOString();
  else if (typeof value === 'object')
    text = JSON.stringify(value, (_, item) => (typeof item === 'bigint' ? item.toString() : item));
  else text = String(value);
  if (text.length > LIMITS.cellCharacters) {
    state.truncated = true;
    text = text.slice(0, LIMITS.cellCharacters);
  }
  return text;
}
async function executeStatements(database, source) {
  const all = statements(source);
  const list = all.slice(0, LIMITS.statements);
  const results = [];
  if (!list.length) return { results, omitted: 0, connectionLost: false };
  let connection = null;
  let connectionLost = false;
  const connect = async (withDatabase) =>
    mariadb.createConnection({
      socketPath: SOCKET,
      user: 'root',
      ...(withDatabase ? { database } : {}),
      rowsAsArray: true,
      dateStrings: true,
      connectTimeout: 5000,
    });
  try {
    connection = await connect(true).catch(() => connect(false));
    // Bounds accidental `SELECT *` on a large table; an explicit LIMIT is the learner's choice.
    await connection.query(`SET SESSION sql_select_limit = ${LIMITS.rows + 1}`);
  } catch {
    connection = null;
  }
  const deadline = Date.now() + LIMITS.statementsMs;
  let budget = LIMITS.resultCharacters;
  for (const [index, text] of list.entries()) {
    const base = { index, text: text.slice(0, 300) };
    if (text.length > LIMITS.statementCharacters) {
      results.push({
        ...base,
        status: 'error',
        error: { code: null, sqlState: null, message: 'Instrukcja przekracza limit 8192 znaków.' },
      });
      continue;
    }
    if (!connection || Date.now() > deadline) {
      results.push({ ...base, status: 'skipped' });
      continue;
    }
    try {
      const outcome = await connection.query(text);
      if (Array.isArray(outcome) && Array.isArray(outcome.meta)) {
        const state = { truncated: false };
        const columns = outcome.meta.slice(0, LIMITS.columns).map((column) => column.name());
        if (outcome.meta.length > LIMITS.columns) state.truncated = true;
        const rows = [];
        for (const row of outcome) {
          if (rows.length >= LIMITS.rows) {
            state.truncated = true;
            break;
          }
          const cells = row.slice(0, LIMITS.columns).map((value) => cell(value, state));
          budget -= cells.reduce((sum, value) => sum + (value?.length ?? 4) + 3, 0);
          if (budget < 0) {
            state.truncated = true;
            break;
          }
          rows.push(cells);
        }
        results.push({
          ...base,
          status: 'rows',
          columns,
          rows,
          rowCount: outcome.length,
          truncated: state.truncated,
        });
      } else {
        const affected = Number(outcome?.affectedRows);
        results.push({
          ...base,
          status: 'ok',
          affectedRows: Number.isFinite(affected) ? affected : null,
        });
      }
    } catch (error) {
      results.push({
        ...base,
        status: 'error',
        error: {
          code: Number.isInteger(error.errno) ? error.errno : null,
          sqlState: typeof error.sqlState === 'string' ? error.sqlState : null,
          message: String(error.sqlMessage ?? error.text ?? error.message ?? '').slice(0, 2000),
        },
      });
      if (error.fatal || !connection.isValid()) {
        connectionLost = true;
        await connection.end().catch(() => undefined);
        connection = await connect(true)
          .catch(() => connect(false))
          .catch(() => null);
      }
    }
  }
  if (connection) await connection.end().catch(() => undefined);
  return { results, omitted: all.length - list.length, connectionLost };
}

async function requestPage(php) {
  let url = new URL(
    `${ORIGIN}/${php.entry
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')}`,
  );
  const fields = new URLSearchParams(php.fields);
  let method = php.method;
  if (method === 'GET') url.search = fields.toString();
  const signal = AbortSignal.timeout(LIMITS.requestMs);
  const page = { status: null, contentType: null, html: '', truncated: false, finalPath: null };
  try {
    let response;
    for (let hop = 0; ; hop++) {
      response = await fetch(url, {
        method,
        ...(method === 'POST' ? { body: fields } : {}),
        redirect: 'manual',
        signal,
      });
      const location = response.headers.get('location');
      if (![301, 302, 303, 307, 308].includes(response.status) || !location) break;
      const target = new URL(location, url);
      // The sandbox has no network; a redirect elsewhere is reported, never followed.
      if (target.origin !== ORIGIN || hop >= LIMITS.redirects) {
        page.redirect = target.origin === ORIGIN ? target.pathname + target.search : target.href;
        break;
      }
      await response.body?.cancel().catch(() => undefined);
      url = target;
      method = 'GET';
    }
    page.status = response.status;
    page.contentType = response.headers.get('content-type');
    page.finalPath = url.pathname + url.search;
    const chunks = [];
    let size = 0;
    if (response.body)
      for await (const chunk of response.body) {
        const room = LIMITS.htmlBytes - size;
        if (chunk.length > room) {
          chunks.push(chunk.subarray(0, room));
          page.truncated = true;
          break;
        }
        chunks.push(chunk);
        size += chunk.length;
      }
    page.html = Buffer.concat(chunks).toString('utf8');
  } catch (error) {
    page.error = error?.name === 'TimeoutError' || signal.aborted ? 'timeout' : 'unavailable';
  }
  page.messages = await readFile('/tmp/php/errors.log', 'utf8')
    .then((text) => text.slice(-LIMITS.messageCharacters))
    .catch(() => '');
  return page;
}

try {
  const request = validated();
  await prepareScratch([
    ['/tmp/db', 10002],
    ['/tmp/php', 10001],
    // Exists only so that file import/export has no writable or readable target.
    ['/tmp/no-files', 0, 0o555],
  ]);
  const server = await startDatabase([
    '--max-statement-time=5',
    '--local-infile=0',
    '--secure-file-priv=/tmp/no-files',
    '--max-allowed-packet=16M',
    '--innodb-log-file-size=16M',
  ]);
  await sql(
    `CREATE DATABASE ${quoteIdentifier(request.database)};
CREATE USER 'check_reader'@'localhost' IDENTIFIED BY '';
GRANT SELECT ON ${quoteIdentifier(request.database.replaceAll('_', '\\_'))}.* TO 'check_reader'@'localhost';`,
  );
  let connectionLost = false;
  const result = {
    database: request.database,
    import: null,
    statements: [],
    omittedStatements: 0,
    php: null,
    serverStopped: false,
  };
  if (request.dump) result.import = await importDump(request.database, request.dump);
  if (!result.import || result.import.ok) {
    const executed = await executeStatements(request.database, request.source);
    result.statements = executed.results;
    result.omittedStatements = executed.omitted;
    connectionLost = executed.connectionLost;
    if (request.php) {
      // Examination stations show PHP notices in the page; the log is returned as well.
      await startPhp(['display_errors=1', 'html_errors=0']);
      result.php = await requestPage(request.php);
    }
  }
  // A server that the learner shut down needs a moment to exit.
  for (let attempt = 0; connectionLost && server.exitCode === null && attempt < 30; attempt++)
    await delay(100);
  result.serverStopped = server.exitCode !== null;
  process.stdout.write(JSON.stringify({ run: result }));
} catch (error) {
  process.stderr.write('Nie udało się uruchomić środowiska.\n');
  process.exitCode = 1;
  if (process.env.CHECKER_DEBUG === '1') process.stderr.write(String(error) + '\n');
} finally {
  stopProcesses();
}
