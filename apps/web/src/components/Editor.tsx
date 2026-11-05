import { useEffect, useRef } from 'react';
import {
  Annotation,
  Compartment,
  type EditorSelection,
  EditorState,
  StateEffect,
  Transaction,
} from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
  drawSelection,
  showPanel,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { acceptCompletion, autocompletion } from '@codemirror/autocomplete';
import {
  bracketMatching,
  foldGutter,
  syntaxHighlighting,
  HighlightStyle,
} from '@codemirror/language';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { javascript } from '@codemirror/lang-javascript';
import { php } from '@codemirror/lang-php';
import { sql } from '@codemirror/lang-sql';
import { oneDarkTheme, oneDarkHighlightStyle } from '@codemirror/theme-one-dark';
import {
  expandHtmlAbbreviation,
  htmlAbbreviationCompletions,
  supportsHtmlAbbreviation,
} from './editor-abbreviation';

const readableHighlightStyle = HighlightStyle.define(
  oneDarkHighlightStyle.specs.map((spec) => ({
    ...spec,
    color: spec.color === '#7d8799' ? '#a4aec1' : spec.color,
  })),
);

type ViewPosition = { anchor: number; head: number; scrollTop: number };
type SavedEditor = {
  state: EditorState;
  position: ViewPosition;
  readonly: Compartment;
  label: Compartment;
  size: Compartment;
};
const sessions = new Map<string, SavedEditor>();

const abbreviationTools = [
  autocompletion({ override: [htmlAbbreviationCompletions], interactionDelay: 0 }),
  EditorState.phrases.of({ Completions: 'Podpowiedzi kodu' }),
  showPanel.of(() => {
    const dom = document.createElement('div');
    dom.className = 'cm-html-abbreviation-hint';
    dom.textContent =
      'Skróty HTML: wpisz div lub ul>li*3 i naciśnij Tab. Skrót ! w osobnym wierszu tworzy szkielet strony.';
    return { dom, bottom: true };
  }),
];

function accessSettings(readOnly: boolean, path: string) {
  return [
    EditorState.readOnly.of(readOnly),
    EditorView.editable.of(!readOnly),
    !readOnly && supportsHtmlAbbreviation(path) ? abbreviationTools : [],
  ];
}

export type EditorReveal = {
  path: string;
  range?: { from: number; to: number };
  valid: () => boolean;
};
const externalValue = Annotation.define<boolean>();

function syncText(view: EditorView, value: string) {
  const normalized = value.replace(/\r\n?/g, '\n');
  if (view.state.doc.toString() !== normalized)
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: normalized },
      annotations: [externalValue.of(true), Transaction.addToHistory.of(false)],
    });
}

