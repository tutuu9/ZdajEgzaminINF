import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Lightbulb,
} from 'lucide-react';
import Markdown from 'react-markdown';
import '../study.css';
import type { PublicExercise } from '@zdaj/shared';
import { useApp } from '../context';
import { api, errorMessage } from '../api';
import { markLesson, readExercise, saveExercise } from '../storage';
import {
  CompletedLabel,
  EmptyState,
  ErrorNotice,
  LevelPicker,
  Loading,
  PageHeading,
  TopicIcon,
  levelLabel,
} from '../components/common';
import { Editor } from '../components/Editor';

function ExerciseBlock({ exercise }: { exercise: PublicExercise }) {
  const [code, setCode] = useState(exercise.starter),
    [hintCount, setHintCount] = useState(0),
    [solution, setSolution] = useState<{ solution: string; explanation: string } | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    void readExercise(exercise.id)
      .then((value) => {
        if (value !== undefined) setCode(value);
      })
      .catch((e) => setError(errorMessage(e)));
  }, [exercise.id]);
  const change = (value: string) => {
    setCode(value);
    void saveExercise(exercise.id, value).catch((e) => setError(errorMessage(e)));
  };
  const reveal = async () => {
    setBusy(true);
    setError('');
    try {
      setSolution(await api(`/exercises/${exercise.id}/solution`, { method: 'POST', body: {} }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="exercise-block">
      <div className="exercise-heading">
        <span className="pill">
          <BookOpen size={14} />
          Małe ćwiczenie
        </span>
        <span>{exercise.language}</span>
      </div>
      <h3>{exercise.title}</h3>
      <p>{exercise.prompt}</p>
      <Editor
        path={`cwiczenie.${exercise.language === 'javascript' ? 'js' : exercise.language}`}
        value={code}
        onChange={change}
        label="Kod ćwiczenia"
      />
      <ErrorNotice message={error} />
      {exercise.hints.slice(0, hintCount).map((hint, index) => (
        <div className="hint-note" key={hint}>
          <Lightbulb size={18} />
          <div>
            <strong>Wskazówka {index + 1}</strong>
            <p>{hint}</p>
          </div>
        </div>
      ))}
      <div className="exercise-actions">
        <button
          className="button secondary small"
          disabled={hintCount >= exercise.hints.length}
          onClick={() => setHintCount((value) => value + 1)}
        >
          <Lightbulb size={16} />
          Pokaż wskazówkę
        </button>
        <button className="text-button" disabled={busy || !!solution} onClick={() => void reveal()}>
          {busy ? 'Wczytywanie…' : 'Porównaj z przykładowym rozwiązaniem'}
          <ChevronDown size={15} />
        </button>
      </div>
      {solution && (
        <div className="exercise-solution">
          <h4>Jedno z możliwych rozwiązań</h4>
          <pre>
            <code>{solution.solution}</code>
          </pre>
          <p>{solution.explanation}</p>
          <p className="muted small-text">
            Zanim przejdziesz dalej, wyjaśnij własnymi słowami, dlaczego to działa.
          </p>
        </div>
      )}
    </section>
  );
}

export function Learn() {
  const { data, loading, level, setLevel, completed, refreshProgress } = useApp();
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const [error, setError] = useState('');
  if (!data)
    return loading ? (
      <Loading />
    ) : (
      <EmptyState title="Lekcje są chwilowo niedostępne">
        Spróbuj ponownie połączyć się z serwerem.
      </EmptyState>
    );
  if (id) {
    const lesson = data.lessons.find((item) => item.id === id);
    if (!lesson)
      return (
        <EmptyState title="Nie znaleziono lekcji" to="/nauka" label="Wróć do ścieżki">
          Wybierz lekcję z aktualnej listy tematów.
        </EmptyState>
      );
    const exercises = data.exercises.filter((item) => lesson.exerciseIds.includes(item.id));
    const done = completed.includes(id);
    const next = data.lessons[data.lessons.indexOf(lesson) + 1];
    const toggleComplete = async () => {
      try {
        await markLesson(id, !done);
        await refreshProgress();
      } catch (e) {
        setError(errorMessage(e));
      }
    };
    return (
      <div className="lesson-layout">
        <div className="lesson-main">
          <Link className="back-link" to={`/nauka?temat=${lesson.topicId}`}>
            <ArrowLeft size={16} />
            Wróć do tematu
          </Link>
          <PageHeading
            kicker={data.topics.find((topic) => topic.id === lesson.topicId)?.title}
            title={lesson.title}
          >
            {lesson.summary}
          </PageHeading>
          <div className="lesson-meta">
            <span>
              <Clock3 size={15} />
              {lesson.minutes} minut
            </span>
            <span>{levelLabel(lesson.level)}</span>
            <span>Wersja {lesson.version}</span>
            {done && <CompletedLabel />}
          </div>
          <article className="prose">
            <Markdown>{lesson.body}</Markdown>
          </article>
          {exercises.map((exercise) => (
            <ExerciseBlock exercise={exercise} key={exercise.id} />
          ))}
          <ErrorNotice message={error} />
          <div className="lesson-completion">
            <div>
              <h3>{done ? 'Ten krok jest już za Tobą.' : 'Gotowe na kolejny krok?'}</h3>
              <p>Zaznacz ukończenie, gdy potrafisz odtworzyć przykład samodzielnie.</p>
            </div>
            <button
              className={`button ${done ? 'secondary' : 'primary'}`}
              onClick={() => void toggleComplete()}
            >
              <Check size={17} />
              {done ? 'Cofnij ukończenie' : 'Oznacz jako ukończone'}
            </button>
          </div>
          {next && (
            <Link className="next-lesson" to={`/nauka/${next.id}`}>
              <div>
                <small>Następna lekcja</small>
                <strong>{next.title}</strong>
              </div>
              <ArrowRight size={20} />
            </Link>
          )}
        </div>
        <aside className="lesson-outline">
          <h3>Po tej lekcji potrafisz</h3>
          <ul>
            {lesson.objectives.map((objective) => (
              <li key={objective}>
                <Check size={16} />
                {objective}
              </li>
            ))}
          </ul>
          <div className="study-note">
            <Lightbulb size={22} />
            <h4>Sprawdź, czy rozumiesz</h4>
            <p>Zmień jedną rzecz w przykładzie. Zanim go uruchomisz, przewidź wynik.</p>
          </div>
          <Link className="button secondary full" to={`/teoria?temat=${lesson.topicId}`}>
            Poćwicz teorię
            <ArrowRight size={17} />
          </Link>
          <div className="lesson-exam-links">
            <h3>Zastosuj to w arkuszu CKE</h3>
            {data.tasks
              .filter((task) => task.topicIds.includes(lesson.topicId))
              .map((task) => (
                <Link key={task.id} to={`/praktyka/${task.id}?tryb=nauka&widok=nauka`}>
                  <BookOpen size={16} />
                  <span>{task.title}</span>
                  <ArrowRight size={15} />
                </Link>
              ))}
          </div>
        </aside>
      </div>
    );
  }
  const topic = params.get('temat') || 'all';
  const filtered = data.lessons.filter((lesson) => topic === 'all' || lesson.topicId === topic);
  return (
    <>
      <PageHeading kicker="Krok po kroku" title="Zbuduj solidne podstawy">
        Wybierz temat, zrozum przykład i napisz własne rozwiązanie.
      </PageHeading>
      <LevelPicker value={level} onChange={setLevel} />
      <section className="learning-exam-entry">
        <div>
          <h2>Od wymagania CKE do własnego kodu</h2>
          <p>
            Wybierz arkusz: przeczytaj wymaganie, napisz fragment i porównaj go z objaśnionym
            przykładem. Omówienia są materiałem edukacyjnym; oryginalne zadania pozostają w PDF CKE.
          </p>
        </div>
        <div>
          {data.tasks.map((task) => (
            <Link key={task.id} to={`/praktyka/${task.id}?tryb=nauka&widok=nauka`}>
              <BookOpen size={19} />
              <span>{task.title}</span>
              <ArrowRight size={17} />
            </Link>
          ))}
        </div>
      </section>
      <div className="topic-filter" role="group" aria-label="Temat lekcji">
        <button className={topic === 'all' ? 'active' : ''} onClick={() => setParams({})}>
          Wszystkie tematy
        </button>
        {data.topics.map((item) => (
          <button
            key={item.id}
            className={topic === item.id ? 'active' : ''}
            onClick={() => setParams({ temat: item.id })}
          >
            <TopicIcon id={item.id} size={16} />
            {item.title}
          </button>
        ))}
      </div>
      <div className="lesson-list">
        {filtered.map((lesson, index) => (
          <Link className="lesson-row" to={`/nauka/${lesson.id}`} key={lesson.id}>
            <span className={`lesson-number ${completed.includes(lesson.id) ? 'done' : ''}`}>
              {completed.includes(lesson.id) ? (
                <Check size={20} />
              ) : (
                String(index + 1).padStart(2, '0')
              )}
            </span>
            <div>
              <div className="lesson-row-title">
                <h2>{lesson.title}</h2>
                {completed.includes(lesson.id) && <CompletedLabel />}
              </div>
              <p>{lesson.summary}</p>
              <div className="meta-line">
                <span>{data.topics.find((t) => t.id === lesson.topicId)?.title}</span>
                <span>
                  <Clock3 size={14} />
                  {lesson.minutes} min
                </span>
                <span>{levelLabel(lesson.level)}</span>
              </div>
            </div>
            <ChevronRight size={20} />
          </Link>
        ))}
      </div>
      <div className="notice">
        <Lightbulb size={20} />
        <p>
          Poziom określa ilość pomocy w projektach. Każda lekcja i każdy temat pozostają dla Ciebie
          dostępne.
        </p>
      </div>
    </>
  );
}
