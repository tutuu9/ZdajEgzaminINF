import { describe, expect, it } from 'vitest';
import { examStudyGuides } from '../packages/content/src/exam-study.js';
import { chapterForActivity } from '../apps/web/src/handbook/match';
import { handbookBooks } from '../apps/web/src/handbook';

const find = (taskId: string, key: string) => {
  const guide = examStudyGuides.find((item) => item.taskId === taskId)!;
  const [stepId, activityId] = key.split('/');
  const step = guide.steps.find((item) => item.id === stepId)!;
  const activity = step.activities!.find((item) => item.id === activityId)!;
  const match = chapterForActivity(activity, step.fileName);
  return match && `${match.book.id}/${match.chapter.id}`;
};

describe('course steps point to handbook chapters', () => {
  it('matches activities to the chapter that explains them', () => {
    expect(find('inf03-02-24-06-sg', 'queries/join')).toBe('sql/relacje');
    expect(find('inf03-02-24-06-sg', 'queries/permissions')).toBe('sql/zmiany');
    expect(find('inf03-02-25-06-sg', 'queries/group')).toBe('sql/agregaty');
    expect(find('inf03-02-25-06-sg', 'queries/like')).toBe('sql/warunki');
    expect(find('inf03-02-25-06-sg', 'script/add-item')).toBe('javascript/nowe-elementy');
    expect(find('inf03-02-25-01-sg', 'offer/merged-header')).toBe('html/obrazy-tabele');
    expect(find('inf03-02-25-01-sg', 'calculator-page/options')).toBe('html/formularze');
    expect(find('inf03-02-25-01-sg', 'style/header')).toBe('css/tla-pozycja');
    expect(find('inf03-12-26-06-sg', 'script/date')).toBe('javascript/obliczenia-data');
    expect(find('inf03-11-26-06-sg', 'details/hover')).toBe('css/selektory');
    expect(find('inf03-11-26-06-sg', 'structure/style-link')).toBe('html/szkielet');
    expect(find('inf03-08-25-06-sg', 'structure/head')).toBe('html/szkielet');
    expect(find('inf03-08-25-06-sg', 'php-connection/region')).toBe('php/xampp');
    expect(find('inf03-08-25-06-sg', 'php-connection/connection')).toBe('php/polaczenie');
    expect(find('inf03-08-25-06-sg', 'php-filter/guard')).toBe('php/formularze');
    expect(find('inf03-08-25-06-sg', 'php-filter/prepare')).toBe('php/wyniki');
    expect(find('inf03-01-24-06-sg', 'php-count/browser-check')).toBe('php/bledy');
  });

  it('gives no chapter to graphics, screenshots and hand-in steps', () => {
    expect(find('inf03-02-25-06-sg', 'graphics/resize')).toBeUndefined();
    expect(find('inf03-02-25-06-sg', 'database/proof')).toBeUndefined();
    expect(find('inf03-02-25-06-sg', 'delivery/browser-name')).toBeUndefined();
  });

  it('only returns existing chapters, and every chapter is reached from some course', () => {
    const reached = new Set<string>();
    for (const guide of examStudyGuides)
      for (const step of guide.steps)
        for (const activity of step.activities ?? []) {
          const match = chapterForActivity(activity, step.fileName);
          if (!match) continue;
          expect(match.book.chapters).toContain(match.chapter);
          reached.add(`${match.book.id}/${match.chapter.id}`);
        }
    const all = handbookBooks.flatMap((book) =>
      book.chapters.map((chapter) => `${book.id}/${chapter.id}`),
    );
    expect([...reached].sort()).toEqual(all.sort());
  });
});
