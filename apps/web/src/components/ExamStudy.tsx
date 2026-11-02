import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, BookOpen, Download, Lightbulb } from 'lucide-react';
import Markdown from 'react-markdown';
import type { AttemptSnapshot, ExamStudyGuide } from '@zdaj/shared';
import { api, errorMessage } from '../api';
import { Editor } from './Editor';
import { LegacyStudyNotebook, StudySequence } from './StudySequence';
import { ErrorNotice, Loading, Notice } from './common';
import '../study.css';

type GuideResponse = { guide: ExamStudyGuide; hintCount: number };
const guides = new Map<string, Promise<GuideResponse>>();
function loadGuide(attempt: AttemptSnapshot) {
  const cached = guides.get(attempt.id);
  if (cached) return cached;
  const pending = api<GuideResponse>(`/attempts/${encodeURIComponent(attempt.id)}/study`, {
    method: 'POST',
    body: { token: attempt.ticket.token },
  }).catch((error) => {
    guides.delete(attempt.id);
    throw error;
  });
  if (guides.size >= 20) guides.delete(guides.keys().next().value!);
  guides.set(attempt.id, pending);
  return pending;
}

const resourceNames: Record<string, string> = {
  'starter-archive': 'Pliki wejściowe',
  'solution-archive': 'Pliki rozwiązania',
  walkthrough: 'Omówienie',
  criteria: 'Kryteria',
};
function StudyResources({ resources }: { resources: ExamStudyGuide['resources'] }) {
  return (
    <div className="study-resource-list">
      {resources.map((resource) => (
        <article key={resource.id}>
          <div>
            <span className="pill subtle">{resourceNames[resource.kind] ?? resource.kind}</span>
            <h3>{resource.title}</h3>
            <p>{resource.description}</p>
            <small>
              {resource.publisher} ·{' '}
              {resource.provenance === 'cke' ? 'źródło CKE' : 'materiał zewnętrzny'} · sprawdzono{' '}
              {new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' }).format(
                new Date(resource.checkedAt),
              )}
            </small>
          </div>
          <a
            className="button secondary small"
            href={resource.url}
            target="_blank"
            rel="noreferrer"
          >
            {resource.kind.endsWith('archive') ? (
              <Download size={16} />
            ) : (
              <ArrowUpRight size={16} />
            )}
            Otwórz materiał
          </a>
        </article>
      ))}
    </div>
  );
}

