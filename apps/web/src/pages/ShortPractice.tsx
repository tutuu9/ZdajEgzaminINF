import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CatalogEntry, ShortPracticeSource, SqlJoinPractice } from '@zdaj/shared';
import { Editor } from '../components/Editor';
import {
  EmptyState,
  ErrorNotice,
  ExternalLink,
  Loading,
  PageHeading,
  usePageTitle,
} from '../components/common';
import { useApp } from '../context';
import { compareSingleSelect, type PracticeComparison } from '../sql-practice';
import { readExercise, saveExercise } from '../storage';
import '../short-practice.css';

function PaperLink({ paper, source }: { paper: CatalogEntry; source: ShortPracticeSource }) {
  if (!paper.sourcePdf) return null;
  const url = new URL(paper.sourcePdf.url);
  url.hash = `page=${source.page}`;
  return (
    <p>
      <ExternalLink href={url.href}>
        {paper.sourcePdf.sourceLabel}, str. {source.page}, zapytanie {source.queryNumber}
      </ExternalLink>
    </p>
  );
}

function JoinPractice({
  material,
  examplePaper,
  exercisePaper,
  courseHref,
}: {
  material: SqlJoinPractice;
  examplePaper: CatalogEntry;
  exercisePaper: CatalogEntry;
  courseHref: string;
}) {
  const { id, example, exercise } = material;
  const [sql, setSql] = useState<string | null>(null);
  const [practicing, setPracticing] = useState(false);
  const [checked, setChecked] = useState<{ sql: string; result: PracticeComparison } | null>(null);
  const [storageError, setStorageError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const ready = sql !== null;

  useEffect(() => {
    let cancelled = false;
    void readExercise(id).then(
      (draft) => {
        if (cancelled) return;
        setSql(draft ?? exercise.starterSql);
        setPracticing(draft !== undefined);
      },
      () => {
        if (cancelled) return;
        setSql(exercise.starterSql);
        setStorageError('Nie udało się odczytać szkicu. Możesz zacząć od przykładu.');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [id, exercise.starterSql]);

  useEffect(() => {
    if (ready) heading.current?.focus();
  }, [practicing, ready]);

  if (sql === null) return <Loading label="Wczytywanie treningu…" />;

  const change = (value: string) => {
    setSql(value);
    void saveExercise(id, value).then(
      () => setStorageError(''),
      () => setStorageError('Nie udało się zapisać szkicu. Kod nadal jest w edytorze.'),
    );
  };
  const check = () => setChecked({ sql, result: compareSingleSelect(sql, exercise.exampleSql) });
  const feedback = checked && checked.sql === sql ? checked.result : null;

  return (
    <div className="short-practice">
      <Link className="back-link" to="/nauka">
        Wróć do nauki
      </Link>
      <PageHeading title="SQL JOIN w 15 minut" />
      <ErrorNotice message={storageError} />
      {practicing ? (
        <section
          className="short-practice-panel surface-panel"
          aria-labelledby="short-practice-step"
        >
          <h2 id="short-practice-step" ref={heading} tabIndex={-1}>
            Spróbuj samodzielnie w arkuszu {exercisePaper.title}
          </h2>
          <PaperLink paper={exercisePaper} source={exercise.source} />
          <p>{exercise.prompt}</p>
          <dl className="short-practice-schema" aria-label="Tabele i potrzebne kolumny">
            {exercise.tables.map(({ name, columns }) => (
              <div key={name}>
                <dt>
                  <code>{name}</code>
                </dt>
                <dd>
                  <code>{columns.join(', ')}</code>
                </dd>
              </div>
            ))}
          </dl>
          <Editor
            label="Twoje zapytanie SQL"
            path="kwerenda.sql"
            value={sql}
            onChange={change}
            onRun={check}
            tabMovesFocus
            minHeight={165}
          />
          <div className="short-practice-actions">
            <button type="button" className="button primary" onClick={check}>
              Sprawdź zapytanie
            </button>
            <button type="button" className="button secondary" onClick={() => setPracticing(false)}>
              Wróć do przykładu
            </button>
          </div>
          <p className="short-practice-note">
            Sprawdzamy strukturę zapytania. Wynik wykonania możesz zobaczyć w XAMPP.
          </p>
          <div role="status">
            {feedback && (
              <div className={`notice ${feedback.status === 'match' ? 'success' : 'warning'}`}>
                <div>
                  <strong>
                    {feedback.status === 'match'
                      ? 'Zapytanie zgodne z wariantem kursu'
                      : 'Sprawdź wskazane elementy'}
                  </strong>
                  {feedback.findings.length > 0 && (
                    <ul className="short-practice-findings">
                      {feedback.findings.map(({ code, message }) => (
                        <li key={message}>
                          {code === 'missing-condition'
                            ? 'Sprawdź pary kluczy w złączeniach i warunek wyboru lat.'
                            : message}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
          <details className="short-practice-details">
            <summary>Pokaż wskazówkę</summary>
            <p>{exercise.hint}</p>
          </details>
          {checked && (
            <details className="short-practice-details">
              <summary>Porównaj rozwiązanie</summary>
              <pre className="short-practice-code">
                <code>{exercise.exampleSql}</code>
              </pre>
            </details>
          )}
          {feedback?.status === 'match' && (
            <Link className="text-link" to={courseHref}>
              Otwórz kurs {exercisePaper.title}
            </Link>
          )}
        </section>
      ) : (
        <section
          className="short-practice-panel surface-panel"
          aria-labelledby="short-practice-step"
        >
          <h2 id="short-practice-step" ref={heading} tabIndex={-1}>
            Zobacz przykład w arkuszu {examplePaper.title}
          </h2>
          <PaperLink paper={examplePaper} source={example.source} />
          <p>{example.explanation}</p>
          <pre className="short-practice-code">
            <code>{example.sql}</code>
          </pre>
          <div className="short-practice-actions">
            <button type="button" className="button primary" onClick={() => setPracticing(true)}>
              Spróbuj samodzielnie
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

export function ShortPractice() {
  const { data, loading } = useApp();
  usePageTitle('SQL JOIN w 15 minut');
  if (loading && !data) return <Loading />;

  const practice = data?.shortPractice;
  const exampleId = practice?.example.source.catalogId;
  const exerciseId = practice?.exercise.source.catalogId;
  const examplePaper = data?.catalog.find(({ id }) => id === exampleId);
  const exercisePaper = data?.catalog.find(({ id }) => id === exerciseId);
  const course = data?.tasks.find(({ sourceCatalogId }) => sourceCatalogId === exerciseId);
  if (!practice || !examplePaper?.sourcePdf || !exercisePaper?.sourcePdf || !course)
    return (
      <EmptyState
        failed
        title="Trening JOIN jest chwilowo niedostępny"
        to="/nauka"
        label="Wróć do nauki"
      >
        Do tego treningu potrzebne są materiały z arkuszy Chat i Baza Smoków.
      </EmptyState>
    );

  return (
    <JoinPractice
      key={practice.id}
      material={practice}
      examplePaper={examplePaper}
      exercisePaper={exercisePaper}
      courseHref={`/praktyka/${encodeURIComponent(course.id)}?tryb=nauka&widok=nauka`}
    />
  );
}
