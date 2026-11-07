import { useEffect, useRef, useState } from 'react';
import type { ProjectFile } from '@zdaj/shared';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { createPreview } from '../preview';

/** Separate, script-free frames compare snapshots without changing the editor or its preview. */
export function ChangePreview({
  before,
  after,
  preferredEntry,
  onClose,
}: {
  before: ProjectFile[];
  after: ProjectFile[];
  preferredEntry: string;
  onClose: () => void;
}) {
  const entries = [
    ...new Set(
      [...after, ...before]
        .filter((file) => file.encoding !== 'base64' && /\.(?:html?|php)$/i.test(file.path))
        .map((file) => file.path),
    ),
  ];
  const [chosen, setChosen] = useState(preferredEntry);
  const entry = entries.includes(chosen)
    ? chosen
    : entries.includes(preferredEntry)
      ? preferredEntry
      : (entries[0] ?? '');
  const [phase, setPhase] = useState<'before' | 'after'>('after');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }, []);
  return (
    <section className="change-preview" aria-label="Porównanie strony">
      <header>
        <h3 ref={heading} tabIndex={-1}>
          Porównaj swoją zmianę
        </h3>
        <button type="button" className="button quiet small" onClick={onClose}>
          <ArrowLeft size={15} aria-hidden="true" /> Wróć do podglądu
        </button>
      </header>
      <label className="change-entry">
        Porównywana strona
        <select
          value={entry}
          disabled={!entries.length}
          onChange={(event) => setChosen(event.target.value)}
        >
          {!entries.length && <option value="">Brak pliku HTML</option>}
          {entries.map((path) => (
            <option key={path}>{path}</option>
          ))}
        </select>
      </label>
      <div className="change-phases" role="group" aria-label="Wersja podglądu">
        <button type="button" aria-pressed={phase === 'before'} onClick={() => setPhase('before')}>
          Przed
        </button>
        <button type="button" aria-pressed={phase === 'after'} onClick={() => setPhase('after')}>
          Po
        </button>
      </div>
      <p className="change-caption">
        {phase === 'before'
          ? 'Twój zapis sprzed tego kroku.'
          : 'Twoje bieżące pliki — edytuj je, aby zobaczyć zmianę.'}
      </p>
      <div hidden={phase !== 'before'}>
        <StaticComparisonFrame files={before} entry={entry} phase="before" />
      </div>
      <div hidden={phase !== 'after'}>
        <StaticComparisonFrame files={after} entry={entry} phase="after" />
      </div>
      <p className="fine-print">
        <ShieldCheck size={14} aria-hidden="true" /> Statyczny HTML/CSS. JavaScript i PHP nie są
        wykonywane. Widoki mają ten sam rozmiar; to porównanie Twoich plików, nie wzorzec CKE.
      </p>
    </section>
  );
}

function StaticComparisonFrame({
  files,
  entry,
  phase,
}: {
  files: ProjectFile[];
  entry: string;
  phase: 'before' | 'after';
}) {
  const [prepared, setPrepared] = useState<{
    files: ProjectFile[];
    entry: string;
    html: string;
    error?: string;
  }>();
  useEffect(() => {
    let dispose = () => undefined as void;
    const timer = setTimeout(() => {
      try {
        const preview = createPreview(files, entry, { scripts: false });
        dispose = preview.dispose;
        setPrepared({ files, entry, html: preview.html });
      } catch {
        setPrepared({
          files,
          entry,
          html: '',
          error: 'Nie udało się przygotować tego podglądu. Twoje pliki pozostają zapisane.',
        });
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      dispose();
    };
  }, [files, entry]);
  const current = prepared?.files === files && prepared.entry === entry ? prepared : undefined;
  return !current ? (
    <p role="status">Odświeżanie podglądu…</p>
  ) : current.html ? (
    <iframe
      key={entry}
      title={phase === 'before' ? 'Strona przed zmianą' : 'Strona po zmianie'}
      sandbox=""
      referrerPolicy="no-referrer"
      srcDoc={current.html}
    />
  ) : (
    <p role="status">
      {current.error ??
        'W tej wersji nie ma jeszcze wybranej strony HTML. Porównaj zmienione wiersze w kodzie.'}
    </p>
  );
}
