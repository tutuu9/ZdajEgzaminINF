import { FAQ_TYPE_LABELS, type FaqRevision } from '@zdaj/shared';

function date(value: string) {
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeZone: 'UTC' }).format(parsed);
}

export function FaqAnswer({ entry }: { entry: FaqRevision }) {
  return (
    <div className="faq-answer">
      <div className="faq-answer-meta">
        <span>{FAQ_TYPE_LABELS[entry.type]}</span>
        {entry.schoolYear && <span>Rok szkolny {entry.schoolYear}</span>}
        <span>
          Sprawdzono: <time dateTime={entry.reviewedAt}>{date(entry.reviewedAt)}</time>
        </span>
      </div>
      <div className="faq-answer-text">
        {entry.answer.split(/\n\s*\n/).map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>
      <div className="faq-sources">
        <h3>Źródła i podstawa odpowiedzi</h3>
        <ul>
          {entry.sources.map((source, index) => (
            <li key={index}>
              {/^https:\/\//i.test(source.url) ? (
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title}
                  <span className="visually-hidden"> (otwiera się w nowej karcie)</span>
                </a>
              ) : (
                <span>{source.title || 'Uzupełnij źródło'}</span>
              )}
              {source.section && <span className="faq-source-section">{source.section}</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
