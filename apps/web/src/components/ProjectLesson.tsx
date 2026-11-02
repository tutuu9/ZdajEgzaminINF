import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
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
import type { StudyCheckResponse, StudyCheckResult } from '@zdaj/shared';
import { api, ApiError, errorMessage } from '../api';
import { checkProjectLocally, filesHash } from '../project-checks';
import type { ProjectStore } from '../project-store';
import { ErrorNotice, Loading, Notice } from './common';
import { Editor } from './Editor';

export function ProjectLesson({
  store,
  editor,
  preview,
  onOpenFile,
  onOpenSheet,
  reference,
}: {
  store: ProjectStore;
  editor: ReactNode;
  preview: ReactNode;
  reference: ReactNode;
  onOpenFile: (path: string) => void;
  onOpenSheet: (page: number) => void;
}) {
  const { project, saving, error: saveError } = useSyncExternalStore(store.subscribe, store.get);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [manual, setManual] = useState(false),
    [results, setResults] = useState<StudyCheckResult[]>([]),
    [checkedHash, setCheckedHash] = useState(''),
    [hash, setHash] = useState('');
  const panel = project.workspace?.studyPanel ?? 'lesson';
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
  useEffect(() => {
    setResults([]);
    setManual(false);
    setCheckedHash('');
    setError('');
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
  const fresh = checkedHash === hash && !!hash;
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
  const blocked = navigationBlocked || !!project.submittedAt;
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
      sourceHash = await filesHash(source.files ?? []),
      activityId = current.id;
    try {
      await store.flush();
      let report = await checkProjectLocally(
        source.files ?? [],
        activity.checks ?? [
          {
            id: 'manual',
            title: 'Sprawdzenie własne',
            kind: 'manual',
            prompt: activity.check.prompt,
          },
        ],
      );
      if (activity.checks?.some((item) => item.kind === 'runtime')) {
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
              report = [
                ...report.filter(
                  (item) =>
                    !activity.checks?.some(
                      (check) => check.kind === 'runtime' && check.id === item.id,
                    ),
                ),
                ...response.report.results,
              ];
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
      if (
        store.get().project.study?.current !== activityId ||
        (await filesHash(store.get().project.files ?? [])) !== sourceHash
      ) {
        setError(
          'Kod zmienił się podczas sprawdzania. Sprawdź aktualną wersję; żaden plik nie został cofnięty.',
        );
        return;
      }
      setResults(report);
      setCheckedHash(sourceHash);
    } catch (cause) {
      if (mounted.current) setError(errorMessage(cause));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const complete = async () => {
    if (!canComplete && !completedFresh) return;
    try {
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
    }
  };
  return (
    <div className="cumulative-course">
      <div className="course-heading">
        <div>
          <span className="course-kicker">Twój projekt rośnie z każdym krokiem</span>
          <h2>{guide.title}</h2>
        </div>
        <span>
          {Object.keys(progress.completed).length} / {positions.length} kroków
        </span>
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
      <div className="course-mobile-tabs" role="tablist" aria-label="Panele nauki">
        {(
          [
            ['lesson', 'Lekcja'],
            ['code', 'Kod'],
            ['preview', 'Podgląd'],
          ] as const
        ).map(([key, label]) => (
          <button role="tab" key={key} aria-selected={panel === key} onClick={() => setPanel(key)}>
            {label}
          </button>
        ))}
      </div>
      <div className={`cumulative-grid show-${panel}`}>
        <aside className="course-instruction">
          <label className="course-step-select">
            Twój krok
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
          <button className="button primary full" disabled={blocked} onClick={() => void check()}>
            {busy ? <Loader2 className="spin" size={17} /> : <Play size={17} />}
            {busy ? 'Sprawdzanie…' : 'Sprawdź ten krok'}
          </button>
          {results.length > 0 && (
            <div className="course-check-results" aria-live="polite">
              {results.map((item) => (
                <div className={`course-check ${item.status}`} key={item.id}>
                  <strong>
                    {item.status === 'passed' ? '✓ ' : ''}
                    {item.title}
                  </strong>
                  <p>{item.evidence}</p>
                  {item.recommendation && <p>{item.recommendation}</p>}
                </div>
              ))}
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
          <details
            className="course-example"
            onToggle={(event) => {
              if (event.currentTarget.open && !progress.viewedExamples.includes(current.id))
                void store
                  .patch((latest) => ({
                    ...latest,
                    study: {
                      ...latest.study!,
                      viewedExamples: [...new Set([...latest.study!.viewedExamples, current.id])],
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
          <div className="course-next glass-panel">
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
        <section className="course-editor">{editor}</section>
        <section className="course-preview">{preview}</section>
      </div>
      {reference}
    </div>
  );
}
