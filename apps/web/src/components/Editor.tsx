import { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
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
import { expandHtmlAbbreviation, supportsHtmlAbbreviation } from './editor-abbreviation';

const readableHighlightStyle = HighlightStyle.define(
  oneDarkHighlightStyle.specs.map((spec) => ({
    ...spec,
    color: spec.color === '#7d8799' ? '#a4aec1' : spec.color,
  })),
);

export function Editor({
  value,
  path,
  onChange,
  readOnly = false,
  label = 'Edytor kodu',
  minHeight = 260,
}: {
  value: string;
  path: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  label?: string;
  minHeight?: number;
}) {
  const container = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    callback = useRef(onChange);
  callback.current = onChange;
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
    const instance = new EditorView({
      parent: container.current,
      state: EditorState.create({
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
            { key: 'Tab', run: expandHtmlAbbreviation(path) },
            indentWithTab,
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          oneDarkTheme,
          language,
          EditorView.lineWrapping,
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          EditorView.contentAttributes.of({ 'aria-label': `${label}: ${path}` }),
          !readOnly && supportsHtmlAbbreviation(path)
            ? showPanel.of(() => {
                const dom = document.createElement('div');
                dom.className = 'cm-html-abbreviation-hint';
                dom.textContent = `Szkielet HTML: wpisz ! w osobnym wierszu i naciśnij Tab.${/\.php$/i.test(path) ? ' Działa poza kodem PHP.' : ''}`;
                return { dom, bottom: true };
              })
            : [],
          EditorView.updateListener.of((update) => {
            if (update.docChanged) callback.current(update.state.doc.toString());
          }),
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
    return () => {
      instance.destroy();
      view.current = null;
    };
    // A file switch starts an independent editing session. Value updates are applied below.
  }, [path, readOnly, label, minHeight]);
  useEffect(() => {
    const instance = view.current;
    if (instance && instance.state.doc.toString() !== value)
      instance.dispatch({ changes: { from: 0, to: instance.state.doc.length, insert: value } });
  }, [value]);
  return <div className="code-editor" ref={container} style={{ minHeight }} />;
}
