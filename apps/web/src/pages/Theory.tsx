import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import '../pdf-sheet.css';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Loader2,
  RotateCcw,
  Send,
  SearchCheck,
  XCircle,
} from 'lucide-react';
import type {
  AttemptSnapshot,
  Mode,
  PublicQuestion,
  QuestionCheck,
  TheoryResult,
  TheoryTicket,
} from '@zdaj/shared';
import { useApp } from '../context';
import { api, ApiError, errorMessage } from '../api';
import { readAttempt, updateAttempt } from '../storage';
import { createTheoryAttempt, theoryReviewQuestions, theoryReviewTitle } from '../theory-review';
import {
  EmptyState,
  ErrorNotice,
  Loading,
  ModePicker,
  PageHeading,
  Timer,
  modeLabel,
  plural,
} from '../components/common';
const SourceQuestionPdf = lazy(() =>
  import('../components/PdfSheet').then((module) => ({ default: module.PdfReader })),
);

type ReviewedQuestion = TheoryResult['results'][number]['question'];
/** The official wording lives only in the CKE document, so the review shows the same crop. */
function ReviewSource({ question, open }: { question: ReviewedQuestion; open: boolean }) {
  const [shown, setShown] = useState(open);
  const source = question.source;
  if (!source) return null;
  return (
    <details
      className="feedback-source"
      open={shown}
      onToggle={(event) => setShown(event.currentTarget.open)}
    >
      <summary>Pytanie CKE i warianty odpowiedzi</summary>
      {shown && (
        <div className="theory-source-question">
          <Suspense fallback={<Loading label="Wczytywanie oryginalnego pytania CKE…" />}>
            <SourceQuestionPdf
              url={`/api/v1/catalog/${encodeURIComponent(source.catalogId)}/sheet.pdf`}
              title={question.prompt}
              label={`CKE · zadanie ${source.questionNumber} · strona ${source.page}`}
              downloadName={`${source.catalogId}.pdf`}
              requestedPage={source.page}
              compact
              crop={
                source.top !== undefined && source.bottom !== undefined
                  ? { top: source.top, bottom: source.bottom }
                  : undefined
              }
            />
          </Suspense>
        </div>
      )}
    </details>
  );
}

