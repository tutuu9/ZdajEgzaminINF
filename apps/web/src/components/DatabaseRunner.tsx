import { useEffect, useMemo, useRef, useState } from 'react';
import { Database, Loader2, Play, Plus, Trash2, Upload } from 'lucide-react';
import type {
  ProjectFile,
  SandboxRunResponse,
  SandboxRunResult,
  SandboxRunStatement,
} from '@zdaj/shared';
import { MAX_RUN_FIELDS, MAX_RUN_SQL_CHARACTERS } from '@zdaj/shared';
import { api, errorMessage } from '../api';
import { createPreview } from '../preview';
import type { ProjectStore } from '../project-store';
import {
  awaitRun,
  decodeDump,
  dumpFileName,
  pageFilePaths,
  requestFields,
  runInputFiles,
  sqlFilePaths,
  type RunJob,
} from '../sandbox-run';
import { ErrorNotice, Notice } from './common';
import '../database-runner.css';

interface FieldRow {
  name: string;
  value: string;
}
interface Draft {
  database: string;
  dumpPath: string;
  sql: string;
  entry: string;
  method: 'GET' | 'POST';
  fields: FieldRow[];
  scripts: boolean;
}
const emptyDraft: Draft = {
  database: '',
  dumpPath: '',
  sql: '',
  entry: '',
  method: 'GET',
  fields: [],
  scripts: false,
};
const draftKey = (attemptId: string) => `zdaj-run-draft:${attemptId}`;
function loadDraft(attemptId: string): Draft {
  try {
    const stored = JSON.parse(
      localStorage.getItem(draftKey(attemptId)) ?? 'null',
    ) as Partial<Draft> | null;
    if (
      stored &&
      typeof stored.database === 'string' &&
      typeof stored.dumpPath === 'string' &&
      typeof stored.sql === 'string'
    )
      // Drafts saved before the page request existed lack its fields.
      return {
        ...emptyDraft,
        database: stored.database,
        dumpPath: stored.dumpPath,
        sql: stored.sql,
        entry: typeof stored.entry === 'string' ? stored.entry : '',
        method: stored.method === 'POST' ? 'POST' : 'GET',
        fields: Array.isArray(stored.fields)
          ? stored.fields
              .filter(
                (row): row is FieldRow =>
                  !!row && typeof row.name === 'string' && typeof row.value === 'string',
              )
              .slice(0, MAX_RUN_FIELDS)
          : [],
        scripts: stored.scripts === true,
      };
  } catch {
    /* Private mode or a damaged entry: start with an empty form. */
  }
  return emptyDraft;
}
const rowsLabel = (count: number | null) =>
  count === null ? 'liczba wierszy nieznana' : `wierszy: ${count}`;

