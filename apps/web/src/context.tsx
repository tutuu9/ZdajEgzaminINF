import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import type { AttemptSnapshot, Bootstrap, Level } from '@zdaj/shared';
import { api, errorMessage, initializeSession } from './api';
import { completedLessons, getLevel, listAttempts, storeLevel } from './storage';

interface AppContextValue {
  data: Bootstrap | null;
  loading: boolean;
  error: string;
  level: Level;
  setLevel: (level: Level) => void;
  attempts: AttemptSnapshot[];
  completed: string[];
  /** False until saved work has been read once; lists are not yet known to be empty. */
  progressLoaded: boolean;
  reload: () => Promise<void>;
  refreshProgress: () => Promise<void>;
}
const Context = createContext<AppContextValue | null>(null);
export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Bootstrap | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [level, updateLevel] = useState<Level>('beginner'),
    [attempts, setAttempts] = useState<AttemptSnapshot[]>([]),
    [completed, setCompleted] = useState<string[]>([]),
    [progressLoaded, setProgressLoaded] = useState(false);
  const location = useLocation();
  const refreshProgress = useCallback(async () => {
    try {
      const [all, lessons, savedLevel] = await Promise.all([
        listAttempts(),
        completedLessons(),
        getLevel(),
      ]);
      setAttempts(all);
      setCompleted(lessons);
      updateLevel(savedLevel);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setProgressLoaded(true);
    }
  }, []);
  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await initializeSession();
      setData(await api<Bootstrap>('/bootstrap'));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    void getLevel()
      .then(updateLevel)
      .catch(() =>
        setError(
          'Przeglądarka nie udostępnia lokalnego zapisu. Włącz przechowywanie danych dla tej witryny.',
        ),
      );
  }, [reload]);
  useEffect(() => {
    void refreshProgress();
  }, [location.pathname, refreshProgress]);
  const setLevel = (value: Level) => {
    updateLevel(value);
    void storeLevel(value).catch((e) => setError(errorMessage(e)));
  };
  return (
    <Context.Provider
      value={{
        data,
        loading,
        error,
        level,
        setLevel,
        attempts,
        completed,
        progressLoaded,
        reload,
        refreshProgress,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useApp(): AppContextValue {
  const context = useContext(Context);
  if (!context) throw new Error('AppProvider missing');
  return context;
}
