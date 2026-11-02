import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ThemePreference = 'system' | 'light' | 'dark';
type Theme = 'light' | 'dark';
const storageKey = 'zdaj-theme';
const ThemeContext = createContext<{
  preference: ThemePreference;
  theme: Theme;
  error: string;
  choose: (preference: ThemePreference) => void;
} | null>(null);

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    // Theme selection is optional; learner storage is managed independently.
  }
  return 'system';
}

function resolvedTheme(preference: ThemePreference): Theme {
  return preference === 'system'
    ? matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
    : preference;
}

function applyTheme(preference: ThemePreference): Theme {
  const theme = resolvedTheme(preference);
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.themePreference = preference;
  document.documentElement.style.colorScheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#101419' : '#f5f5f7');
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(readPreference);
  const [theme, setTheme] = useState(() => resolvedTheme(preference));
  const [error, setError] = useState('');

  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)');
    const update = () => setTheme(applyTheme(preference));
    const storageChanged = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      const next = readPreference();
      setPreference(next);
      setTheme(applyTheme(next));
      setError('');
    };
    update();
    media.addEventListener('change', update);
    window.addEventListener('storage', storageChanged);
    return () => {
      media.removeEventListener('change', update);
      window.removeEventListener('storage', storageChanged);
    };
  }, [preference]);

  function choose(next: ThemePreference) {
    setPreference(next);
    setTheme(applyTheme(next));
    setError('');
    try {
      if (next === 'system') localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, next);
    } catch {
      setError('Motyw zmieniono. Przeglądarka nie pozwala zapisać wyboru na kolejne wizyty.');
    }
  }

  return (
    <ThemeContext.Provider value={{ preference, theme, error, choose }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('ThemeProvider is required.');
  return theme;
}
