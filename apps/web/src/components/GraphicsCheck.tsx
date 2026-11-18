import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, Eye, Image as ImageIcon } from 'lucide-react';
import type { CatalogGraphic, ProjectFile } from '@zdaj/shared';
import {
  checkGraphic,
  fileBytes,
  transparencyFromCorners,
  type CheckState,
  type GraphicCheckItem,
  type GraphicReport,
} from '../graphics-check';
import '../graphics-check.css';

const MIME = { jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif' } as const;

/** Alpha of the four corner pixels of the first frame, decoded locally in this browser. */
async function cornerAlpha(file: ProjectFile, report: GraphicReport): Promise<number[] | null> {
  const bytes = fileBytes(file);
  if (!bytes || !report.facts) return null;
  try {
    const bitmap = await createImageBitmap(new Blob([bytes], { type: MIME[report.facts.format] }));
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(bitmap, 0, 0);
    const right = bitmap.width - 1,
      bottom = bitmap.height - 1;
    return [
      [0, 0],
      [right, 0],
      [0, bottom],
      [right, bottom],
    ].map(([x, y]) => context.getImageData(x!, y!, 1, 1).data[3]!);
  } catch {
    return null;
  }
}

function StateIcon({ state }: { state: CheckState }) {
  if (state === 'ok') return <CheckCircle2 size={15} aria-label="Zgodne" />;
  if (state === 'wrong') return <AlertTriangle size={15} aria-label="Do poprawy" />;
  return <CircleDashed size={15} aria-label="Sprawdzanie" />;
}

function GraphicRow({ report, files }: { report: GraphicReport; files: ProjectFile[] }) {
  const file = files.find((candidate) => candidate.path === report.path);
  const needsPixels = report.items.some(
    (item) => item.label === 'Przezroczystość' && item.state === 'look',
  );
  const [transparency, setTransparency] = useState<GraphicCheckItem | null>(null);
  useEffect(() => {
    if (!needsPixels || !file) return;
    let current = true;
    void cornerAlpha(file, report).then((alpha) => {
      if (current)
        setTransparency(
          alpha
            ? transparencyFromCorners(alpha)
            : {
                label: 'Przezroczystość',
                state: 'look',
                detail: 'nie udało się odczytać pikseli — obejrzyj tło w programie graficznym',
              },
        );
    });
    return () => {
      current = false;
    };
  }, [needsPixels, file, report]);

  const items = report.items.map((item) =>
    item.label === 'Przezroczystość' && item.state === 'look' && transparency ? transparency : item,
  );
  const { requirement } = report;
  const missing = report.facts === undefined;
  const unreadable = report.facts === null;
  const state: CheckState = missing
    ? 'look'
    : unreadable || report.wrongCase || items.some((item) => item.state === 'wrong')
      ? 'wrong'
      : items.some((item) => item.state === 'look')
        ? 'look'
        : 'ok';

  return (
    <li className={`graphics-item ${state}`}>
      <div className="graphics-name">
        <StateIcon state={state} />
        <code>{requirement.file}</code>
        <small>str. {requirement.page}</small>
      </div>
      {missing && (
        <p>
          Nie ma jeszcze tego pliku w projekcie. Przygotuj go w programie graficznym i wczytaj
          przyciskiem „Wczytaj pliki / ZIP”.
        </p>
      )}
      {unreadable && (
        <p>
          Plik <code>{report.path}</code> nie jest obrazem PNG, JPEG ani GIF albo jest uszkodzony.
          Wyeksportuj go ponownie.
        </p>
      )}
      {report.wrongCase && (
        <p className="graphics-warning">
          W projekcie jest <code>{report.path}</code> — inna wielkość liter niż w arkuszu.
        </p>
      )}
      {items.length > 0 && (
        <ul className="graphics-checks">
          {items.map((item) => (
            <li key={item.label} className={item.state}>
              <StateIcon state={item.state} />
              <span>
                <strong>{item.label}:</strong> {item.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * Checks the images the paper asks for, using the learner's own project files. Measurable
 * properties only; the content of each image is compared with the paper by the learner.
 */
export function GraphicsCheck({
  graphics,
  files,
}: {
  graphics: CatalogGraphic[];
  files: ProjectFile[];
}) {
  const reports = useMemo(
    () => graphics.map((requirement) => checkGraphic(requirement, files)),
    [graphics, files],
  );
  const present = reports.filter((report) => report.facts !== undefined).length;
  return (
    <details className="graphics-check">
      <summary>
        <ImageIcon size={16} />
        Grafika z arkusza ({present}/{reports.length})
      </summary>
      <ul>
        {reports.map((report) => (
          <GraphicRow key={report.requirement.file} report={report} files={files} />
        ))}
      </ul>
      <p className="graphics-note">
        <Eye size={14} aria-hidden="true" />
        Sprawdzamy format, wymiary, przezroczystość i klatki pliku w Twoim projekcie. Treść obrazu
        (napis, kolor, kadr) porównaj sam z ilustracją w arkuszu.
      </p>
    </details>
  );
}
