import { Link } from 'react-router-dom';
import { ExternalLink as ExternalIcon } from 'lucide-react';
import { PageHeading } from '../components/common';
import { inlineParts, localHref, releaseHistory } from '../release-notes';
import '../whats-new.css';

const files = import.meta.glob('../../../../docs/releases/v*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const RELEASES = releaseHistory(files);

function Inline({ text }: { text: string }) {
  return (
    <>
      {inlineParts(text).map((part, index) => {
        if (part.kind === 'strong') return <strong key={index}>{part.text}</strong>;
        if (part.kind === 'code') return <code key={index}>{part.text}</code>;
        if (part.kind === 'text') return <span key={index}>{part.text}</span>;
        const local = localHref(part.href);
        if (local)
          return (
            <Link key={index} to={local}>
              {part.text}
            </Link>
          );
        if (!/^https:\/\//.test(part.href)) return <span key={index}>{part.text}</span>;
        return (
          <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">
            {part.text}
            <ExternalIcon size={13} aria-hidden="true" />
          </a>
        );
      })}
    </>
  );
}

/** Learner-facing history of published versions, newest first. */
export function WhatsNew() {
  return (
    <div className="whats-new-page">
      <PageHeading kicker="Historia wersji" title="Co nowego">
        Najważniejsze zmiany w kolejnych wydaniach Zdaj Egzamin INF.
      </PageHeading>
      <ol className="whats-new-list">
        {RELEASES.map((release, index) => (
          <li key={release.version} className="whats-new-release glass-panel">
            <header>
              <span className={`whats-new-version${index === 0 ? ' latest' : ''}`}>
                v{release.version}
              </span>
              {index === 0 && <span className="whats-new-latest">Najnowsza</span>}
              <h2 id={`v${release.version}`}>{release.title}</h2>
            </header>
            {release.intro && (
              <p>
                <Inline text={release.intro} />
              </p>
            )}
            {release.items.length > 0 && (
              <ul>
                {release.items.map((item) => (
                  <li key={item}>
                    <Inline text={item} />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
