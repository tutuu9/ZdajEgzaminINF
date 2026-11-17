import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Database, FileText, KeyRound, Play, Table2, Upload } from 'lucide-react';
import type { ExamStudyGuide, ProjectFile } from '@zdaj/shared';
import { decodeDump, dumpFileName } from '../sandbox-run';
import {
  comparePractice,
  lintQueries,
  parseDump,
  practiceSteps,
  sqlDumpFiles,
  type PracticeComparison,
  type PracticeFinding,
} from '../sql-practice';
import { Editor } from './Editor';
import { ErrorNotice } from './common';
import '../sql-practice.css';

type View = 'sql' | 'structure' | 'browse';

const draftKey = (projectId: string, stepId: string) => `zdaj:sql-practice:${projectId}:${stepId}`;
const readDraft = (key: string) => {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
};

function Findings({ findings }: { findings: PracticeFinding[] }) {
  if (!findings.length) return null;
  return (
    <ul className="sqlp-findings">
      {findings.map((finding, index) => (
        <li key={index} className={finding.level}>
          {finding.message}
        </li>
      ))}
    </ul>
  );
}

/**
 * An approximate phpMyAdmin-like practice view for the course SQL steps. Nothing is
 * executed: the learner's statement is compared with the prepared variant of the step.
 */
