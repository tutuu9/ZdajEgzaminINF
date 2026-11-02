import { lazy, Suspense, useState } from 'react';
import { Search, SlidersHorizontal, FolderOpen, Info, FileText } from 'lucide-react';
import { catalogPdfGuides } from '../catalog-pdf-guide-content';
import '../pdf-sheet.css';
import { useApp } from '../context';
import { EmptyState, ExternalLink, Loading, Notice, PageHeading, Tags } from '../components/common';

const PdfReader = lazy(() =>
  import('../components/PdfSheet').then((module) => ({ default: module.PdfReader })),
);

export function Catalog() {
  const { data, loading } = useApp();
  const [search, setSearch] = useState(''),
    [year, setYear] = useState('all'),
    [technology, setTechnology] = useState('all'),
    [openPdf, setOpenPdf] = useState<string | null>(null),
    [requestedPage, setRequestedPage] = useState(1);
  if (!data)
    return loading ? (
      <Loading />
    ) : (
      <EmptyState title="Katalog jest chwilowo niedostępny">
        Spróbuj ponownie połączyć się z serwerem.
      </EmptyState>
    );
  const entries = data.catalog.filter(
    (entry) =>
      (year === 'all' || String(entry.year) === year) &&
      (technology === 'all' || entry.technologies.includes(technology)) &&
      `${entry.title} ${entry.identifier ?? ''} ${entry.topics.join(' ')}`
        .toLocaleLowerCase('pl')
        .includes(search.toLocaleLowerCase('pl')),
  );
  const years = [
    ...new Set(data.catalog.map((entry) => entry.year).filter((value) => value !== null)),
  ].sort((a, b) => b - a);
  const technologies = [...new Set(data.catalog.flatMap((entry) => entry.technologies))];
  return (
    <>
      <PageHeading kicker="Materiały źródłowe" title="Arkusze egzaminacyjne">
        Sprawdzone odnośniki, pochodzenie materiałów i jasne granice wsparcia.
      </PageHeading>
      <Notice>
        Czytaj oryginalne PDF-y z podanym źródłem i korzystaj z przewodnika po stronach. To wybrane
        materiały, nie pełny bank egzaminacyjny. W zakładce Zadania praktyczne zapiszesz rozwiązanie
        tych arkuszy. Automatyczna ocena nie jest jeszcze dostępna.
      </Notice>
      <div className="filter-bar">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Szukaj arkusza"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj tematu lub kodu arkusza…"
          />
        </label>
        <label className="filter-select">
          <SlidersHorizontal size={16} />
          <select aria-label="Rok egzaminu" value={year} onChange={(e) => setYear(e.target.value)}>
            <option value="all">Wszystkie lata</option>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-select">
          <select
            aria-label="Technologia"
            value={technology}
            onChange={(e) => setTechnology(e.target.value)}
          >
            <option value="all">Wszystkie technologie</option>
            {technologies.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="list-summary">
        <span>{entries.length} materiały</span>
        <span>INF.03 · Formuła 2019</span>
      </div>
      <div className="catalog-list">
        {entries.map((entry) => (
          <article className="catalog-entry" key={entry.id}>
            <div className="catalog-main">
              <span className="catalog-icon">
                <FolderOpen size={23} />
              </span>
              <div>
                <div className="catalog-code">
                  {entry.identifier || 'Oficjalny przykład'}
                  <span>
                    {entry.year ?? 'Rok nieustalony'}
                    {entry.session ? ` · ${entry.session}` : ''}
                  </span>
                </div>
                <h2>{entry.title}</h2>
                <Tags items={entry.technologies} />
              </div>
              <span className="pill subtle">
                {entry.supportStatus === 'full'
                  ? 'Pełna weryfikacja'
                  : entry.supportStatus === 'partial'
                    ? 'Częściowa weryfikacja'
                    : 'Katalog i źródła'}
              </span>
            </div>
            <div className="catalog-details">
              <dl>
                <div>
                  <dt>Źródło</dt>
                  <dd>{entry.sourceName}</dd>
                </div>
                <div>
                  <dt>Kryteria oceniania</dt>
                  <dd>
                    {entry.criteriaAvailability === 'available'
                      ? 'Odnośnik dostępny'
                      : entry.criteriaAvailability === 'missing'
                        ? 'Nie odnaleziono'
                        : 'Do weryfikacji'}
                  </dd>
                </div>
                <div>
                  <dt>Prawa do publikacji</dt>
                  <dd>
                    {entry.rightsStatus === 'permission-confirmed'
                      ? 'Potwierdzone'
                      : entry.rightsStatus === 'original'
                        ? 'Materiał autorski'
                        : 'Status niewyjaśniony'}
                  </dd>
                </div>
                <div>
                  <dt>Sprawdzenie źródła</dt>
                  <dd>
                    {entry.checkedAt
                      ? new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' }).format(
                          new Date(entry.checkedAt),
                        )
                      : 'Do sprawdzenia'}
                  </dd>
                </div>
              </dl>
              {entry.notes && (
                <p className="catalog-note">
                  <Info size={16} />
                  {entry.notes}
                </p>
              )}
              <div className="catalog-links">
                {entry.sourcePdf && (
                  <button
                    className="button primary small"
                    aria-expanded={openPdf === entry.id}
                    onClick={() => {
                      setOpenPdf((value) => (value === entry.id ? null : entry.id));
                      setRequestedPage(1);
                    }}
                  >
                    <FileText size={16} />
                    {openPdf === entry.id ? 'Zwiń oryginalny PDF' : 'Podgląd oryginalnego PDF'}
                  </button>
                )}
                <ExternalLink href={entry.sourceUrl}>Otwórz materiał źródłowy</ExternalLink>
                {entry.attachments.map((attachment) => (
                  <ExternalLink href={attachment.url} key={attachment.url}>
                    {attachment.title}
                  </ExternalLink>
                ))}
              </div>
            </div>
            {openPdf === entry.id && entry.sourcePdf && (
              <div className="catalog-pdf-layout">
                <Suspense fallback={<Loading label="Otwieranie oryginalnego arkusza…" />}>
                  <PdfReader
                    url={`/api/v1/catalog/${encodeURIComponent(entry.id)}/sheet.pdf`}
                    title={entry.title}
                    label={
                      entry.sourcePdf.sourceKind === 'official-source'
                        ? 'Oficjalny przykład CKE · plik bezpośrednio ze strony CKE'
                        : 'Arkusz egzaminacyjny · kopia w zewnętrznym archiwum'
                    }
                    downloadName={`${entry.id}.pdf`}
                    sourceUrl={entry.sourcePdf.url}
                    sourceLabel={entry.sourcePdf.sourceLabel}
                    requestedPage={requestedPage}
                  />
                </Suspense>
                {catalogPdfGuides[entry.id] && (
                  <aside className="pdf-reading-guide catalog-page-guide">
                    <header>
                      <FileText size={22} />
                      <div>
                        <h2>Jak czytać ten arkusz</h2>
                        <p>{catalogPdfGuides[entry.id]!.title}</p>
                      </div>
                    </header>
                    <p className="fine-print">
                      Wybierz stronę, aby przejść do oryginalnej treści. Wskazówki poniżej nie są
                      częścią dokumentu CKE.
                    </p>
                    {catalogPdfGuides[entry.id]!.pages.map((section) => (
                      <section key={section.page}>
                        <button
                          className="text-button"
                          onClick={() => setRequestedPage(section.page)}
                        >
                          Strona {section.page} · {section.title}
                        </button>
                        <ul>
                          {section.focus.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </aside>
                )}
              </div>
            )}
          </article>
        ))}
      </div>
      {!entries.length && (
        <EmptyState title="Brak wyników dla tych filtrów">
          Zmień rok, technologię lub szukane słowo.
        </EmptyState>
      )}
      <p className="fine-print">
        Status „niewyjaśniony” nie oznacza zakazu ani zgody na kopiowanie. W tej wersji
        przechowujemy metadane i odnośniki, nie niezweryfikowane kopie cudzych archiwów.
      </p>
    </>
  );
}
