import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Loader2, SearchCheck, Send, Sparkles, Trash2 } from 'lucide-react';
import Markdown from 'react-markdown';
import type { AttemptSnapshot, SandboxRunResult } from '@zdaj/shared';
import { api, errorMessage } from '../api';
import {
  collectFindings,
  courseCheckFindings,
  selectAiFiles,
  type CheckFinding,
} from '../ai-findings';
import type { ConsoleEntry } from '../preview-console';
import type { ProjectStore } from '../project-store';
import { ErrorNotice } from './common';
import '../ai-assistant.css';

interface Used {
  sheet: boolean;
  files: string[];
  omittedFiles: string[];
  history: number;
}
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  used?: Used;
}
const MAX_HISTORY = 8;
const MAX_HISTORY_CHARACTERS = 6000;
const REVIEW_PROMPT =
  'Przejrzyj cały mój projekt. Porównaj pliki z wymaganiami arkusza i z wynikami kontroli. Odpowiedz w trzech częściach: co już działa, co poprawić, czego się nauczyć.';

export function AiAssistant({
  store,
  attempt,
  activePath,
  available,
  hasSheet,
  manual,
  console: consoleEntries,
  run,
}: {
  store: ProjectStore;
  attempt: AttemptSnapshot;
  /** File open in the editor; it is always sent in full. */
  activePath: string;
  available: boolean;
  /** The paper has a reviewed original PDF the server can read. */
  hasSheet: boolean;
  manual: boolean;
  console: readonly ConsoleEntry[];
  run: SandboxRunResult | null;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]),
    [input, setInput] = useState(''),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false),
    [error, setError] = useState('');
  const log = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const element = log.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, busy]);

  const guide = attempt.study?.guide;
  const lesson = guide?.steps
    .flatMap((step) =>
      (step.activities ?? []).map((activity) => ({ id: `${step.id}/${activity.id}`, activity })),
    )
    .find((position) => position.id === attempt.study?.current);
  const preview = selectAiFiles(attempt.files ?? [], activePath);
  const reads = [
    hasSheet ? 'tekst arkusza' : 'opis zadania',
    ...(lesson ? ['bieżący krok kursu'] : []),
    ...(preview.active ? [preview.active.path] : []),
    ...(preview.files.length ? [`pozostałe pliki tekstowe (${preview.files.length})`] : []),
    'wyniki kontroli i komunikaty błędów',
  ];

  const ask = async (question: string) => {
    const prompt = question.trim();
    if (prompt.length < 3 || busy || !consent) return;
    const history = messages
      .slice(-MAX_HISTORY)
      .map(({ role, content }) => ({ role, content: content.slice(0, MAX_HISTORY_CHARACTERS) }));
    setMessages((current) => [...current, { role: 'user', content: prompt }]);
    setInput('');
    setBusy(true);
    setError('');
    try {
      await store.flush();
      const project = store.get().project;
      const selection = selectAiFiles(project.files ?? [], activePath);
      let checks: CheckFinding[] = [];
      try {
        checks = await courseCheckFindings(project);
      } catch {
        /* The assistant can still read the files without the course checks. */
      }
      const position = project.study?.guide ? project.study.current : undefined;
      const response = await store.request((latest) =>
        api<{ text: string; used?: Used }>('/ai', {
          method: 'POST',
          body: {
            attemptId: latest.ticket.id,
            attemptToken: latest.ticket.token,
            prompt,
            code: selection.active?.content ?? '',
            ...(selection.active ? { codePath: selection.active.path } : {}),
            files: selection.files,
            fileNames: selection.fileNames,
            history,
            ...(position && /^\w[\w-]*\/\w[\w-]*$/.test(position)
              ? { activity: position, guideVersion: project.study!.guide.version }
              : {}),
            diagnostics: collectFindings({
              files: project.files ?? [],
              requiredFiles: project.study?.guide?.project?.requiredFiles,
              checks,
              console: consoleEntries,
              run,
            }),
            consent: true,
          },
        }),
      );
      if (mounted.current)
        setMessages((current) => [
          ...current,
          { role: 'assistant', content: response.text, used: response.used },
        ]);
    } catch (cause) {
      if (!mounted.current) return;
      // The question was not answered: return it to the field instead of losing it.
      setMessages((current) =>
        current.at(-1)?.role === 'user' && current.at(-1)?.content === prompt
          ? current.slice(0, -1)
          : current,
      );
      setInput((current) => current || prompt);
      setError(errorMessage(cause));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void ask(input);
  };
  const suggestions = [
    ...(preview.active
      ? [
          {
            label: 'Co jest nie tak w tym pliku?',
            prompt: `Znajdź błędy w otwartym pliku ${preview.active.path} względem wymagań arkusza i wyjaśnij, skąd się biorą.`,
          },
        ]
      : []),
    ...(lesson
      ? [
          {
            label: 'Wyjaśnij ten krok',
            prompt: `Wyjaśnij, co mam zrobić w bieżącym kroku kursu („${lesson.activity.title}”) i dlaczego. Sprawdź, czy mój kod już to spełnia.`,
          },
        ]
      : []),
    {
      label: 'Od czego zacząć?',
      prompt:
        'W jakiej kolejności wykonać ten arkusz? Podaj plan pracy według arkusza i wskaż, co już mam w projekcie.',
    },
  ];

  return (
    <section className="ai-panel ai-assistant" aria-label="Asystent AI">
      <div className="ai-panel-heading">
        <Sparkles size={23} />
        <div>
          <h2>Asystent arkusza</h2>
          <p>
            Czyta arkusz i Twoje pliki, wskazuje błąd i tłumaczy, skąd się wziął. Nie uruchamia
            kodu, a jego odpowiedź nie jest oceną egzaminacyjną.
          </p>
        </div>
        <span className={`pill ${available ? '' : 'subtle'}`}>
          {available ? 'DeepSeek' : 'AI wyłączone'}
        </span>
      </div>
      {available ? (
        <>
          {messages.length > 0 && (
            <div className="ai-log" ref={log} role="log" aria-live="polite" tabIndex={0}>
              {messages.map((message, index) => (
                <article key={index} className={`ai-message ${message.role}`}>
                  <span className="ai-author">{message.role === 'user' ? 'Ty' : 'Asystent'}</span>
                  {message.role === 'assistant' ? (
                    <div className="ai-response prose">
                      <Markdown>{message.content}</Markdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                  {message.used && (
                    <small className="ai-used">
                      Przeczytano: {message.used.sheet ? 'tekst arkusza' : 'bez tekstu arkusza'}
                      {message.used.files.length > 0 && ` · ${message.used.files.join(', ')}`}
                      {message.used.omittedFiles.length > 0 &&
                        ` · pominięto z braku miejsca: ${message.used.omittedFiles.join(', ')}`}
                    </small>
                  )}
                </article>
              ))}
              {busy && (
                <p className="ai-waiting">
                  <Loader2 size={16} className="spin" />
                  Asystent czyta arkusz i pliki…
                </p>
              )}
            </div>
          )}
          <ErrorNotice message={error} />
          <div className="ai-suggestions">
            <button
              className="button secondary small"
              disabled={busy || !consent}
              onClick={() => void ask(REVIEW_PROMPT)}
            >
              <SearchCheck size={15} />
              Sprawdź mój projekt
            </button>
            {suggestions.map((item) => (
              <button
                key={item.label}
                className="button quiet small"
                disabled={busy || !consent}
                onClick={() => void ask(item.prompt)}
              >
                {item.label}
              </button>
            ))}
            {messages.length > 0 && (
              <button
                className="button quiet small ai-clear"
                disabled={busy}
                onClick={() => {
                  setMessages([]);
                  setError('');
                }}
              >
                <Trash2 size={14} />
                Wyczyść rozmowę
              </button>
            )}
          </div>
          <label className="field ai-input">
            <span>Twoje pytanie</span>
            <textarea
              rows={3}
              value={input}
              maxLength={4000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Np. Dlaczego menu nie ustawia się obok treści? Enter wysyła, Shift+Enter dodaje wiersz."
            />
          </label>
          <div className="ai-send-row">
            <label className="checkbox-field">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>
                Zgadzam się na przesłanie do DeepSeek pytań z tej rozmowy, plików tekstowych
                projektu oraz wyników kontroli. Nie wpisuję danych osobowych ani kluczy.
              </span>
            </label>
            <button
              className="button primary"
              disabled={!consent || input.trim().length < 3 || busy}
              onClick={() => void ask(input)}
            >
              {busy ? <Loader2 size={17} className="spin" /> : <Send size={17} />}
              Zapytaj
            </button>
          </div>
          <p className="fine-print">
            Asystent czyta: {reads.join(' · ')}. Rozmowa zostaje tylko w tej karcie i znika po jej
            zamknięciu.
          </p>
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
  );
}
