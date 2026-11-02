import { lazy, Suspense, useState } from 'react';
import { FileText } from 'lucide-react';
import type { CatalogEntry } from '@zdaj/shared';
import { ExternalLink, Loading } from '../components/common';
import '../pdf-sheet.css';

const PdfReader = lazy(() =>
  import('../components/PdfSheet').then((module) => ({ default: module.PdfReader })),
);

/** Source metadata is part of its exam, rather than a second competing catalog. */
export function CatalogSource({ entry }: { entry: CatalogEntry }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="catalog-source">
      <div className="source-actions">
        {entry.sourcePdf && (
          <button
            className="button secondary small"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <FileText size={16} />
            {open ? 'Zwiń PDF' : 'Czytaj oryginalny PDF'}
          </button>
        )}
        <ExternalLink href={entry.sourceUrl}>Źródło: {entry.sourceName}</ExternalLink>
        {entry.attachments.map((attachment) => (
          <ExternalLink key={attachment.url} href={attachment.url}>
            {attachment.title}
          </ExternalLink>
        ))}
      </div>
      <p className="source-provenance">
        {entry.sourcePdf?.sourceKind === 'official-source'
          ? 'Dokument bezpośrednio ze strony CKE.'
          : 'Oryginalny arkusz egzaminacyjny udostępniony przez zewnętrzne archiwum.'}{' '}
        {entry.notes}
      </p>
      {open && entry.sourcePdf && (
        <Suspense fallback={<Loading label="Otwieranie oryginalnego PDF…" />}>
          <PdfReader
            url={`/api/v1/catalog/${encodeURIComponent(entry.id)}/sheet.pdf`}
            title={entry.title}
            label={
              entry.sourcePdf.sourceKind === 'official-source'
                ? 'Oficjalny przykład CKE'
                : 'Arkusz CKE · kopia w zewnętrznym archiwum'
            }
            downloadName={`${entry.id}.pdf`}
            sourceUrl={entry.sourcePdf.url}
            sourceLabel={entry.sourcePdf.sourceLabel}
          />
        </Suspense>
      )}
      <details className="source-metadata">
        <summary>Szczegóły materiału</summary>
        <dl>
          <div>
            <dt>Rok i sesja</dt>
            <dd>
              {entry.year ?? 'Nieustalone'}
              {entry.session ? `, ${entry.session}` : ''}
            </dd>
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
            <dt>Sprawdzenie źródła</dt>
            <dd>
              {entry.checkedAt
                ? new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' }).format(
                    new Date(entry.checkedAt),
                  )
                : 'Do sprawdzenia'}
            </dd>
          </div>
          <div>
            <dt>Prawa do ponownej publikacji</dt>
            <dd>
              {entry.rightsStatus === 'permission-confirmed'
                ? 'Potwierdzone'
                : entry.rightsStatus === 'original'
                  ? 'Materiał autorski'
                  : 'Status niewyjaśniony — korzystamy z odnośników'}
            </dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