function StatementResult({ statement }: { statement: SandboxRunStatement }) {
  return (
    <li className={`run-statement run-${statement.status}`}>
      <code className="run-statement-text">{statement.text}</code>
      {statement.status === 'rows' && (
        <>
          <div className="run-table-scroll" tabIndex={0}>
            <table>
              <thead>
                <tr>
                  {statement.columns?.map((column, index) => (
                    <th key={index} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {statement.rows?.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((value, index) => (
                      <td key={index}>{value === null ? <em>NULL</em> : value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="run-note">
            {statement.rows?.length
              ? `Wiersze w wyniku: ${statement.rows.length}.`
              : 'Zapytanie nie zwróciło żadnego wiersza.'}
            {statement.truncated &&
              ' Wynik został skrócony: pokazano najwyżej 200 wierszy i 4096 znaków w komórce.'}
          </p>
        </>
      )}
      {statement.status === 'ok' && (
        <p className="run-note">
          Wykonano.
          {statement.affectedRows !== null && statement.affectedRows !== undefined
            ? ` Zmienione wiersze: ${statement.affectedRows}.`
            : ''}
        </p>
      )}
      {statement.status === 'error' && (
        <p className="run-error" role="alert">
          <strong>
            Błąd MariaDB
            {statement.error?.code ? ` ${statement.error.code}` : ''}
            {statement.error?.sqlState ? ` (${statement.error.sqlState})` : ''}:
          </strong>{' '}
          <span lang="en">{statement.error?.message}</span>
        </p>
      )}
      {statement.status === 'skipped' && (
        <p className="run-note">
          Pominięto: przekroczono łączny czas 15 sekund albo utracono połączenie z bazą.
        </p>
      )}
    </li>
  );
}

function PageResult({
  page,
  entry,
  files,
  scripts,
}: {
  page: NonNullable<SandboxRunResult['php']>;
  entry: string;
  files: ProjectFile[];
  scripts: boolean;
}) {
  // The server returns markup only. Styles and images come from the local project, and the
  // frame keeps the same isolation as the ordinary preview: no network, no form target.
  const html = useMemo(
    () => (page.html ? createPreview(files, entry, { markup: page.html, scripts }).html : ''),
    [files, entry, page.html, scripts],
  );
  return (
    <div className="run-page">
      <h3>Strona {entry}</h3>
      <p className="run-note">
        {page.error === 'timeout'
          ? 'Strona nie odpowiedziała w ciągu 10 sekund. Sprawdź, czy kod nie zawiera nieskończonej pętli.'
          : page.error
            ? 'Serwer PHP tego uruchomienia nie odpowiedział.'
            : `Odpowiedź HTTP ${page.status ?? '—'}${page.finalPath ? `, adres ${page.finalPath}` : ''}.`}
        {page.redirect && ` Strona przekierowuje do ${page.redirect}; tego adresu nie otwarto.`}
        {page.truncated && ' Wynik został skrócony do 512 KiB.'}
      </p>
      {html ? (
        <iframe
          className="run-page-frame"
          title={`Wynik strony ${entry}`}
          sandbox={scripts ? 'allow-scripts' : ''}
          srcDoc={html}
        />
      ) : (
        !page.error && <p className="run-note">Strona nie zwróciła żadnej treści.</p>
      )}
      <p className="run-note">
        Odnośniki i formularze w tym podglądzie nie wysyłają żądań. Aby sprawdzić formularz, wpisz
        jego pola powyżej i uruchom ponownie.
      </p>
      {page.messages.trim() && (
        <details className="run-messages" open>
          <summary>Komunikaty PHP</summary>
          <pre lang="en">{page.messages}</pre>
        </details>
      )}
    </div>
  );
}

function RunResult({
  result,
  dumpPath,
  entry,
  files,
  scripts,
}: {
  result: SandboxRunResult;
  dumpPath: string;
  entry: string;
  files: ProjectFile[];
  scripts: boolean;
}) {
  return (
    <section className="run-result" aria-label="Wynik uruchomienia">
      {result.import &&
        (result.import.ok ? (
          <div className="run-import">
            <strong>
              Zaimportowano {dumpPath} do bazy „{result.database}”.
            </strong>
            {result.import.tables === null ? (
              <p>Nie udało się odczytać listy tabel.</p>
            ) : result.import.tables.length ? (
              <p>
                Tabele:{' '}
                {result.import.tables
                  .map((table) => `${table.name} (${rowsLabel(table.rows)})`)
                  .join(', ')}
                .
              </p>
            ) : (
              <p>Po imporcie baza „{result.database}” nie zawiera tabel.</p>
            )}
          </div>
        ) : (
          <div className="run-error" role="alert">
            <strong>Import pliku {dumpPath} nie powiódł się.</strong> Zapytania nie zostały
            wykonane.
            <pre lang="en">{result.import.error}</pre>
          </div>
        ))}
      {result.statements.length > 0 && (
        <ol className="run-statements">
          {result.statements.map((statement) => (
            <StatementResult key={statement.index} statement={statement} />
          ))}
        </ol>
      )}
      {result.php && <PageResult page={result.php} entry={entry} files={files} scripts={scripts} />}
      {result.omittedStatements > 0 && (
        <p className="run-note">
          Wykonano pierwsze 30 instrukcji. Pominięte instrukcje: {result.omittedStatements}.
        </p>
      )}
      {result.serverStopped && (
        <p className="run-note">
          Jedna z instrukcji zatrzymała serwer bazy tego uruchomienia. Następne uruchomienie zacznie
          od nowej, czystej bazy.
        </p>
      )}
      <p className="run-disclaimer">{result.disclaimer}</p>
    </section>
  );
}

export function DatabaseRunner({
  store,
  files,
  available,
  readOnly,
  onAddFile,
}: {
  store: ProjectStore;
  files: ProjectFile[];
  available: boolean;
  readOnly: boolean;
  onAddFile: (file: ProjectFile) => Promise<void>;
}) {
  const attemptId = store.get().project.id;
  const [draft, setDraft] = useState<Draft>(() => loadDraft(attemptId));
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState<SandboxRunResponse['status'] | ''>(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [result, setResult] = useState<{
      value: SandboxRunResult;
      dumpPath: string;
      entry: string;
      files: ProjectFile[];
      scripts: boolean;
    } | null>(null);
  const mounted = useRef(true),
    upload = useRef<HTMLInputElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(attemptId), JSON.stringify(draft));
    } catch {
      /* The form still works without a remembered draft. */
    }
  }, [attemptId, draft]);
  const dumps = sqlFilePaths(files);
  const dumpPath = dumps.includes(draft.dumpPath) ? draft.dumpPath : '';
  const queries = files.find((file) => file.path.toLowerCase() === 'kwerendy.txt');
  const pages = pageFilePaths(files);
  const entry = pages.includes(draft.entry) ? draft.entry : '';
  const changeField = (index: number, patch: Partial<FieldRow>) =>
    change({
      fields: draft.fields.map((row, position) =>
        position === index ? { ...row, ...patch } : row,
      ),
    });
  const change = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const addDump = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setNotice('');
    try {
      const path = dumpFileName(file.name);
      const decoded = decodeDump(await file.arrayBuffer());
      await onAddFile({ path, content: decoded.content, encoding: 'utf8' });
      change({ dumpPath: path });
      setNotice(
        decoded.recoded
          ? `Plik ${path} nie był zapisany w UTF-8, więc odczytano go jako Windows-1250. Sprawdź polskie znaki w wynikach.`
          : `Dodano ${path} do projektu. Plik pozostaje w tej przeglądarce.`,
      );
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      if (upload.current) upload.current.value = '';
    }
  };

  const run = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    setStatus('queued');
    try {
      await store.flush();
      const project = store.get().project;
      const input = runInputFiles(project.files ?? []);
      const selectedDump = sqlFilePaths(input).includes(draft.dumpPath) ? draft.dumpPath : null;
      const selectedEntry = pageFilePaths(input).includes(draft.entry) ? draft.entry : null;
      const php = selectedEntry
        ? { entry: selectedEntry, method: draft.method, fields: requestFields(draft.fields) }
        : null;
      const finished = await awaitRun(
        {
          submit: () =>
            store.request((latest) =>
              api<RunJob>(`/attempts/${latest.ticket.id}/runs`, {
                method: 'POST',
                body: {
                  token: latest.ticket.token,
                  projectRevision: project.revision ?? 0,
                  run: {
                    database: draft.database.trim(),
                    dumpPath: selectedDump,
                    sql: draft.sql,
                    php,
                  },
                  files: input,
                },
              }),
            ),
          poll: (job) =>
            api<SandboxRunResponse>(`/runs/${job.id}`, { headers: { 'X-Run-Token': job.token } }),
          acknowledge: (job) =>
            api(`/runs/${job.id}/ack`, { method: 'POST', body: { token: job.token } }),
        },
        { onStatus: (next) => mounted.current && setStatus(next), active: () => mounted.current },
      );
      if (finished && mounted.current)
        setResult({
          value: finished,
          dumpPath: selectedDump ?? '',
          entry: selectedEntry ?? '',
          // The page is shown with the files it was executed with, not with later edits.
          files: project.files ?? [],
          scripts: draft.scripts,
        });
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause));
    } finally {
      if (mounted.current) {
        setBusy(false);
        setStatus('');
      }
    }
  };

  const nothingToRun = !dumpPath && !draft.sql.trim() && !entry;
  return (
    <div className="database-runner">
      <header>
        <h2>
          <Database size={20} /> Baza danych, SQL i PHP
        </h2>
        <p>
          Zaimportuj własny plik .sql z materiałów do arkusza, wykonaj zapytania i otwórz stronę PHP
          korzystającą z tej bazy. Każde uruchomienie zaczyna od czystej bazy: plik jest importowany
          od nowa, potem po kolei wykonywane są wpisane instrukcje, a na końcu wywoływana jest
          wybrana strona. To uruchomienie, nie ocena.
        </p>
      </header>
      {!available && (
        <Notice>
          Uruchamianie SQL i PHP na serwerze jest teraz niedostępne. Import, zapytania i stronę
          uruchom we własnym środowisku, np. XAMPP z phpMyAdmin, zgodnie z arkuszem. Formularz i
          pliki pozostają zapisane w tej przeglądarce.
        </Notice>
      )}
      <div className="run-form">
        <label className="field">
          <span>Nazwa bazy danych</span>
          <input
            value={draft.database}
            maxLength={64}
            spellCheck={false}
            autoComplete="off"
            placeholder="nazwa podana w arkuszu"
            onChange={(event) => change({ database: event.target.value })}
          />
          <small>Litery bez polskich znaków, cyfry i znak podkreślenia.</small>
        </label>
        <div className="field">
          <label htmlFor="run-dump">
            <span>Plik bazy (.sql) z projektu</span>
          </label>
          <div className="run-dump-row">
            <select
              id="run-dump"
              value={dumpPath}
              onChange={(event) => change({ dumpPath: event.target.value })}
            >
              <option value="">Bez importu</option>
              {dumps.map((path) => (
                <option key={path} value={path}>
                  {path}
                </option>
              ))}
            </select>
            <input
              ref={upload}
              type="file"
              accept=".sql"
              hidden
              onChange={(event) => void addDump(event.target.files?.[0])}
            />
            <button
              type="button"
              className="button secondary"
              disabled={readOnly || busy}
              onClick={() => upload.current?.click()}
            >
              <Upload size={16} />
              Wczytaj plik .sql
            </button>
          </div>
          <small>
            Platforma nie dostarcza plików z arkuszy. Pobierz je ze źródła wskazanego przy arkuszu.
          </small>
        </div>
        <label className="field run-sql">
          <span>Zapytania SQL</span>
          <textarea
            value={draft.sql}
            rows={8}
            maxLength={MAX_RUN_SQL_CHARACTERS}
            spellCheck={false}
            placeholder="SELECT ... ;"
            onChange={(event) => change({ sql: event.target.value })}
          />
          <small>Rozdziel instrukcje średnikami. Wykonywanych jest najwyżej 30 instrukcji.</small>
        </label>
        <fieldset className="run-php">
          <legend>Strona PHP (opcjonalnie)</legend>
          <div className="run-php-row">
            <label className="field">
              <span>Strona do uruchomienia</span>
              <select value={entry} onChange={(event) => change({ entry: event.target.value })}>
                <option value="">Bez strony</option>
                {pages.map((path) => (
                  <option key={path} value={path}>
                    {path}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Metoda formularza</span>
              <select
                value={draft.method}
                disabled={!entry}
                onChange={(event) =>
                  change({ method: event.target.value === 'POST' ? 'POST' : 'GET' })
                }
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
            </label>
          </div>
          {entry && (
            <>
              {draft.fields.map((row, index) => (
                <div className="run-field-row" key={index}>
                  <input
                    aria-label={`Nazwa pola ${index + 1}`}
                    placeholder="nazwa pola (name)"
                    value={row.name}
                    spellCheck={false}
                    onChange={(event) => changeField(index, { name: event.target.value })}
                  />
                  <input
                    aria-label={`Wartość pola ${index + 1}`}
                    placeholder="wartość"
                    value={row.value}
                    onChange={(event) => changeField(index, { value: event.target.value })}
                  />
                  <button
                    type="button"
                    className="button quiet"
                    aria-label={`Usuń pole ${index + 1}`}
                    onClick={() =>
                      change({ fields: draft.fields.filter((_, position) => position !== index) })
                    }
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <div className="run-php-options">
                <button
                  type="button"
                  className="button secondary"
                  disabled={draft.fields.length >= MAX_RUN_FIELDS}
                  onClick={() => change({ fields: [...draft.fields, { name: '', value: '' }] })}
                >
                  <Plus size={16} />
                  Dodaj pole formularza
                </button>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={draft.scripts}
                    onChange={(event) => change({ scripts: event.target.checked })}
                  />
                  <span>Uruchom też skrypty JavaScript strony w podglądzie</span>
                </label>
              </div>
              <small>
                Pola odpowiadają atrybutom name formularza. Dla GET trafiają do adresu, dla POST do
                treści żądania.
              </small>
            </>
          )}
        </fieldset>
        <div className="run-actions">
          <button
            type="button"
            className="button primary"
            disabled={!available || busy || !draft.database.trim() || nothingToRun}
            onClick={() => void run()}
          >
            {busy ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
            Uruchom
          </button>
          {queries && (
            <button
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => change({ sql: queries.content.slice(0, MAX_RUN_SQL_CHARACTERS) })}
            >
              Wstaw treść kwerendy.txt
            </button>
          )}
          <span className="run-status" role="status">
            {busy && (status === 'running' ? 'Wykonywanie w izolowanym środowisku…' : 'W kolejce…')}
          </span>
        </div>
      </div>
      {notice && <Notice>{notice}</Notice>}
      {error && <ErrorNotice message={error} />}
      {result && (
        <RunResult
          result={result.value}
          dumpPath={result.dumpPath}
          entry={result.entry}
          files={result.files}
          scripts={result.scripts}
        />
      )}
    </div>
  );
}
