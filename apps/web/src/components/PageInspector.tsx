import { ArrowLeft, Code2, X } from 'lucide-react';
import { explainProperty, explainTag } from '../inspector/explanations';
import type {
  InspectionBox,
  InspectionIndex,
  InspectionSelection,
  InspectionSides,
  InspectionSource,
} from '../inspector/types';

const number = (value: number) =>
  new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 }).format(value);
const sides = (value: InspectionSides) =>
  [value.top, value.right, value.bottom, value.left].map(number).join(' / ');

export function PageInspector({
  index,
  selection,
  spacing,
  onSpacing,
  onReveal,
  onBack,
  onClose,
}: {
  index: InspectionIndex;
  selection: InspectionSelection;
  spacing: boolean;
  onSpacing: (value: boolean) => void;
  onReveal: (source: InspectionSource) => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const element = index.elements.find((item) => item.id === selection.elementId);
  if (!element) return null;
  const matches = selection.matches.flatMap((match) => {
    const rule = index.rules.find((item) => item.id === match.ruleId);
    return rule ? [{ ...match, rule }] : [];
  });
  const explanation = explainTag(element.tag);
  return (
    <section className="page-inspector-card" aria-label="Wybrany element">
      <header>
        <div>
          <span className="inspector-eyebrow">Twój element</span>
          <h3>{element.label}</h3>
        </div>
        <button className="icon-button" aria-label="Zakończ badanie" onClick={onClose}>
          <X size={18} />
        </button>
      </header>
      {explanation && <p>{explanation}</p>}
      {element.source.note && <p className="inspector-note">{element.source.note}</p>}
      <div className="inspector-actions">
        <button className="button secondary small" onClick={() => onReveal(element.source)}>
          <Code2 size={16} />
          {element.source.range ? 'Pokaż HTML' : 'Otwórz plik'}
        </button>
        <button className="text-button" onClick={onBack}>
          <ArrowLeft size={15} />
          Wróć do podglądu
        </button>
      </div>
      <details className="inspector-rules" open>
        <summary>Reguły pasujące do elementu</summary>
        <p className="inspector-note">
          Kilka reguł może ustawiać tę samą właściwość. Ostateczny wygląd sprawdzisz w „Wartości w
          podglądzie”.
        </p>
        <div className="inspector-rule-list">
          {matches.map(({ rule, active, inheritedFrom }) => (
            <div className="inspector-rule" key={`${rule.id}/${inheritedFrom ?? ''}`}>
              <div className="inspector-rule-title">
                <code>{rule.selector || 'style="…"'}</code>
                <span>{rule.source.path}</span>
              </div>
              {inheritedFrom && (
                <p className="inspector-note">
                  Reguła przodka: {index.elements.find((item) => item.id === inheritedFrom)?.label}.
                  Tylko właściwości dziedziczone mogą przejść na ten element.
                </p>
              )}
              {rule.conditions.length > 0 && (
                <p className="inspector-note">
                  {rule.conditions
                    .map((condition) => `@${condition.kind} ${condition.text}`)
                    .join(' · ')}{' '}
                  —{' '}
                  {rule.conditions.some((c) => c.kind === 'unsupported')
                    ? 'analiza tego warunku nie jest obsługiwana'
                    : active
                      ? 'warunek aktywny'
                      : 'warunek nieaktywny'}
                </p>
              )}
              {rule.source.note && <p className="inspector-note">{rule.source.note}</p>}
              {rule.declarations.map((declaration) => (
                <div className="inspector-declaration" key={declaration.id}>
                  <button
                    type="button"
                    aria-label={`Pokaż CSS: ${declaration.property}: ${declaration.value} (${declaration.source.path})`}
                    onClick={() => onReveal(declaration.source)}
                  >
                    <code>
                      {declaration.property}: {declaration.value};
                    </code>
                    <Code2 size={15} aria-hidden="true" />
                  </button>
                  {explainProperty(declaration.property) && (
                    <p>{explainProperty(declaration.property)}</p>
                  )}
                  {declaration.source.note && (
                    <p className="inspector-note">{declaration.source.note}</p>
                  )}
                </div>
              ))}
            </div>
          ))}
          {!matches.length && (
            <p>
              Nie znaleziono pasujących reguł w obsługiwanych stylach projektu. Wygląd może
              pochodzić z dziedziczenia lub domyślnych stylów przeglądarki.
            </p>
          )}
        </div>
        {index.note && <p className="inspector-note">{index.note}</p>}
      </details>
      <details>
        <summary>Wartości w podglądzie</summary>
        <p className="inspector-note">
          Wartości dla aktualnej szerokości podglądu, po zastosowaniu stylów i dziedziczenia.
        </p>
        <dl className="inspector-values">
          {Object.entries(selection.computed).map(([property, value]) => (
            <div key={property}>
              <dt>
                <code>{property}</code>
              </dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </details>
      <details>
        <summary>Rozmiar i odstępy</summary>
        <label className="inspector-spacing-toggle">
          <input
            type="checkbox"
            checked={spacing}
            onChange={(event) => onSpacing(event.target.checked)}
          />
          Pokaż odstępy
        </label>
        <div className="inspector-box-model">
          <div className="inspector-box-margin">
            margin · {sides(selection.box.margin)} px
            <div className="inspector-box-border">
              border · {sides(selection.box.border)} px
              <div className="inspector-box-padding">
                padding · {sides(selection.box.padding)} px
                <div className="inspector-box-content">
                  content · {number(selection.box.content.width)} ×{' '}
                  {number(selection.box.content.height)} px
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="inspector-note">
          Kolejność: góra / prawo / dół / lewo. Margin jest na zewnątrz obramowania; padding
          oddziela je od treści.
        </p>
        {selection.box.note && <p className="inspector-note">{selection.box.note}</p>}
      </details>
    </section>
  );
}

type Rect = InspectionBox['rect'];
function inset(rect: Rect, values: InspectionSides, sign = 1): Rect {
  return {
    x: rect.x + values.left * sign,
    y: rect.y + values.top * sign,
    width: Math.max(0, rect.width - (values.left + values.right) * sign),
    height: Math.max(0, rect.height - (values.top + values.bottom) * sign),
  };
}
const path = (rect: Rect) => `M${rect.x},${rect.y}h${rect.width}v${rect.height}h${-rect.width}Z`;

/** Render outside the document so overlays cannot affect selectors or layout. */
export function InspectorOverlay({ box, spacing }: { box: InspectionBox; spacing: boolean }) {
  const padding = inset(box.rect, box.border),
    content = inset(padding, box.padding),
    margin = inset(box.rect, box.margin, -1);
  return (
    <svg
      className="inspector-overlay"
      aria-hidden="true"
      viewBox={`0 0 ${box.viewport.width} ${box.viewport.height}`}
      preserveAspectRatio="none"
    >
      {spacing && box.precise && (
        <>
          <path
            className="inspector-overlay-margin"
            fillRule="evenodd"
            d={path(margin) + path(box.rect)}
          />
          <path
            className="inspector-overlay-border"
            fillRule="evenodd"
            d={path(box.rect) + path(padding)}
          />
          <path
            className="inspector-overlay-padding"
            fillRule="evenodd"
            d={path(padding) + path(content)}
          />
          <rect className="inspector-overlay-content" {...content} />
        </>
      )}
      <rect className="inspector-overlay-outline" {...box.rect} />
    </svg>
  );
}
