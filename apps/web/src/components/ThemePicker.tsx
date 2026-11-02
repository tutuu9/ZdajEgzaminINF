import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useTheme } from '../theme';

const choices = [
  { value: 'light', label: 'Jasny', icon: Sun },
  { value: 'dark', label: 'Ciemny', icon: Moon },
  { value: 'system', label: 'Systemowy', icon: Monitor },
] as const;

export function ThemePicker() {
  const { preference, theme, error, choose } = useTheme();
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const Icon = theme === 'dark' ? Moon : Sun;
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.current?.contains(event.target)) {
        details.current?.removeAttribute('open');
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, []);
  return (
    <details
      className="theme-picker"
      ref={details}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          details.current?.removeAttribute('open');
          trigger.current?.focus();
        }
      }}
    >
      <summary ref={trigger} aria-label="Zmień motyw" title="Zmień motyw">
        <Icon size={19} aria-hidden="true" />
      </summary>
      <div className="theme-menu" role="group" aria-label="Motyw kolorystyczny">
        <strong>Wygląd</strong>
        {choices.map(({ value, label, icon: ChoiceIcon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={preference === value}
            onClick={() => choose(value)}
          >
            <ChoiceIcon size={17} aria-hidden="true" />
            <span>{label}</span>
            {preference === value && <Check size={16} aria-hidden="true" />}
          </button>
        ))}
        {error && <p role="status">{error}</p>}
      </div>
    </details>
  );
}
