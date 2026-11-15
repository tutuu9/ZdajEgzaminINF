import type { InexactAsset, MissingAsset } from '../preview';
import { Notice } from './common';

/** Explains addresses the preview could not match exactly to a project file. */
export function MissingAssets({
  missing,
  inexact = [],
}: {
  missing: MissingAsset[];
  inexact?: InexactAsset[];
}) {
  return (
    <>
      {missing.length > 0 && (
        <Notice>
          Podgląd nie znalazł w projekcie {missing.length === 1 ? 'pliku' : 'plików'}:
          <ul className="missing-assets">
            {missing.slice(0, 5).map((item) => (
              <li key={item.value}>
                <code>{item.value}</code>
                {item.suggestion && (
                  <>
                    {' '}
                    — w projekcie jest <code>{item.suggestion}</code>. Popraw adres w kodzie albo
                    przenieś plik.
                  </>
                )}
              </li>
            ))}
          </ul>
          {missing.length > 5 && `Oraz ${missing.length - 5} innych. `}
          Sprawdź nazwę i folder albo wczytaj brakujący plik przyciskiem „Wczytaj pliki / ZIP”.
        </Notice>
      )}
      {inexact.length > 0 && (
        <Notice>
          Wielkość liter w adresie różni się od nazwy pliku:
          <ul className="inexact-assets">
            {inexact.slice(0, 5).map((item) => (
              <li key={item.value}>
                w kodzie <code>{item.value}</code>, plik nazywa się <code>{item.path}</code>
              </li>
            ))}
          </ul>
          {inexact.length > 5 && `Oraz ${inexact.length - 5} innych. `}
          Podgląd pokazuje taki plik, ale automatyczne sprawdzanie rozróżnia wielkie i małe litery.
          Zapisz adres dokładnie tak, jak nazywa się plik.
        </Notice>
      )}
    </>
  );
}
