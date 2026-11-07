import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  MousePointer2,
  Download,
  File,
  FilePlus2,
  FileText,
  FolderOpen,
  Lightbulb,
  Loader2,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import Markdown from 'react-markdown';
import '../pdf-sheet.css';
import type {
  AttemptSnapshot,
  AttemptTicket,
  CheckResponse,
  ExamStudyResponse,
  Mode,
  ProjectFile,
  PublicTask,
} from '@zdaj/shared';
import { useApp } from '../context';
import { api, errorMessage } from '../api';
import { downloadProject, importProject, readAttempt, safePath, saveAttempt } from '../storage';
import { useProjectPreview } from '../inspector/use-project-preview';
import { InspectorOverlay, PageInspector } from '../components/PageInspector';
import '../inspector.css';
import { Editor, type EditorReveal } from '../components/Editor';
import { ProjectStore, projectStore, recoverySnapshot, type ProjectPatch } from '../project-store';
import '../cumulative.css';
import { ThemePicker } from '../components/ThemePicker';
import { Report } from '../components/Report';
import { PdfReadingGuide } from '../components/PdfReadingGuide';
import {
  EmptyState,
  ErrorNotice,
  Loading,
  ModePicker,
  Notice,
  PageHeading,
  Tags,
  Timer,
  levelLabel,
  modeLabel,
} from '../components/common';

const PdfSheet = lazy(() =>
  import('../components/PdfSheet').then((module) => ({ default: module.PdfSheet })),
);
const OriginalPdfReader = lazy(() =>
  import('../components/PdfSheet').then((module) => ({ default: module.PdfReader })),
);
const ExamStudy = lazy(() =>
  import('../components/ExamStudy').then((module) => ({ default: module.ExamStudy })),
);
function TaskPdfPanel({
  task,
  requestedPage,
  onPageChange,
}: {
  task: PublicTask;
  requestedPage?: number;
  onPageChange?: (page: number) => void;
}) {
  const { data } = useApp();
  const entry = data?.catalog.find((item) => item.id === task.sourceCatalogId);
  if (entry?.sourcePdf)
    return (
      <OriginalPdfReader
        url={`/api/v1/catalog/${encodeURIComponent(entry.id)}/sheet.pdf`}
        title={entry.title}
        label={
          entry.sourcePdf.sourceKind === 'official-source'
            ? 'Oryginalny dokument CKE'
            : 'Oryginalny arkusz CKE · kopia w zewnętrznym archiwum'
        }
        sourceUrl={entry.sourcePdf.url}
        sourceLabel={entry.sourcePdf.sourceLabel}
        downloadName={`${entry.id}.pdf`}
        requestedPage={requestedPage}
        onPageChange={onPageChange}
      />
    );
  if (task.origin === 'exam')
    return (
      <Notice>
        Oryginalny PDF jest chwilowo niedostępny. <Link to="/katalog">Otwórz katalog źródeł.</Link>
      </Notice>
    );
  return <PdfSheet task={task} requestedPage={requestedPage} onPageChange={onPageChange} />;
}

