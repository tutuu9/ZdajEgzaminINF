import { useEffect, useRef, useState } from 'react';
import { Database, Loader2, Play, Upload } from 'lucide-react';
import type {
  ProjectFile,
  SandboxRunResponse,
  SandboxRunResult,
  SandboxRunStatement,
} from '@zdaj/shared';
import { MAX_RUN_SQL_CHARACTERS } from '@zdaj/shared';
import { api, errorMessage } from '../api';
import type { ProjectStore } from '../project-store';
import {
  awaitRun,
  decodeDump,
  dumpFileName,
  runInputFiles,
  sqlFilePaths,
  type RunJob,
} from '../sandbox-run';
import { ErrorNotice, Notice } from './common';
import '../database-runner.css';

interface Draft {
  database: string;
  dumpPath: string;
  sql: string;
}
const emptyDraft: Draft = { database: '', dumpPath: '', sql: '' };
const draftKey = (attemptId: string) => `zdaj-run-draft:${attemptId}`;
function loadDraft(attemptId: string): Draft {
  try {
    const stored = JSON.parse(localStorage.getItem(draftKey(attemptId)) ?? 'null') as Draft | null;
    if (
      stored &&
      typeof stored.database === 'string' &&
      typeof stored.dumpPath === 'string' &&
      typeof stored.sql === 'string'
    )
      return stored;
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

function RunResult({ result, dumpPath }: { result: SandboxRunResult; dumpPath: string }) {
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
    [result, setResult] = useState<{ value: SandboxRunResult; dumpPath: string } | null>(null);
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
                    php: null,
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
      if (finished && mounted.current) setResult({ value: finished, dumpPath: selectedDump ?? '' });
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause));
    } finally {
      if (mounted.current) {
        setBusy(false);
        setStatus('');
      }
    }
  };

  const nothingToRun = !dumpPath && !draft.sql.trim();
  return (
    <div className="database-runner">
      <header>
        <h2>
          <Database size={20} /> Baza danych i zapytania SQL
        </h2>
        <p>
          Zaimportuj własny plik .sql z materiałów do arkusza i wykonaj zapytania. Każde
          uruchomienie zaczyna od czystej bazy: plik jest importowany od nowa, a potem po kolei
          wykonywane są wszystkie wpisane instrukcje. To uruchomienie, nie ocena.
        </p>
      </header>
      {!available && (
        <Notice>
          Uruchamianie SQL na serwerze jest teraz niedostępne. Import i zapytania wykonaj we własnym
          środowisku, np. XAMPP z phpMyAdmin, zgodnie z arkuszem. Formularz i pliki pozostają
          zapisane w tej przeglądarce.
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
      {result && <RunResult result={result.value} dumpPath={result.dumpPath} />}
    </div>
  );
}