export function SqlPractice({
  projectId,
  guide,
  currentStep,
  files,
  readOnly,
  onAppendQuery,
  onAddFile,
}: {
  projectId: string;
  guide: ExamStudyGuide;
  currentStep?: string;
  files: ProjectFile[];
  readOnly: boolean;
  onAppendQuery: (statement: string) => Promise<void>;
  onAddFile: (file: ProjectFile) => Promise<void>;
}) {
  const steps = useMemo(() => practiceSteps(guide), [guide]);
  const runnable = steps.filter((step) => step.reference);
  const [stepId, setStepId] = useState(() =>
    runnable.some((step) => step.id === currentStep) ? currentStep! : (runnable[0]?.id ?? ''),
  );
  const step = runnable.find((item) => item.id === stepId) ?? runnable[0];
  const [sql, setSql] = useState(() => (step ? readDraft(draftKey(projectId, step.id)) : ''));
  const [result, setResult] = useState<PracticeComparison | null>(null);
  const [lint, setLint] = useState<PracticeFinding[] | null>(null);
  const [view, setView] = useState<View>('sql');
  const [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const upload = useRef<HTMLInputElement>(null);

  const dumpText = sqlDumpFiles(files)
    .map((file) => file.content)
    .join(';\n');
  const tables = useMemo(() => parseDump(dumpText), [dumpText]);
  const [tableName, setTableName] = useState('');
  const table = tables.find((item) => item.name === tableName) ?? tables[0];
  const queries = files.find((file) => file.path.toLowerCase() === 'kwerendy.txt');
  const database = step?.database || steps.find((item) => item.database)?.database || '';

  useEffect(() => {
    if (!step) return;
    try {
      localStorage.setItem(draftKey(projectId, step.id), sql);
    } catch {
      /* The draft is a convenience; the console works without storage. */
    }
  }, [projectId, step, sql]);

  if (!step)
    return (
      <section className="sql-practice">
        <p>Ten kurs nie ma kroków SQL do przećwiczenia w przeglądarce.</p>
      </section>
    );

  const chooseStep = (id: string) => {
    setStepId(id);
    setSql(readDraft(draftKey(projectId, id)));
    setResult(null);
  };
  const execute = () => {
    setLint(null);
    setResult(comparePractice(sql, step.reference!));
  };
  const append = async () => {
    const statement = sql.trim();
    if (!statement) return;
    setError('');
    try {
      await onAppendQuery(/;\s*$/.test(statement) ? statement : `${statement};`);
      setNotice('Dopisano zapytanie na końcu kwerendy.txt.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  };
  const addDump = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    try {
      const { content, recoded } = decodeDump(await file.arrayBuffer());
      await onAddFile({ path: dumpFileName(file.name), content });
      setNotice(
        recoded
          ? `Wczytano ${file.name}. Plik nie był w UTF-8 — odczytano go jako Windows-1250.`
          : `Wczytano ${file.name} do projektu.`,
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (upload.current) upload.current.value = '';
    }
  };

  return (
    <section className="sql-practice" aria-labelledby="sql-practice-title">
      <header>
        <h2 id="sql-practice-title">
          <Database size={20} /> Ćwiczebna baza danych
        </h2>
        <p>
          Przybliżony widok jak w phpMyAdmin. Zapytanie <strong>nie jest wykonywane</strong>:
          porównujemy je z przygotowanym wariantem kroku kursu i wskazujemy różnice. Prawdziwy wynik
          i zrzut ekranu zrób w XAMPP.
        </p>
      </header>
      <ErrorNotice message={error} />
      {notice && (
        <p className="sqlp-notice" role="status">
          {notice}
        </p>
      )}
      <div className="sqlp-layout">
        <aside className="sqlp-tree" aria-label="Baza i tabele">
          <p className="sqlp-database">
            <Database size={16} /> {database || 'baza'}
          </p>
          {tables.length ? (
            <ul>
              {tables.map((item) => (
                <li key={item.name}>
                  <button
                    type="button"
                    aria-current={item === table && view !== 'sql' ? 'true' : undefined}
                    onClick={() => {
                      setTableName(item.name);
                      setView('browse');
                    }}
                  >
                    <Table2 size={14} /> {item.name}
                    <small>{item.rowCount}</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sqlp-empty">
              Wczytaj plik .sql z materiałów arkusza, aby zobaczyć tabele.
            </p>
          )}
          <input
            ref={upload}
            type="file"
            accept=".sql"
            hidden
            onChange={(event) => void addDump(event.target.files?.[0])}
          />
          <button
            type="button"
            className="button secondary small"
            disabled={readOnly}
            onClick={() => upload.current?.click()}
          >
            <Upload size={15} /> Import pliku .sql
          </button>
        </aside>
        <div className="sqlp-main">
          <div className="sqlp-tabs" role="tablist" aria-label="Widok bazy">
            {(
              [
                ['sql', 'SQL'],
                ['structure', 'Struktura'],
                ['browse', 'Przeglądaj'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={view === key}
                disabled={key !== 'sql' && !table}
                onClick={() => setView(key)}
              >
                {label}
              </button>
            ))}
          </div>
          {view === 'sql' && (
            <div className="sqlp-sql" role="tabpanel" aria-label="SQL">
              <label className="field">
                <span>Krok kursu</span>
                <select value={step.id} onChange={(event) => chooseStep(event.target.value)}>
                  {runnable.map((item, index) => (
                    <option key={item.id} value={item.id}>
                      {index + 1}. {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sqlp-editor">
                <Editor
                  path="zapytanie.sql"
                  label="Zapytanie SQL"
                  minHeight={130}
                  value={sql}
                  onChange={(value) => {
                    setSql(value);
                    setResult(null);
                  }}
                  onRun={execute}
                />
              </div>
              <div className="sqlp-actions">
                <button
                  type="button"
                  className="button primary"
                  disabled={!sql.trim()}
                  onClick={execute}
                >
                  <Play size={16} /> Wykonaj
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={readOnly || !sql.trim()}
                  onClick={() => void append()}
                >
                  <FileText size={16} /> Dopisz do kwerendy.txt
                </button>
                <button
                  type="button"
                  className="button secondary"
                  disabled={!queries?.content.trim()}
                  onClick={() => {
                    setResult(null);
                    setLint(lintQueries(queries?.content ?? ''));
                  }}
                >
                  Sprawdź kwerendy.txt
                </button>
              </div>
              <div aria-live="polite">
                {result?.status === 'match' && (
                  <div className="sqlp-result ok">
                    <strong>
                      <CheckCircle2 size={17} /> Zgodne z przygotowanym wariantem tego kroku
                    </strong>
                    <Findings findings={result.findings} />
                    {step.expect.length > 0 && (
                      <>
                        <p>W XAMPP sprawdź wynik:</p>
                        <ul>
                          {step.expect.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                )}
                {result?.status === 'different' && (
                  <div className="sqlp-result bad">
                    <strong>Do poprawy</strong>
                    <Findings findings={result.findings} />
                    <p className="sqlp-hint">
                      Inne poprawne rozwiązanie też jest możliwe — wtedy sprawdź je w XAMPP.
                    </p>
                  </div>
                )}
                {result?.status === 'empty' && (
                  <p className="sqlp-hint">Wpisz instrukcję SQL zakończoną średnikiem.</p>
                )}
                {lint && (
                  <div className={`sqlp-result ${lint.length ? 'bad' : 'ok'}`}>
                    <strong>
                      {lint.length
                        ? 'kwerendy.txt — częste błędy'
                        : 'kwerendy.txt — nie widać częstych błędów'}
                    </strong>
                    <Findings findings={lint} />
                  </div>
                )}
              </div>
            </div>
          )}
          {view === 'structure' && table && (
            <div className="sqlp-table-wrap" role="tabpanel" aria-label="Struktura">
              <table>
                <caption>Struktura tabeli {table.name}</caption>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nazwa</th>
                    <th>Typ</th>
                    <th>Klucz</th>
                  </tr>
                </thead>
                <tbody>
                  {table.columns.map((column, index) => (
                    <tr key={column.name}>
                      <td>{index + 1}</td>
                      <td>{column.name}</td>
                      <td>{column.type}</td>
                      <td>
                        {column.primary && (
                          <span title="Klucz główny">
                            <KeyRound size={14} aria-label="Klucz główny" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {view === 'browse' && table && (
            <div className="sqlp-table-wrap" role="tabpanel" aria-label="Przeglądaj">
              <p className="sqlp-hint">
                {table.rowCount
                  ? `Pokazano wiersze 1–${table.rows.length} (razem ${table.rowCount}) z pliku .sql.`
                  : 'Plik nie zawiera danych tej tabeli.'}
              </p>
              {table.rowCount > 0 && (
                <table>
                  <caption>Dane tabeli {table.name}</caption>
                  <thead>
                    <tr>
                      {(table.columns.length
                        ? table.columns.map((column) => column.name)
                        : table.rows[0]!.map((_, index) => `${index + 1}`)
                      ).map((name) => (
                        <th key={name}>{name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className={cell === 'NULL' ? 'null' : undefined}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
