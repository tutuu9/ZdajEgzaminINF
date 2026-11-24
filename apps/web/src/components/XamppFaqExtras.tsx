import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FaqRevision } from '@zdaj/shared';
import { phpCheck, phpCities } from '../xampp-examples';
import { XAMPP_HOME_PRACTICE } from '../xampp-help';

const screenshots = new Map([
  [
    'xampp-start',
    [
      {
        file: 'localhost-result.webp',
        width: 560,
        height: 64,
        alt: 'Przeglądarka wyświetla napis PHP działa po otwarciu sprawdz.php przez localhost.',
        caption: 'Wynik otwarcia pliku z htdocs/inf03-demo/sprawdz.php przez Apache.',
      },
    ],
  ],
  [
    'xampp-import',
    [
      {
        file: 'phpmyadmin-import.webp',
        width: 1000,
        height: 444,
        alt: 'Zakładka Import w phpMyAdmin z wybraną bazą inf03_xampp_demo i plikiem miasta.sql.',
        caption:
          'phpMyAdmin w XAMPP 8.2.12. Najpierw wybierz bazę, potem wskaż plik w zakładce Import.',
      },
    ],
  ],
  [
    'xampp-apache',
    [
      {
        file: 'apache-port-log.webp',
        width: 760,
        height: 80,
        alt: 'Dziennik Apache pokazuje komunikat could not bind to address, ponieważ port nasłuchiwania jest zajęty.',
        caption:
          'Apache w XAMPP 8.2.12. Komunikat wskazuje adres i port, na których serwer nie mógł nasłuchiwać.',
      },
    ],
  ],
]);

function PhpExample({ name, code }: { name: string; code: string }) {
  const [message, setMessage] = useState('');
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage('Skopiowano kod.');
    } catch {
      setMessage('Zaznacz i skopiuj kod ręcznie. Schowek jest niedostępny.');
    }
  }
  return (
    <figure className="faq-code-example">
      <figcaption>
        <strong>{name}</strong>
        <button type="button" className="button secondary small" onClick={() => void copy()}>
          Kopiuj {name}
        </button>
      </figcaption>
      <pre tabIndex={0} aria-label={name}>
        <code>{code}</code>
      </pre>
      <p className="faq-copy-status" role="status">
        {message}
      </p>
    </figure>
  );
}

export function XamppFaqExtras({ entry }: { entry: FaqRevision }) {
  // Attach only to the published text that the screenshots and sample steps illustrate.
  if (entry.categoryId !== 'xampp' || entry.version !== 1) return null;

  return (
    <>
      {entry.id === 'xampp-start' && (
        <p className="faq-panel-reference">
          <a
            href="https://commons.wikimedia.org/wiki/File:Xampp_Control_Panel.jpg"
            target="_blank"
            rel="noopener noreferrer"
          >
            Zobacz zrzut panelu XAMPP
            <span className="visually-hidden"> (otwiera się w nowej karcie)</span>
          </a>
          {' · Wikimedia Commons, Jayprakash12345'}
        </p>
      )}
      {screenshots.get(entry.id)?.map(({ file, width, height, alt, caption }) => (
        <figure key={file} className="faq-screenshot">
          <a href={'/xampp/' + file} target="_blank" rel="noopener noreferrer">
            <img
              src={'/xampp/' + file}
              width={width}
              height={height}
              alt={alt}
              loading="lazy"
              decoding="async"
            />
            <span className="visually-hidden"> (powiększenie w nowej karcie)</span>
          </a>
          <figcaption>{caption}</figcaption>
        </figure>
      ))}
      {entry.id === 'xampp-start' && (
        <Link className="button secondary" to={XAMPP_HOME_PRACTICE}>
          Próba na własnym komputerze
        </Link>
      )}
      {entry.id === 'xampp-home-practice' && (
        <>
          <PhpExample name="sprawdz.php" code={phpCheck} />
          <a className="button secondary faq-demo-download" href="/xampp/miasta.sql" download>
            Pobierz miasta.sql
          </a>
          <PhpExample name="miasta.php" code={phpCities} />
        </>
      )}
    </>
  );
}
