import {
  MAX_RUN_DUMP_BYTES,
  MAX_RUN_FIELDS,
  MAX_RUN_FIELD_CHARACTERS,
  MAX_RUN_INPUT_BYTES,
  type ProjectFile,
  type SandboxRunResponse,
  type SandboxRunResult,
} from '@zdaj/shared';

export interface RunJob {
  id: string;
  token: string;
}
export interface RunTransport {
  submit(): Promise<RunJob>;
  poll(job: RunJob): Promise<SandboxRunResponse>;
  acknowledge(job: RunJob): Promise<unknown>;
}

const bytes = (text: string) => new TextEncoder().encode(text).length;

/** A run needs code and data only; images stay in the browser. */
export function runInputFiles(files: ProjectFile[]): ProjectFile[] {
  const text = files.filter((file) => (file.encoding ?? 'utf8') !== 'base64');
  if (text.reduce((total, file) => total + bytes(file.content), 0) > MAX_RUN_INPUT_BYTES)
    throw new Error(
      'Pliki tekstowe projektu przekraczają 4 MiB. Usuń zbędne pliki tekstowe przed uruchomieniem.',
    );
  return text;
}

export const sqlFilePaths = (files: ProjectFile[]) =>
  files
    .filter((file) => /\.sql$/i.test(file.path) && (file.encoding ?? 'utf8') !== 'base64')
    .map((file) => file.path);

export const pageFilePaths = (files: ProjectFile[]) =>
  files
    .filter((file) => /\.(?:php|html?)$/i.test(file.path) && (file.encoding ?? 'utf8') !== 'base64')
    .map((file) => file.path);

/** Form rows as the server accepts them: named, text only, at most the allowed number. */
export function requestFields(rows: { name: string; value: string }[]): [string, string][] {
  const named = rows.filter((row) => row.name.trim());
  if (named.length > MAX_RUN_FIELDS)
    throw new Error(`Formularz może zawierać najwyżej ${MAX_RUN_FIELDS} pól.`);
  return named.map((row) => [
    row.name.trim().slice(0, MAX_RUN_FIELD_CHARACTERS),
    row.value.slice(0, MAX_RUN_FIELD_CHARACTERS),
  ]);
}

/**
 * Reads a learner's `.sql` file. Older phpMyAdmin exports may not be UTF-8; those are
 * decoded as Windows-1250 and reported, never silently mangled.
 */
export function decodeDump(buffer: ArrayBuffer): { content: string; recoded: boolean } {
  if (buffer.byteLength > MAX_RUN_DUMP_BYTES)
    throw new Error('Plik bazy może mieć maksymalnie 2 MiB.');
  try {
    return {
      content: new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, ''),
      recoded: false,
    };
  } catch {
    return { content: new TextDecoder('windows-1250').decode(buffer), recoded: true };
  }
}

/** Project file names follow the same rules the server applies to uploads. */
export function dumpFileName(name: string): string {
  if (
    name.length > 240 ||
    !/\.sql$/i.test(name) ||
    // eslint-disable-next-line no-control-regex
    /[\\/:\x00-\x1f]/u.test(name) ||
    name.startsWith('.')
  )
    throw new Error('Nazwa pliku bazy musi kończyć się na .sql i nie może zawierać znaków \\ / :');
  return name;
}

/** Submits one run and waits for its result; the temporary server copy is then released. */
export async function awaitRun(
  transport: RunTransport,
  options: {
    onStatus?: (status: SandboxRunResponse['status']) => void;
    active?: () => boolean;
    sleep?: (ms: number) => Promise<void>;
    timeoutMs?: number;
    now?: () => number;
  } = {},
): Promise<SandboxRunResult | null> {
  const {
    onStatus,
    active = () => true,
    sleep = (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
    timeoutMs = 90_000,
    now = Date.now,
  } = options;
  const job = await transport.submit();
  const deadline = now() + timeoutMs;
  while (active() && now() < deadline) {
    const response = await transport.poll(job);
    onStatus?.(response.status);
    if (response.status === 'completed' && response.result) {
      await transport.acknowledge(job).catch(() => undefined);
      return response.result;
    }
    if (response.status === 'failed') {
      await transport.acknowledge(job).catch(() => undefined);
      throw new Error(response.error || 'Środowisko nie ukończyło uruchomienia.');
    }
    await sleep(1000);
  }
  if (!active()) return null;
  throw new Error(
    'Minął czas oczekiwania na wynik. Uruchom ponownie albo wykonaj zapytania we własnym środowisku.',
  );
}