export function Editor({
  value,
  path,
  onChange,
  readOnly = false,
  label = 'Edytor kodu',
  minHeight = 260,
  sessionKey,
  initialView,
  onViewChange,
  reveal,
}: {
  value: string;
  path: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  label?: string;
  minHeight?: number;
  sessionKey?: string;
  initialView?: ViewPosition;
  onViewChange?: (view: ViewPosition) => void;
  reveal?: EditorReveal;
}) {
  const container = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    revealedSelection = useRef<EditorSelection | null>(null),
    callback = useRef(onChange);
  callback.current = onChange;
  const positionCallback = useRef(onViewChange),
    compartments = useRef<SavedEditor | null>(null);
  positionCallback.current = onViewChange;
  const clearReveal = (instance: EditorView) => {
    if (instance.state.selection === revealedSelection.current)
      instance.dispatch({
        selection: { anchor: instance.state.selection.main.head },
        annotations: Transaction.addToHistory.of(false),
      });
    revealedSelection.current = null;
  };
  useEffect(() => {
    if (!container.current) return;
    const language = /\.php$/i.test(path)
      ? php()
      : /\.html?$/i.test(path)
        ? html()
        : /\.css$/i.test(path)
          ? css()
          : /\.(js|mjs|ts)$/i.test(path)
            ? javascript()
            : /\.(sql|txt)$/i.test(path) && /sql|kwerend/i.test(path)
              ? sql()
              : [];
    const cached = sessionKey ? sessions.get(sessionKey) : undefined;
    const saveSessionPosition = positionCallback.current;
    const readonly = cached?.readonly ?? new Compartment(),
      labelConfig = cached?.label ?? new Compartment(),
      size = cached?.size ?? new Compartment();
    let positionTimer: ReturnType<typeof setTimeout> | undefined;
    const notifyPosition = () => {
      if (positionTimer) clearTimeout(positionTimer);
      positionTimer = setTimeout(() => {
        positionCallback.current?.({
          anchor:
            instance.state.selection === revealedSelection.current
              ? instance.state.selection.main.head
              : instance.state.selection.main.anchor,
          head: instance.state.selection.main.head,
          scrollTop: instance.scrollDOM.scrollTop,
        });
      }, 250);
    };
    const instance = new EditorView({
      parent: container.current,
      state:
        cached?.state ??
        EditorState.create({
          doc: value,
          extensions: [
            lineNumbers(),
            history(),
            drawSelection(),
            highlightActiveLine(),
            highlightActiveLineGutter(),
            bracketMatching(),
            foldGutter(),
            syntaxHighlighting(readableHighlightStyle),
            keymap.of([
              { key: 'Tab', run: acceptCompletion },
              { key: 'Tab', run: expandHtmlAbbreviation(path) },
              indentWithTab,
              ...defaultKeymap,
              ...historyKeymap,
            ]),
            oneDarkTheme,
            language,
            EditorView.lineWrapping,
            readonly.of(accessSettings(readOnly, path)),
            labelConfig.of(EditorView.contentAttributes.of({ 'aria-label': `${label}: ${path}` })),
            size.of(EditorView.theme({ '.cm-scroller': { minHeight: `${minHeight}px` } })),
            EditorView.theme({
              '&': { fontSize: '13px', height: '100%' },
              '.cm-scroller': {
                fontFamily: '"IBM Plex Mono", monospace',
                overflow: 'auto',
                minHeight: `${minHeight}px`,
              },
              '.cm-content': { padding: '16px 0' },
              '.cm-gutters': { backgroundColor: '#192434', color: '#a4aec1', border: 'none' },
              '&.cm-editor.cm-focused': { outline: '2px solid #75aaff', outlineOffset: '-2px' },
              '.cm-completionInfo': {
                whiteSpace: 'pre-wrap',
                maxHeight: '10rem',
                overflow: 'auto',
              },
              '.cm-html-abbreviation-hint': {
                padding: '7px 12px',
                color: '#c2cede',
                backgroundColor: '#192434',
                fontFamily: '"Source Sans 3", sans-serif',
                fontSize: '12px',
                lineHeight: '1.4',
              },
            }),
          ],
        }),
    });
    view.current = instance;
    // A fresh listener is appended after restoring state; remove listeners before caching below.
    const listener = new Compartment();
    instance.dispatch({
      effects: StateEffect.appendConfig.of(
        listener.of(
          EditorView.updateListener.of((update) => {
            if (update.transactions.some((tr) => tr.docChanged && !tr.annotation(externalValue)))
              callback.current(update.state.doc.toString());
            if (update.selectionSet || update.docChanged) notifyPosition();
          }),
        ),
      ),
    });
    instance.dispatch({
      effects: [
        readonly.reconfigure(accessSettings(readOnly, path)),
        labelConfig.reconfigure(
          EditorView.contentAttributes.of({ 'aria-label': `${label}: ${path}` }),
        ),
      ],
    });
    syncText(instance, value);
    const position = cached?.position ?? initialView;
    if (position) {
      instance.dispatch({
        selection: {
          anchor: Math.min(position.anchor, instance.state.doc.length),
          head: Math.min(position.head, instance.state.doc.length),
        },
      });
      instance.scrollDOM.scrollTop = position.scrollTop;
    }
    compartments.current = {
      state: instance.state,
      position: { anchor: 0, head: 0, scrollTop: 0 },
      readonly,
      label: labelConfig,
      size,
    };
    instance.scrollDOM.addEventListener('scroll', notifyPosition);

    return () => {
      if (positionTimer) clearTimeout(positionTimer);
      instance.scrollDOM.removeEventListener('scroll', notifyPosition);
      instance.dispatch({ effects: listener.reconfigure([]) });
      clearReveal(instance);
      if (sessionKey) {
        const position = {
          anchor: instance.state.selection.main.anchor,
          head: instance.state.selection.main.head,
          scrollTop: instance.scrollDOM.scrollTop,
        };
        saveSessionPosition?.(position);
        sessions.set(sessionKey, {
          state: instance.state,
          position,
          readonly,
          label: labelConfig,
          size,
        });
        if (sessions.size > 50) sessions.delete(sessions.keys().next().value!);
      }
      instance.destroy();
      view.current = null;
    };
    // A file switch starts an independent editing session. Value updates are applied below.
  }, [path, sessionKey]);
  useEffect(() => {
    const instance = view.current,
      config = compartments.current;
    if (instance && config)
      instance.dispatch({
        effects: [
          config.readonly.reconfigure(accessSettings(readOnly, path)),
          config.label.reconfigure(
            EditorView.contentAttributes.of({ 'aria-label': `${label}: ${path}` }),
          ),
          config.size.reconfigure(
            EditorView.theme({ '.cm-scroller': { minHeight: `${minHeight}px` } }),
          ),
        ],
      });
  }, [readOnly, label, path, minHeight]);
  useEffect(() => {
    const instance = view.current;
    if (instance) syncText(instance, value);
  }, [value]);
  useEffect(() => {
    const instance = view.current;
    if (!instance || !reveal || reveal.path !== path || !reveal.valid()) return;
    const range = reveal.range;
    if (
      range &&
      range.from >= 0 &&
      range.to >= range.from &&
      range.to <= instance.state.doc.length
    ) {
      instance.dispatch({
        selection: { anchor: range.from, head: range.to },
        scrollIntoView: true,
        annotations: Transaction.addToHistory.of(false),
      });
      revealedSelection.current = instance.state.selection;
    } else instance.dispatch({ effects: EditorView.scrollIntoView(instance.state.selection.main) });
    instance.focus();
    return () => {
      if (view.current === instance) clearReveal(instance);
    };
  }, [path, sessionKey, reveal]);
  return <div className="code-editor" ref={container} style={{ minHeight }} />;
}
