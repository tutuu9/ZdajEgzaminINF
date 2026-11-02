import { useState } from 'react';
import { readStudyArchive, downloadBlob } from '../storage';
import { ErrorNotice } from './common';

export function ArchivedNotes({ projectId }: { projectId: string }) {
  const [entries, setEntries] = useState<{ key: string; content: string }[]>([]),
    [error, setError] = useState(''),
    [loaded, setLoaded] = useState(false);
  const load = async () => {
    if (loaded) return;
    try {
      const stored = await readStudyArchive(projectId);
      const notes = stored.flatMap((entry) => {
        if (!entry.key.startsWith('exercise:study-flow-')) return [entry];
        try {
          const value = JSON.parse(entry.content) as { drafts?: Record<string, unknown> };
          return Object.entries(value.drafts ?? {})
            .filter((pair): pair is [string, string] => typeof pair[1] === 'string')
            .map(([key, content]) => ({ key, content }));
        } catch {
          return [entry];
        }
      });
      setEntries(notes);
      setLoaded(true);
    } catch {
      setError('Nie udało się odczytać archiwum. Twoje wcześniejsze zapisy pozostają bez zmian.');
    }
  };
  return (
    <details
      className="course-archive"
      onToggle={(event) => {
        if (event.currentTarget.open) void load();
      }}
    >
      <summary>Wcześniejsze notatniki — zachowane bez zmian</summary>
      <p>
        Dawne fragmenty pozostają tutaj. Nie łączymy ich automatycznie z projektem. Obejrzyj
        fragment i skopiuj wybrany tekst do właściwego pliku.
      </p>
      <ErrorNotice message={error} onRetry={() => void load()} />
      {loaded && !entries.length && <p>Nie znaleziono wcześniejszych fragmentów dla tej pracy.</p>}
      {entries.map((entry) => (
        <details key={entry.key}>
          <summary>{entry.key.replace(`exercise:study-${projectId}-`, '')}</summary>
          <pre tabIndex={0}>{entry.content}</pre>
          <button
            className="button secondary small"
            onClick={() => {
              void navigator.clipboard
                .writeText(entry.content)
                .catch(() =>
                  setError('Zaznacz i skopiuj tekst ręcznie — schowek jest niedostępny.'),
                );
            }}
          >
            Kopiuj fragment
          </button>
          <button
            className="button quiet small"
            onClick={() =>
              downloadBlob(
                new Blob([entry.content], { type: 'text/plain;charset=utf-8' }),
                'wczesniejsza-notatka.txt',
              )
            }
          >
            Pobierz notatkę
          </button>
        </details>
      ))}
    </details>
  );
}
