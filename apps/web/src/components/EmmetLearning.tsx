import { memo, useEffect, useRef, useState } from 'react';
import { BookOpen, Copy, Zap } from 'lucide-react';
import type { ExamStudyGuide, ExamStudyStep, StudyActivity } from '@zdaj/shared';
import { emmetChainParts, emmetTopics, type EmmetExample } from '../emmet-learning/catalog';
import { getEmmetTeachingTip } from '../emmet-learning/learning';
import { expandHtmlShortcut } from './editor-abbreviation';
import '../emmet-learning.css';

function Expansion({ abbreviation }: { abbreviation: string }) {
  const expansion = expandHtmlShortcut(abbreviation);
  return expansion ? (
    <pre className="emmet-output">
      <code>{expansion.text}</code>
    </pre>
  ) : (
    <p>Nie można rozwinąć tego przykładu. Własny kod pozostaje bez zmian.</p>
  );
}

function ShortcutExample({
  example,
  showTitle = true,
  showPlacement = true,
}: {
  example: EmmetExample;
  showTitle?: boolean;
  showPlacement?: boolean;
}) {
  const [copyState, setCopyState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function copy() {
    setCopyState('pending');
    try {
      await navigator.clipboard.writeText(example.abbreviation);
      if (mounted.current) setCopyState('success');
    } catch {
      if (mounted.current) setCopyState('error');
    }
  }
  return (
    <article className="emmet-example" aria-label={example.title}>
      {showTitle && <h5>{example.title}</h5>}
      <div className="emmet-shortcut">
        <code>{example.abbreviation}</code>
      </div>
      <p>{example.explanation}</p>
      {showPlacement && example.placement && <p>{example.placement}</p>}
      {example.caution && <p className="emmet-caution">{example.caution}</p>}
      <button
        type="button"
        className="button quiet"
        disabled={copyState === 'pending'}
        onClick={() => void copy()}
      >
        <Copy size={15} aria-hidden="true" /> Kopiuj skrót
      </button>
      {copyState === 'success' && (
        <p role="status">
          Skopiowano skrót. Wklej go samodzielnie w wybranym miejscu kodu i naciśnij Tab.
        </p>
      )}
      {copyState === 'error' && (
        <p role="alert">
          Nie udało się skopiować skrótu. Zaznacz go powyżej i skopiuj ręcznie albo przepisz w
          edytorze.
        </p>
      )}
      <details className="emmet-expansion">
        <summary>Zobacz HTML</summary>
        <Expansion abbreviation={example.abbreviation} />
      </details>
    </article>
  );
}

export const EmmetLearning = memo(function EmmetLearning({
  guide,
  step,
  activity,
}: {
  guide: ExamStudyGuide;
  step: ExamStudyStep;
  activity: StudyActivity;
}) {
  const tip = getEmmetTeachingTip(guide, step, activity);
  return (
    <section className="emmet-learning" aria-label="Skróty HTML">
      {tip && (
        <section className="emmet-context" aria-label="Pisz szybciej">
          <header>
            <Zap size={17} aria-hidden="true" />
            <h4>Pisz szybciej</h4>
            <span>opcjonalnie</span>
          </header>
          <p className="emmet-location">
            <strong>
              W pliku <code>{tip.fileName}</code>
            </strong>{' '}
            · {tip.placement}
          </p>
          <ShortcutExample
            key={tip.example.id}
            example={tip.example}
            showTitle={false}
            showPlacement={false}
          />
          {tip.note && <p className="emmet-caution">{tip.note}</p>}
          <p className="emmet-footnote">
            Masz już poprawny fragment? Zachowaj go. Skrót nie jest warunkiem zaliczenia kroku.
          </p>
        </section>
      )}
      <details className="emmet-reference">
        <summary>
          <BookOpen size={17} aria-hidden="true" /> Skróty HTML — podręczna ściąga
        </summary>
        <p>
          Emmet zapisuje HTML krócej. Wpisz skrót w miejscu na nowy element i naciśnij Tab.
          Przykłady objaśniają składnię; nazwy plików, treść i strukturę dobierz do swojego kroku i
          PDF.
        </p>
        <p>
          Możesz pisać znaczniki ręcznie. Kopiowanie skrótu nie zmienia projektu. Rozwinięcie
          cofniesz jednym poleceniem Cofnij (Ctrl+Z / ⌘Z).
        </p>
        <p>
          Skróty działają w HTML oraz we fragmentach HTML plików PHP. Nie działają wewnątrz kodu
          PHP, JavaScript, CSS, komentarzy ani wartości atrybutów. Po rozwinięciu edytor zaznacza
          pierwsze pole do uzupełnienia; kolejne uzupełnij samodzielnie.
        </p>
        {emmetTopics.map((topic) => (
          <details className="emmet-topic" key={topic.id}>
            <summary>{topic.title}</summary>
            <p>{topic.description}</p>
            {topic.examples.map((example) => (
              <ShortcutExample key={example.id} example={example} />
            ))}
          </details>
        ))}
        <details className="emmet-chain">
          <summary>Jak czytać dłuższy skrót</summary>
          <p>
            Buduj zapis po kawałku. Znak ^ zmienia poziom w skrócie, a nie miejsce kursora w
            istniejącym dokumencie. Najpierw obejrzyj strukturę; nie dopisuj drugi raz elementów,
            które już masz.
          </p>
          <ol>
            {emmetChainParts.map((part) => (
              <li key={part.abbreviation}>
                <code className="emmet-chain-code">{part.abbreviation}</code>
                <p>{part.explanation}</p>
                <details>
                  <summary>Zobacz HTML</summary>
                  <Expansion abbreviation={part.abbreviation} />
                </details>
              </li>
            ))}
          </ol>
          <p>
            Lepiej tworzyć krótkie, zrozumiałe fragmenty niż zapisywać cały arkusz jednym skrótem.
          </p>
        </details>
        <a href="https://docs.emmet.io/abbreviations/syntax/" target="_blank" rel="noreferrer">
          Dokumentacja składni Emmet (po angielsku, nowa karta)
        </a>
      </details>
    </section>
  );
});
