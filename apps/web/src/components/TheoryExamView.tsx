import { lazy, Suspense, useState, type RefObject } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Loader2, Play, Send } from 'lucide-react';
import type { AttemptSnapshot } from '@zdaj/shared';
import { StationClock } from './ExamStation';
import { ErrorNotice, Loading } from './common';
import {
  guideTimeLabel,
  OFFICIAL_MINUTES,
  OFFICIAL_TASKS,
  theoryExamDeadline,
  type TheoryExamRecord,
} from '../theory-exam';
import '../theory-exam.css';

const SourceQuestionPdf = lazy(() =>
  import('./PdfSheet').then((module) => ({ default: module.PdfReader })),
);

/** What the CKE informator says the candidate sees, retold for this training view. */
function Instructions() {
  return (
    <div className="theory-exam-instructions">
      <ul>
        <li>Czas zaczyna płynąć po wybraniu przycisku Start.</li>
        <li>
          Odpowiadasz w dowolnej kolejności. Zadania bez odpowiedzi są oznaczone na czerwono, a z
          prawej strony widzisz liczbę udzielonych i nieudzielonych odpowiedzi oraz pozostały czas.
        </li>
        <li>Do każdego zadania możesz wrócić i zmienić odpowiedź.</li>
        <li>
          Przycisk Zakończ egzamin działa po udzieleniu wszystkich odpowiedzi. Gdy czas minie, test
          zakończy się sam.
        </li>
        <li>Po zakończeniu zobaczysz liczbę poprawnych odpowiedzi.</li>
      </ul>
      <p className="theory-exam-source">
        Na podstawie opisu części pisemnej w informatorze CKE o egzaminie zawodowym (część ogólna,
        formuła 2019, aktualizacja z 7 grudnia 2023 r.).
      </p>
    </div>
  );
}

