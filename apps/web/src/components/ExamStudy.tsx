import { useState, useSyncExternalStore, type ReactNode } from 'react';
import { ArrowUpRight, BookOpen, Download } from 'lucide-react';
import Markdown from 'react-markdown';
import type { ExamStudyGuide } from '@zdaj/shared';
import type { ProjectStore } from '../project-store';
import { Editor } from './Editor';
import { LegacyStudyNotebook } from './StudySequence';
import { ProjectLesson, type RevealCode } from './ProjectLesson';
import { ArchivedNotes } from './ArchivedNotes';
import { Notice } from './common';
import '../study.css';
import '../cumulative.css';
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
          {guide.steps.some((step) => step.code.trim()) && (
            <h2>Pełne fragmenty i wcześniejsze notatki</h2>
          )}
          {guide.steps
            .filter((step) => step.code.trim())
            .map((step) => (
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
  store,
  onOpenFile,
  onRevealCode,
  onOpenSheet,
  editor,
  preview,
}: {
  store: ProjectStore;
  onOpenFile: (path: string) => void;
  onRevealCode: RevealCode;
  onOpenSheet: (page: number) => void;
  editor: ReactNode;
  preview: ReactNode;
}) {
  const { project } = useSyncExternalStore(store.subscribe, store.get);
  if (project.mode === 'egzamin' && !project.submittedAt)
    return <Notice>Nauka jest dostępna po zakończeniu egzaminu.</Notice>;
  const guide = project.study?.guide;
  const reference = (
    <div className="course-materials">
      {guide && (
        <details>
          <summary>Oryginalne pliki i przygotowanie stanowiska</summary>
          <StudyResources
            resources={guide.resources.filter((item) => item.kind === 'starter-archive')}
          />
          <ul>
            {guide.prerequisites.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </details>
      )}
      <ArchivedNotes projectId={project.legacyProjectId ?? project.id} />
      {guide && <StudyReference guide={guide} attemptId={project.legacyProjectId ?? project.id} />}
    </div>
  );
  return (
    <ProjectLesson
      store={store}
      onOpenFile={onOpenFile}
      onRevealCode={onRevealCode}
      onOpenSheet={onOpenSheet}
      editor={editor}
      preview={preview}
      reference={reference}
    />
  );
}
