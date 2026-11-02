import { FAQ_CATEGORIES, type FaqResponse, type FaqRevision } from '@zdaj/shared';
import { published } from './content.js';

export async function publicFaq(): Promise<FaqResponse> {
  const entries = await published<FaqRevision>('faq');
  const categoryOrder = (id: string) => FAQ_CATEGORIES.findIndex((category) => category.id === id);
  entries.sort(
    (a, b) =>
      categoryOrder(a.categoryId) - categoryOrder(b.categoryId) ||
      a.order - b.order ||
      a.id.localeCompare(b.id, 'pl'),
  );
  return { entries };
}