/** A theory series laid out like the electronic written part, as a training run. */
export function TheoryExamView({
  attempt,
  record,
  index,
  busy,
  error,
  heading,
  onStart,
  onGo,
  onChoose,
  onFinish,
  onExpire,
}: {
  attempt: AttemptSnapshot;
  record: TheoryExamRecord;
  index: number;
  busy: boolean;
  error: string;
  heading: RefObject<HTMLHeadingElement | null>;
  onStart: () => void;
  onGo: (index: number) => void;
  onChoose: (optionId: string) => void;
  onFinish: () => void;
  onExpire: () => void;
}) {
  const [showInstructions, setShowInstructions] = useState(false);
  const questions = attempt.questions ?? [];
  const question = questions[index];
  const answered = questions.filter((item) => attempt.answers?.[item.id]).length;
  const deadline = theoryExamDeadline(record);
  const notice = (
    <p className="theory-exam-notice">
      Trening z {questions.length} opublikowanych przykładów z informatora CKE. Klucz odpowiedzi
      jest publiczny, więc to nie jest egzamin i nie jest to system CKE. Prawdziwa część pisemna ma{' '}
      {OFFICIAL_TASKS} zadań i {OFFICIAL_MINUTES} minut.
    </p>
  );
  if (!deadline)
    return (
      <div className="theory-exam theory-exam-intro">
        <header className="theory-exam-menu">
          <strong>Test próbny · INF.03</strong>
        </header>
        <section className="theory-exam-panel" aria-labelledby="instrukcja-obslugi">
          <h1 id="instrukcja-obslugi">Instrukcja obsługi</h1>
          {notice}
          <Instructions />
          <p>
            Zadań: <strong>{questions.length}</strong> · czas:{' '}
            <strong>{guideTimeLabel(questions.length)}</strong> (90 sekund na zadanie, jak{' '}
            {OFFICIAL_MINUTES} minut na {OFFICIAL_TASKS} zadań).
          </p>
          <button className="button primary" onClick={onStart}>
            <Play size={17} />
            Start
          </button>
        </section>
      </div>
    );
  if (!question) return null;
  const optionIndex = question.options.findIndex(
    (option) => option.id === attempt.answers?.[question.id],
  );
  return (
    <div className="theory-exam">
      <header className="theory-exam-menu">
        <strong>Test próbny · INF.03</strong>
        <button
          className="theory-exam-menu-item"
          aria-expanded={showInstructions}
          onClick={() => setShowInstructions((value) => !value)}
        >
          <BookOpen size={15} aria-hidden="true" />
          Instrukcja obsługi
        </button>
      </header>
      {showInstructions && (
        <section className="theory-exam-panel" aria-label="Instrukcja obsługi">
          <Instructions />
        </section>
      )}
      <ErrorNotice message={error} />
      <div className="theory-exam-layout">
        <section className="theory-exam-task" aria-labelledby="zadanie-tytul">
          <h1 id="zadanie-tytul" ref={heading} tabIndex={-1}>
            Zadanie {index + 1}
          </h1>
          {question.source && (
            <div className="theory-source-question">
              <Suspense fallback={<Loading label="Wczytywanie zadania…" />}>
                <SourceQuestionPdf
                  url={`/api/v1/catalog/${encodeURIComponent(question.source.catalogId)}/sheet.pdf`}
                  title={question.prompt}
                  label={`Zadanie ${index + 1}`}
                  downloadName={`${question.source.catalogId}.pdf`}
                  requestedPage={question.source.page}
                  compact
                  crop={
                    question.source.top !== undefined && question.source.bottom !== undefined
                      ? { top: question.source.top, bottom: question.source.bottom }
                      : undefined
                  }
                />
              </Suspense>
            </div>
          )}
          <fieldset className="theory-exam-options">
            <legend>Wybierz jedną odpowiedź</legend>
            {question.options.map((option, position) => (
              <label key={option.id} className={optionIndex === position ? 'selected' : ''}>
                <input
                  type="radio"
                  name={`odpowiedz-${question.id}`}
                  value={option.id}
                  checked={optionIndex === position}
                  disabled={busy}
                  aria-label={`Odpowiedź ${'ABCD'[position]}`}
                  onChange={() => onChoose(option.id)}
                />
                <span className="theory-exam-letter">{'ABCD'[position]}</span>
                {!question.source && <span>{option.text}</span>}
              </label>
            ))}
          </fieldset>
          <nav className="theory-exam-navigation" aria-label="Zadania">
            <button
              className="button secondary"
              disabled={index === 0}
              onClick={() => onGo(index - 1)}
            >
              <ChevronLeft size={17} />
              Poprzednie
            </button>
            <button
              className="button secondary"
              disabled={index === questions.length - 1}
              onClick={() => onGo(index + 1)}
            >
              Następne
              <ChevronRight size={17} />
            </button>
          </nav>
        </section>
        <aside className="theory-exam-status" aria-label="Stan testu">
          <dl>
            <div>
              <dt>Udzielone odpowiedzi</dt>
              <dd>{answered}</dd>
            </div>
            <div>
              <dt>Nieudzielone odpowiedzi</dt>
              <dd className={answered < questions.length ? 'open' : undefined}>
                {questions.length - answered}
              </dd>
            </div>
            <div>
              <dt>Pozostały czas</dt>
              <dd>
                <StationClock deadlineAt={deadline} label="Pozostały czas" onExpire={onExpire} />
              </dd>
            </div>
          </dl>
          <div className="theory-exam-grid">
            {questions.map((item, position) => {
              const done = Boolean(attempt.answers?.[item.id]);
              return (
                <button
                  key={item.id}
                  className={`${done ? 'answered' : 'open'}${position === index ? ' current' : ''}`}
                  aria-current={position === index ? 'step' : undefined}
                  aria-label={`Zadanie ${position + 1}${done ? ', odpowiedź udzielona' : ', bez odpowiedzi'}`}
                  onClick={() => onGo(position)}
                >
                  {position + 1}
                </button>
              );
            })}
          </div>
          <button
            className="button primary full"
            disabled={busy || answered < questions.length}
            onClick={onFinish}
          >
            {busy ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
            Zakończ egzamin
          </button>
          <p className="fine-print">
            {answered < questions.length
              ? 'Przycisk zadziała po udzieleniu wszystkich odpowiedzi. Gdy czas minie, test zakończy się sam.'
              : 'Wszystkie odpowiedzi udzielone. Możesz je jeszcze zmienić.'}
          </p>
          {notice}
        </aside>
      </div>
    </div>
  );
}