/** The four options with what is right or wrong about each, as shown in the final review. */
function FeedbackOptions({
  question,
  correctOptionId,
  selectedOptionId,
  optionExplanations,
}: {
  question: PublicQuestion;
  correctOptionId: string;
  selectedOptionId: string | null;
  optionExplanations: Record<string, string>;
}) {
  return (
    <div className="feedback-options">
      {question.options.map((option, index) => (
        <div
          key={option.id}
          className={`${option.id === correctOptionId ? 'correct ' : ''}${option.id === selectedOptionId ? 'chosen' : ''}`}
        >
          <span className="option-letter">{'ABCD'[index]}</span>
          <div>
            {!question.source && <strong>{option.text}</strong>}
            <p>{optionExplanations[option.id]}</p>
          </div>
          {option.id === correctOptionId ? (
            <Check size={17} />
          ) : option.id === selectedOptionId ? (
            <XCircle size={17} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function Theory() {
  const { data, level, attempts, refreshProgress } = useApp();
  const [params, setParams] = useSearchParams();
  const id = params.get('proba');
  const [attempt, setAttempt] = useState<AttemptSnapshot | null>(null),
    [mode, setMode] = useState<Mode>('nauka'),
    [topic, setTopic] = useState(params.get('temat') || 'all'),
    [count, setCount] = useState(5),
    [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [filter, setFilter] = useState<'all' | 'wrong'>('all');
  const ref = useRef<AttemptSnapshot | null>(null),
    expired = useRef<string | null>(null),
    heading = useRef<HTMLHeadingElement>(null),
    moved = useRef(false);
  ref.current = attempt;
  useEffect(() => {
    // A series that was just started here is already on screen; reading it again would flash.
    if (id && ref.current?.id === id) return;
    setError('');
    expired.current = null;
    setAttempt(null);
    if (!id) return;
    setLoading(true);
    let cancelled = false;
    void readAttempt(id)
      .then((value) => {
        if (cancelled) return;
        if (!value || value.kind !== 'theory')
          throw new Error('Nie znaleziono tego testu w tej przeglądarce.');
        setAttempt(value);
        setMode(value.mode);
        // Open at the first question still waiting for an answer, or at the last one, where
        // the series is handed in.
        const open = value.questions?.findIndex((q) => !value.answers?.[q.id]) ?? 0;
        setIndex(open < 0 ? Math.max(0, (value.questions?.length ?? 1) - 1) : open);
      })
      .catch((e) => {
        if (!cancelled) setError(errorMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  useEffect(() => {
    // Keyboard and screen-reader users land on the question they moved to.
    if (!moved.current) return;
    moved.current = false;
    heading.current?.focus();
  }, [index]);
  const go = (next: number) => {
    moved.current = true;
    setIndex(next);
  };
  /** Saves a change on top of what is stored, so a second tab's answers are not lost. */
  const patch = useCallback(async (change: (stored: AttemptSnapshot) => AttemptSnapshot) => {
    const current = ref.current;
    if (!current) return null;
    const next = await updateAttempt(current.id, change);
    if (ref.current?.id === next.id) {
      ref.current = next;
      setAttempt(next);
    }
    return next;
  }, []);
  /**
   * The server keeps a series for a day; the browser keeps it for as long as the learner
   * wants. An expired series gets a new ticket for the same questions and the request is
   * sent again.
   */
  const withTicket = useCallback(
    async <T,>(send: (attempt: AttemptSnapshot) => Promise<T>): Promise<T> => {
      const current = ref.current!;
      try {
        return await send(current);
      } catch (cause) {
        if (
          !(cause instanceof ApiError) ||
          ![404, 410].includes(cause.status) ||
          current.mode === 'egzamin' ||
          !current.questions?.length
        )
          throw cause;
        const ticket = await api<TheoryTicket>('/theory/renew', {
          method: 'POST',
          body: {
            mode: current.mode,
            level: current.level,
            questions: current.questions.map((question) => ({
              id: question.id,
              version: question.version,
              optionOrder: question.options.map((option) => option.id),
            })),
          },
        });
        const renewed = await patch((stored) => ({
          ...stored,
          ticket: { id: ticket.id, token: ticket.token, deadlineAt: ticket.deadlineAt },
        }));
        return send(renewed ?? current);
      }
    },
    [patch],
  );
  const start = async (questionIds?: string[]) => {
    if (busy) return;
    if (!questionIds && mode === 'egzamin') {
      setError(
        'Pełny egzamin jest wyłączony: opublikowany zestaw CKE jest niepełny, a źródłowe informatory zawierają odpowiedzi. Wybierz naukę lub trening.',
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const snapshot = questionIds
        ? await createTheoryAttempt({ mode: 'trening', level, questionIds }, theoryReviewTitle)
        : await createTheoryAttempt(
            {
              mode: mode === 'trening' ? 'trening' : 'nauka',
              level,
              topicId: topic === 'all' ? undefined : topic,
              count: Math.min(count, data?.questionCount ?? count, 40),
            },
            `Przykłady CKE: ${topic === 'all' ? 'wszystkie tematy' : (data?.topics.find((t) => t.id === topic)?.title ?? 'wybrany temat')}`,
          );
      ref.current = snapshot;
      setAttempt(snapshot);
      setMode(snapshot.mode);
      setParams({ proba: snapshot.id });
      setIndex(0);
      await refreshProgress();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const submit = useCallback(async () => {
    const shown = ref.current;
    if (!shown || shown.submittedAt) return;
    setBusy(true);
    setError('');
    try {
      // Another tab may have answered more questions or already handed the series in.
      const stored = await readAttempt(shown.id);
      if (stored && ref.current?.id === stored.id) {
        ref.current = stored;
        setAttempt(stored);
        if (stored.submittedAt) return;
      }
      const result = await withTicket((attempt) =>
        api<TheoryResult>(`/theory/${attempt.ticket.id}/submit`, {
          method: 'POST',
          body: { token: attempt.ticket.token, answers: attempt.answers ?? {} },
        }),
      );
      await patch((latest) =>
        latest.submittedAt
          ? latest
          : {
              ...latest,
              theoryResult: result,
              submittedAt: result.submittedAt,
              updatedAt: new Date().toISOString(),
            },
      );
      await refreshProgress();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [patch, refreshProgress, withTicket]);
  const expire = useCallback(() => {
    if (ref.current && !ref.current.submittedAt && expired.current !== ref.current.id) {
      expired.current = ref.current.id;
      void submit();
    }
  }, [submit]);
  const choose = (optionId: string) => {
    const current = ref.current,
      question = current?.questions?.[index];
    if (!current || !question) return;
    const change = (stored: AttemptSnapshot): AttemptSnapshot =>
      stored.submittedAt || stored.checked?.[question.id]
        ? stored
        : {
            ...stored,
            answers: { ...stored.answers, [question.id]: optionId },
            updatedAt: new Date().toISOString(),
          };
    // Show the choice at once; the save then merges it with what is stored.
    const optimistic = change(current);
    ref.current = optimistic;
    setAttempt(optimistic);
    void patch(change).catch((e) => setError(errorMessage(e)));
  };
  /** Learning mode: explain this question now. A checked answer is final. */
  const check = async () => {
    const current = ref.current,
      question = current?.questions?.[index],
      optionId = question && current?.answers?.[question.id];
    if (!current || !question || !optionId || current.submittedAt || busy) return;
    setBusy(true);
    setError('');
    try {
      const feedback = await withTicket((attempt) =>
        api<QuestionCheck>(`/theory/${attempt.ticket.id}/check`, {
          method: 'POST',
          body: { token: attempt.ticket.token, questionId: question.id, optionId },
        }),
      );
      await patch((stored) =>
        stored.submittedAt || stored.checked?.[question.id]
          ? stored
          : {
              ...stored,
              answers: { ...stored.answers, [question.id]: feedback.selectedOptionId },
              checked: { ...stored.checked, [question.id]: feedback },
              updatedAt: new Date().toISOString(),
            },
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  if (loading) return <Loading label="Otwieranie zapisanej próby…" />;
  if (!attempt) {
    const questionIds = theoryReviewQuestions(attempts, data?.reviewQuestionIds);
    return (
      <div className="theory-landing">
        <PageHeading title="Teoria w małych porcjach.">
          {mode === 'nauka'
            ? 'Wybierz odpowiedź i sprawdź ją od razu. Wyjaśnienie zobaczysz po każdym pytaniu.'
            : 'Wybierz odpowiedź. Po oddaniu serii poznasz jej wyjaśnienie.'}
        </PageHeading>
        <ErrorNotice message={error} />
        <section className="theory-start glass-panel">
          <span className="theory-start-icon">
            <GraduationCap size={34} strokeWidth={1.5} />
          </span>
          <h2>Chwila skupienia. Kolejny krok.</h2>
          <p>
            Opublikowane przykłady CKE z objaśnieniami odpowiedzi. Zacznij od krótkiej serii i
            wracaj do trudniejszych tematów.
          </p>
          <div className="theory-set-summary">
            <strong>
              {topic === 'all'
                ? plural(Math.min(count, data?.questionCount ?? 0), 'pytanie', 'pytania', 'pytań')
                : `Do ${Math.min(count, data?.questionCount ?? 0)} pytań`}
            </strong>
            <span>
              {topic === 'all'
                ? 'Wszystkie tematy'
                : data?.topics.find((item) => item.id === topic)?.title}
            </span>
            <span>Bez limitu czasu</span>
          </div>
          <button
            className="button primary full"
            disabled={busy || !data || data.questionCount === 0 || mode === 'egzamin'}
            onClick={() => void start()}
          >
            {busy ? <Loader2 className="spin" size={17} /> : <ArrowRight size={17} />}Rozpocznij{' '}
            {mode === 'nauka' ? 'naukę' : modeLabel(mode).toLowerCase()}
          </button>
          {questionIds.length > 0 && (
            <div className="theory-review-action">
              <p>
                Powtórka z poprzednich serii ·{' '}
                {plural(questionIds.length, 'pytanie', 'pytania', 'pytań')}
              </p>
              <button
                className="button secondary full"
                disabled={busy}
                onClick={() => void start(questionIds)}
              >
                <RotateCcw size={17} aria-hidden />
                Powtórz błędy
              </button>
            </div>
          )}
          <details className="theory-set-options">
            <summary>
              Zmień zestaw
              <ChevronRight size={16} />
            </summary>
            <div className="setup-fields">
              <label className="field">
                <span>Temat</span>
                <select value={topic} onChange={(event) => setTopic(event.target.value)}>
                  <option value="all">Wszystkie tematy</option>
                  {data?.topics.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Liczba pytań</span>
                <select
                  value={Math.min(count, data?.questionCount ?? 0)}
                  onChange={(event) => setCount(Number(event.target.value))}
                >
                  {[5, 10, 20]
                    .filter((value) => value < (data?.questionCount ?? 0))
                    .map((value) => (
                      <option key={value} value={value}>
                        {value} pytań
                      </option>
                    ))}
                  <option value={data?.questionCount ?? 0}>
                    Wszystkie dostępne ({data?.questionCount ?? 0})
                  </option>
                </select>
              </label>
            </div>
            <p className="fine-print">
              Jeśli temat zawiera mniej pytań, otrzymasz wszystkie dostępne.
            </p>
            <ModePicker value={mode} onChange={setMode} disabledModes={['egzamin']} />
          </details>
        </section>
        <details className="theory-source-note">
          <summary>Skąd pochodzą pytania?</summary>
          <p>
            To {data?.questionCount ?? 0} opublikowanych przykładów CKE, a nie pełny bank
            egzaminacyjny. Dokumenty źródłowe zawierają także klucze odpowiedzi, dlatego pełny tryb
            egzaminu pozostaje wyłączony.
          </p>
          <p>
            Prawdziwa część pisemna to 40 pytań w 60 minut, z progiem 50%. Wyniki na tej stronie
            służą nauce.
          </p>
        </details>
      </div>
    );
  }
  const result = attempt.theoryResult;
  if (result) {
    const visible = result.results.filter((item) => filter === 'all' || !item.correct);
    const late =
      !!attempt.deadlineAt && Date.parse(result.submittedAt) > Date.parse(attempt.deadlineAt);
    return (
      <>
        <PageHeading
          kicker="Raport z teorii"
          title={result.passed ? 'Dobry krok do przodu.' : 'Już wiesz, co warto powtórzyć.'}
          action={
            <button
              className="button secondary"
              onClick={() => {
                setParams({});
                setAttempt(null);
                // A retained examination attempt must not leave the start button disabled.
                setMode((value) => (value === 'egzamin' ? 'nauka' : value));
              }}
            >
              <RotateCcw size={16} />
              Nowa próba
            </button>
          }
        >
          To wynik ćwiczeniowy, nie oficjalna ocena CKE.
        </PageHeading>
        <div className="theory-score">
          <div
            className="score-circle"
            style={{ '--score': `${result.percentage}%` } as React.CSSProperties}
          >
            <span>
              {result.percentage}
              <small>%</small>
            </span>
          </div>
          <div>
            <h2>
              {result.correct} z {result.total} poprawnych odpowiedzi
            </h2>
            <p>
              {result.passed
                ? 'Osiągnięto próg 50% dla tej próby. Wróć do pomyłek, żeby wiedza została na dłużej.'
                : 'Próg części pisemnej to 50%. Zacznij od pytań poniżej i wróć do odpowiadających im lekcji.'}
            </p>
            {late && <p className="late-label">Przekroczono czas egzaminu — wynik ćwiczeniowy.</p>}
          </div>
        </div>
        <div className="report-filter">
          <h2>Omówienie odpowiedzi</h2>
          <div className="segmented">
            <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
              Wszystkie ({result.total})
            </button>
            <button
              className={filter === 'wrong' ? 'active' : ''}
              onClick={() => setFilter('wrong')}
            >
              Do powtórki ({result.total - result.correct})
            </button>
          </div>
        </div>
        <div className="question-feedback-list">
          {visible.map((item) => (
            <article
              className="question-feedback"
              key={`${item.question.id}:${item.question.version}`}
            >
              <div className="feedback-heading">
                {item.correct ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                <h3>
                  {result.results.indexOf(item) + 1}. {item.question.prompt}
                </h3>
              </div>
              <ReviewSource question={item.question} open={!item.correct} />
              <FeedbackOptions
                question={item.question}
                correctOptionId={item.correctOptionId}
                selectedOptionId={item.selectedOptionId}
                optionExplanations={item.optionExplanations}
              />
              {!item.selectedOptionId && <p className="muted">Nie zaznaczono odpowiedzi.</p>}
              <p className="feedback-explanation">{item.explanation}</p>
              <Link className="text-link" to={`/nauka/podstawy?temat=${item.question.topicId}`}>
                Powtórz ten temat
                <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
        {!visible.length && (
          <EmptyState title="Wszystkie odpowiedzi poprawne">
            Świetnie. Teraz sprawdź te umiejętności w projekcie praktycznym.
          </EmptyState>
        )}
      </>
    );
  }
  const questions = attempt.questions ?? [],
    question = questions[index],
    answered = Object.keys(attempt.answers ?? {}).length;
  const feedback = question ? attempt.checked?.[question.id] : undefined,
    chosen = question ? attempt.answers?.[question.id] : undefined,
    last = index === questions.length - 1;
  const finish = () => {
    if (
      answered === questions.length ||
      window.confirm(
        `Bez odpowiedzi: ${plural(questions.length - answered, 'pytanie', 'pytania', 'pytań')}. Oddać próbę?`,
      )
    )
      void submit();
  };
  if (!question)
    return (
      <EmptyState
        title="Nie udało się odczytać pytań"
        to="/moje-prace"
        label="Otwórz zapisane próby"
      >
        Zaimportuj prawidłową kopię postępu lub rozpocznij nowy test.
      </EmptyState>
    );
  return (
    <>
      <div className="quiz-heading">
        <div>
          <Link className="back-link" to="/moje-prace">
            <ArrowLeft size={15} />
            Zapisane próby
          </Link>
          <h1>{attempt.title}</h1>
          <div className="meta-line">
            <span className="pill">{modeLabel(attempt.mode)}</span>
            <span>
              Odpowiedziano na {answered} z {questions.length}
            </span>
          </div>
        </div>
        <Timer deadlineAt={attempt.deadlineAt} onExpire={expire} />
      </div>
      <ErrorNotice message={error} />
      <div className="quiz-layout">
        <section className="quiz-question">
          <div className="question-topline">
            <span>
              Pytanie {index + 1} z {questions.length}
            </span>
            <span>{data?.topics.find((t) => t.id === question.topicId)?.title}</span>
          </div>
          <h2 ref={heading} tabIndex={-1}>
            {question.prompt}
          </h2>
          {question.source && (
            <div className="theory-source-question">
              <Suspense fallback={<Loading label="Wczytywanie oryginalnego pytania CKE…" />}>
                <SourceQuestionPdf
                  url={`/api/v1/catalog/${encodeURIComponent(question.source.catalogId)}/sheet.pdf`}
                  title={question.prompt}
                  label={`CKE · zadanie ${question.source.questionNumber} · strona ${question.source.page}`}
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
              <p className="fine-print">
                <a href={question.source.url} target="_blank" rel="noreferrer">
                  Oryginalny informator CKE
                </a>{' '}
                może zawierać także odpowiedzi. Wybierz A, B, C lub D w kolejności pokazanej w
                dokumencie.
              </p>
            </div>
          )}
          {feedback ? (
            <div className="question-check" role="status">
              <p className={`check-verdict ${feedback.correct ? 'correct' : 'wrong'}`}>
                {feedback.correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                {feedback.correct
                  ? 'Dobrze. To poprawna odpowiedź.'
                  : `Nie tym razem. Poprawna odpowiedź to ${'ABCD'[question.options.findIndex((option) => option.id === feedback.correctOptionId)]}.`}
              </p>
              <FeedbackOptions
                question={question}
                correctOptionId={feedback.correctOptionId}
                selectedOptionId={feedback.selectedOptionId}
                optionExplanations={feedback.optionExplanations}
              />
              <p className="feedback-explanation">{feedback.explanation}</p>
            </div>
          ) : (
            <>
              <fieldset className="answer-options">
                <legend className="visually-hidden">Wybierz jedną odpowiedź</legend>
                {question.options.map((option, optionIndex) => (
                  <label key={option.id} className={chosen === option.id ? 'selected' : ''}>
                    <input
                      type="radio"
                      aria-label={question.source ? `Odpowiedź ${'ABCD'[optionIndex]}` : undefined}
                      name={`answer-${question.id}`}
                      value={option.id}
                      checked={chosen === option.id}
                      disabled={busy}
                      onChange={() => choose(option.id)}
                    />
                    <span className="option-letter">{'ABCD'[optionIndex]}</span>
                    {!question.source && <span>{option.text}</span>}
                    {chosen === option.id && <Check size={18} />}
                  </label>
                ))}
              </fieldset>
              {attempt.mode === 'nauka' && (
                <div className="question-check-action">
                  <button
                    className="button primary"
                    disabled={busy || !chosen}
                    onClick={() => void check()}
                  >
                    {busy ? <Loader2 size={17} className="spin" /> : <SearchCheck size={17} />}
                    Sprawdź odpowiedź
                  </button>
                  <span>
                    {chosen
                      ? 'Po sprawdzeniu nie zmienisz już tej odpowiedzi.'
                      : 'Zaznacz odpowiedź, aby zobaczyć wyjaśnienie.'}
                  </span>
                </div>
              )}
            </>
          )}
          <div className="question-navigation">
            <button
              className="button secondary"
              disabled={index === 0}
              onClick={() => go(index - 1)}
            >
              <ChevronLeft size={17} />
              Poprzednie
            </button>
            <span>Odpowiedzi zapisują się automatycznie.</span>
            {last ? (
              <button className="button primary" disabled={busy} onClick={finish}>
                <Send size={17} />
                Oddaj serię
              </button>
            ) : (
              <button
                className={`button ${attempt.mode === 'nauka' && chosen && !feedback ? 'secondary' : 'primary'}`}
                onClick={() => go(index + 1)}
              >
                Następne
                <ChevronRight size={17} />
              </button>
            )}
          </div>
        </section>
        <aside className="quiz-overview">
          <h3>Twoja próba</h3>
          <div className="question-grid">
            {questions.map((item, questionIndex) => (
              <button
                key={item.id}
                aria-label={`Przejdź do pytania ${questionIndex + 1}${attempt.answers?.[item.id] ? ', odpowiedź zaznaczona' : ''}${attempt.checked?.[item.id] ? (attempt.checked[item.id]!.correct ? ', poprawna' : ', błędna') : ''}`}
                aria-current={index === questionIndex ? 'step' : undefined}
                className={`${attempt.answers?.[item.id] ? 'answered ' : ''}${attempt.checked?.[item.id] ? (attempt.checked[item.id]!.correct ? 'checked-correct ' : 'checked-wrong ') : ''}${index === questionIndex ? 'current' : ''}`}
                onClick={() => go(questionIndex)}
              >
                {questionIndex + 1}
              </button>
            ))}
          </div>
          <div className="quiz-legend">
            <span />
            <small>Zaznaczona odpowiedź</small>
          </div>
          <div className="progress-track">
            <span style={{ width: `${(answered / questions.length) * 100}%` }} />
          </div>
          <p>
            {questions.length - answered
              ? `Bez odpowiedzi: ${plural(questions.length - answered, 'pytanie', 'pytania', 'pytań')}.`
              : 'Wszystkie odpowiedzi zaznaczone.'}
          </p>
          <button className="button primary full" disabled={busy} onClick={finish}>
            {busy ? <Loader2 size={17} className="spin" /> : <Send size={17} />}Oddaj i zobacz wynik
          </button>
          <p className="fine-print">
            Po oddaniu nie można zmienić odpowiedzi. Zawsze możesz rozpocząć kolejną próbę.
          </p>
        </aside>
      </div>
    </>
  );
}
