import { z } from 'zod';
import { FAQ_CATEGORIES } from '@zdaj/shared';

const requiredText = (limit: number) => z.string().trim().min(1).max(limit);
const schoolYear = z
  .string()
  .regex(/^20\d{2}\/20\d{2}$/, 'Podaj rok szkolny, np. 2026/2027.')
  .refine((value) => Number(value.slice(5)) === Number(value.slice(0, 4)) + 1, {
    message: 'Rok szkolny musi obejmować dwa kolejne lata.',
  });

export const faqSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9][a-z0-9._-]{0,100}$/),
    version: z.number().int().positive(),
    categoryId: z.enum(FAQ_CATEGORIES.map((category) => category.id)),
    question: requiredText(240),
    answer: requiredText(8000),
    order: z.number().int().min(0).max(9999),
    sources: z
      .array(
        z
          .object({
            title: requiredText(240),
            url: z
              .url()
              .max(2000)
              .refine((value) => {
                const url = new URL(value);
                return url.protocol === 'https:' && !url.username && !url.password;
              }, 'Źródło musi mieć adres HTTPS bez danych logowania.'),
            section: requiredText(400),
          })
          .strict(),
      )
      .min(1)
      .max(12),
    reviewedAt: z.iso.date(),
    schoolYear: schoolYear.optional(),
    type: z.enum(['rules', 'advice', 'service']),
  })
  .strict();
