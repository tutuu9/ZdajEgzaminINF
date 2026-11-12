import { useEffect, useId, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FileText,
  Loader2,
  Play,
  Plus,
} from 'lucide-react';
import Markdown from 'react-markdown';
import type {
  AttemptSnapshot,
  StudyCheckResponse,
  StudyCheckResult,
  StudyCheckSpec,
} from '@zdaj/shared';
import { api, ApiError, errorMessage } from '../api';
import type { CodeDiagnostic } from '../code-diagnostic';
import { diagnoseCourseChecks } from '../course-diagnostics';
import { diagnoseFirmaChecks } from '../firma-diagnostics';
import { checkProjectLocally, filesHash } from '../project-checks';
import type { ProjectStore } from '../project-store';
import { ErrorNotice, Loading, Notice } from './common';
import { Editor } from './Editor';
import { useChangeUnderstand } from '../change-understand/use-change-understand';
import type { InspectionSource } from '../inspector/types';
import { ChangeUnderstand, ChangeDiff, ChangeRestoreNotice } from './ChangeUnderstand';
import { ChangePreview } from './ChangePreview';
import { EmmetLearning } from './EmmetLearning';

export type RevealCode = (
  path: string,
  range: CodeDiagnostic['range'],
  isCurrent: () => boolean,
  scrollIntoView?: boolean,
) => void;

interface CheckedStep {
  activityId: string;
  files: AttemptSnapshot['files'];
  hash: string;
  results: StudyCheckResult[];
  diagnostics: (CodeDiagnostic | undefined)[];
}

