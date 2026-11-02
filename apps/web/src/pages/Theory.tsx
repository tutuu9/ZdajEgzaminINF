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
  XCircle,
} from 'lucide-react';
import type { AttemptSnapshot, Mode, TheoryResult, TheoryTicket } from '@zdaj/shared';
import { useApp } from '../context';
import { api, errorMessage } from '../api';
import { readAttempt, saveAttempt } from '../storage';
import {
  EmptyState,
  ErrorNotice,
  Loading,
  ModePicker,
  PageHeading,
  Timer,
  modeLabel,
} from '../components/common';
const SourceQuestionPdf = lazy(() =>
  import('../components/PdfSheet').then((module) => ({ default: module.PdfReader })),
);

export function Theory() {
  const { data, level, refreshProgress } = useApp();
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
    expired = useRef<string | null>(null);
  ref.current = attempt;
  useEffect(() => {
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
        setIndex(Math.max(0, value.questions?.findIndex((q) => !value.answers?.[q.id]) ?? 0));
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
  const update = useCallback(async (value: AttemptSnapshot) => {
    ref.current = value;
    setAttempt(value);
    await saveAttempt(value);
  }, []);
  const start = async () => {
    if (mode === 'egzamin') {
      setError(
        'Pełny egzamin jest wyłączony: opublikowany zestaw CKE jest niepełny, a źródłowe informatory zawierają odpowiedzi. Wybierz naukę lub trening.',
      );
      return;
    }
    setBusy(true);
    setError('');
    try {
      const ticket = await api<TheoryTicket>('/theory/start', {
        method: 'POST',
        body: {
          mode,
          topicId: topic === 'all' ? undefined : topic,
          count: Math.min(count, data?.questionCount ?? count),
        },
      });
      const now = new Date().toISOString();
      const snapshot: AttemptSnapshot = {
        id: ticket.id,
        kind: 'theory',
        title: `Przykłady CKE: ${topic === 'all' ? 'wszystkie tematy' : (data?.topics.find((t) => t.id === topic)?.title ?? 'wybrany temat')}`,
        mode,
        level,
        createdAt: now,
        updatedAt: now,
        deadlineAt: ticket.deadlineAt,
        ticket: { id: ticket.id, token: ticket.token, deadlineAt: ticket.deadlineAt },
        questions: ticket.questions,
        answers: {},
        hintCount: 0,
      };
      await update(snapshot);
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
    const current = ref.current;
    if (!current || current.submittedAt) return;
    setBusy(true);
    setError('');
    try {
      const result = await api<TheoryResult>(`/theory/${current.ticket.id}/submit`, {
        method: 'POST',
        body: { token: current.ticket.token, answers: current.answers ?? {} },
      });
      await update({
        ...current,
        theoryResult: result,
        submittedAt: result.submittedAt,
        updatedAt: new Date().toISOString(),
      });
      await refreshProgress();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }, [refreshProgress, update]);
  const expire = useCallback(() => {
    if (ref.current && !ref.current.submittedAt && expired.current !== ref.current.id) {
      expired.current = ref.current.id;
      void submit();
    }
  }, [submit]);
  const choose = (optionId: string) => {
    const current = ref.current,
      question = current?.questions?.[index];
    if (!current || !question || current.submittedAt) return;
    void update({
      ...current,
      answers: { ...current.answers, [question.id]: optionId },
      updatedAt: new Date().toISOString(),
    }).catch((e) => setError(errorMessage(e)));
  };
  if (loading) return <Loading label="Otwieranie zapisanej próby…" />;
  if (!attempt)
    return (
      <div className="theory-landing">
        <PageHeading title="Teoria w małych porcjach.">
          Wybierz odpowiedź. Po oddaniu serii poznasz jej wyjaśnienie.
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
            <strong>{Math.min(count, data?.questionCount ?? 0)} pytań</strong>
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
          {visible.map((item, qindex) => (
            <article
              className="question-feedback"
              key={`${item.question.id}:${item.question.version}`}
            >
              <div className="feedback-heading">
                {item.correct ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                <h3>
                  {qindex + 1}. {item.question.prompt}
                </h3>
              </div>
              <div className="feedback-options">
                {item.question.options.map((option, index) => (
                  <div
                    key={option.id}
                    className={`${option.id === item.correctOptionId ? 'correct ' : ''}${option.id === item.selectedOptionId ? 'chosen' : ''}`}
                  >
                    <span className="option-letter">{'ABCD'[index]}</span>
                    <div>
                      {!item.question.source && <strong>{option.text}</strong>}
                      <p>{item.optionExplanations[option.id]}</p>
                    </div>
                    {option.id === item.correctOptionId ? (
                      <Check size={17} />
                    ) : option.id === item.selectedOptionId ? (
                      <XCircle size={17} />
                    ) : null}
                  </div>
                ))}
              </div>
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
          <h2>{question.prompt}</h2>
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
          <fieldset className="answer-options">
            <legend className="visually-hidden">Wybierz jedną odpowiedź</legend>
            {question.options.map((option, optionIndex) => (
              <label
                key={option.id}
                className={attempt.answers?.[question.id] === option.id ? 'selected' : ''}
              >
                <input
                  type="radio"
                  aria-label={question.source ? `Odpowiedź ${'ABCD'[optionIndex]}` : undefined}
                  name={`answer-${question.id}`}
                  value={option.id}
                  checked={attempt.answers?.[question.id] === option.id}
                  disabled={busy}
                  onChange={() => choose(option.id)}
                />
                <span className="option-letter">{'ABCD'[optionIndex]}</span>
                {!question.source && <span>{option.text}</span>}
                {attempt.answers?.[question.id] === option.id && <Check size={18} />}
              </label>
            ))}
          </fieldset>
          <div className="question-navigation">
            <button
              className="button secondary"
              disabled={index === 0}
              onClick={() => setIndex((value) => value - 1)}
            >
              <ChevronLeft size={17} />
              Poprzednie
            </button>
            <span>Odpowiedzi zapisują się automatycznie.</span>
            <button
              className="button primary"
              disabled={index === questions.length - 1}
              onClick={() => setIndex((value) => value + 1)}
            >
              Następne
              <ChevronRight size={17} />
            </button>
          </div>
        </section>
        <aside className="quiz-overview">
          <h3>Twoja próba</h3>
          <div className="question-grid">
            {questions.map((item, questionIndex) => (
              <button
                key={item.id}
                aria-label={`Przejdź do pytania ${questionIndex + 1}${attempt.answers?.[item.id] ? ', odpowiedź zaznaczona' : ''}`}
                aria-current={index === questionIndex ? 'step' : undefined}
                className={`${attempt.answers?.[item.id] ? 'answered ' : ''}${index === questionIndex ? 'current' : ''}`}
                onClick={() => setIndex(questionIndex)}
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
              ? `${questions.length - answered} pytań pozostaje bez odpowiedzi.`
              : 'Wszystkie odpowiedzi zaznaczone.'}
          </p>
          <button
            className="button primary full"
            disabled={busy}
            onClick={() => {
              if (
                answered === questions.length ||
                window.confirm(
                  `Pozostało ${questions.length - answered} pytań bez odpowiedzi. Oddać próbę?`,
                )
              )
                void submit();
            }}
          >
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
