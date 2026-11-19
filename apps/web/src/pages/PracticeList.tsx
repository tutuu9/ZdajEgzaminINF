import { ArrowRight, BookOpen, ChevronDown, Clock3, FileCode2, Search, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '../context';
import { resumeHref } from '../resume';
import { EmptyState, Loading, PageHeading, Tags, plural } from '../components/common';
import { CatalogSource } from './Catalog';
import {
  DEFAULT_FILTERS,
  SAMPLE_YEAR,
  filterPapers,
  readFilters,
  sessionLabel,
  writeFilters,
  yearOptions,
  type PaperFilters,
} from '../practice-filters';

export function PracticeList() {
  const { data, loading, attempts } = useApp();
  const [params, setParams] = useSearchParams();
  const filters = readFilters(params);
  const update = (change: Partial<PaperFilters>) =>
    setParams(writeFilters({ ...filters, ...change }), { replace: true });
  const filtered = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  if (!data)
    return loading ? (
      <Loading />
    ) : (
      <EmptyState title="Nie udało się wczytać arkuszy">
        Sprawdź połączenie z serwerem i spróbuj ponownie.
      </EmptyState>
    );
  const tasks = filterPapers(data.tasks, data.catalog, filters);
  const technologies = [...new Set(data.tasks.flatMap((task) => task.technologies))];
  const years = yearOptions(data.catalog);
  return (
    <div className="exam-library">
      <PageHeading title="Jeden arkusz. Wiele umiejętności.">
        Czytaj oryginał CKE, ucz się małymi krokami albo rozwiąż zadanie samodzielnie.
      </PageHeading>
      <div className="library-toolbar glass-panel">
        <label className="search-field">
          <Search size={19} />
          <input
            aria-label="Szukaj arkusza"
            placeholder="Nazwa lub kod arkusza"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
          />
        </label>
        <label className="library-filter">
          <span>Technologia</span>
          <select
            value={filters.technology}
            aria-label="Technologia"
            onChange={(event) => update({ technology: event.target.value })}
          >
            <option value="all">Wszystkie</option>
            {technologies.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="library-filter">
          <span>Sesja</span>
          <select
            value={filters.year}
            aria-label="Sesja"
            onChange={(event) => update({ year: event.target.value })}
          >
            <option value="all">Wszystkie</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
            <option value={SAMPLE_YEAR}>Przykład CKE</option>
          </select>
        </label>
        <label className="library-filter">
          <span>Kolejność</span>
          <select
            value={filters.order}
            aria-label="Kolejność"
            onChange={(event) => update({ order: event.target.value as PaperFilters['order'] })}
          >
            <option value="newest">Najnowsze</option>
            <option value="oldest">Najstarsze</option>
          </select>
        </label>
        <label className="library-check">
          <input
            type="checkbox"
            checked={filters.withoutPhp}
            onChange={(event) => update({ withoutPhp: event.target.checked })}
          />
          Bez PHP
        </label>
        <span className="library-count">Liczba arkuszy: {tasks.length}</span>
        {filtered && (
          <button
            type="button"
            className="button quiet small library-reset"
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
          >
            <X size={15} /> Wyczyść
          </button>
        )}
      </div>
      <div className="exam-library-list">
        {tasks.map((task, index) => {
          const past = attempts.filter((attempt) => attempt.taskId === task.id);
          const draft = past.find((attempt) => !attempt.submittedAt);
          const source = data.catalog.find((entry) => entry.id === task.sourceCatalogId);
          return (
            <article className="exam-library-row surface-panel" key={task.id}>
              <div className="exam-row-heading">
                <span className={`exam-app-icon exam-color-${index % 3}`}>
                  <FileCode2 size={28} strokeWidth={1.6} />
                </span>
                <div>
                  <span className="subtle-label">
                    {source?.identifier ?? 'Oficjalny przykład CKE'}
                    {source?.year ? ` · ${sessionLabel(source)}` : ''}
                  </span>
                  <h2>{task.title}</h2>
                </div>
                <span className="exam-duration">
                  <Clock3 size={16} />
                  {task.durationMinutes} min
                </span>
              </div>
              <div className="exam-row-content">
                <p>{task.summary}</p>
                <Tags items={task.technologies} />
                <div className="exam-row-actions">
                  <Link
                    className="button primary"
                    to={draft ? resumeHref(draft) : `/praktyka/${task.id}?tryb=nauka&widok=nauka`}
                  >
                    {draft ? <ArrowRight size={17} /> : <BookOpen size={17} />}
                    {draft ? 'Kontynuuj' : 'Ucz się krok po kroku'}
                  </Link>
                  <Link className="button quiet" to={`/praktyka/${task.id}?tryb=trening`}>
                    Rozwiąż samodzielnie
                    <ArrowRight size={16} />
                  </Link>
                  <span>
                    {past.length
                      ? plural(past.length, 'zapisana próba', 'zapisane próby', 'zapisanych prób')
                      : 'Z objaśnieniami i plikami do pobrania'}
                  </span>
                </div>
              </div>
              {source && (
                <details className="exam-source-details">
                  <summary>
                    Arkusz PDF, pliki i źródło
                    <ChevronDown size={17} />
                  </summary>
                  <CatalogSource entry={source} />
                </details>
              )}
            </article>
          );
        })}
      </div>
      {!tasks.length && (
        <EmptyState title="Nie znaleziono arkusza">
          Zmień nazwę albo filtry — technologię, sesję lub „Bez PHP”.
        </EmptyState>
      )}
      <p className="library-disclosure">
        Wybrane materiały CKE, nie pełna baza egzaminów. Projekty zachowujesz w tej przeglądarce.
        Arkusze bez automatycznej weryfikacji kończysz własnym sprawdzeniem wymagań.
      </p>
    </div>
  );
}
