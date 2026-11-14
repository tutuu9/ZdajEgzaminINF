import { AlertCircle, AlertTriangle, ChevronRight, Info, Trash2 } from 'lucide-react';
import type { ConsoleEntry } from '../preview-console';

const levelLabel = { log: 'Komunikat', info: 'Informacja', warn: 'Ostrzeżenie', error: 'Błąd' };

/** What the learner's JavaScript printed or broke on. Entries are shown as plain text only. */
export function PreviewConsole({
  entries,
  running,
  onClear,
}: {
  entries: ConsoleEntry[];
  running: boolean;
  onClear: () => void;
}) {
  const errors = entries.filter((entry) => entry.level === 'error').length;
  return (
    <section className="preview-console" aria-label="Konsola JavaScript">
      <div className="preview-console-heading">
        <h3>
          Konsola JavaScript
          {errors > 0 && <span className="preview-console-count">{errors}</span>}
        </h3>
        <button
          className="icon-button"
          aria-label="Wyczyść konsolę"
          disabled={!entries.length}
          onClick={onClear}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <ol className="preview-console-list" role="log" aria-live="polite">
        {entries.map((entry, index) => (
          <li key={index} className={`console-${entry.level}`}>
            {entry.level === 'error' ? (
              <AlertCircle size={14} />
            ) : entry.level === 'warn' ? (
              <AlertTriangle size={14} />
            ) : entry.level === 'info' ? (
              <Info size={14} />
            ) : (
              <ChevronRight size={14} />
            )}
            <span className="visually-hidden">{levelLabel[entry.level]}: </span>
            <span className="preview-console-text">{entry.text}</span>
            {entry.file && (
              <span className="preview-console-source">
                {entry.file}
                {entry.line ? `, wiersz ${entry.line}` : ''}
              </span>
            )}
          </li>
        ))}
      </ol>
      {!entries.length && (
        <p className="preview-console-empty">
          {running
            ? 'Brak komunikatów. Tutaj pojawią się wyniki console.log i błędy skryptu.'
            : 'Uruchom JS, aby zobaczyć wyniki console.log i błędy skryptu.'}
        </p>
      )}
    </section>
  );
}
