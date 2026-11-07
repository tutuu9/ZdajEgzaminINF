import { useEffect, useRef, useState, type RefObject } from 'react';
import type { AttemptSnapshot, ProjectFile } from '@zdaj/shared';
import { createPreview } from '../preview';
import { readInspectionMessage } from './bridge';
import type { InspectionIndex, InspectionSelection, InspectionSource } from './types';

interface PreviewContext {
  id?: string;
  files?: ProjectFile[];
  entry: string;
  step?: string;
  enabled: boolean;
}
interface PreparedPreview {
  context: PreviewContext;
  html: string;
  inspection?: InspectionIndex;
}
const sameContext = (a: PreviewContext, b: PreviewContext) =>
  a.id === b.id &&
  a.files === b.files &&
  a.entry === b.entry &&
  a.step === b.step &&
  a.enabled === b.enabled;

/** Preview generations never authorize edits. Source locations stay in the parent. */
export function useProjectPreview({
  project,
  entry,
  enabled,
  iframe,
  toggleButton,
  onReveal,
  onExit,
}: {
  project: AttemptSnapshot | null;
  entry: string;
  enabled: boolean;
  iframe: RefObject<HTMLIFrameElement | null>;
  toggleButton: RefObject<HTMLButtonElement | null>;
  onReveal: (source: InspectionSource, valid: () => boolean) => void;
  onExit: () => void;
}) {
  const [requested, setRequested] = useState(false);
  const [scriptRequest, setScriptRequest] = useState<PreviewContext>();
  const [prepared, setPrepared] = useState<PreparedPreview>();
  const [selectionState, setSelection] = useState<{
    generation: string;
    value: InspectionSelection;
  }>();
  const [problem, setProblem] = useState('');
  const [ready, setReady] = useState(false);
  const context: PreviewContext = {
    id: project?.id,
    files: project?.files,
    entry,
    step: project?.study?.current,
    enabled,
  };
  const current = useRef(context);
  current.current = context;
  const preparedRef = useRef(prepared);
  preparedRef.current = prepared;
  const callbacks = useRef({ onReveal, onExit });
  callbacks.current = { onReveal, onExit };
  const inspecting = enabled && requested;
  const activeRef = useRef(inspecting);
  activeRef.current = inspecting;
  const scriptsRunning = !inspecting && !!scriptRequest && sameContext(scriptRequest, context);
  const fresh = !!prepared && sameContext(prepared.context, context);
  const index = fresh && inspecting ? prepared.inspection : undefined;
  const selection =
    index?.generation === selectionState?.generation ? selectionState?.value : undefined;

  const stop = () => {
    activeRef.current = false;
    setRequested(false);
    setSelection(undefined);
    callbacks.current.onExit();
    // The mobile preview panel is restored before returning keyboard focus.
    requestAnimationFrame(() => toggleButton.current?.focus());
  };
  const stopRef = useRef(stop);
  stopRef.current = stop;

  useEffect(() => {
    if (!enabled) setRequested(false);
  }, [enabled]);
  useEffect(() => {
    const snapshot: PreviewContext = {
      id: project?.id,
      files: project?.files,
      entry,
      step: project?.study?.current,
      enabled,
    };
    setSelection(undefined);
    setReady(false);
    setProblem('');
    if (!snapshot.files?.length || !entry) {
      setPrepared(undefined);
      return;
    }
    try {
      const document = createPreview(snapshot.files, entry, {
        scripts: scriptsRunning,
        inspection: inspecting,
      });
      setPrepared({ context: snapshot, html: document.html, inspection: document.inspection });
      return document.dispose;
    } catch {
      setPrepared(undefined);
      setProblem(
        'Nie udało się przygotować podglądu. Twoje pliki pozostają zapisane. Wyłącz badanie i spróbuj ponownie.',
      );
    }
  }, [
    project?.id,
    project?.files,
    project?.study?.current,
    entry,
    enabled,
    inspecting,
    scriptsRunning,
  ]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      const frame = preparedRef.current;
      if (
        !activeRef.current ||
        !frame?.inspection ||
        !current.current.enabled ||
        !sameContext(frame.context, current.current)
      )
        return;
      const message = readInspectionMessage(
        event,
        iframe.current?.contentWindow ?? null,
        frame.inspection,
      );
      if (!message) return;
      if (message.kind === 'exit') {
        stopRef.current();
        return;
      }
      // On narrow screens opening Kod hides the preview. Keep its last visible
      // measurements rather than replacing them with a hidden layout's zeros.
      if (message.kind === 'update' && !iframe.current?.getClientRects().length) return;
      setSelection({ generation: message.generation, value: message.selection });
      if (message.kind === 'select') {
        const element = frame.inspection.elements.find(
          (item) => item.id === message.selection.elementId,
        )!;
        callbacks.current.onReveal(
          element.source,
          () =>
            activeRef.current &&
            preparedRef.current === frame &&
            current.current.enabled &&
            sameContext(frame.context, current.current),
        );
      }
    };
    const escape = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !event.defaultPrevented &&
        activeRef.current &&
        preparedRef.current?.inspection &&
        current.current.enabled
      ) {
        event.preventDefault();
        stopRef.current();
      }
    };
    window.addEventListener('message', receive);
    window.addEventListener('keydown', escape);
    return () => {
      window.removeEventListener('message', receive);
      window.removeEventListener('keydown', escape);
    };
  }, [iframe]);

  return {
    html: fresh ? prepared.html : '',
    index,
    selection,
    inspecting,
    scriptsRunning,
    problem,
    ready,
    loaded: () => setReady(true),
    toggle: () => {
      setScriptRequest(undefined);
      if (inspecting) stop();
      else setRequested(true);
    },
    stop,
    runScripts: () => {
      activeRef.current = false;
      setRequested(false);
      setSelection(undefined);
      setScriptRequest(context);
    },
    choose: (elementId: string) => {
      if (!ready || !index?.elements.some((element) => element.id === elementId)) return;
      iframe.current?.contentWindow?.postMessage(
        { type: 'zdaj-inspector-select', generation: index.generation, elementId },
        '*',
      );
    },
    reveal: (source: InspectionSource) => {
      if (!index || !prepared) return;
      callbacks.current.onReveal(
        source,
        () =>
          activeRef.current &&
          preparedRef.current === prepared &&
          current.current.enabled &&
          sameContext(prepared.context, current.current),
      );
    },
  };
}
