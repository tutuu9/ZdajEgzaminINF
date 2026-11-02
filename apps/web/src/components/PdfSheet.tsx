import { useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Minus,
  Plus,
} from 'lucide-react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PublicTask } from '@zdaj/shared';
import { ErrorNotice, Loading } from './common';

GlobalWorkerOptions.workerSrc = workerUrl;

export function taskSheetUrl(task: Pick<PublicTask, 'id' | 'version'>) {
  return `/api/v1/tasks/${encodeURIComponent(task.id)}/sheet.pdf?version=${task.version}`;
}

export function PdfSheet({
  task,
  requestedPage,
  onPageChange,
}: {
  task: PublicTask;
  requestedPage?: number;
  onPageChange?: (page: number) => void;
}) {
  return (
    <PdfReader
      url={taskSheetUrl(task)}
      title={task.title}
      label={`Arkusz ćwiczeniowy · materiał autorski · ${task.qualification} · wersja ${task.version}`}
      downloadName={`${task.id}-v${task.version}.pdf`}
      task={task}
      requestedPage={requestedPage}
      onPageChange={onPageChange}
    />
  );
}

export function PdfReader({
  url,
  title,
  label,
  downloadName,
  sourceUrl,
  sourceLabel,
  requestedPage,
  onPageChange,
  task,
  compact = false,
  crop,
}: {
  url: string;
  title: string;
  label: string;
  downloadName: string;
  sourceUrl?: string;
  sourceLabel?: string;
  requestedPage?: number;
  onPageChange?: (page: number) => void;
  task?: PublicTask;
  compact?: boolean;
  crop?: { top: number; bottom: number };
}) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null),
    [pageNumber, setPageNumber] = useState(requestedPage ?? 1),
    [zoom, setZoom] = useState(1),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [rendering, setRendering] = useState(false),
    [pageText, setPageText] = useState(''),
    [retry, setRetry] = useState(0),
    [width, setWidth] = useState(700);
  const canvas = useRef<HTMLCanvasElement>(null),
    viewport = useRef<HTMLDivElement>(null);
  const pageChange = useRef(onPageChange);
  pageChange.current = onPageChange;
  const changePage = (page: number) => {
    setPageNumber(page);
    pageChange.current?.(page);
  };
  useEffect(() => {
    let cancelled = false;
    setPdf(null);
    setLoading(true);
    setError('');
    setPageNumber(requestedPage ?? 1);
    setPageText('');
    const job = getDocument({
      url,
      withCredentials: true,
      // PDF.js 6 removed the eval-based compiler and its isEvalSupported option.
      useWasm: false,
      useSystemFonts: true,
    });
    void job.promise
      .then((document) => {
        if (!cancelled) setPdf(document);
      })
      .catch(() => {
        if (!cancelled)
          setError(
            'Nie udało się wczytać arkusza PDF. Spróbuj ponownie lub otwórz plik w osobnej karcie.',
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      void job.destroy();
    };
  }, [url, retry]);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width;
      if (next) setWidth(Math.max(220, next - 32));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (pdf && requestedPage) {
      const page = Math.max(1, Math.min(pdf.numPages, requestedPage));
      setPageNumber(page);
      if (page !== requestedPage) pageChange.current?.(page);
    }
  }, [pdf, requestedPage]);
  useEffect(() => {
    if (!pdf || !canvas.current) return;
    let cancelled = false;
    let renderTask:
      ReturnType<Awaited<ReturnType<PDFDocumentProxy['getPage']>>['render']> | undefined;
    setRendering(true);
    setError('');
    setPageText('');
    void (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        if (cancelled || !canvas.current) return;
        const natural = page.getViewport({ scale: 1 });
        const scaled = page.getViewport({ scale: Math.min(width / natural.width, 1.8) * zoom });
        const ratio = Math.min(window.devicePixelRatio || 1, 2),
          element = canvas.current;
        element.width = Math.ceil(scaled.width * ratio);
        const cropTop = Math.max(0, Math.min(0.99, crop?.top ?? 0)),
          cropBottom = Math.max(cropTop + 0.01, Math.min(1, crop?.bottom ?? 1));
        element.height = Math.ceil(scaled.height * (cropBottom - cropTop) * ratio);
        element.style.width = `${scaled.width}px`;
        element.style.height = `${scaled.height * (cropBottom - cropTop)}px`;
        renderTask = page.render({
          canvas: element,
          viewport: scaled,
          transform: [ratio, 0, 0, ratio, 0, -scaled.height * cropTop * ratio],
        });
        await renderTask.promise;
        const text = await page.getTextContent();
        const visibleItems = compact
          ? crop
            ? text.items.filter((item) => {
                if (!('str' in item)) return false;
                const point = natural.convertToViewportPoint(
                  Number(item.transform[4]),
                  Number(item.transform[5]),
                );
                return (
                  point[1]! >= natural.height * cropTop && point[1]! <= natural.height * cropBottom
                );
              })
            : []
          : text.items;
        if (!cancelled)
          setPageText(
            visibleItems
              .map((item) =>
                'str' in item ? item.str + ('hasEOL' in item && item.hasEOL ? '\n' : ' ') : '',
              )
              .join(''),
          );
      } catch (cause) {
        if (!cancelled && !(cause instanceof Error && cause.name === 'RenderingCancelledException'))
          setError(
            'Nie udało się wyświetlić tej strony. Otwórz PDF w osobnej karcie lub u źródła.',
          );
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [pdf, pageNumber, zoom, width, crop?.top, crop?.bottom, compact]);
  return (
    <section className="pdf-sheet" aria-label="Czytnik arkusza PDF">
      <div className="pdf-heading">
        <div>
          <FileText size={22} />
          <div>
            <h2>
              {compact
                ? 'Pytanie z informatora CKE'
                : task
                  ? 'Arkusz ćwiczeniowy PDF'
                  : 'Oryginalny arkusz PDF'}
            </h2>
            <p>{label}</p>
          </div>
        </div>
        {!compact && (
          <div className="pdf-links">
            <a href={url} download={downloadName} className="text-link">
              <Download size={16} />
              Pobierz PDF
            </a>
            <a href={url} target="_blank" rel="noreferrer" className="text-link">
              <ExternalLink size={16} />
              Otwórz osobno
            </a>
          </div>
        )}
      </div>
      {sourceUrl && (
        <p className="pdf-source-line">
          Źródło pliku:{' '}
          <a href={sourceUrl} target="_blank" rel="noreferrer">
            {sourceLabel ?? sourceUrl}
            <ExternalLink size={13} />
          </a>
          . Treść dokumentu nie została przeredagowana. Automatyczna ocena tego arkusza nie jest
          dostępna.
        </p>
      )}
      <div className="pdf-toolbar" aria-label="Sterowanie arkuszem">
        <div className="pdf-pagination">
          <button
            className="icon-button"
            aria-label="Poprzednia strona arkusza"
            disabled={compact || !pdf || pageNumber === 1}
            onClick={() => changePage(pageNumber - 1)}
          >
            <ChevronLeft size={20} />
          </button>
          <span aria-live="polite">
            Strona <strong>{pageNumber}</strong> z {pdf?.numPages ?? '—'}
          </span>
          <button
            className="icon-button"
            aria-label="Następna strona arkusza"
            disabled={compact || !pdf || pageNumber >= pdf.numPages}
            onClick={() => changePage(pageNumber + 1)}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="pdf-zoom">
          <button
            className="icon-button"
            aria-label="Pomniejsz arkusz"
            disabled={zoom <= 0.75}
            onClick={() => setZoom((value) => Math.max(0.75, value - 0.25))}
          >
            <Minus size={17} />
          </button>
          <button
            className="text-button"
            aria-label="Dopasuj arkusz do szerokości"
            onClick={() => setZoom(1)}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            className="icon-button"
            aria-label="Powiększ arkusz"
            disabled={zoom >= 2}
            onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
          >
            <Plus size={17} />
          </button>
        </div>
      </div>
      <ErrorNotice message={error} onRetry={() => setRetry((value) => value + 1)} />
      <div className="pdf-viewport" ref={viewport} aria-busy={loading || rendering}>
        {loading && <Loading label="Wczytywanie arkusza PDF…" />}
        {pdf && (
          <canvas
            ref={canvas}
            role="img"
            aria-label={`${title}, strona ${pageNumber}. Tekst tej strony jest dostępny pod podglądem.`}
          />
        )}
        {!loading && !pdf && (
          <div className="pdf-unavailable">
            <FileText size={34} />
            <p>Arkusz jest chwilowo niedostępny.</p>
          </div>
        )}
      </div>
      {pdf && (!compact || !!crop) && (
        <details className="pdf-text" open={compact}>
          <summary>
            {compact
              ? 'Tekst pytania — wersja do odczytu'
              : `Tekst strony ${pageNumber} — wersja do odczytu`}
          </summary>
          <div className="pdf-extracted-text">
            {pageText ||
              (rendering
                ? 'Odczytywanie tekstu…'
                : 'Ten fragment nie zawiera dostępnej warstwy tekstowej.')}
          </div>
        </details>
      )}
      {task && (
        <details className="pdf-text" open={!!error}>
          <summary>Wymagania zadania w tekście</summary>
          <h3>{task.title}</h3>
          <p>{task.summary}</p>
          <ul>
            {task.requirements.map((requirement) => (
              <li key={requirement}>{requirement}</li>
            ))}
          </ul>
          <p>
            Czas części praktycznej: {task.durationMinutes} minut. Pełne warunki i pliki wejściowe
            sprawdź w arkuszu.
          </p>
        </details>
      )}
    </section>
  );
}
