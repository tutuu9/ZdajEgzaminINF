import { BookOpen, CheckCircle2 } from 'lucide-react';
import type { Level } from '@zdaj/shared';
import { readingGuideIntro, readingGuideSections, taskReadingFocus } from '../pdf-guide-content';

export function PdfReadingGuide({
  taskId,
  taskVersion,
  level,
}: {
  taskId: string;
  taskVersion: number;
  level: Level;
}) {
  const candidate = taskReadingFocus[taskId];
  const focus = candidate?.version === taskVersion ? candidate : undefined;
  return (
    <section className="pdf-reading-guide">
      <header>
        <BookOpen size={22} />
        <div>
          <h2>Jak czytać arkusz</h2>
          <p>{readingGuideIntro}</p>
        </div>
      </header>
      {readingGuideSections.map((section, index) => (
        <details key={section.id} open={level === 'beginner'}>
          <summary>
            <span>{String(index + 1).padStart(2, '0')}</span>
            {section.title.replace(/^\d+\.\s*/, '')}
          </summary>
          <p>
            <strong>{section.summary}</strong>
          </p>
          <p>{section.detail}</p>
        </details>
      ))}
      {focus && (
        <div className="pdf-task-focus">
          <h3>Na co zwrócić uwagę w tym zadaniu</h3>
          <ul>
            {[...focus.items, ...focus.byLevel[level]].map((item) => (
              <li key={item}>
                <CheckCircle2 size={16} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
