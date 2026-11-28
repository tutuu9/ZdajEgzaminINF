import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { CatalogEntry, ShortPracticeSource, SqlShortPractice } from '@zdaj/shared';
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
import { studyStageHref } from '../resume';
import { compareSingleSelect, type PracticeComparison } from '../sql-practice';
import { readExercise, saveExercise } from '../storage';
import '../short-practice.css';

function PaperLink({
  paper,
  source,
}: {
  paper: CatalogEntry;
  source: Omit<ShortPracticeSource, 'queryNumber'> & { queryNumber?: number };
}) {
  if (!paper.sourcePdf) return null;
  const url = new URL(paper.sourcePdf.url);
  url.hash = `page=${source.page}`;
  return (
    <p>
      <ExternalLink href={url.href}>
        {paper.sourcePdf.sourceLabel}, str. {source.page}
        {source.queryNumber ? `, zapytanie ${source.queryNumber}` : ''}
      </ExternalLink>
    </p>
  );
}

function SqlPractice({
  material,
  kind,
  examplePaper,
  exercisePaper,
  courseHref,
}: {
  material: SqlShortPractice;
  kind: 'join' | 'group-by';
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
      <Link className="back-link" to="/nauka/15-minut">
        Wróć do krótkich ćwiczeń
      </Link>
      <PageHeading title={kind === 'join' ? 'SQL JOIN w 15 minut' : 'SQL GROUP BY w 15 minut'} />
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
                          {kind === 'join' && code === 'missing-condition'
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

export function ShortPractice({ kind = 'join' }: { kind?: 'join' | 'group-by' } = {}) {
  const { data, loading } = useApp();
  const topic = kind === 'join' ? 'JOIN' : 'GROUP BY';
  usePageTitle(`SQL ${topic} w 15 minut`);
  if (loading && !data) return <Loading />;

  const practice = kind === 'join' ? data?.shortPractice : data?.groupByPractice;
  const exampleId = practice?.example.source.catalogId;
  const exerciseId = practice?.exercise.source.catalogId;
  const examplePaper = data?.catalog.find(({ id }) => id === exampleId);
  const exercisePaper = data?.catalog.find(({ id }) => id === exerciseId);
  const course = data?.tasks.find(({ sourceCatalogId }) => sourceCatalogId === exerciseId);
  if (!practice || !examplePaper?.sourcePdf || !exercisePaper?.sourcePdf || !course)
    return (
      <EmptyState
        failed
        title={`Trening ${topic} jest chwilowo niedostępny`}
        to="/nauka/15-minut"
        label="Wróć do krótkich ćwiczeń"
      >
        {kind === 'join'
          ? 'Do tego treningu potrzebne są materiały z arkuszy Chat i Baza Smoków.'
          : 'Do tego treningu potrzebne są materiały z arkuszy Poziomy rzek i Moje zadania.'}
      </EmptyState>
    );

  return (
    <SqlPractice
      key={practice.id}
      material={practice}
      kind={kind}
      examplePaper={examplePaper}
      exercisePaper={exercisePaper}
      courseHref={
        kind === 'join'
          ? studyStageHref(course.id, 'sql')
          : studyStageHref(course.id, 'queries', 'group')
      }
    />
  );
}

export function ShortPracticeIndex() {
  const { data, loading } = useApp();
  usePageTitle('Mam 15 minut');
  if (loading && !data) return <Loading />;
  const activities = [
    {
      available: data?.shortPractice,
      path: 'join',
      title: 'Połącz tabele za pomocą JOIN',
      paper: 'Chat i Baza Smoków',
    },
    {
      available: data?.groupByPractice,
      path: 'group-by',
      title: 'Policz wyniki w grupach za pomocą GROUP BY',
      paper: 'Poziomy rzek i Moje zadania',
    },
    {
      available: data?.postPractice,
      path: 'post',
      title: 'Odczytaj dane z formularza POST',
      paper: 'Poziomy rzek',
    },
  ].filter(({ available }) => available);
  if (!activities.length)
    return (
      <EmptyState
        failed
        title="Krótkie ćwiczenia są chwilowo niedostępne"
        to="/nauka"
        label="Wróć do nauki"
      >
        Możesz kontynuować naukę z pełnym arkuszem.
      </EmptyState>
    );
  return (
    <div className="short-practice">
      <Link className="back-link" to="/nauka">
        Wróć do nauki
      </Link>
      <PageHeading title="Mam 15 minut" />
      {activities.map(({ path, title, paper }) => (
        <section key={path} className="short-practice-panel surface-panel">
          <h2>{title}</h2>
          <p>{paper}</p>
          <Link className="button secondary" to={path} aria-label={`Otwórz ćwiczenie: ${title}`}>
            Otwórz ćwiczenie
          </Link>
        </section>
      ))}
    </div>
  );
}

export function PostPractice() {
  const { data, loading } = useApp();
  usePageTitle('PHP POST w 15 minut');
  if (loading && !data) return <Loading />;
  const practice = data?.postPractice;
  const paper = data?.catalog.find(({ id }) => id === practice?.source.catalogId);
  const course = data?.tasks.find(
    (task) =>
      task.sourceCatalogId === practice?.source.catalogId && task.version === practice?.taskVersion,
  );
  if (!practice || !paper?.sourcePdf || !course)
    return (
      <EmptyState
        failed
        title="Trening POST jest chwilowo niedostępny"
        to="/nauka/15-minut"
        label="Wróć do krótkich ćwiczeń"
      >
        Do tego ćwiczenia potrzebne są materiały z arkusza Poziomy rzek.
      </EmptyState>
    );
  return (
    <div className="short-practice">
      <Link className="back-link" to="/nauka/15-minut">
        Wróć do krótkich ćwiczeń
      </Link>
      <PageHeading title="PHP POST w 15 minut" />
      <section className="short-practice-panel surface-panel" aria-labelledby="post-practice-step">
        <h2 id="post-practice-step">Odczytaj wybrany poziom z formularza</h2>
        <PaperLink paper={paper} source={practice.source} />
        <p>
          Otrzymasz gotowy formularz z trzema opcjami. Odczytaj wybór w PHP i sprawdź, czy zmienia
          się po wysłaniu formularza. Do tego kroku wystarczy sam plik PHP.
        </p>
        <p>Otwórz stronę w „Baza i PHP” albo uruchom ją lokalnie w XAMPP.</p>
        <Link
          className="button primary"
          to={studyStageHref(course.id, practice.stepId, practice.activityId)}
        >
          Przejdź do kroku w kursie {course.title}
        </Link>
      </section>
    </div>
  );
}
