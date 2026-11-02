import { useState } from 'react';
import { ArrowRight, BookOpen, ChevronDown, Clock3, FileCode2, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context';
import { resumeHref } from '../resume';
import { EmptyState, Loading, PageHeading, Tags } from '../components/common';
import { CatalogSource } from './Catalog';

export function PracticeList() {
  const { data, loading, attempts } = useApp();
  const [search, setSearch] = useState(''),
    [technology, setTechnology] = useState('all');
  if (!data)
    return loading ? (
      <Loading />
    ) : (
      <EmptyState title="Nie udało się wczytać arkuszy">
        Sprawdź połączenie z serwerem i spróbuj ponownie.
      </EmptyState>
    );
  const tasks = data.tasks.filter(
    (task) =>
      `${task.title} ${task.id} ${task.technologies.join(' ')}`
        .toLocaleLowerCase('pl')
        .includes(search.toLocaleLowerCase('pl')) &&
      (technology === 'all' || task.technologies.includes(technology)),
  );
  const technologies = [...new Set(data.tasks.flatMap((task) => task.technologies))];
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
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="library-filter">
          <span>Technologia</span>
          <select
            value={technology}
            aria-label="Technologia"
            onChange={(event) => setTechnology(event.target.value)}
          >
            <option value="all">Wszystkie</option>
            {technologies.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <span className="library-count">{tasks.length} arkusze</span>
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
                      ? `${past.length} zapisane próby`
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
        <EmptyState title="Nie znaleziono arkusza">Zmień nazwę lub wybraną technologię.</EmptyState>
      )}
      <p className="library-disclosure">
        Wybrane materiały CKE, nie pełna baza egzaminów. Projekty zachowujesz w tej przeglądarce.
        Arkusze bez automatycznej weryfikacji kończysz własnym sprawdzeniem wymagań.
      </p>
    </div>
  );
}
