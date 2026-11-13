// Shared process, MariaDB and PHP plumbing for the sandbox controller.
// `check.mjs` (fixed criteria) and `run.mjs` (learner-initiated runs) both build on it.
import { spawn } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { mkdir, chown } from 'node:fs/promises';

// The job specification arrives on the controller's standard input. It is
// never written to a path that learner PHP, running as another user, can read.
async function readConfiguration() {
  let source = '';
  for await (const chunk of process.stdin) {
    source += chunk;
    if (source.length > 8 * 1024 * 1024) throw new Error('Configuration is too large.');
  }
  return JSON.parse(source);
}
export const task = await readConfiguration();

export const SOCKET = '/tmp/mysql.sock';
export const SQL_CLIENT = { uid: 10004, gid: 10004 };
export const SYSTEM_SCHEMAS = ['mysql', 'information_schema', 'performance_schema', 'sys'];
export const quoteIdentifier = (name) => '`' + name.replaceAll('`', '``') + '`';
export class InfrastructureError extends Error {}
export class ClientCommandError extends Error {}
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processes = [];
const services = [];
let diagnostics = 0;

export function assertServices() {
  if (diagnostics > 1024 * 1024)
    throw new InfrastructureError('Przekroczono limit diagnostyki środowiska.');
  if (services.some((child) => child.exitCode !== null))
    throw new InfrastructureError('Proces środowiska zakończył pracę.');
}
export function stopProcesses() {
  for (const child of processes) if (child.exitCode === null) child.kill('SIGKILL');
}
function start(executable, args, options = {}) {
  const child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'pipe'], ...options });
  processes.push(child);
  child.on('error', () => undefined);
  for (const stream of [child.stdout, child.stderr])
    stream.on('data', (chunk) => {
      diagnostics += chunk.length;
      if (diagnostics > 1024 * 1024) {
        for (const process of processes) process.kill('SIGKILL');
      }
    });
  return child;
}
export function run(executable, args, input = '', options = {}, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const child = start(executable, args, options);
    let out = '';
    let err = '';
    let settled = false;
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      finish(new Error('Przekroczono czas operacji.'));
    }, timeoutMs);
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    };
    child.stdout.on('data', (data) => {
      out += data;
      if (out.length > 1024 * 1024) {
        child.kill('SIGKILL');
        finish(new Error('Zbyt długi wynik.'));
      }
    });
    child.stderr.on('data', (data) => {
      err += data;
      if (err.length > 8192) err = err.slice(-8192);
    });
    child.on('error', (error) => finish(error));
    child.on('close', (code) =>
      code === 0 ? finish(null, out) : finish(new Error(err || 'Operacja nie powiodła się.')),
    );
    child.stdin.on('error', () => undefined);
    child.stdin.end(input);
  });
}
export async function sql(query, database, reader = false, timeoutMs = 10000) {
  try {
    return await run(
      'mariadb',
      [
        '--no-defaults',
        `--socket=${SOCKET}`,
        '--default-character-set=utf8mb4',
        '--batch',
        '--raw',
        // Without this the client executes `\!`, `system` and `source` found in SQL text.
        '--sandbox',
        reader ? '-ucheck_reader' : '-uroot',
        ...(database ? [database] : []),
      ],
      query,
      // The client parses learner text, so it never runs with the controller's identity.
      SQL_CLIENT,
      timeoutMs,
    );
  } catch (error) {
    if (/ERROR (2002|2003|2006|2013)\b/.test(error.message))
      throw new InfrastructureError('Baza ćwiczenia jest niedostępna.');
    if (/Not allowed in the sandbox mode/.test(error.message))
      throw new ClientCommandError('Niedozwolone polecenie klienta bazy.');
    throw error;
  }
}
/** Decodes one HEX() column from `--batch --raw` output; unusual names survive intact. */
export function hexColumn(output) {
  return output
    .split('\n')
    .slice(1)
    .filter((line) => /^(?:[0-9A-F]{2})+$/.test(line))
    .map((line) => Buffer.from(line, 'hex').toString('utf8'));
}
/** Learner PHP connects as root and may create databases under any name; all of them go. */
export async function dropLearnerSchemas() {
  const names = hexColumn(
    await sql(
      `SELECT HEX(SCHEMA_NAME) FROM information_schema.SCHEMATA WHERE SCHEMA_NAME NOT IN (${SYSTEM_SCHEMAS.map((name) => `'${name}'`).join(', ')});`,
    ),
  );
  if (names.length)
    await sql(names.map((name) => `DROP DATABASE IF EXISTS ${quoteIdentifier(name)};`).join('\n'));
}
export async function prepareScratch(directories) {
  for (const [directory, uid, mode] of directories) {
    await mkdir(directory, { recursive: true, ...(mode ? { mode } : {}) });
    await chown(directory, uid, uid);
  }
}
export async function startDatabase(extraArguments = []) {
  await run(
    'mariadb-install-db',
    [
      '--no-defaults',
      '--datadir=/tmp/db',
      '--auth-root-authentication-method=normal',
      '--skip-test-db',
    ],
    '',
    { uid: 10002, gid: 10002 },
    30000,
  );
  const server = start(
    'mariadbd',
    [
      '--no-defaults',
      '--datadir=/tmp/db',
      `--socket=${SOCKET}`,
      '--pid-file=/tmp/mysql.pid',
      '--bind-address=127.0.0.1',
      '--port=3306',
      '--innodb-buffer-pool-size=64M',
      '--key-buffer-size=8M',
      '--max-connections=10',
      '--skip-log-bin',
      '--secure-file-priv=/tmp/db',
      // Later occurrences override the defaults above.
      ...extraArguments,
    ],
    { uid: 10002, gid: 10002 },
  );
  services.push(server);
  for (let attempt = 0; attempt < 70; attempt++) {
    try {
      await sql('SELECT 1;');
      return server;
    } catch {
      await delay(100);
    }
  }
  throw new Error('Nie uruchomiono bazy ćwiczenia.');
}
export async function startPhp(extraSettings = []) {
  const settings = [
    `mysqli.default_socket=${SOCKET}`,
    `pdo_mysql.default_socket=${SOCKET}`,
    'display_errors=0',
    'log_errors=1',
    'error_log=/tmp/php/errors.log',
    'session.save_path=/tmp/php',
    'upload_tmp_dir=/tmp/php',
    'memory_limit=128M',
    'max_execution_time=10',
    ...extraSettings,
  ];
  services.push(
    start(
      'php',
      [...settings.flatMap((setting) => ['-d', setting]), '-S', '127.0.0.1:8080', '-t', '/project'],
      { uid: 10001, gid: 10001 },
    ),
  );
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      await fetch('http://127.0.0.1:8080/');
      break;
    } catch {
      await delay(100);
    }
  }
}
/** Splits SQL text into statements, dropping comments and respecting quoted text. */
export function statements(source) {
  const output = [];
  let value = '';
  let quote = '';
  let lineComment = false;
  let blockComment = false;
  for (let i = 0; i < source.length; i++) {
    const c = source[i],
      next = source[i + 1];
    if (lineComment) {
      if (c === '\n') {
        lineComment = false;
        value += ' ';
      }
      continue;
    }
    if (blockComment) {
      if (c === '*' && next === '/') {
        blockComment = false;
        i++;
        value += ' ';
      }
      continue;
    }
    if (quote) {
      value += c;
      if (c === '\\' && next) {
        value += next;
        i++;
      } else if (c === quote) {
        if (next === quote) {
          value += next;
          i++;
        } else quote = '';
      }
      continue;
    }
    if (c === '-' && next === '-' && /\s/.test(source[i + 2] ?? ' ')) {
      lineComment = true;
      i++;
      continue;
    }
    if (c === '#') {
      lineComment = true;
      continue;
    }
    if (c === '/' && next === '*') {
      blockComment = true;
      i++;
      continue;
    }
    if (["'", '"', '`'].includes(c)) {
      quote = c;
      value += c;
      continue;
    }
    if (c === ';') {
      if (value.trim()) output.push(value.trim());
      value = '';
    } else value += c;
  }
  if (value.trim()) output.push(value.trim());
  return output;
}
