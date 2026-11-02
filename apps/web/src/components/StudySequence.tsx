import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Code2,
  Download,
  Eye,
  FileText,
  Loader2,
  LockKeyhole,
} from 'lucide-react';
import Markdown from 'react-markdown';
import type { ExamStudyGuide, ExamStudyStep } from '@zdaj/shared';
import { downloadBlob, readExercise, saveExercise } from '../storage';
import {
  canVisitActivity,
  completeStudyActivity,
  hasWrittenAttempt,
  initialStudyProgress,
  parseStudyProgress,
  serializeStudyProgress,
  studySequence,
  type StudyProgress,
} from '../study-progress';
import { Editor } from './Editor';
import { ErrorNotice, Loading, Notice } from './common';

export function LegacyStudyNotebook({
  attemptId,
  step,
}: {
  attemptId: string;
  step: ExamStudyStep;
}) {
  const [open, setOpen] = useState(false),
    [code, setCode] = useState<string>(),
    [ready, setReady] = useState(false),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setReady(false);
    setError('');
    void readExercise(`study-${attemptId}-${step.id}`)
      .then((value) => {
        if (!cancelled) setCode(value);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            'Nie udało się odczytać wcześniejszego notatnika. Nie zmieniliśmy jego zawartości.',
          );
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [attemptId, step.id, open, retry]);
  return (
    <details
      className="study-legacy"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Wcześniejszy notatnik</summary>
      {open && (
        <>
          <p>
            Twój zapis z wcześniejszego sposobu nauki. Pozostaje osobno i nie jest nadpisywany przez
            małe kroki.
          </p>
          <ErrorNotice message={error} onRetry={() => setRetry((value) => value + 1)} />
          {!ready ? (
            <Loading label="Odczytywanie wcześniejszej notatki…" />
          ) : (
            !error &&
            (code === undefined ? (
              <p>Brak wcześniejszej notatki dla tego etapu w tej próbie.</p>
            ) : (
              <Editor
                path={step.fileName}
                value={code}
                readOnly
                onChange={() => undefined}
                minHeight={120}
                label={`Wcześniejszy notatnik: ${step.title}`}
              />
            ))
          )}
        </>
      )}
    </details>
  );
}

