import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Disc3,
  File,
  FileText,
  FolderOpen,
  Loader2,
  Play,
  Upload,
  X,
} from 'lucide-react';
import type { CatalogEntry, ProjectFile } from '@zdaj/shared';
import { matchHandInFiles } from '../exam-report';
import { plural } from './common';
import {
  candidateProblem,
  fileSize,
  READING_MINUTES,
  readingDeadline,
  stationClock,
  type ReadingPhase,
} from '../exam-station';
import '../exam-station.css';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);
  return now;
}

/** Remaining time in h:mm:ss; calls onExpire once when it reaches zero. */
export function StationClock({
  deadlineAt,
  label,
  onExpire,
}: {
  deadlineAt: string;
  label: string;
  onExpire?: () => void;
}) {
  const now = useNow();
  const left = Math.max(0, Date.parse(deadlineAt) - now);
  const fired = useRef('');
  useEffect(() => {
    if (left === 0 && onExpire && fired.current !== deadlineAt) {
      fired.current = deadlineAt;
      onExpire();
    }
  }, [left, deadlineAt, onExpire]);
  return (
    <span
      className={`timer station-clock${left < 300_000 ? ' urgent' : ''}`}
      aria-label={label}
      title={label}
    >
      <Clock3 size={16} aria-hidden="true" />
      {stationClock(left)}
    </span>
  );
}