export function ProjectLesson({
  store,
  editor,
  preview,
  onOpenFile,
  onRevealCode,
  onOpenSheet,
  onCompareStart,
  reference,
}: {
  store: ProjectStore;
  editor: ReactNode;
  preview: ReactNode;
  reference: ReactNode;
  onOpenFile: (path: string) => void;
  onRevealCode: RevealCode;
  onOpenSheet: (page: number) => void;
  onCompareStart: () => void;
}) {
  const { project, saving, error: saveError } = useSyncExternalStore(store.subscribe, store.get);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [manual, setManual] = useState(false),
    [checked, setChecked] = useState<CheckedStep>(),
    [hash, setHash] = useState('');
  const panel = project.workspace?.studyPanel ?? 'lesson';
  const [section, setSection] = useState<'step' | 'help' | 'experiment'>('step');
  const sectionId = useId();
  const sidebarBody = useRef<HTMLDivElement>(null);
  const feedback = useRef<HTMLDivElement>(null);
  const [phone, setPhone] = useState(() => window.matchMedia('(max-width: 900px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)');
    const update = () => setPhone(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const setPanel = (studyPanel: 'lesson' | 'code' | 'preview') => {
    void store
      .patch((latest) =>
        latest.workspace?.studyPanel === studyPanel
          ? latest
          : {
              ...latest,
              workspace: {
                view: 'study',
                activeFile: latest.files?.[0]?.path ?? '',
                previewEntry: '',
                editors: {},
                ...latest.workspace,
                studyPanel,
              },
            },
      )
      .catch((cause) => setError(errorMessage(cause)));
  };
  const mounted = useRef(true);
  const previewRegion = useRef<HTMLElement>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    void store.loadGuide().catch((cause) => setError(errorMessage(cause)));
  }, [store]);
  useEffect(() => {
    let active = true;
    setChecked((previous) =>
      previous?.files && previous.files !== project.files
        ? { ...previous, files: undefined, diagnostics: [] }
        : previous,
    );
    void filesHash(project.files ?? []).then((value) => {
      if (active) setHash(value);
    });
    return () => {
      active = false;
    };
  }, [project.files]);
  const guide = project.study?.guide;
  const positions =
    guide?.steps.flatMap((step) =>
      (step.activities ?? []).map((activity) => ({
        id: `${step.id}/${activity.id}`,
        step,
        activity,
      })),
    ) ?? [];
  const current = positions.find((item) => item.id === project.study?.current) ?? positions[0];
  const learning = useChangeUnderstand(store, project, current);
  useEffect(() => {
    sidebarBody.current?.scrollTo(0, 0);
  }, [section, current?.id]);
  useEffect(() => {
    setChecked(undefined);
    setManual(false);
    setError('');
    setSection('step');
  }, [current?.id]);
  if (!guide || !current || !project.study)
    return error ? (
      <ErrorNotice
        message={error}
        onRetry={() => {
          setError('');
          void store.loadGuide().catch((cause) => setError(errorMessage(cause)));
        }}
      />
    ) : (
      <Loading label="Otwieranie Twojego kursu…" />
    );
  const activity = current.activity,
    progress = project.study;
  const index = positions.indexOf(current),
    checkpoint = progress.completed[current.id];
  const coachEnabled = !!guide.project && project.mode === 'nauka' && !project.submittedAt;
  const sections = [
    { key: 'step', label: 'Krok' },
    { key: 'help', label: 'Pomoc' },
    ...(learning.lesson ? [{ key: 'experiment', label: 'Eksperyment' } as const] : []),
  ] as const;
  const activeSection = sections.some((item) => item.key === section) ? section : 'step';
  const currentReport = checked?.activityId === current.id ? checked : undefined;
  const results = currentReport?.results ?? [];
  const fresh =
    !!currentReport &&
    currentReport.hash === hash &&
    (!coachEnabled || currentReport.files === project.files);
  const manualNeeded = results.some((item) =>
    ['manual', 'unsupported', 'error'].includes(item.status),
  );
  const canComplete =
    fresh &&
    results.length > 0 &&
    !results.some((item) => item.status === 'failed') &&
    (!manualNeeded || manual);
  const completedFresh = checkpoint?.filesHash === hash;
  const navigationBlocked = busy || saving || !!saveError;
  const blocked = busy || !!saveError || !!project.submittedAt;
  const revealChange = (source: InspectionSource) => {
    const sourceFiles = project.files;
    const valid = () => {
      const latest = store.get();
      return (
        mounted.current &&
        !latest.error &&
        !latest.project.submittedAt &&
        latest.project.mode === 'nauka' &&
        latest.project.id === project.id &&
        latest.project.study?.current === current.id &&
        latest.project.files === sourceFiles
      );
    };
    if (!valid()) return;
    setPanel('code');
    onRevealCode(source.path, source.range, valid, true);
  };
  const reveal = (diagnostic: CodeDiagnostic) => {
    const isCurrent = () => {
      const { project: latest, error: storageError } = store.get();
      return (
        mounted.current &&
        !latest.submittedAt &&
        latest.mode === 'nauka' &&
        latest.id === project.id &&
        latest.study?.current === current.id &&
        latest.files === currentReport?.files &&
        !storageError
      );
    };
    if (!fresh || !isCurrent()) return;
    setPanel('code');
    onRevealCode(diagnostic.path, diagnostic.range, isCurrent);
  };
  const navigate = async (target: typeof current) => {
    try {
      await store.patch((latest) => ({
        ...latest,
        study: { ...latest.study!, current: target.id },
        workspace: {
          view: 'study',
          activeFile: latest.files?.[0]?.path ?? '',
          previewEntry: '',
          editors: {},
          ...latest.workspace,
          studyPanel: 'lesson',
        },
      }));
      const path = target.activity.targetFiles?.[0] ?? target.step.fileName;
      onOpenFile(path);
    } catch (cause) {
      setError(errorMessage(cause));
    }
  };
  const check = async () => {
    setBusy(true);
    setError('');
    setManual(false);
    const source = store.get().project,
      activityId = current.id;
    try {
      const sourceHash = await filesHash(source.files ?? []);
      await store.flush();
      const checks: StudyCheckSpec[] = activity.checks ?? [
        {
          id: 'manual',
          title: 'Sprawdzenie własne',
          kind: 'manual',
          prompt: activity.check.prompt,
        },
      ];
      let report = await checkProjectLocally(source.files ?? [], checks);
      if (checks.some((item) => item.kind === 'runtime')) {
        try {
          const job = await store.request((latest) =>
            api<{ id: string; token: string }>(`/attempts/${latest.ticket.id}/study/checks`, {
              method: 'POST',
              body: {
                token: latest.ticket.token,
                guideVersion: guide.version,
                activityId,
                projectRevision: source.revision ?? 0,
                files: source.files ?? [],
              },
            }),
          );
          const deadline = Date.now() + 150_000;
          let received = false;
          while (mounted.current && Date.now() < deadline) {
            const response = await api<StudyCheckResponse>(`/study/checks/${job.id}`, {
              headers: { 'X-Check-Token': job.token },
            });
            if (response.report) {
              if (
                response.report.activityId !== activityId ||
                response.report.projectRevision !== (source.revision ?? 0) ||
                response.report.inputHash !== sourceHash
              )
                throw new Error('Raport nie pasuje do wysłanej wersji plików.');
              const runtimeResults = response.report.results;
              report = report.map((item, i) =>
                checks[i]?.kind === 'runtime'
                  ? (runtimeResults.find((result) => result.id === item.id) ?? item)
                  : item,
              );
              await api(`/study/checks/${job.id}/ack`, {
                method: 'POST',
                body: { token: job.token },
              }).catch(() => undefined);
              received = true;
              break;
            }
            if (response.status === 'failed')
              throw new Error(response.error || 'Wykonawca nie ukończył sprawdzania.');
            await new Promise((resolve) => setTimeout(resolve, 1200));
          }
          if (mounted.current && !received)
            throw new Error(
              'Minął czas oczekiwania na raport. Możesz ponowić sprawdzenie lub wykonać kontrolę ręczną.',
            );
        } catch (cause) {
          if (cause instanceof ApiError && [401, 403].includes(cause.status)) throw cause;
          report = report.map((item) =>
            item.status === 'unsupported'
              ? {
                  ...item,
                  status: 'manual',
                  evidence: `Sprawdzenie wykonawcy jest niedostępne: ${errorMessage(cause)}`,
                  recommendation: activity.check.prompt,
                }
              : item,
          );
        }
      }
      if (!mounted.current) return;
      const latest = store.get().project;
      if (latest.study?.current !== activityId || latest.files !== source.files) {
        setError(
          'Kod zmienił się podczas sprawdzania. Sprawdź aktualną wersję; żaden plik nie został cofnięty.',
        );
        return;
      }
      let diagnostics: CheckedStep['diagnostics'] = [];
      if (coachEnabled) {
        diagnostics =
          project.taskId === 'inf03-01-24-01-sg' && guide.version === 1
            ? diagnoseFirmaChecks(source.files ?? [], checks, report, activityId)
            : diagnoseCourseChecks(
                source.files ?? [],
                checks,
                report,
                activity.targetFiles ?? [current.step.fileName],
                positions.slice(0, index).flatMap(({ activity: prior }) => prior.checks ?? []),
              );
      }
      setChecked({
        activityId,
        files: coachEnabled ? source.files : undefined,
        hash: sourceHash,
        results: report,
        diagnostics,
      });
      requestAnimationFrame(() => {
        // Reveal the report inside the lesson, without moving the editor or page.
        const body = sidebarBody.current;
        const report = feedback.current;
        if (body && report && store.get().project.study?.current === activityId) {
          body.scrollTop += report.getBoundingClientRect().top - body.getBoundingClientRect().top;
        }
      });
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const complete = async () => {
    if (!canComplete && !completedFresh) return;
    setBusy(true);
    try {
      // A cursor save may still be pending when the learner clicks Next.
      await store.flush();
      const checkedProject = store.get().project;
      const currentHash = await filesHash(checkedProject.files ?? []);
      if (currentHash !== hash) throw new Error('Kod zmienił się. Sprawdź ponownie.');
      await store.patch((latest) => {
        if (latest.files !== checkedProject.files || latest.study?.current !== current.id)
          throw new Error('Kod lub krok zmienił się podczas zapisu. Sprawdź ponownie.');
        return {
          ...latest,
          study: {
            ...latest.study!,
            completed: {
              ...latest.study!.completed,
              [current.id]: {
                status: results.length
                  ? manualNeeded
                    ? 'manual'
                    : 'passed'
                  : (checkpoint?.status ?? 'manual'),
                filesHash: currentHash,
                revision: latest.revision ?? 0,
                checkedAt: new Date().toISOString(),
                evidence:
                  results.map((item) => item.evidence).join('\n') || checkpoint?.evidence || '',
              },
            },
          },
        };
      });
      if (positions[index + 1]) await navigate(positions[index + 1]!);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <div className="cumulative-course">
      <div className="course-overview">
        <div className="course-heading">
          <div>
            <h2>Nauka krok po kroku</h2>
            <span className="course-kicker">
              Krok {index + 1} z {positions.length}
            </span>
          </div>
          <label className="course-progress">
            <span>{Object.keys(progress.completed).length} ukończonych</span>
            <progress value={Object.keys(progress.completed).length} max={positions.length} />
          </label>
        </div>
        <div className="course-mobile-tabs" role="tablist" aria-label="Panele nauki">
          {(
            [
              ['lesson', 'Lekcja'],
              ['code', 'Kod'],
              ['preview', 'Podgląd'],
            ] as const
          ).map(([key, label]) => (
            <button
              role="tab"
              key={key}
              data-panel={key}
              aria-selected={(phone ? panel : panel === 'preview' ? 'preview' : 'code') === key}
              onClick={() => setPanel(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {!project.files?.length && (
        <Notice>
          <p>
            Ten projekt nie ma jeszcze plików. Dodaj minimalny szkielet jeden raz, a potem rozwijaj
            go krok po kroku. Wcześniejsze notatniki pozostają w archiwum.
          </p>
          <button
            className="button primary small"
            disabled={blocked}
            onClick={() =>
              void store
                .patch((latest) =>
                  latest.files?.length
                    ? latest
                    : { ...latest, files: structuredClone(guide.project?.starterFiles ?? []) },
                )
                .then(() => onOpenFile(guide.project?.starterFiles[0]?.path ?? ''))
                .catch((cause) => setError(errorMessage(cause)))
            }
          >
            <Plus size={16} />
            Dodaj szkielet projektu
          </button>
        </Notice>
      )}
      <ChangeRestoreNotice model={learning} taskId={project.taskId} />
      <div className={`cumulative-grid show-${panel}`}>
        <aside className="course-instruction">
          <div className="course-sidebar-heading">
            <label className="course-step-select">
              <span className="visually-hidden">Twój krok</span>
              <select
                value={current.id}
                disabled={navigationBlocked}
                onChange={(event) => {
                  const target = positions.find((item) => item.id === event.target.value);
                  if (target) void navigate(target);
                }}
              >
                {positions.map((item, at) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={
                      !project.submittedAt &&
                      at > 0 &&
                      !positions.slice(0, at).every((previous) => progress.completed[previous.id])
                    }
                  >
                    {at + 1}. {item.activity.title}
                  </option>
                ))}
              </select>
            </label>
            <div className="course-location">
              <span>{current.step.title.replace(/^\d+[.)]\s*/, '')}</span>
              <button className="text-button" onClick={() => onOpenSheet(current.step.page ?? 1)}>
                <FileText size={15} />
                PDF · {current.step.page ?? 1}
              </button>
            </div>
            <div className="course-section-tabs" role="tablist" aria-label="Materiały do kroku">
              {sections.map(({ key, label }, at) => (
                <button
                  key={key}
                  id={`${sectionId}-${key}-tab`}
                  role="tab"
                  aria-selected={activeSection === key}
                  aria-controls={`${sectionId}-${key}-panel`}
                  tabIndex={activeSection === key ? 0 : -1}
                  onClick={() => setSection(key)}
                  onKeyDown={(event) => {
                    const next =
                      event.key === 'ArrowRight'
                        ? (at + 1) % sections.length
                        : event.key === 'ArrowLeft'
                          ? (at + sections.length - 1) % sections.length
                          : event.key === 'Home'
                            ? 0
                            : event.key === 'End'
                              ? sections.length - 1
                              : undefined;
                    if (next === undefined) return;
                    event.preventDefault();
                    setSection(sections[next]!.key);
                    document.getElementById(`${sectionId}-${sections[next]!.key}-tab`)?.focus();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="course-sidebar-body" ref={sidebarBody}>
            <div
              role="tabpanel"
              id={`${sectionId}-step-panel`}
              aria-labelledby={`${sectionId}-step-tab`}
              hidden={activeSection !== 'step'}
            >
              <h3>{activity.title}</h3>
              <div className="prose">
                <Markdown>{activity.explanation}</Markdown>
              </div>
              <div className="course-task">
                <strong>Teraz zmień tylko to</strong>
                <Markdown>{activity.instruction}</Markdown>
                {activity.placement && <p>{activity.placement}</p>}
              </div>
              <div className="course-targets">
                {(activity.targetFiles ?? [current.step.fileName]).map((path) => (
                  <button
                    key={path}
                    onClick={() => {
                      onOpenFile(path);
                      setPanel('code');
                    }}
                  >
                    {path}
                  </button>
                ))}
              </div>
              <ErrorNotice message={error} />
              {checkpoint && !completedFresh && (
                <p className="course-stale">
                  Ten krok był ukończony. Pliki zmieniły się od tego czasu — przed ponownym
                  potwierdzeniem sprawdź aktualny kod.
                </p>
              )}
              {results.length > 0 && (
                <div className="course-check-results" aria-live="polite" ref={feedback}>
                  {results.map((item, ordinal) => {
                    const diagnostic =
                      coachEnabled && fresh ? currentReport?.diagnostics[ordinal] : undefined;
                    const explanationId = `study-feedback-${current.id}-${ordinal}`;
                    return (
                      <div className={`course-check ${item.status}`} key={`${ordinal}:${item.id}`}>
                        <strong>
                          {item.status === 'passed' ? '✓ ' : ''}
                          {diagnostic && item.status === 'failed'
                            ? `Do poprawy w pliku ${diagnostic.path}`
                            : item.title}
                        </strong>
                        {(!diagnostic ||
                          item.status !== 'failed' ||
                          activity.checks?.[ordinal]?.kind === 'runtime') && (
                          <>
                            <p>{item.evidence}</p>
                            {item.recommendation && <p>{item.recommendation}</p>}
                          </>
                        )}
                        {diagnostic && (
                          <div className={diagnostic.warning ? 'course-file-warning' : undefined}>
                            {diagnostic.warning && (
                              <strong>
                                {diagnostic.warning === 'missing-file'
                                  ? 'Brakuje pliku w projekcie'
                                  : 'Sprawdź cel odnośnika w menu'}
                              </strong>
                            )}
                            <p id={explanationId}>{diagnostic.explanation}</p>
                            <button
                              type="button"
                              className="button secondary small course-reveal"
                              aria-describedby={explanationId}
                              disabled={blocked}
                              onClick={() => reveal(diagnostic)}
                            >
                              {diagnostic.range ? 'Pokaż w kodzie' : 'Otwórz plik'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!fresh && <p>Kod zmienił się — sprawdź ponownie.</p>}
                  {manualNeeded && fresh && (
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={manual}
                        onChange={(event) => setManual(event.target.checked)}
                      />
                      <span>Potwierdzam kontrolę ręczną: {activity.check.prompt}</span>
                    </label>
                  )}
                </div>
              )}
            </div>
            <div
              role="tabpanel"
              id={`${sectionId}-help-panel`}
              aria-labelledby={`${sectionId}-help-tab`}
              hidden={activeSection !== 'help'}
            >
              <h3>Pomoc do tego kroku</h3>
              <p className="course-section-intro">
                Zajrzyj do przykładu lub skrótów, potem wróć do własnego kodu.
              </p>
              {coachEnabled && (
                <EmmetLearning
                  key={`${project.id}:${guide.version}:${current.id}`}
                  guide={guide}
                  step={current.step}
                  activity={activity}
                />
              )}
              <details
                className="course-example"
                onToggle={(event) => {
                  if (event.currentTarget.open && !progress.viewedExamples.includes(current.id))
                    void store
                      .patch((latest) => ({
                        ...latest,
                        study: {
                          ...latest.study!,
                          viewedExamples: [
                            ...new Set([...latest.study!.viewedExamples, current.id]),
                          ],
                        },
                      }))
                      .catch((cause) => setError(errorMessage(cause)));
                }}
              >
                <summary>
                  <BookOpen size={16} />
                  Wyjaśnienie i mały przykład
                </summary>
                <Editor
                  value={activity.exampleCode}
                  path={activity.targetFiles?.[0] ?? current.step.fileName}
                  readOnly
                  minHeight={110}
                  onChange={() => undefined}
                  label="Przykład do porównania"
                />
                <ul>
                  {activity.why.map((why) => (
                    <li key={why}>{why}</li>
                  ))}
                </ul>
                <p>Przykład nie zastępuje Twojego kodu.</p>
              </details>
            </div>
            {learning.lesson && (
              <div
                role="tabpanel"
                id={`${sectionId}-experiment-panel`}
                aria-labelledby={`${sectionId}-experiment-tab`}
                hidden={activeSection !== 'experiment'}
              >
                <ChangeUnderstand
                  model={learning}
                  project={project}
                  blocked={blocked}
                  saving={saving}
                  saveError={saveError}
                  onReveal={revealChange}
                  onCompare={() => {
                    onCompareStart();
                    learning.setComparisonOpen(true);
                    setPanel('preview');
                  }}
                />
              </div>
            )}
          </div>
          {activeSection === 'step' && (
            <div className="course-check-action">
              {' '}
              <button
                className="button primary full"
                disabled={blocked}
                onClick={() => void check()}
              >
                {busy ? <Loader2 className="spin" size={17} /> : <Play size={17} />}
                {busy
                  ? 'Sprawdzanie…'
                  : coachEnabled && currentReport
                    ? 'Sprawdź ponownie'
                    : 'Sprawdź ten krok'}
              </button>
            </div>
          )}
          {activeSection !== 'step' && (
            <button
              className="button secondary course-back-to-step"
              onClick={() => {
                setSection('step');
                document.getElementById(`${sectionId}-step-tab`)?.focus();
              }}
            >
              <ArrowLeft size={15} /> Wróć do kroku
            </button>
          )}
          <div className="course-next glass-panel" hidden={activeSection !== 'step'}>
            <button
              className="icon-button"
              aria-label="Poprzedni krok"
              disabled={index === 0 || navigationBlocked}
              onClick={() => void navigate(positions[index - 1]!)}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              className="button primary"
              disabled={
                project.submittedAt
                  ? navigationBlocked || !positions[index + 1]
                  : blocked || (!canComplete && !completedFresh)
              }
              onClick={() =>
                project.submittedAt ? void navigate(positions[index + 1]!) : void complete()
              }
            >
              {project.submittedAt
                ? 'Następny krok'
                : index === positions.length - 1
                  ? 'Potwierdź ukończenie'
                  : 'Zapisz i przejdź dalej'}
              <ArrowRight size={17} />
            </button>
          </div>
          {Object.keys(progress.completed).length === positions.length && (
            <Notice>
              <CheckCircle2 />
              Przeszedłeś cały kurs. Pobierz pliki i porównaj komplet pracy z oryginalnym PDF.
              Potwierdzenia kroków nie są oceną CKE.
            </Notice>
          )}
        </aside>
        <section className="course-editor">
          <ChangeDiff model={learning} onReveal={revealChange} />
          {editor}
        </section>
        <section className="course-preview" ref={previewRegion}>
          {learning.lesson && learning.checkpoint && learning.comparisonOpen ? (
            <ChangePreview
              key={learning.checkpoint.id}
              before={learning.checkpoint.files}
              after={project.files ?? []}
              preferredEntry={
                learning.lesson.entry ??
                project.workspace?.previewEntry ??
                learning.checkpoint.previewEntry
              }
              onClose={() => {
                learning.setComparisonOpen(false);
                requestAnimationFrame(() =>
                  previewRegion.current?.querySelector<HTMLElement>('select, button')?.focus(),
                );
              }}
            />
          ) : (
            preview
          )}
        </section>
      </div>
      {reference}
    </div>
  );
}
