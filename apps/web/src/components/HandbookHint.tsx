import { BookMarked, ExternalLink } from 'lucide-react';
import type { StudyActivity } from '@zdaj/shared';
import { chapterForActivity } from '../handbook/match';

/**
 * Points from a course activity to the handbook chapter that explains its topic. It opens
 * in a new tab, so the course stays where the learner left it.
 */
export function HandbookHint({
  activity,
  fileName,
}: {
  activity: Pick<StudyActivity, 'exampleCode' | 'targetFiles'>;
  fileName: string;
}) {
  const match = chapterForActivity(activity, fileName);
  if (!match) return null;
  return (
    <a
      className="course-handbook-link"
      href={`/nauka/podrecznik/${match.book.id}/${match.chapter.id}`}
      target="_blank"
      rel="noopener"
    >
      <BookMarked size={16} aria-hidden="true" />
      <span>
        Więcej w podręczniku: <strong>{match.chapter.title}</strong> ({match.book.title})
      </span>
      <ExternalLink size={14} aria-hidden="true" />
    </a>
  );
}