export function WallClock() {
  const now = useNow(15_000);
  return (
    <span className="station-wall-clock" aria-hidden="true">
      {new Date(now).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
    </span>
  );
}

/** Material archives (.7z/.zip) that the paper's publisher provides, if any. */
export function materialArchives(entry: CatalogEntry | undefined) {
  return (entry?.attachments ?? []).filter((item) => /^(7z|zip|rar)$/i.test(item.type));
}

export function ExamMaterials({ entry }: { entry: CatalogEntry | undefined }) {
  const archives = materialArchives(entry);
  return (
    <div className="station-materials">
      <h3>Materiały z arkusza</h3>
      {archives.length ? (
        <>
          <p>
            Na egzaminie archiwum z plikami leży na pulpicie i jest zabezpieczone hasłem podanym w
            arkuszu. Pobierz je teraz, a po starcie rozpakuj programem do archiwów (np. 7-Zip) i
            dodaj pliki do folderu z wynikami.
          </p>
          <ul>
            {archives.map((item) => (
              <li key={item.url}>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>
          Serwis nie ma archiwum z materiałami do tego arkusza. Przygotuj własną kopię plików albo
          pliki zastępcze o nazwach z arkusza.
        </p>
      )}
    </div>
  );
}

/** The 10 minutes before the clock: the paper is open, the editor is not. */
export function ExamReading({
  phase,
  title,
  durationMinutes,
  entry,
  busy,
  error,
  pdf,
  onCandidate,
  onStart,
  onCancel,
}: {
  phase: ReadingPhase;
  title: string;
  durationMinutes: number;
  entry: CatalogEntry | undefined;
  busy: boolean;
  error?: ReactNode;
  pdf: ReactNode;
  onCandidate: (value: string) => void;
  onStart: () => void;
  onCancel: () => void;
}) {
  const problem = candidateProblem(phase.candidate);
  return (
    <div className="exam-station reading">
      <div className="station-desktop">
        <section className="station-window reading-window" aria-labelledby="zapoznanie">
          <header className="station-window-bar">
            <FileText size={15} aria-hidden="true" />
            <span>Arkusz egzaminacyjny — {title}</span>
          </header>
          <div className="station-window-body">{pdf}</div>
        </section>
        <aside className="station-reading-panel" aria-label="Zapoznanie z zadaniem">
          <p className="station-simulation">Symulacja stanowiska · nie jest to system CKE</p>
          <h1 id="zapoznanie">Zapoznanie z zadaniem</h1>
          <p>
            Masz {READING_MINUTES} minut na przeczytanie arkusza. Ten czas nie wlicza się do{' '}
            {durationMinutes} minut pracy. Edytor otworzy się po rozpoczęciu egzaminu.
          </p>
          <label className="station-field">
            Numer zdającego (ćwiczeniowy)
            <input
              value={phase.candidate}
              maxLength={20}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={problem ? true : undefined}
              aria-describedby="numer-opis"
              onChange={(event) => onCandidate(event.target.value)}
            />
          </label>
          <small id="numer-opis" className={problem ? 'station-problem' : undefined}>
            {problem ??
              'Tak nazwiesz folder z wynikami i archiwum. Nie wpisuj prawdziwego numeru PESEL.'}
          </small>
          <ExamMaterials entry={entry} />
          {error}
          <button
            className="button primary full"
            disabled={busy || Boolean(problem)}
            onClick={onStart}
          >
            {busy ? <Loader2 className="spin" size={17} /> : <Play size={17} />}
            Rozpocznij pracę ({durationMinutes} minut)
          </button>
          <button className="button quiet full" disabled={busy} onClick={onCancel}>
            Wróć do wyboru trybu
          </button>
        </aside>
      </div>
      <div className="station-taskbar" role="presentation">
        <span className="station-start" aria-hidden="true">
          INF.03
        </span>
        <span className="station-task active">
          <FileText size={15} aria-hidden="true" />
          Arkusz PDF
        </span>
        <span className="station-taskbar-spacer" />
        <StationClock
          deadlineAt={readingDeadline(phase)}
          label="Czas na zapoznanie się z zadaniem"
          onExpire={problem ? undefined : onStart}
        />
        <WallClock />
      </div>
    </div>
  );
}

/** The results folder on the simulated desktop. */
export function ExamFolder({
  candidate,
  files,
  closed,
  busy,
  onUpload,
  onOpen,
}: {
  candidate: string;
  files: ProjectFile[];
  closed: boolean;
  busy: boolean;
  onUpload: (files: FileList | null) => void;
  onOpen: (path: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="station-window station-folder" aria-label={`Folder ${candidate}`}>
      <header className="station-window-bar">
        <FolderOpen size={15} aria-hidden="true" />
        <span>Pulpit › {candidate}</span>
      </header>
      <div className="station-window-body">
        {!closed && (
          <div className="station-folder-actions">
            <input
              ref={input}
              type="file"
              multiple
              accept=".zip,.html,.htm,.css,.js,.php,.sql,.txt,.json,.png,.jpg,.jpeg,.gif,.svg,.webp,.ico"
              className="visually-hidden"
              aria-label="Dodaj pliki do folderu"
              onChange={(event) => {
                onUpload(event.target.files);
                event.target.value = '';
              }}
            />
            <button
              className="button secondary small"
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              <Upload size={15} />
              Dodaj pliki z rozpakowanego archiwum
            </button>
            <small>
              Rozpakuj archiwum 7-Zip na swoim komputerze i wskaż pliki. Zrzuty ekranu wykonaj
              skrótem systemowym (np. Win+Shift+S) i dodaj je tutaj.
            </small>
          </div>
        )}
        {files.length ? (
          <table className="station-folder-table">
            <thead>
              <tr>
                <th scope="col">Nazwa</th>
                <th scope="col">Rozmiar</th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.path}>
                  <td>
                    <button className="station-folder-file" onClick={() => onOpen(file.path)}>
                      <File size={14} aria-hidden="true" />
                      {file.path}
                    </button>
                  </td>
                  <td>{fileSize(file)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="station-folder-empty">Folder jest pusty.</p>
        )}
      </div>
    </section>
  );
}

/** Final review of the results folder before the simulated disc is burnt. */
export function HandInDialog({
  candidate,
  files,
  required,
  busy,
  onCancel,
  onConfirm,
}: {
  candidate: string;
  files: ProjectFile[];
  required: string[] | undefined;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [burning, setBurning] = useState(false);
  const confirm = useRef(onConfirm);
  confirm.current = onConfirm;
  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);
  useEffect(() => {
    if (!burning) return;
    const timer = setTimeout(() => confirm.current(), 1200);
    return () => clearTimeout(timer);
  }, [burning]);
  const matched = required ? matchHandInFiles(required, files) : [];
  const missing = matched.filter((item) => item.status !== 'present');
  const working = burning || busy;
  return (
    <dialog
      ref={dialog}
      className="station-dialog"
      aria-labelledby="oddanie-tytul"
      onCancel={(event) => {
        event.preventDefault();
        if (!working) onCancel();
      }}
    >
      <header>
        <h2 id="oddanie-tytul">Zakończ egzamin</h2>
        <button
          className="icon-button"
          aria-label="Wróć do pracy"
          disabled={working}
          onClick={onCancel}
        >
          <X size={18} />
        </button>
      </header>
      <p>
        {files.length ? (
          <>
            Na płytę trafi folder <strong>{candidate}</strong> (
            {plural(files.length, 'plik', 'pliki', 'plików')}).
          </>
        ) : (
          <>
            Folder <strong>{candidate}</strong> jest pusty.
          </>
        )}{' '}
        Po oddaniu nie zmienisz już tej próby.
      </p>
      {required && (
        <section aria-label="Pliki wymagane przez arkusz">
          <h3>Pliki z listy rezultatów</h3>
          <ul className="station-hand-in">
            {matched.map((item) => (
              <li key={item.name} className={`hand-in-${item.status}`}>
                {item.status === 'present' ? (
                  <CheckCircle2 size={15} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={15} aria-hidden="true" />
                )}
                <span>{item.name}</span>
                <small>
                  {item.status === 'present'
                    ? 'jest w folderze'
                    : item.status === 'wrong-case'
                      ? `inna wielkość liter: ${item.actual}`
                      : 'brak w folderze'}
                </small>
              </li>
            ))}
          </ul>
          {missing.length > 0 && (
            <p className="station-problem" role="status">
              Do sprawdzenia przed oddaniem: {missing.length} z {matched.length}{' '}
              {matched.length === 1 ? 'pliku' : 'plików'} z listy. Zrzuty ekranu i obrazy możesz
              dodać w oknie Folder.
            </p>
          )}
        </section>
      )}
      <ul className="station-reminders">
        <li>Sprawdź nazwy plików i folderu z arkuszem.</li>
        <li>Jeśli arkusz tego wymaga, dodaj plik przeglądarka.txt.</li>
        <li>Na egzaminie sprawdzasz też, czy nagraną płytę da się odczytać.</li>
      </ul>
      <footer>
        <button className="button quiet" disabled={working} onClick={onCancel}>
          Wróć do pracy
        </button>
        <button className="button primary" disabled={working} onClick={() => setBurning(true)}>
          {working ? <Loader2 className="spin" size={17} /> : <Disc3 size={17} />}
          {working ? 'Nagrywanie płyty…' : 'Nagraj płytę i oddaj pracę'}
        </button>
      </footer>
    </dialog>
  );
}