function StudyReference({ guide, attemptId }: { guide: ExamStudyGuide; attemptId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="study-reference"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <BookOpen size={19} />
        <span>
          Materiały do porównania i gotowe warianty
          <small>
            Otwórz osobno, gdy chcesz zajrzeć do pełnego omówienia lub plików rozwiązania.
          </small>
        </span>
      </summary>
      {open && (
        <>
          <p className="study-provenance">
            To dodatkowe materiały edukacyjne. Nie są oficjalnym rozwiązaniem CKE ani oceną Twojej
            pracy. Możesz zajrzeć tutaj bez kończenia całej ścieżki.
          </p>
          <h2>Pełne fragmenty i wcześniejsze notatki</h2>
          {guide.steps.map((step) => (
            <details className="study-reference-step" key={step.id}>
              <summary>
                {step.title.replace(/^\d+[.)]\s*/, '')} · {step.fileName}
              </summary>
              <div className="prose">
                <Markdown>{step.explanation}</Markdown>
              </div>
              <Editor
                path={step.fileName}
                value={step.code}
                readOnly
                minHeight={150}
                onChange={() => undefined}
                label={`Pełny fragment: ${step.title}`}
              />
              <div className="study-explanation-columns">
                <div>
                  <h4>Dlaczego to działa</h4>
                  <ul>
                    {step.why.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Częste błędy</h4>
                  <ul>
                    {step.commonMistakes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="fine-print">Sprawdź samodzielnie: {step.checkpoint}</p>
              <LegacyStudyNotebook attemptId={attemptId} step={step} />
            </details>
          ))}
          <section className="study-resources">
            <h2>Materiały źródłowe i omówienia</h2>
            <p>
              Linki otwierają materiały u wydawcy. Pobranie archiwum nie wczytuje go do projektu i
              nie zmienia Twoich plików.
            </p>
            <StudyResources
              resources={guide.resources.filter((resource) => resource.kind !== 'starter-archive')}
            />
          </section>
          {guide.variants.length > 0 && (
            <section className="study-variants">
              <h2>Warianty rozwiązania</h2>
              <p>
                Zewnętrzne propozycje do porównania po własnej próbie. Nie są oficjalnymi
                rozwiązaniami CKE.
              </p>
              <Notice>
                Sprawdzone archiwa rozwiązań nie zawierają oryginalnych plików SQL do importu ani
                Twoich wymaganych zrzutów ekranu. Pobierz osobno pliki wejściowe, zaimportuj bazę i
                przygotuj własne potwierdzenia wykonania pracy.
              </Notice>
              {guide.variants.map((variant) => (
                <article key={variant.id}>
                  <div>
                    <h3>{variant.title}</h3>
                    <p>{variant.description}</p>
                    <p className="study-variant-approach">{variant.approach}</p>
                  </div>
                  <div className="button-row">
                    <a
                      className="button secondary small"
                      href={variant.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ArrowUpRight size={16} />
                      Zobacz omówienie
                    </a>
                    {variant.downloadUrl && (
                      <a
                        className="button secondary small"
                        href={variant.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Download size={16} />
                        Pobierz pliki rozwiązania
                      </a>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </details>
  );
}

export function ExamStudy({
  attempt,
  onSelectStep,
  onOpenSheet,
  onUsage,
}: {
  attempt: AttemptSnapshot;
  selectedStep: string;
  onSelectStep: (id: string) => void;
  onOpenSheet: (page: number) => void;
  onUsage: (count: number) => void;
}) {
  const [guide, setGuide] = useState<ExamStudyGuide | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);
  const usage = useRef(onUsage);
  usage.current = onUsage;
  const allowed = attempt.mode !== 'egzamin' || !!attempt.submittedAt;
  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    void loadGuide(attempt)
      .then((result) => {
        if (!cancelled) {
          setGuide(result.guide);
          usage.current(result.hintCount);
        }
      })
      .catch((cause) => {
        if (!cancelled) setError(errorMessage(cause));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt.id, allowed, retry]);
  if (!allowed)
    return (
      <Notice>Omówienie i rozwiązania są dostępne po zakończeniu próby egzaminacyjnej.</Notice>
    );
  if (loading) return <Loading label="Otwieranie nauki z arkuszem…" />;
  if (!guide)
    return (
      <ErrorNotice
        message={error || 'Omówienie tego arkusza jest chwilowo niedostępne.'}
        onRetry={() => setRetry((value) => value + 1)}
      />
    );
  const inputs = guide.resources.filter((resource) => resource.kind === 'starter-archive');
  return (
    <section className="exam-study">
      <header className="study-intro">
        <span className="pill">
          <BookOpen size={15} />
          Nauka na podstawie arkusza
        </span>
        <h2>{guide.title}</h2>
        <div className="prose">
          <Markdown>{guide.introduction}</Markdown>
        </div>
        <p className="study-provenance">
          Omówienie edukacyjne, nie oficjalne rozwiązanie CKE. Oryginalne wymagania zawsze sprawdzaj
          w PDF.
        </p>
        {!attempt.submittedAt && (
          <p className="fine-print">
            Otwarcie omówienia jest odnotowane jako skorzystanie z pomocy w tej próbie. Użyta pomoc:{' '}
            {attempt.hintCount}.
          </p>
        )}
      </header>
      {guide.prerequisites.length > 0 && (
        <details className="study-prerequisites">
          <summary>
            <Lightbulb size={17} />
            Przygotuj się do pracy
          </summary>
          <ul>
            {guide.prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}
      {inputs.length > 0 && (
        <details className="study-inputs">
          <summary>
            <Download size={17} />
            Pliki wejściowe do arkusza — pobierz przed pracą
          </summary>
          <StudyResources resources={inputs} />
        </details>
      )}
      <StudySequence
        key={`${attempt.id}:${guide.id}:${guide.version}`}
        guide={guide}
        attemptId={attempt.id}
        onSelectStep={onSelectStep}
        onOpenSheet={onOpenSheet}
      />
      <StudyReference key={`${attempt.id}:${guide.version}`} guide={guide} attemptId={attempt.id} />
    </section>
  );
}
