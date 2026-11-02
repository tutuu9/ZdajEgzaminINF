import { useEffect, useState, type ReactNode } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  Database,
  FileCode2,
  FolderOpen,
  Image,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Level, Mode } from '@zdaj/shared';

export const LEVELS: { id: Level; label: string; short: string; description: string }[] = [
  {
    id: 'beginner',
    label: 'Od podstaw',
    short: 'Od podstaw',
    description: 'Wyjaśnienia i małe kroki',
  },
  {
    id: 'intermediate',
    label: 'Średniozaawansowany',
    short: 'Średni',
    description: 'Utrwalanie samodzielnej pracy',
  },
  {
    id: 'advanced',
    label: 'Zaawansowany',
    short: 'Zaawansowany',
    description: 'Łączenie umiejętności',
  },
];
export const MODES: { id: Mode; label: string; description: string }[] = [
  { id: 'nauka', label: 'Nauka', description: 'Pracuj krok po kroku z objaśnieniami.' },
  { id: 'trening', label: 'Trening', description: 'Spróbuj samodzielnie. Podpowiedź jest opcją.' },
  {
    id: 'egzamin',
    label: 'Egzamin',
    description: 'Zadanie na czas. Omówienie dopiero po oddaniu.',
  },
];
export const levelLabel = (level: Level) =>
  LEVELS.find((item) => item.id === level)?.label || level;
export const modeLabel = (mode: Mode) => MODES.find((item) => item.id === mode)?.label || mode;
export function TopicIcon({ id, size = 22 }: { id: string; size?: number }) {
  const Component =
    {
      tools: FolderOpen,
      'html-css': FileCode2,
      javascript: Code2,
      sql: Database,
      php: Code2,
      'graphics-security': Image,
    }[id] || BookOpen;
  return <Component size={size} strokeWidth={1.7} />;
}
export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="notice error" role="alert">
      <AlertCircle size={20} />
      <div>
        {message}
        {onRetry && (
          <button className="text-button" onClick={onRetry}>
            Spróbuj ponownie
          </button>
        )}
      </div>
    </div>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="notice">
      <ShieldCheck size={19} />
      <div>{children}</div>
    </div>
  );
}
export function Loading({ label = 'Ładowanie pracowni…' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <Loader2 className="spin" size={24} />
      {label}
    </div>
  );
}
export function PageHeading({
  kicker,
  title,
  children,
  action,
}: {
  kicker?: string;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        {kicker && <div className="eyebrow">{kicker}</div>}
        <h1>{title}</h1>
        {children && <p>{children}</p>}
      </div>
      {action}
    </header>
  );
}
export function EmptyState({
  title,
  children,
  to,
  label,
}: {
  title: string;
  children: ReactNode;
  to?: string;
  label?: string;
}) {
  return (
    <div className="empty-state">
      <BookOpen size={34} />
      <h2>{title}</h2>
      <p>{children}</p>
      {to && (
        <Link className="button primary" to={to}>
          {label || 'Zacznij naukę'}
          <ChevronRight size={17} />
        </Link>
      )}
    </div>
  );
}
export function LevelPicker({
  value,
  onChange,
}: {
  value: Level;
  onChange: (value: Level) => void;
}) {
  return (
    <div className="level-picker" role="group" aria-label="Poziom przygotowania">
      {LEVELS.map((level) => (
        <button
          key={level.id}
          onClick={() => onChange(level.id)}
          className={value === level.id ? 'selected' : ''}
          aria-pressed={value === level.id}
        >
          <span>{level.label}</span>
          <small>{level.description}</small>
          {value === level.id && <Check size={17} />}
        </button>
      ))}
    </div>
  );
}
export function ModePicker({
  value,
  onChange,
  disabledModes = [],
}: {
  value: Mode;
  onChange: (value: Mode) => void;
  disabledModes?: Mode[];
}) {
  return (
    <div className="mode-picker" role="group" aria-label="Tryb pracy">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          disabled={disabledModes.includes(mode.id)}
          onClick={() => onChange(mode.id)}
          className={value === mode.id ? 'selected' : ''}
          aria-pressed={value === mode.id}
        >
          <strong>{mode.label}</strong>
          <span>{mode.description}</span>
        </button>
      ))}
    </div>
  );
}
export function Timer({
  deadlineAt,
  onExpire,
}: {
  deadlineAt: string | null;
  onExpire?: () => void;
}) {
  const [left, setLeft] = useState(() =>
    deadlineAt ? Math.max(0, Date.parse(deadlineAt) - Date.now()) : 0,
  );
  useEffect(() => {
    if (!deadlineAt) return;
    const tick = () => setLeft(Math.max(0, Date.parse(deadlineAt) - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [deadlineAt]);
  useEffect(() => {
    if (deadlineAt && left === 0) onExpire?.();
  }, [deadlineAt, left, onExpire]);
  if (!deadlineAt) return null;
  const seconds = Math.ceil(left / 1000);
  return (
    <span className={`timer ${left < 300000 ? 'urgent' : ''}`} aria-label="Pozostały czas">
      <Clock3 size={17} />
      {Math.floor(seconds / 60)
        .toString()
        .padStart(2, '0')}
      :{(seconds % 60).toString().padStart(2, '0')}
    </span>
  );
}
export function Tags({ items }: { items: string[] }) {
  return (
    <div className="tags">
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="external-link" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}
export function CompletedLabel() {
  return (
    <span className="completed-label">
      <CheckCircle2 size={16} />
      Ukończono
    </span>
  );
}
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  );
}
