import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Database, Loader2, Play, Plus, Trash2, Upload } from 'lucide-react';
import type {
  ProjectFile,
  SandboxRunRequest,
  SandboxRunResponse,
  SandboxRunResult,
  SandboxRunStatement,
  SqlResultFeedback,
} from '@zdaj/shared';
import { MAX_RUN_FIELDS, MAX_RUN_SQL_CHARACTERS, riverJoinPractice } from '@zdaj/shared';
import { api, errorMessage } from '../api';
import { createPreview } from '../preview';
import { phpActionRequest, phpResultEntry, readPhpAction } from '../php-preview';
import { XAMPP_START } from '../xampp-help';
import { Editor } from './Editor';
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
import { MissingAssets } from './MissingAssets';
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
type RunView = 'sql' | 'php';
type PageRequest = NonNullable<SandboxRunRequest['php']>;
interface CompletedRun {
  value: SandboxRunResult;
  request: SandboxRunRequest;
  files: ProjectFile[];
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
  enabled,
  onRequest,
  onError,
}: {
  page: NonNullable<SandboxRunResult['php']>;
  entry: string;
  files: ProjectFile[];
  scripts: boolean;
  enabled: boolean;
  onRequest: (request: PageRequest) => void;
  onError: (message: string) => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const pages = useMemo(() => pageFilePaths(files), [files]);
  const base = phpResultEntry(page.finalPath, pages);
  const interactive =
    enabled &&
    !scripts &&
    !!base &&
    !page.truncated &&
    /^text\/html\b/i.test(page.contentType ?? '');
  const { preview, generation } = useMemo(() => {
    const generation = interactive ? crypto.randomUUID() : undefined;
    const preview = page.html
      ? createPreview(files, entry, { markup: page.html, scripts, base, phpGeneration: generation })
      : undefined;
    return { preview, generation };
  }, [files, entry, page, base, scripts, interactive]);
  useEffect(() => {
    const finalPath = page.finalPath;
    if (!generation || !finalPath) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== 'null' || event.source !== frame.current?.contentWindow) return;
      const action = readPhpAction(event.data, generation);
      if (!action) return;
      try {
        onRequest(phpActionRequest(action, finalPath, pages));
      } catch (cause) {
        onError(errorMessage(cause));
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [generation, page.finalPath, pages, onRequest, onError]);
  const html = preview?.html ?? '';
  return (
    <div className="run-page">
      <h3>Strona {entry}</h3>
      <p className="run-note" aria-live="polite">
        {page.error === 'timeout'
          ? 'Strona nie odpowiedziała w ciągu 10 sekund. Sprawdź, czy kod nie zawiera nieskończonej pętli.'
          : page.error
            ? 'Serwer PHP tego uruchomienia nie odpowiedział.'
            : `Odpowiedź HTTP ${page.status ?? '—'}${page.finalPath ? `, adres ${page.finalPath}` : ''}.`}
        {page.redirect && ` Strona przekierowuje do ${page.redirect}; tego adresu nie otwarto.`}
        {page.truncated && ' Wynik został skrócony do 512 KiB.'}
      </p>
      {preview && <MissingAssets missing={preview.missing} inexact={preview.inexact} />}
      {html ? (
        <iframe
          ref={frame}
          className="run-page-frame"
          title={`Wynik strony ${entry}`}
          sandbox={generation ? 'allow-scripts allow-forms' : scripts ? 'allow-scripts' : ''}
          srcDoc={html}
        />
      ) : (
        !page.error && <p className="run-note">Strona nie zwróciła żadnej treści.</p>
      )}
      {html && (interactive || scripts) && (
        <p className="run-note">
          {interactive
            ? 'Użyj lokalnego odnośnika lub formularza na stronie, aby wysłać kolejne żądanie.'
            : 'Przełącz na podgląd formularzy, aby wysłać kolejne żądanie PHP.'}
        </p>
      )}
      {page.messages.trim() && (
        <details className="run-messages" open>
          <summary>Komunikaty PHP</summary>
          <pre lang="en">{page.messages}</pre>
        </details>
      )}
    </div>
  );
}

function JoinFeedback({ feedback }: { feedback: SqlResultFeedback }) {
  if (feedback.status === 'match')
    return <Notice>Wynik zgadza się z zapytaniem 3 dla zaimportowanej bazy.</Notice>;
  if (feedback.status === 'columns')
    return (
      <Notice>
        Liczba zwróconych kolumn: {feedback.actualCount} z {feedback.expected.length}.{' '}
        {feedback.missing?.length
          ? `Brakuje: ${feedback.missing.join(', ')}.`
          : `Porównaj kolumny z poleceniem: ${feedback.expected.join(', ')}.`}
      </Notice>
    );
  if (feedback.status === 'rows')
    return (
      <div className="run-import">
        <strong>Wynik różni się od zapytania 3.</strong>
        {[
          { label: 'Brakujące wiersze', rows: feedback.missing },
          { label: 'Nadmiarowe wiersze', rows: feedback.extra },
        ].map(({ label, rows }) => (
          <div key={label}>
            <p>
              {label} ({rows.length})
            </p>
            {rows.length > 0 && (
              <ul>
                {rows.slice(0, 5).map((row, index) => (
                  <li key={index}>{row.map((cell) => cell ?? 'NULL').join(' · ')}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    );
  return (
    <Notice>
      {feedback.reason === 'reference'
        ? 'Porównanie wymaga danych z arkusza Poziomy rzek. Wybierz jego plik .sql i sprawdź import.'
        : feedback.reason === 'truncated'
          ? 'Wynik jest za duży do porównania. Sprawdź powiązanie tabel i warunek filtrowania.'
          : 'Do porównania zaznacz jedno zapytanie zwracające wiersze. Sprawdź błędy poniżej.'}
    </Notice>
  );
}

function RunResult({
  result,
  dumpPath,
  children,
}: {
  result: SandboxRunResult;
  dumpPath: string;
  children: ReactNode;
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
      {result.practice && (
        <div role="status">
          <JoinFeedback feedback={result.practice} />
        </div>
      )}
      {result.statements.length > 0 && (
        <ol className="run-statements">
          {result.statements.map((statement) => (
            <StatementResult key={statement.index} statement={statement} />
          ))}
        </ol>
      )}
      {children}
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
  visible,
  available,
  joinPractice,
  readOnly,
  showXamppHelp,
  pageSelection,
  onAddFile,
  onResult,
}: {
  store: ProjectStore;
  files: ProjectFile[];
  visible: boolean;
  available: boolean;
  joinPractice: boolean;
  readOnly: boolean;
  showXamppHelp: boolean;
  pageSelection: { path: string } | null;
  onAddFile: (file: ProjectFile) => Promise<void>;
  /** Supplies the existing assistant with the last result for this attempt. */
  onResult?: (result: SandboxRunResult) => void;
}) {
  const attemptId = store.get().project.id;
  const id = useId();
  const [draft, setDraft] = useState<Draft>(() => loadDraft(attemptId));
  const [view, setView] = useState<RunView>('sql');
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState<SandboxRunResponse['status'] | ''>(''),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [results, setResults] = useState<Partial<Record<RunView, CompletedRun>>>({});
  const mounted = useRef(true),
    running = useRef(false),
    selectedSql = useRef(''),
    upload = useRef<HTMLInputElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!pageSelection) return;
    setView('php');
    setDraft((current) => ({ ...current, entry: pageSelection.path }));
  }, [pageSelection]);
  useEffect(() => {
    try {
      localStorage.setItem(draftKey(attemptId), JSON.stringify(draft));
    } catch {
      /* The form still works without a remembered draft. */
    }
  }, [attemptId, draft]);
  // Retain the run and its polling when switching tabs, without mounting a second editor.
  if (!visible) return null;
  const dumps = sqlFilePaths(files);
  const dumpPath = dumps.includes(draft.dumpPath) ? draft.dumpPath : '';
  const queries = files.find((file) => file.path.toLowerCase() === 'kwerendy.txt');
  const pages = pageFilePaths(files);
  const entry = pages.includes(draft.entry) ? draft.entry : '';
  const database = draft.database.trim();
  const result = results[view];
  const stale =
    !!result &&
    (result.files !== files ||
      result.request.database !== database ||
      result.request.dumpPath !== (dumpPath || null));
  const changeField = (index: number, patch: Partial<FieldRow>) =>
    change({
      fields: draft.fields.map((row, position) =>
        position === index ? { ...row, ...patch } : row,
      ),
    });
  const change = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const addDump = async (file: File | undefined) => {
    if (!file || readOnly || running.current) return;
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

  const run = async (
    sql: string,
    php: SandboxRunRequest['php'] = null,
    previous?: CompletedRun,
    practice?: SandboxRunRequest['practice'],
  ) => {
    if (running.current || readOnly || !available || !database) return;
    running.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    setStatus('queued');
    try {
      await store.flush();
      const project = store.get().project;
      const snapshot = project.files ?? [];
      if (previous && previous.files !== snapshot)
        throw new Error('Pliki projektu zmieniły się. Otwórz stronę ponownie.');
      const input = runInputFiles(snapshot);
      if (
        (dumpPath && !sqlFilePaths(input).includes(dumpPath)) ||
        (php && !pageFilePaths(input).includes(php.entry))
      )
        throw new Error('Wybrany plik nie jest już częścią projektu. Wybierz plik ponownie.');
      const request: SandboxRunRequest = {
        database,
        dumpPath: dumpPath || null,
        sql,
        php,
        ...(practice ? { practice } : {}),
      };
      const finished = await awaitRun(
        {
          submit: () =>
            store.request((latest) => {
              if (
                latest.submittedAt ||
                (latest.deadlineAt && Date.parse(latest.deadlineAt) <= Date.now())
              )
                throw new Error('Czas pracy minął lub próba została już oddana.');
              if (latest.files !== project.files)
                throw new Error('Projekt zmienił się przed wysłaniem. Uruchom ponownie.');
              return api<RunJob>(`/attempts/${latest.ticket.id}/runs`, {
                method: 'POST',
                body: {
                  token: latest.ticket.token,
                  projectRevision: latest.revision ?? 0,
                  run: request,
                  files: input,
                },
              });
            }),
          poll: (job) =>
            api<SandboxRunResponse>(`/runs/${job.id}`, { headers: { 'X-Run-Token': job.token } }),
          acknowledge: (job) =>
            api(`/runs/${job.id}/ack`, { method: 'POST', body: { token: job.token } }),
        },
        { onStatus: (next) => mounted.current && setStatus(next), active: () => mounted.current },
      );
      if (finished && mounted.current) {
        setResults((current) => ({
          ...current,
          [view]: { value: finished, request, files: snapshot },
        }));
        onResult?.(finished);
      }
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause));
    } finally {
      running.current = false;
      if (mounted.current) {
        setBusy(false);
        setStatus('');
      }
    }
  };

  const blocked = readOnly
    ? 'Czas pracy minął lub próba została już oddana.'
    : !available
      ? 'Uruchamianie na serwerze jest teraz niedostępne.'
      : !database
        ? 'Wpisz nazwę bazy danych.'
        : view === 'sql' && !dumpPath && !draft.sql.trim()
          ? 'Wybierz plik bazy lub wpisz zapytanie SQL.'
          : view === 'php' && !entry
            ? 'Wybierz stronę do uruchomienia.'
            : '';
  const runSql = (practice?: SandboxRunRequest['practice']) => {
    if (blocked || running.current) return;
    const selection = selectedSql.current;
    if (selection && !selection.trim()) {
      setError('Zaznaczenie nie zawiera zapytania SQL.');
      return;
    }
    void run(selection || draft.sql, null, undefined, practice);
  };
  const openPage = () => void run('', { entry, method: 'GET', fields: [] });
  const blockedId = blocked ? `${id}-blocked` : undefined;
  return (
    <div className="database-runner">
      <header className="database-runner-heading">
        <div>
          <h2>
            <Database size={20} /> Baza danych, SQL i PHP
          </h2>
          <p>
            Każde uruchomienie tworzy czystą bazę i ponownie importuje wybrany plik .sql. To
            uruchomienie, nie ocena.
          </p>
        </div>
        {showXamppHelp && (
          <Link className="button secondary small" to={XAMPP_START}>
            Pomoc z XAMPP
          </Link>
        )}
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
            readOnly={readOnly || busy}
            maxLength={64}
            spellCheck={false}
            autoComplete="off"
            placeholder="nazwa podana w arkuszu"
            onChange={(event) => change({ database: event.target.value })}
          />
          <small>Litery bez polskich znaków, cyfry i znak podkreślenia.</small>
        </label>
        <div className="field">
          <label htmlFor={`${id}-dump`}>
            <span>Plik bazy (.sql) z projektu</span>
          </label>
          <div className="run-dump-row">
            <select
              id={`${id}-dump`}
              value={dumpPath}
              disabled={readOnly || busy}
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
      </div>
      <div className="run-views" role="group" aria-label="Narzędzie bazy i PHP">
        <button
          type="button"
          className="button secondary small"
          aria-pressed={view === 'sql'}
          onClick={() => setView('sql')}
        >
          SQL
        </button>
        <button
          type="button"
          className="button secondary small"
          aria-pressed={view === 'php'}
          onClick={() => setView('php')}
        >
          Strona PHP
        </button>
      </div>
      {view === 'sql' ? (
        <div className="field run-sql">
          <span>Zapytania SQL</span>
          <Editor
            path="zapytania.sql"
            label="Zapytania SQL"
            minHeight={170}
            value={draft.sql}
            readOnly={readOnly || busy}
            onChange={(sql) => change({ sql: sql.slice(0, MAX_RUN_SQL_CHARACTERS) })}
            onSelectedText={(sql) => {
              selectedSql.current = sql;
            }}
            onRun={() => runSql()}
          />
          <small>
            Ctrl+Enter lub ⌘+Enter uruchamia zaznaczenie albo cały tekst. Rozdziel instrukcje
            średnikami. Wykonywanych jest najwyżej 30 instrukcji.
          </small>
          <div className="run-actions">
            <button
              type="button"
              className="button primary"
              disabled={busy || !!blocked}
              aria-describedby={blockedId}
              onClick={() => runSql()}
            >
              {busy ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
              Uruchom SQL
            </button>
            {joinPractice && (
              <button
                type="button"
                className="button secondary"
                disabled={busy || !!blocked || !dumpPath || !draft.sql.trim()}
                onClick={() => runSql(riverJoinPractice.id)}
              >
                Porównaj wynik zapytania 3
              </button>
            )}
            {queries && (
              <button
                type="button"
                className="button secondary"
                disabled={busy || readOnly}
                onClick={() => change({ sql: queries.content.slice(0, MAX_RUN_SQL_CHARACTERS) })}
              >
                Wstaw treść kwerendy.txt
              </button>
            )}
          </div>
          {joinPractice && (
            <small>
              Do porównania zaimportuj plik .sql z arkusza, a potem zaznacz zapytanie 3 ze strony 2.
            </small>
          )}
        </div>
      ) : (
        <div className="run-php">
          <div className="run-php-row">
            <label className="field">
              <span>Strona do uruchomienia</span>
              <select
                value={entry}
                disabled={readOnly || busy}
                onChange={(event) => change({ entry: event.target.value })}
              >
                <option value="">Wybierz plik PHP lub HTML</option>
                {pages.map((path) => (
                  <option key={path} value={path}>
                    {path}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button primary"
              disabled={busy || !!blocked}
              aria-describedby={blockedId}
              onClick={openPage}
            >
              {busy ? <Loader2 size={16} className="spin" /> : <Play size={16} />}
              Otwórz stronę
            </button>
          </div>
          {entry && (
            <details className="run-manual">
              <summary>Żądanie ręczne</summary>
              <fieldset disabled={readOnly || busy} className="run-manual-fields">
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
                </div>
                <small>
                  Uruchomienie ręczne wykona cały tekst z widoku SQL przed otwarciem strony.
                </small>
                <div className="run-actions">
                  <button
                    type="button"
                    className="button secondary"
                    disabled={!!blocked}
                    aria-describedby={blockedId}
                    onClick={() =>
                      void run(draft.sql, {
                        entry,
                        method: draft.method,
                        fields: requestFields(draft.fields),
                      })
                    }
                  >
                    Wykonaj żądanie
                  </button>
                </div>
              </fieldset>
            </details>
          )}
          {result?.value.php?.html && (
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={draft.scripts}
                onChange={(event) => change({ scripts: event.target.checked })}
              />
              <span>Podgląd JavaScript</span>
            </label>
          )}
        </div>
      )}
      {busy ? (
        <div className="run-status" role="status">
          {status === 'running' ? 'Wykonywanie w izolowanym środowisku…' : 'W kolejce…'}
        </div>
      ) : (
        blocked && (
          <div className="run-status" id={blockedId}>
            {blocked}
          </div>
        )
      )}
      {notice && <Notice>{notice}</Notice>}
      {error && <ErrorNotice message={error} />}
      {result && (
        <RunResult result={result.value} dumpPath={result.request.dumpPath ?? ''}>
          {result.value.php && result.request.php && (
            <>
              {stale && (
                <Notice>
                  Zmieniono pliki projektu lub ustawienia bazy. Otwórz stronę ponownie.
                </Notice>
              )}
              <PageResult
                page={result.value.php}
                entry={result.request.php.entry}
                files={result.files}
                scripts={draft.scripts}
                enabled={!stale && !readOnly && available}
                onRequest={(request) => {
                  if (!stale) void run(result.request.sql, request, result);
                }}
                onError={setError}
              />
            </>
          )}
        </RunResult>
      )}
    </div>
  );
}
