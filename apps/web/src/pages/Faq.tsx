import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Link2, Search } from 'lucide-react';
import {
  FAQ_CATEGORIES,
  type FaqCategoryId,
  type FaqResponse,
  type FaqRevision,
} from '@zdaj/shared';
import { api, errorMessage } from '../api';
import { ErrorNotice, Loading, PageHeading } from '../components/common';
import { FaqAnswer } from '../components/FaqAnswer';
import { filterFaqEntries } from '../faq-search';
import '../faq.css';

function FaqItem({ entry, active }: { entry: FaqRevision; active: boolean }) {
  const [open, setOpen] = useState(active);
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!active) return;
    setOpen(true);
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ block: 'start' });
      ref.current?.querySelector('summary')?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [active]);
  return (
    <details
      className="faq-item"
      id={entry.id}
      ref={ref}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span>{entry.question}</span>
        <ChevronDown size={20} aria-hidden="true" />
      </summary>
      <FaqAnswer entry={entry} />
      <Link className="faq-permalink" to={`/faq#${encodeURIComponent(entry.id)}`}>
        <Link2 size={16} aria-hidden="true" />
        Link do tej odpowiedzi
      </Link>
    </details>
  );
}

export function Faq() {
  const [entries, setEntries] = useState<FaqRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = params.get('q') ?? '';
  const category: FaqCategoryId | 'all' =
    FAQ_CATEGORIES.find((item) => item.id === params.get('category'))?.id ?? 'all';
  let activeId = '';
  try {
    activeId = decodeURIComponent(location.hash.slice(1));
  } catch {
    // A malformed fragment is an unknown question, not a failed page.
  }
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEntries((await api<FaqResponse>('/faq')).entries);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const filtered = filterFaqEntries(entries, query, category);
  useEffect(() => {
    if (
      activeId &&
      entries.some((entry) => entry.id === activeId) &&
      !filtered.some((entry) => entry.id === activeId)
    ) {
      void navigate({ pathname: '/faq', hash: location.hash }, { replace: true });
    }
  }, [activeId, entries, filtered, location.hash, navigate]);
  const changeFilters = (search: string, nextCategory: FaqCategoryId | 'all') => {
    const next = new URLSearchParams();
    if (search) next.set('q', search);
    if (nextCategory !== 'all') next.set('category', nextCategory);
    void navigate({ pathname: '/faq', search: next.toString() }, { replace: true });
  };
  return (
    <div className="faq-page">
      <PageHeading title="Pytania i odpowiedzi">
        Od pierwszego zapisu po oddanie pracy. Znajdź odpowiedź i sprawdź jej źródło.
      </PageHeading>
      <div className="faq-filters" role="search" aria-label="Wyszukiwanie odpowiedzi">
        <label className="field faq-search-field">
          <span>Szukaj w pytaniach i odpowiedziach</span>
          <div className="faq-search-control">
            <Search size={20} aria-hidden="true" />
            <input
              type="search"
              value={query}
              maxLength={300}
              placeholder="Np. czas, poprawka, pliki…"
              onChange={(event) => changeFilters(event.target.value, category)}
            />
          </div>
        </label>
        <label className="field faq-category-field">
          <span id="faq-category-label">Temat</span>
          <select
            aria-labelledby="faq-category-label"
            value={category}
            onChange={(event) => changeFilters(query, event.target.value as FaqCategoryId | 'all')}
          >
            <option value="all">Wszystkie tematy</option>
            {FAQ_CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <Loading label="Ładowanie pytań i odpowiedzi…" />
      ) : error ? (
        <ErrorNotice message={error} onRetry={() => void load()} />
      ) : (
        <>
          <p className="faq-results-count" role="status" aria-live="polite">
            Liczba odpowiedzi: {filtered.length} z {entries.length}.
          </p>
          {!filtered.length && (
            <section className="faq-empty">
              <h2>
                {entries.length
                  ? 'Nie znaleziono odpowiedzi'
                  : 'Pytania i odpowiedzi pojawią się tutaj'}
              </h2>
              <p>
                {entries.length
                  ? 'Spróbuj krótszego hasła lub wybierz inny temat.'
                  : 'Materiały są przygotowywane. Wróć za chwilę.'}
              </p>
              {(query || category !== 'all') && (
                <button className="button secondary" onClick={() => changeFilters('', 'all')}>
                  Wyczyść filtry
                </button>
              )}
            </section>
          )}
          {FAQ_CATEGORIES.map((group) => {
            const grouped = filtered.filter((entry) => entry.categoryId === group.id);
            if (!grouped.length) return null;
            return (
              <section
                className="faq-group"
                key={group.id}
                aria-labelledby={`faq-category-${group.id}`}
              >
                <h2 id={`faq-category-${group.id}`}>{group.label}</h2>
                <div className="faq-question-list">
                  {grouped.map((entry) => (
                    <FaqItem
                      key={`${entry.id}:${entry.version}`}
                      entry={entry}
                      active={entry.id === activeId}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          <p className="faq-page-note">
            Daty dotyczą roku szkolnego podanego przy odpowiedzi. Swój termin i szczególne warunki
            potwierdź w szkole lub właściwej OKE.
          </p>
        </>
      )}
    </div>
  );
}