export function Workspace() {
  const { id = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const attemptId = params.get('proba');
  const requestedStudy = params.get('widok') === 'nauka';
  const requestedMode = params.get('tryb');
  const { data, level, refreshProgress } = useApp();
  const [task, setTask] = useState<PublicTask | null>(null),
    [attempt, setAttempt] = useState<AttemptSnapshot | null>(null),
    [mode, setMode] = useState<Mode>('nauka');
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [saved, setSaved] = useState(true);
  const [selected, setSelectedState] = useState(''),
    [editorReveal, setEditorReveal] = useState<EditorReveal>(),
    [newPath, setNewPath] = useState(''),
    [adding, setAdding] = useState(false),
    [tab, setTabState] = useState<'code' | 'preview' | 'report' | 'sheet' | 'study'>('code'),
    [showSheet, setShowSheet] = useState(false),
    [sheetPage, setSheetPageState] = useState(1);
  const [previewEntry, setPreviewEntryState] = useState(''),
    [inspectSpacing, setInspectSpacing] = useState(false),
    [inspectChoice, setInspectChoice] = useState<{ generation: string; id: string }>(),
    [checkStatus, setCheckStatus] = useState(''),
    [hintBusy, setHintBusy] = useState(false),
    [aiBusy, setAiBusy] = useState(false),
    [aiPrompt, setAiPrompt] = useState(''),
    [consent, setConsent] = useState(false),
    [aiText, setAiText] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null),
    iframeRef = useRef<HTMLIFrameElement>(null),
    inspectorToggleRef = useRef<HTMLButtonElement>(null),
    attemptRef = useRef<AttemptSnapshot | null>(null),
    autoSubmitted = useRef<string | null>(null);
  const storeRef = useRef<ProjectStore | null>(null);
  const [store, setStore] = useState<ProjectStore | null>(null);
  attemptRef.current = attempt;
  const currentReveal = editorReveal?.valid() ? editorReveal : undefined;
  useEffect(() => {
    if (editorReveal && !currentReveal) setEditorReveal(undefined);
  }, [editorReveal, currentReveal]);
  useEffect(() => {
    if (!store) return;
    const sync = () => {
      const state = store.get();
      setAttempt(state.project);
      attemptRef.current = state.project;
      setSheetPageState(state.project.workspace?.sheetPage ?? 1);
      setSaved(!state.saving && !state.error);
      if (state.error) setError(state.error);
    };
    sync();
    return store.subscribe(sync);
  }, [store]);
  useEffect(() => {
    if (saved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saved]);
  const remember = useCallback((patch: Partial<NonNullable<AttemptSnapshot['workspace']>>) => {
    const controller = storeRef.current;
    if (!controller) return;
    void controller
      .patch((current) => ({
        ...current,
        workspace: {
          view: 'code',
          activeFile: '',
          previewEntry: '',
          editors: {},
          ...current.workspace,
          ...patch,
        },
      }))
      .catch((cause) => setError(errorMessage(cause)));
  }, []);
  const setSelected = (path: string) => {
    setEditorReveal(undefined);
    setSelectedState(path);
    remember({ activeFile: path });
  };
  const setTab = useCallback(
    (view: NonNullable<AttemptSnapshot['workspace']>['view']) => {
      setEditorReveal(undefined);
      setTabState(view);
      remember({ view });
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set('widok', view === 'study' ? 'nauka' : view);
          return next;
        },
        { replace: true },
      );
    },
    [remember, setParams],
  );
  const setPreviewEntry = (path: string) => {
    setPreviewEntryState(path);
    remember({ previewEntry: path });
  };
  const inspectorEnabled =
    tab === 'study' &&
    attempt?.mode === 'nauka' &&
    !attempt.submittedAt &&
    !!attempt.study?.guide?.project;
  const projectPreview = useProjectPreview({
    project: attempt,
    entry: previewEntry,
    enabled: inspectorEnabled,
    iframe: iframeRef,
    toggleButton: inspectorToggleRef,
    onReveal: (source, valid) => {
      if (!valid()) return;
      const controller = storeRef.current;
      if (!controller) return;
      void controller
        .patch((latest) => ({
          ...latest,
          workspace: {
            view: 'study',
            previewEntry,
            editors: {},
            ...latest.workspace,
            activeFile: source.path,
            studyPanel: 'code',
          },
        }))
        .then(() => {
          if (!valid()) return;
          setInspectChoice(undefined);
          setSelectedState(source.path);
          setEditorReveal({ path: source.path, range: source.range, valid, scrollIntoView: true });
        })
        .catch((cause) => setError(errorMessage(cause)));
    },
    onExit: () => {
      setEditorReveal(undefined);
      remember({ studyPanel: 'preview' });
    },
  });
  const setSheetPage = (page: number) => {
    if (!Number.isSafeInteger(page) || page < 1) return;
    setSheetPageState(page);
    if (storeRef.current?.get().project.workspace?.sheetPage !== page)
      remember({ sheetPage: page });
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setBusy(false);
    setError('');
    setAttempt(null);
    setEditorReveal(undefined);
    setAiText('');
    setTabState('code');
    storeRef.current = null;
    setStore(null);
    autoSubmitted.current = null;
    void (async () => {
      try {
        const stored = attemptId ? await readAttempt(attemptId) : undefined;
        if (attemptId && !stored)
          throw new Error(
            'Nie znaleziono tej próby w tej przeglądarce. Otwórz nową próbę lub zaimportuj kopię postępu.',
          );
        if (stored && stored.taskId !== id) throw new Error('Ta próba dotyczy innego projektu.');
        const version = stored?.taskVersion;
        const known = data?.tasks.find(
          (item) => item.id === id && (!version || item.version === version),
        );
        const current =
          known ??
          (await api<PublicTask>(
            `/tasks/${encodeURIComponent(id)}${version ? `?version=${version}` : ''}`,
          ));
        if (cancelled) return;
        setTask(current);
        const restored = stored ? projectStore(stored) : null;
        storeRef.current = restored;
        setStore(restored);
        const active = restored?.get().project ?? stored;
        const requestedView = params.get('widok');
        const allowedView = ['study', 'code', 'sheet', 'preview', 'report'].includes(
          requestedView ?? '',
        )
          ? (requestedView as NonNullable<AttemptSnapshot['workspace']>['view'])
          : requestedView === 'nauka'
            ? 'study'
            : undefined;
        let initialView =
          allowedView ??
          active?.workspace?.view ??
          (active?.mode === 'nauka' ? 'study' : current.sourceCatalogId ? 'sheet' : 'code');
        if (active?.mode === 'egzamin' && !active.submittedAt && initialView === 'study')
          initialView = 'sheet';
        setTabState(initialView);
        setAttempt(active ?? null);
        setMode(
          stored?.mode ??
            (requestedMode === 'trening' || requestedMode === 'egzamin' ? requestedMode : 'nauka'),
        );
        setSelectedState(active?.workspace?.activeFile ?? active?.files?.[0]?.path ?? '');
        setSheetPageState(active?.workspace?.sheetPage ?? 1);
        setPreviewEntryState(
          active?.workspace?.previewEntry ??
            stored?.files?.find((file) => /\.(?:html?|php)$/i.test(file.path))?.path ??
            current.starterFiles.find((file) => /\.(?:html?|php)$/i.test(file.path))?.path ??
            '',
        );
        if (stored?.submittedAt && !allowedView && !active?.workspace) setTabState('report');
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, attemptId]);
  const update = useCallback(async (patch: ProjectPatch) => {
    if (!storeRef.current) throw new Error('Projekt nie jest jeszcze gotowy.');
    await storeRef.current.patch(patch);
  }, []);
  const changeFiles = (files: ProjectFile[]) => {
    if (!attemptRef.current || attemptRef.current.submittedAt || busy) return;
    void update((current) => ({ ...current, files })).catch(() => undefined);
  };
  const start = async (copyFiles?: ProjectFile[]) => {
    if (!task) return;
    setBusy(true);
    setError('');
    try {
      const ticket = await api<AttemptTicket>('/attempts', {
        method: 'POST',
        body: { taskId: task.id, taskVersion: task.version, mode, level },
      });
      const now = new Date().toISOString();
      const next: AttemptSnapshot = {
        id: ticket.id,
        taskId: task.id,
        taskVersion: task.version,
        title: task.title,
        kind: 'practice',
        mode,
        level,
        createdAt: now,
        updatedAt: now,
        deadlineAt: ticket.deadlineAt,
        ticket,
        files: structuredClone(copyFiles ?? task.starterFiles),
        hintCount: 0,
        revealedHints: [],
      };
      if (mode === 'nauka' && !copyFiles && task.sourceCatalogId) {
        const response = await api<ExamStudyResponse>(`/attempts/${ticket.id}/study`, {
          method: 'POST',
          body: { token: ticket.token },
        });
        next.files = structuredClone(response.guide.project?.starterFiles ?? task.starterFiles);
        next.study = {
          guide: response.guide,
          current: `${response.guide.steps[0]?.id}/${response.guide.steps[0]?.activities?.[0]?.id}`,
          completed: {},
          viewedExamples: [],
        };
        next.hintCount = response.hintCount;
      }
      next.workspace = {
        view: mode === 'nauka' ? 'study' : 'code',
        studyPanel: 'lesson',
        sheetPage,
        activeFile: next.files?.[0]?.path ?? '',
        previewEntry: next.files?.find((f) => /\.(?:html?|php)$/i.test(f.path))?.path ?? '',
        editors: {},
      };
      next.revision = 0;
      await saveAttempt(next);
      const controller = projectStore(next);
      storeRef.current = controller;
      setStore(controller);
      setAttempt(next);
      setParams({
        proba: next.id,
        ...(mode === 'nauka' ? { widok: 'nauka' } : {}),
      });
      await refreshProgress();
      void navigator.storage?.persist?.().catch(() => false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const submit = useCallback(async () => {
    const controller = storeRef.current;
    const current = controller?.get().project;
    if (!controller || !current || current.submittedAt) return;
    setBusy(true);
    setError('');
    try {
      if (task?.supportStatus === 'catalog-only') {
        const result = await controller.request((latest) =>
          api<{ submittedAt: string }>(`/attempts/${latest.ticket.id}/complete`, {
            method: 'POST',
            body: { token: latest.ticket.token },
          }),
        );
        await controller.patch((latest) => ({ ...latest, submittedAt: result.submittedAt }));
        if (storeRef.current === controller) setTab('report');
        await refreshProgress();
        return;
      }
      const job = await controller.request((latest) =>
        api<{ id: string; token: string; status: string }>('/checks', {
          method: 'POST',
          body: {
            attemptId: latest.ticket.id,
            attemptToken: latest.ticket.token,
            files: latest.files ?? [],
          },
        }),
      );
      await controller.patch((latest) => ({
        ...latest,
        submittedAt: new Date().toISOString(),
        checkJob: { id: job.id, token: job.token },
      }));
      if (storeRef.current === controller) {
        setCheckStatus(job.status);
        setTab('report');
      }
    } catch (e) {
      if (storeRef.current === controller) setError(errorMessage(e));
    } finally {
      if (storeRef.current === controller) setBusy(false);
    }
  }, [task, refreshProgress, setTab]);
  const expire = useCallback(() => {
    const current = attemptRef.current;
    if (current && !current.submittedAt && autoSubmitted.current !== current.id) {
      autoSubmitted.current = current.id;
      void submit();
    }
  }, [submit]);
  useEffect(() => {
    if (!attempt?.checkJob || attempt.report) return;
    const controller = storeRef.current;
    if (!controller) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const job = attempt.checkJob;
    const poll = async () => {
      try {
        const response = await api<CheckResponse>(`/checks/${job.id}`, {
          headers: { 'X-Check-Token': job.token },
        });
        if (cancelled || storeRef.current !== controller) return;
        setCheckStatus(response.status);
        if (response.report && attemptRef.current) {
          await controller.patch((latest) => ({ ...latest, report: response.report }));
          await refreshProgress();
          try {
            await api(`/checks/${job.id}/ack`, { method: 'POST', body: { token: job.token } });
          } catch {
            /* Local report is safely stored; server TTL still cleans it. */
          }
          return;
        }
        if (response.status === 'failed') {
          setError(
            response.error ||
              'Nie udało się przeprowadzić sprawdzania. To nie jest błąd Twojego rozwiązania.',
          );
          return;
        }
        timer = setTimeout(() => void poll(), 2000);
      } catch (e) {
        if (!cancelled) {
          setError(errorMessage(e));
          timer = setTimeout(() => void poll(), 6000);
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [attempt?.checkJob?.id, attempt?.report, update, refreshProgress]);
  useEffect(() => {
    const navigate = (event: MessageEvent) => {
      if (
        event.source !== iframeRef.current?.contentWindow ||
        event.data?.type !== 'zdaj-preview-navigate' ||
        typeof event.data.path !== 'string'
      )
        return;
      const target = attemptRef.current?.files?.find(
        (file) => file.path === event.data.path && /\.(?:html?|php)$/i.test(file.path),
      );
      if (target) setPreviewEntry(target.path);
    };
    window.addEventListener('message', navigate);
    return () => window.removeEventListener('message', navigate);
  }, []);
  const file = attempt?.files?.find((item) => item.path === selected);
  const htmlFiles = attempt?.files?.filter((item) => /\.(?:html?|php)$/i.test(item.path)) ?? [];
  useEffect(() => {
    if (!attempt?.files?.length || previewEntry) return;
    const path = attempt.files.find((item) => /\.(?:html?|php)$/i.test(item.path))?.path;
    if (path) setPreviewEntry(path);
  }, [attempt?.files, previewEntry]);
  const getHint = async () => {
    if (!attempt) return;
    setHintBusy(true);
    setError('');
    try {
      const result = await storeRef.current!.request((latest) =>
        api<{ hint: string; index: number; remaining: number }>('/hints', {
          method: 'POST',
          body: { attemptId: latest.ticket.id, attemptToken: latest.ticket.token },
        }),
      );
      const current = attemptRef.current;
      if (current?.id === attempt.id)
        await update((latest) => ({
          ...latest,
          hintCount: latest.hintCount + 1,
          revealedHints: [...(latest.revealedHints ?? []), result.hint],
        }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setHintBusy(false);
    }
  };
  const askAi = async () => {
    if (!attempt) return;
    setAiBusy(true);
    setError('');
    try {
      const response = await storeRef.current!.request((latest) =>
        api<{ text: string }>('/ai', {
          method: 'POST',
          body: {
            attemptId: latest.ticket.id,
            attemptToken: latest.ticket.token,
            prompt: aiPrompt,
            code: file?.encoding === 'base64' ? '' : (file?.content ?? ''),
            consent,
          },
        }),
      );
      if (attemptRef.current?.id === attempt.id) setAiText(response.text);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setAiBusy(false);
    }
  };
  const upload = async (list: FileList | null) => {
    if (!list || !attempt || attempt.submittedAt || busy) return;
    setBusy(true);
    setError('');
    try {
      const incoming = await importProject(list);
      const current = attemptRef.current;
      if (!current || current.id !== attempt.id || current.submittedAt) return;
      const replace = list.length === 1 && /\.zip$/i.test(list[0]!.name);
      const files = replace
        ? incoming
        : [
            ...(current.files ?? []).filter(
              (old) => !incoming.some((item) => item.path === old.path),
            ),
            ...incoming,
          ];
      await update((latest) => ({
        ...latest,
        files,
        recovery: recoverySnapshot(latest, 'Import plików'),
      }));
      setSelected(incoming[0]?.path ?? '');
      setPreviewEntry(files.find((item) => /\.(?:html?|php)$/i.test(item.path))?.path ?? '');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  };
  const addFile = () => {
    if (busy || attemptRef.current?.submittedAt) return;
    try {
      safePath(newPath);
      if (attempt?.files?.some((item) => item.path === newPath))
        throw new Error('Plik o tej nazwie już istnieje.');
      changeFiles([...(attempt?.files ?? []), { path: newPath, content: '', encoding: 'utf8' }]);
      setSelected(newPath);
      if (/\.(?:html?|php)$/i.test(newPath)) setPreviewEntry(newPath);
      setAdding(false);
      setNewPath('');
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  if (loading) return <Loading label="Otwieranie projektu…" />;
  if (!task)
    return (
      <>
        <ErrorNotice message={error} />
        <EmptyState
          title="Nie udało się otworzyć projektu"
          to="/praktyka"
          label="Wróć do projektów"
        >
          Sprawdź połączenie i wybierz projekt z listy.
        </EmptyState>
      </>
    );
  if (!attempt && task.origin !== 'exam')
    return (
      <EmptyState title="Ten projekt jest w archiwum" to="/praktyka" label="Otwórz zadania CKE">
        Nowe próby dotyczą wyłącznie arkuszy CKE. Wcześniejsze autorskie próby pozostają w Twoich
        lokalnych postępach.
      </EmptyState>
    );
  if (!attempt)
    return (
      <>
        <div className="workspace-entry-navigation">
          <Link className="back-link" to="/praktyka">
            <ArrowLeft size={16} />
            Zadania praktyczne
          </Link>
          <ThemePicker />
        </div>
        <PageHeading kicker="Arkusz CKE · INF.03" title={task.title}>
          {task.summary}
        </PageHeading>
        <Tags items={task.technologies} />
        {requestedStudy && (
          <Notice>
            Rozpocznij próbę w trybie Nauka. W zakładce „Nauka” rozwiniesz jeden projekt małymi
            krokami. Przejście do kolejnej instrukcji zachowa Twój kod.
          </Notice>
        )}
        <p className="authored-sheet-note" hidden>
          Szukasz prawdziwych arkuszy egzaminacyjnych?{' '}
          <Link to="/katalog">
            Otwórz oryginalne PDF-y w katalogu
            <ArrowRight size={15} />
          </Link>
        </p>
        <div className="task-sheet-intro">
          <FileText size={25} />
          <div>
            <strong>Oryginalny arkusz CKE.</strong>
            <p>
              Przeczytaj oryginalne warunki. Pliki zapiszesz lokalnie; cały arkusz wymaga kontroli
              ręcznej. Sprawdzanie wybranych kroków kursu nie jest oceną CKE.
            </p>
          </div>
          <button
            className="button secondary"
            aria-expanded={showSheet}
            onClick={() => setShowSheet((value) => !value)}
          >
            {showSheet ? 'Zwiń arkusz' : 'Przeczytaj oryginalny PDF'}
            <ChevronRight size={17} />
          </button>
        </div>
        {showSheet && (
          <div className="sheet-before-start">
            <Suspense fallback={<Loading label="Otwieranie czytnika PDF…" />}>
              <TaskPdfPanel task={task} requestedPage={sheetPage} onPageChange={setSheetPage} />
            </Suspense>
            {mode !== 'egzamin' && (
              <PdfReadingGuide taskId={task.id} taskVersion={task.version} level={level} />
            )}
          </div>
        )}
        <div className="task-setup">
          <section>
            <h2>Co zbudujesz?</h2>
            <ul className="requirements-list">
              {task.requirements.map((requirement) => (
                <li key={requirement}>
                  <CheckCircle2 size={18} />
                  {requirement}
                </li>
              ))}
            </ul>
            <Notice>
              Pracuj w edytorze przeglądarkowym lub w swojej IDE. Możesz przesłać pojedyncze pliki
              albo archiwum ZIP. PHP i SQL uruchom we własnym środowisku. Zakończenie tej próby
              zapisuje pracę bez automatycznej oceny.
            </Notice>
          </section>
          <aside className="start-panel">
            <h2>Wybierz sposób pracy</h2>
            <ModePicker value={mode} onChange={setMode} />
            <div className="start-meta">
              <span>
                <Clock3 size={16} />
                {mode === 'egzamin' ? `${task.durationMinutes} minut` : 'Bez limitu czasu'}
              </span>
              <span>{levelLabel(level)}</span>
            </div>
            <ErrorNotice message={error} />
            <button className="button primary full" disabled={busy} onClick={() => void start()}>
              {busy ? <Loader2 className="spin" size={18} /> : <Play size={17} />}Rozpocznij{' '}
              {mode === 'nauka' ? 'naukę' : modeLabel(mode).toLowerCase()}
            </button>
            <p className="fine-print">
              Pliki i wynik tej próby zostaną zapisane w tej przeglądarce.
            </p>
          </aside>
        </div>
      </>
    );
  const closed = !!attempt.submittedAt;
  const manual = task.supportStatus === 'catalog-only';
  const overtime = !!attempt.deadlineAt && Date.now() > Date.parse(attempt.deadlineAt);
  const inspectionChoice =
    inspectChoice?.generation === projectPreview.index?.generation
      ? (inspectChoice?.id ?? '')
      : (projectPreview.selection?.elementId ?? '');
  const editorPanel = (
    <div className="editor-shell">
      <div className="file-tree">
        <div className="file-tree-heading">
          <span>Projekt</span>
          {!closed && (
            <button
              className="icon-button"
              aria-label="Dodaj plik"
              disabled={busy}
              onClick={() => setAdding((value) => !value)}
            >
              <FilePlus2 size={16} />
            </button>
          )}
        </div>
        {adding && !closed && (
          <form
            className="new-file-form"
            onSubmit={(e) => {
              e.preventDefault();
              addFile();
            }}
          >
            <input
              aria-label="Nazwa nowego pliku"
              disabled={busy}
              placeholder="np. skrypt.js"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              autoFocus
            />
            <button type="submit" className="icon-button" aria-label="Utwórz plik" disabled={busy}>
              <Check size={16} />
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => setAdding(false)}
              aria-label="Anuluj"
            >
              <X size={16} />
            </button>
          </form>
        )}
        <div className="file-list">
          {attempt.files?.map((item) => (
            <button
              className={selected === item.path ? 'active' : ''}
              key={item.path}
              onClick={() => setSelected(item.path)}
              title={item.path}
            >
              <File size={14} />
              <span>{item.path}</span>
            </button>
          ))}
        </div>
        {!closed && (
          <>
            <input
              ref={uploadRef}
              type="file"
              multiple
              accept=".zip,.html,.htm,.css,.js,.php,.sql,.txt,.json,.png,.jpg,.jpeg,.gif,.svg,.webp"
              className="visually-hidden"
              onChange={(e) => void upload(e.target.files)}
            />
            <button
              className="upload-project"
              disabled={busy}
              onClick={() => uploadRef.current?.click()}
            >
              <Upload size={16} />
              Wczytaj pliki / ZIP
            </button>
            <small className="file-help">
              ZIP zastępuje pliki projektu.
              <br />
              Maksymalnie 10 MiB.
            </small>
          </>
        )}
      </div>
      <div className="editor-pane">
        {projectPreview.index && projectPreview.selection && (
          <PageInspector
            index={projectPreview.index}
            selection={projectPreview.selection}
            spacing={inspectSpacing}
            onSpacing={setInspectSpacing}
            onReveal={projectPreview.reveal}
            onBack={() => remember({ studyPanel: 'preview' })}
            onClose={projectPreview.stop}
          />
        )}
        <div className="editor-filebar">
          <span>{selected || 'Wybierz plik'}</span>
          {closed ? (
            <span>Tylko odczyt</span>
          ) : (
            file && (
              <button
                className="icon-button"
                aria-label={`Usuń plik ${file.path}`}
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Usunąć plik ${file.path}?`)) {
                    const files = attempt.files?.filter((item) => item.path !== file.path) ?? [];
                    void update((latest) => ({
                      ...latest,
                      files,
                      recovery: recoverySnapshot(latest, 'Usunięcie pliku'),
                    })).catch((cause) => setError(errorMessage(cause)));
                    setSelected(files[0]?.path ?? '');
                  }
                }}
              >
                <Trash2 size={14} />
              </button>
            )
          )}
        </div>
        {file ? (
          file.encoding === 'base64' ? (
            <div className="binary-file">
              <File size={35} />
              <h3>{file.path}</h3>
              <p>Plik binarny zostanie przesłany razem z projektem.</p>
              {/\.(png|jpe?g|gif|webp)$/i.test(file.path) && (
                <img
                  src={`data:image/${/\.png$/i.test(file.path) ? 'png' : /\.webp$/i.test(file.path) ? 'webp' : /\.gif$/i.test(file.path) ? 'gif' : 'jpeg'};base64,${file.content}`}
                  alt={`Podgląd pliku ${file.path}`}
                />
              )}
            </div>
          ) : (
            <Editor
              path={file.path}
              reveal={tab === 'study' && !closed ? currentReveal : undefined}
              sessionKey={`${attempt.id}/${file.path}`}
              initialView={attempt.workspace?.editors[file.path]}
              onViewChange={(view) => {
                const controller = storeRef.current;
                if (!controller || controller.get().project.id !== attempt.id) return;
                void controller
                  .patch((latest) =>
                    JSON.stringify(latest.workspace?.editors[file.path]) === JSON.stringify(view)
                      ? latest
                      : {
                          ...latest,
                          workspace: {
                            view: tab,
                            activeFile: file.path,
                            previewEntry,
                            ...latest.workspace,
                            editors: { ...latest.workspace?.editors, [file.path]: view },
                          },
                        },
                  )
                  .catch(() => undefined);
              }}
              value={file.content}
              readOnly={closed || busy}
              onChange={(content) =>
                changeFiles(
                  (attemptRef.current?.files ?? []).map((item) =>
                    item.path === file.path ? { ...item, content } : item,
                  ),
                )
              }
            />
          )
        ) : (
          <div className="editor-empty">
            <FolderOpen size={30} />
            <p>
              {selected
                ? `W projekcie nie ma jeszcze pliku ${selected}.`
                : 'Wybierz lub dodaj plik, aby zacząć pisać.'}
            </p>
            {!closed &&
              selected &&
              (/\.(html?|css|js|php|sql|txt|json|svg)$/i.test(selected) ? (
                <button
                  className="button secondary"
                  onClick={() => {
                    safePath(selected);
                    void update((latest) =>
                      latest.files?.some((item) => item.path === selected)
                        ? latest
                        : {
                            ...latest,
                            files: [
                              ...(latest.files ?? []),
                              { path: selected, content: '', encoding: 'utf8' },
                            ],
                          },
                    ).catch((cause) => setError(errorMessage(cause)));
                  }}
                >
                  <FilePlus2 size={16} />
                  Utwórz pusty plik {selected}
                </button>
              ) : (
                <button className="button secondary" onClick={() => uploadRef.current?.click()}>
                  <Upload size={16} />
                  Wczytaj przygotowany plik
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
  const previewPanel = (
    <div className="preview-pane">
      {task.runtimeProfile === 'php-mariadb' && (
        <Notice>
          Podgląd pokazuje statyczny HTML/CSS/JavaScript, także z plików .php. Bloki PHP są
          pomijane; dane z bazy nie pojawią się tutaj.{' '}
          {manual
            ? 'PHP i SQL uruchom we własnym środowisku zgodnie z oryginalnym arkuszem.'
            : 'PHP i SQL zostaną uruchomione po oddaniu pracy. Wynik zobaczysz w raporcie.'}
        </Notice>
      )}
      {htmlFiles.length ? (
        <>
          <div className="preview-toolbar">
            <label>
              Strona
              <select value={previewEntry} onChange={(e) => setPreviewEntry(e.target.value)}>
                {htmlFiles.map((item) => (
                  <option key={item.path}>{item.path}</option>
                ))}
              </select>
            </label>
            <span>
              <ShieldCheck size={14} />
              Izolowany podgląd
            </span>
            <button
              className="button secondary small"
              onClick={projectPreview.runScripts}
              disabled={projectPreview.scriptsRunning}
            >
              <Play size={14} />
              {projectPreview.scriptsRunning ? 'JS uruchomiony' : 'Uruchom JS'}
            </button>
            {inspectorEnabled && (
              <button
                ref={inspectorToggleRef}
                className="button secondary small inspector-toggle"
                aria-pressed={projectPreview.inspecting}
                onClick={projectPreview.toggle}
              >
                <MousePointer2 size={16} aria-hidden="true" />
                Zbadaj stronę
              </button>
            )}
          </div>
          {projectPreview.inspecting && projectPreview.index && (
            <div className="inspector-controls">
              <label>
                Element strony
                <select
                  disabled={!projectPreview.ready}
                  value={inspectionChoice}
                  onChange={(event) =>
                    setInspectChoice({
                      generation: projectPreview.index!.generation,
                      id: event.target.value,
                    })
                  }
                >
                  <option value="" disabled>
                    Wybierz element lub kliknij w podglądzie
                  </option>
                  {projectPreview.index.elements.map((element) => (
                    <option value={element.id} key={element.id}>
                      {element.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="button secondary small"
                disabled={!projectPreview.ready || !inspectionChoice}
                onClick={() => projectPreview.choose(inspectionChoice)}
              >
                Pokaż element
              </button>
              <p>
                Kliknij element, aby otworzyć jego HTML. JavaScript jest wyłączony podczas badania.
                Escape kończy badanie.
              </p>
            </div>
          )}
          {projectPreview.problem && <Notice>{projectPreview.problem}</Notice>}
          <div className="inspector-frame">
            <iframe
              ref={iframeRef}
              title="Podgląd projektu"
              sandbox="allow-scripts allow-forms"
              referrerPolicy="no-referrer"
              srcDoc={projectPreview.html}
              onLoad={projectPreview.loaded}
            />
            {projectPreview.selection && (
              <InspectorOverlay box={projectPreview.selection.box} spacing={inspectSpacing} />
            )}
          </div>
          <p className="fine-print">
            HTML i CSS odświeżają się po zmianie pliku. JavaScript uruchom przyciskiem. Zewnętrzne
            zasoby, połączenia sieciowe i wysyłanie formularzy są zablokowane. Moduły z importami
            wymagają własnej IDE.
          </p>
        </>
      ) : (
        <EmptyState title="Brak strony do podglądu">
          Wybierz lub dodaj plik HTML albo PHP zgodnie z bieżącym krokiem. Kod PHP i zapytania SQL
          uruchamiaj w swoim lokalnym środowisku.
        </EmptyState>
      )}
    </div>
  );
  return (
    <>
      <div className="workspace-heading">
        <div>
          <Link className="back-link" to="/praktyka">
            <ArrowLeft size={15} />
            Zadania praktyczne
          </Link>
          <h1>{task.title}</h1>
          <div className="workspace-meta">
            <span className="pill">{modeLabel(attempt.mode)}</span>
            <span>{levelLabel(attempt.level)}</span>
            <span>Wersja {attempt.taskVersion}</span>
            <span className={`save-state ${saved ? '' : 'saving'}`}>
              {saved ? <Check size={14} /> : <Loader2 size={14} className="spin" />}
              {saved ? 'Zapisano lokalnie' : 'Zapisywanie…'}
            </span>
          </div>
        </div>
        <div className="workspace-heading-actions">
          <ThemePicker />
          {!closed && <Timer deadlineAt={attempt.deadlineAt} onExpire={expire} />}
          <button
            className="button secondary small"
            onClick={() => downloadProject(attempt.files ?? [], `${task.id}-rozwiazanie.zip`)}
          >
            <Download size={16} />
            Pobierz ZIP
          </button>
          {closed ? (
            <button
              className="button primary small"
              disabled={busy}
              onClick={() => void start(attempt.files)}
            >
              Popraw w nowej próbie
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="button secondary small"
              disabled={busy || (!manual && !data?.features.checkingAvailable)}
              onClick={() => {
                if (
                  window.confirm(
                    'Zakończyć pracę? Pliki zostaną zachowane do odczytu; dalsze poprawki wykonasz w nowej próbie.',
                  )
                )
                  void submit();
              }}
            >
              {busy ? <Loader2 className="spin" size={16} /> : <Send size={16} />}
              {manual ? 'Zakończ próbę' : 'Oddaj do sprawdzenia'}
            </button>
          )}
        </div>
      </div>
      <ErrorNotice message={error} />
      {store?.get().error && (
        <div className="button-row">
          <button
            className="button secondary"
            onClick={() => void store.retry().catch((cause) => setError(errorMessage(cause)))}
          >
            Ponów zapis
          </button>
          <button
            className="button quiet"
            onClick={() => {
              if (
                window.confirm(
                  'Wczytać zapis z przeglądarki? Najpierw pobierz ZIP bieżącego kodu, jeśli chcesz go zachować.',
                )
              )
                void store.reload().catch((cause) => setError(errorMessage(cause)));
            }}
          >
            Wczytaj zapis z przeglądarki
          </button>
        </div>
      )}
      {!!attempt.recovery?.length && (
        <details className="project-recovery">
          <summary>Kopie przed zmianami plików</summary>
          {attempt.recovery.map((copy) => (
            <div key={copy.id}>
              {copy.reason} · {new Date(copy.createdAt).toLocaleString('pl-PL')}{' '}
              <button
                className="button quiet small"
                onClick={() => downloadProject(copy.files, 'kopia-projektu.zip')}
              >
                Pobierz kopię ZIP
              </button>
            </div>
          ))}
        </details>
      )}
      {!manual && !data?.features.checkingAvailable && !closed && (
        <Notice>
          Sprawdzanie na serwerze jest teraz wyłączone. Możesz nadal pracować, zapisywać pliki i
          pobrać swoje rozwiązanie.
        </Notice>
      )}
      {overtime && (
        <div className="notice warning">
          <Clock3 size={18} />
          <p>
            Przekroczono czas egzaminu. Zapisane rozwiązanie pozostaje dostępne; wynik ma charakter
            ćwiczeniowy.
          </p>
        </div>
      )}
      <div className={`workspace-columns${tab === 'study' ? ' study-mode' : ''}`}>
        <aside className="task-instructions">
          <div className="instructions-title">
            <FolderOpen size={18} />
            <h2>Twoje zadanie</h2>
          </div>
          <ul className="task-checklist">
            {task.requirements.map((requirement, index) => (
              <li key={requirement}>
                <span>{index + 1}</span>
                {requirement}
              </li>
            ))}
          </ul>
          {!manual && attempt.mode !== 'egzamin' && !closed && (
            <section className="guidance">
              <h3>{attempt.mode === 'nauka' ? 'Krok po kroku' : 'Podpowiedzi na życzenie'}</h3>
              {attempt.mode === 'nauka' &&
                task.guidance[attempt.level].map((step, index) => (
                  <details key={step.title} open={attempt.mode === 'nauka' && index === 0}>
                    <summary>
                      <span>{index + 1}</span>
                      {step.title}
                    </summary>
                    <div className="prose">
                      <Markdown>{step.body}</Markdown>
                      <p className="checkpoint">
                        <CheckCircle2 size={15} />
                        {step.checkpoint}
                      </p>
                    </div>
                  </details>
                ))}
              <button
                className="button secondary full"
                disabled={hintBusy}
                onClick={() => void getHint()}
              >
                <Lightbulb size={16} />
                {hintBusy ? 'Wczytywanie…' : 'Potrzebuję wskazówki'}
              </button>
              {(attempt.revealedHints ?? []).map((hint, index) => (
                <div className="hint-note" key={index}>
                  <Lightbulb size={17} />
                  <div>
                    <strong>Wskazówka {index + 1}</strong>
                    <p>{hint}</p>
                  </div>
                </div>
              ))}
              <p className="fine-print">Użyte wskazówki: {attempt.hintCount}</p>
            </section>
          )}
          {attempt.mode === 'egzamin' && !closed && (
            <Notice>
              Podpowiedzi i AI są wyłączone do oddania pracy. Warunki i wymagania zadania pozostają
              dostępne.
            </Notice>
          )}
          {task.criteria.length > 0 && (
            <details className="criteria-details">
              <summary>
                Kryteria sprawdzania
                <ChevronRight size={16} />
              </summary>
              <ul>
                {task.criteria.map((criterion) => (
                  <li key={criterion.id}>
                    <strong>{criterion.title}</strong>
                    <span>{criterion.description}</span>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </aside>
        <section className="workspace-work">
          <div className="workspace-tabs glass-panel" role="tablist" aria-label="Widok projektu">
            <button role="tab" aria-selected={tab === 'sheet'} onClick={() => setTab('sheet')}>
              <FileText size={17} />
              Arkusz PDF
            </button>
            <button role="tab" aria-selected={tab === 'code'} onClick={() => setTab('code')}>
              <Code2 size={17} />
              Projekt
            </button>
            {task.sourceCatalogId && (
              <button
                role="tab"
                aria-selected={tab === 'study'}
                disabled={attempt.mode === 'egzamin' && !closed}
                title={
                  attempt.mode === 'egzamin' && !closed
                    ? 'Omówienie będzie dostępne po zakończeniu egzaminu.'
                    : undefined
                }
                onClick={() => setTab('study')}
              >
                <BookOpen size={17} />
                Nauka
              </button>
            )}
            {closed && (
              <button role="tab" aria-selected={tab === 'report'} onClick={() => setTab('report')}>
                <ShieldCheck size={17} />
                Raport
                {!manual && !attempt.report && checkStatus !== 'failed' && (
                  <Loader2 size={13} className="spin" />
                )}
              </button>
            )}
            <span className="workspace-file-count">{attempt.files?.length ?? 0} plików</span>
          </div>
          {tab === 'sheet' && (
            <div className="workspace-sheet">
              <Suspense fallback={<Loading label="Otwieranie czytnika PDF…" />}>
                <TaskPdfPanel task={task} requestedPage={sheetPage} onPageChange={setSheetPage} />
              </Suspense>
              {(attempt.mode !== 'egzamin' || closed) && (
                <PdfReadingGuide
                  taskId={task.id}
                  taskVersion={task.version}
                  level={attempt.level}
                />
              )}
            </div>
          )}
          {tab === 'study' && store && (attempt.mode !== 'egzamin' || closed) && (
            <Suspense fallback={<Loading label="Otwieranie nauki…" />}>
              <ExamStudy
                store={store}
                editor={editorPanel}
                preview={previewPanel}
                onOpenFile={setSelected}
                onRevealCode={(path, range, valid) => {
                  if (!valid()) return;
                  setSelected(path);
                  setEditorReveal({ path, range, valid });
                }}
                onOpenSheet={(page) => {
                  setSheetPage(page);
                  setTab('sheet');
                }}
              />
            </Suspense>
          )}
          {(tab === 'code' || tab === 'preview') && (
            <div className="project-workbench">
              {editorPanel}
              {previewPanel}
            </div>
          )}
          {tab === 'report' && (
            <div className="report-pane">
              {manual ? (
                <div className="manual-completion">
                  <CheckCircle2 size={32} />
                  <h2>Próba zakończona</h2>
                  <p>
                    Twoje pliki zostały zachowane w przeglądarce. Ten arkusz nie ma adaptera
                    automatycznej oceny, więc nie przypisujemy punktów ani procentu.
                  </p>
                  <h3>Sprawdź pracę z oryginalnym arkuszem</h3>
                  <ul>
                    {task.requirements.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                  <button className="button secondary" onClick={() => setTab('sheet')}>
                    <FileText size={17} />
                    Otwórz oryginalny arkusz
                  </button>
                </div>
              ) : attempt.report ? (
                <>
                  <Report report={attempt.report} />
                  <div className="follow-up">
                    <h3>Spróbuj podobnego zadania</h3>
                    <p>{task.followUp}</p>
                    <button
                      className="button primary"
                      onClick={() => void start(attempt.files)}
                      disabled={busy}
                    >
                      Rozpocznij kolejną próbę
                      <ArrowRight size={17} />
                    </button>
                  </div>
                </>
              ) : checkStatus === 'failed' ? (
                <EmptyState title="Sprawdzanie nie zostało ukończone">
                  Twoje pliki są zapisane. Możesz pobrać projekt lub otworzyć nową próbę. Błąd
                  sprawdzania nie jest oceną rozwiązania.
                </EmptyState>
              ) : (
                <div className="checking-state">
                  <Loader2 size={34} className="spin" />
                  <h2>
                    {checkStatus === 'running' ? 'Sprawdzamy Twoją pracę' : 'Praca czeka w kolejce'}
                  </h2>
                  <p>
                    Możesz opuścić tę stronę i wrócić do zapisanej próby. Pobierz raport w ciągu 24
                    godzin.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
      {(attempt.mode !== 'egzamin' || closed) && (
        <section className="ai-panel">
          <div className="ai-panel-heading">
            <Sparkles size={23} />
            <div>
              <h2>Pomoc w zrozumieniu</h2>
              <p>AI może wyjaśnić błąd. Jego odpowiedź nie jest oceną egzaminacyjną.</p>
            </div>
            <span className={`pill ${data?.features.aiAvailable ? '' : 'subtle'}`}>
              {data?.features.aiAvailable ? 'DeepSeek' : 'AI wyłączone'}
            </span>
          </div>
          {data?.features.aiAvailable ? (
            <>
              <label className="field">
                <span>Co chcesz zrozumieć?</span>
                <textarea
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Np. Dlaczego zapytanie nie zwraca żadnego wiersza?"
                  maxLength={4000}
                />
              </label>
              <label className="checkbox-field">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                <span>
                  Zgadzam się na przesłanie pytania i treści wybranego pliku ({file?.path ?? 'brak'}
                  ) do DeepSeek. Nie wpisuję danych osobowych ani kluczy.
                </span>
              </label>
              <button
                className="button secondary"
                disabled={!consent || !aiPrompt.trim() || aiBusy}
                onClick={() => void askAi()}
              >
                {aiBusy ? <Loader2 size={17} className="spin" /> : <Sparkles size={17} />}Poproś o
                wyjaśnienie
              </button>
              {aiText && (
                <div className="ai-response prose">
                  <Markdown>{aiText}</Markdown>
                </div>
              )}
            </>
          ) : (
            <p>
              {manual
                ? 'Oryginalny arkusz, przewodnik czytania i lokalny zapis działają niezależnie od AI.'
                : 'Przygotowane wskazówki i sprawdzanie projektu działają niezależnie od AI.'}{' '}
              Dostępność AI zależy od ustawień administratora i pozostałego budżetu.
            </p>
          )}
        </section>
      )}
    </>
  );
}