export function StudySequence({
  guide,
  attemptId,
  onSelectStep,
  onOpenSheet,
}: {
  guide: ExamStudyGuide;
  attemptId: string;
  onSelectStep: (id: string) => void;
  onOpenSheet: (page: number) => void;
}) {
  const sequence = studySequence(guide);
  const key = `study-flow-${attemptId}-v${guide.version}`;
  const [progress, setProgress] = useState<StudyProgress | null>(null),
    [loading, setLoading] = useState(true),
    [readError, setReadError] = useState(''),
    [saveError, setSaveError] = useState(''),
    [validationError, setValidationError] = useState(''),
    [saving, setSaving] = useState(false),
    [rawRecovery, setRawRecovery] = useState<string>(),
    [resetConfirmed, setResetConfirmed] = useState(false),
    [retry, setRetry] = useState(0);
  const latest = useRef<StudyProgress | null>(null),
    revision = useRef(0),
    queue = useRef(Promise.resolve()),
    failed = useRef(false),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setReadError('');
    setRawRecovery(undefined);
    void readExercise(key)
      .then((raw) => {
        if (cancelled) return;
        try {
          const restored =
            raw === undefined ? initialStudyProgress(guide) : parseStudyProgress(raw, guide);
          latest.current = restored;
          setProgress(restored);
        } catch (cause) {
          setRawRecovery(raw);
          setReadError(
            cause instanceof Error ? cause.message : 'Nie udało się odczytać zapisanego postępu.',
          );
        }
      })
      .catch(() => {
        if (!cancelled)
          setReadError(
            'Nie można odczytać lokalnego postępu. Sprawdź dostęp przeglądarki do danych; nie utworzyliśmy nowego zapisu.',
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, guide, retry]);
  const current = sequence.find((item) => item.id === progress?.current);
  useEffect(() => {
    if (current) onSelectStep(current.step.id);
  }, [current?.id, onSelectStep]);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [current?.id]);
  useEffect(() => {
    if (!saving && !saveError && !validationError) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saving, saveError, validationError]);

  const persist = (next: StudyProgress) => {
    latest.current = next;
    setProgress(next);
    const currentRevision = ++revision.current;
    let raw: string;
    try {
      raw = serializeStudyProgress(next);
    } catch (cause) {
      setValidationError(
        cause instanceof Error
          ? cause.message
          : 'Nie można zapisać tego postępu. Pobierz jego kopię.',
      );
      setSaving(false);
      return;
    }
    setValidationError('');
    setSaving(true);
    queue.current = queue.current
      .then(async () => {
        if (failed.current) return;
        await saveExercise(key, raw);
        if (revision.current === currentRevision) setSaving(false);
      })
      .catch(() => {
        failed.current = true;
        setSaving(false);
        setSaveError(
          'Nie udało się zapisać kroku. Twój tekst pozostaje na tej stronie. Ponów zapis lub pobierz jego kopię przed zamknięciem.',
        );
      });
  };
  const retrySave = () => {
    if (!latest.current) return;
    failed.current = false;
    setSaveError('');
    persist(latest.current);
  };
  const download = (raw: string) =>
    downloadBlob(
      new Blob([raw], { type: 'application/json' }),
      `nauka-${attemptId}-v${guide.version}.json`,
    );
  if (loading) return <Loading label="Przywracanie miejsca w nauce…" />;
  if (readError)
    return (
      <div className="study-recovery">
        <ErrorNotice message={readError} onRetry={() => setRetry((value) => value + 1)} />
        {rawRecovery !== undefined && (
          <>
            <button className="button secondary small" onClick={() => download(rawRecovery)}>
              <Download size={16} />
              Pobierz zachowany zapis
            </button>
            <label className="study-reset-confirm">
              <input
                type="checkbox"
                checked={resetConfirmed}
                onChange={(event) => setResetConfirmed(event.target.checked)}
              />
              Chcę zastąpić uszkodzony postęp nowym zapisem. Zachowałem potrzebną kopię.
            </label>
            <button
              className="button secondary small"
              disabled={!resetConfirmed}
              onClick={() => {
                setReadError('');
                setRawRecovery(undefined);
                persist(initialStudyProgress(guide));
              }}
            >
              Rozpocznij ten przewodnik od nowa
            </button>
            <p className="fine-print">
              Zmieni się tylko postęp tej wersji przewodnika w tej próbie. Wcześniejsze notatniki i
              pliki projektu pozostają zapisane osobno.
            </p>
          </>
        )}
      </div>
    );
  if (!progress || !current)
    return (
      <Notice>
        Ta wersja ma omówienie zbiorcze. Znajdziesz je poniżej w materiałach do porównania.
      </Notice>
    );
  const { step, activity } = current;
  const phase = progress.phases[current.id] ?? 'explain';
  const draft = progress.drafts[current.id] ?? activity.starterCode;
  const written = hasWrittenAttempt(progress, current);
  const completed = progress.completed.includes(current.id);
  const currentIndex = sequence.findIndex((item) => item.id === current.id);
  const finished = progress.completed.length === sequence.length;
  const blocked = saving || !!saveError || !!validationError;
  const visit = (id: string) => {
    if (!blocked && canVisitActivity(progress, sequence, id)) persist({ ...progress, current: id });
  };
  const setPhase = (next: 'write' | 'compare') => {
    if (!blocked) persist({ ...progress, phases: { ...progress.phases, [current.id]: next } });
  };
  return (
    <>
      <div className="study-overall-progress">
        <div>
          <strong>Małe kroki, własne tempo</strong>
          <span>
            {progress.completed.length} z {sequence.length} kroków potwierdzonych przez Ciebie
          </span>
        </div>
        <progress
          aria-label="Ukończone kroki nauki"
          value={progress.completed.length}
          max={sequence.length}
        />
      </div>
      <ErrorNotice message={saveError} onRetry={retrySave} />
      <ErrorNotice message={validationError} />
      {(saveError || validationError) && (
        <button
          className="button secondary small"
          onClick={() => download(JSON.stringify(progress))}
        >
          <Download size={16} />
          Pobierz bieżący postęp i kod
        </button>
      )}
      <div className="study-layout">
        <nav className="study-step-list" aria-label="Etapy nauki z arkuszem">
          {guide.steps.map((item, index) => {
            const positions = sequence.filter((entry) => entry.step.id === item.id);
            const next =
              positions.find((entry) => !progress.completed.includes(entry.id)) ?? positions[0];
            const unlocked = !!next && canVisitActivity(progress, sequence, next.id);
            const done =
              positions.length > 0 &&
              positions.every((entry) => progress.completed.includes(entry.id));
            return (
              <button
                key={item.id}
                aria-current={step.id === item.id ? 'step' : undefined}
                className={step.id === item.id ? 'active' : ''}
                disabled={!unlocked || blocked}
                onClick={() => next && visit(next.id)}
                title={!unlocked ? 'Najpierw ukończ poprzedni etap.' : undefined}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <strong>{item.title.replace(/^\d+[.)]\s*/, '')}</strong>
                  <small>
                    {done
                      ? 'Ukończony — możesz wrócić'
                      : unlocked
                        ? `${positions.filter((entry) => progress.completed.includes(entry.id)).length}/${positions.length} małych kroków`
                        : 'Po poprzednim etapie'}
                  </small>
                </div>
                {done ? (
                  <Check size={16} />
                ) : unlocked ? (
                  <ChevronRight size={16} />
                ) : (
                  <LockKeyhole size={15} />
                )}
              </button>
            );
          })}
        </nav>
        <article className="study-step study-micro-step" key={current.id}>
          <header className="study-step-heading">
            <div>
              <span className="pill subtle">
                {step.language} · {step.fileName}
              </span>
              <p className="study-stage-name">
                {step.title.replace(/^\d+[.)]\s*/, '')} · krok {current.indexInStep + 1}/
                {step.activities?.length}
              </p>
            </div>
            {step.page && (
              <button
                className="button secondary small"
                disabled={blocked}
                onClick={() => onOpenSheet(step.page!)}
              >
                <FileText size={16} />
                Arkusz, strona {step.page}
              </button>
            )}
          </header>
          <details className="study-small-requirement">
            <summary>Wymaganie z arkusza</summary>
            <p>{step.requirement}</p>
          </details>
          <ol className="study-phases" aria-label="Przebieg małego kroku">
            <li aria-current={phase === 'explain' ? 'step' : undefined}>1. Zrozum</li>
            <li aria-current={phase === 'write' ? 'step' : undefined}>2. Napisz</li>
            <li aria-current={phase === 'compare' ? 'step' : undefined}>3. Sprawdź</li>
          </ol>
          <h3 className="study-activity-title" tabIndex={-1} ref={heading}>
            {activity.title}
          </h3>
          <div className="prose study-explanation">
            <Markdown>{activity.explanation}</Markdown>
          </div>
          {phase === 'explain' ? (
            <div className="study-understand-action">
              <button
                className="button primary"
                disabled={blocked}
                onClick={() => setPhase('write')}
              >
                Rozumiem — spróbuję
                <ChevronRight size={17} />
              </button>
              <p>Za chwilę napiszesz tylko fragment potrzebny w tym kroku.</p>
            </div>
          ) : (
            <>
              <section className="study-scratchpad">
                <div className="study-scratchpad-heading">
                  <div>
                    <Code2 size={20} />
                    <h4>Napisz sam</h4>
                  </div>
                  <span className="save-state" role="status">
                    {saving ? (
                      <Loader2 className="spin" size={14} />
                    ) : saveError || validationError ? null : (
                      <Check size={14} />
                    )}
                    {validationError
                      ? 'Zapis wymaga skrócenia tekstu'
                      : saveError
                        ? 'Zapis wymaga ponowienia'
                        : saving
                          ? 'Zapisywanie…'
                          : 'Postęp zapisany lokalnie'}
                  </span>
                </div>
                <div className="prose study-instruction">
                  <Markdown>{activity.instruction}</Markdown>
                </div>
                <Editor
                  path={step.fileName}
                  value={draft}
                  minHeight={150}
                  readOnly={!!saveError}
                  label={`Napisz sam: ${activity.title}`}
                  onChange={(value) => {
                    const state = latest.current;
                    if (
                      !state ||
                      saveError ||
                      value === (state.drafts[current.id] ?? activity.starterCode)
                    )
                      return;
                    persist({
                      ...state,
                      drafts: { ...state.drafts, [current.id]: value },
                      selfChecks: { ...state.selfChecks, [current.id]: false },
                    });
                  }}
                />
                <p>Ten mały notatnik nie uruchamia kodu i nie zmienia plików oddawanej pracy.</p>
              </section>
              {written && (
                <>
                  {phase !== 'compare' ? (
                    <button
                      className="button secondary"
                      disabled={blocked}
                      onClick={() => setPhase('compare')}
                    >
                      <Eye size={17} />
                      Porównaj z przykładem
                    </button>
                  ) : (
                    <section className="study-example">
                      <h4>Przykład tego małego kroku</h4>
                      <Editor
                        path={step.fileName}
                        value={activity.exampleCode}
                        readOnly
                        minHeight={120}
                        onChange={() => undefined}
                        label={`Przykład: ${activity.title}`}
                      />
                      <h4 className="study-why-title">Dlaczego to działa</h4>
                      <ul>
                        {activity.why.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                  <div className="study-self-check">
                    <label>
                      <input
                        type="checkbox"
                        checked={progress.selfChecks[current.id] ?? false}
                        disabled={blocked}
                        onChange={(event) =>
                          persist({
                            ...progress,
                            selfChecks: {
                              ...progress.selfChecks,
                              [current.id]: event.target.checked,
                            },
                          })
                        }
                      />
                      <span>
                        <strong>Sprawdziłem swój fragment</strong>
                        <span>{activity.check.prompt}</span>
                      </span>
                    </label>
                    <p>
                      To Twoja samodzielna kontrola. Strona nie sprawdza poprawności tego fragmentu
                      ani nie przyznaje punktów.
                    </p>
                  </div>
                </>
              )}
              {!written && (
                <p className="fine-print">
                  Napisz własny fragment, aby otworzyć porównanie i samodzielnie go sprawdzić.
                </p>
              )}
            </>
          )}
          <div className="study-activity-actions">
            <button
              className="button secondary small"
              disabled={currentIndex === 0 || blocked}
              onClick={() => visit(sequence[currentIndex - 1]!.id)}
            >
              <ArrowLeft size={16} />
              Poprzedni krok
            </button>
            {phase !== 'explain' && (
              <button
                className="button primary"
                disabled={
                  blocked ||
                  (!completed && (!written || !progress.selfChecks[current.id])) ||
                  (finished && currentIndex === sequence.length - 1)
                }
                onClick={() => persist(completeStudyActivity(progress, sequence))}
              >
                {completed
                  ? 'Następny krok'
                  : currentIndex === sequence.length - 1
                    ? 'Zakończ naukę krok po kroku'
                    : 'Zapisz i przejdź dalej'}
                <ChevronRight size={17} />
              </button>
            )}
          </div>
          {finished && (
            <div className="study-checkpoint">
              <CheckCircle2 size={22} />
              <div>
                <strong>Przeszedłeś wszystkie małe kroki</strong>
                <p>
                  Możesz wracać do dowolnego etapu. Teraz połącz fragmenty we własnym projekcie i
                  sprawdź go z oryginalnym arkuszem. Ukończenie nauki nie jest oceną egzaminacyjną.
                </p>
              </div>
            </div>
          )}
          <LegacyStudyNotebook attemptId={attemptId} step={step} />
        </article>
      </div>
    </>
  );
}
