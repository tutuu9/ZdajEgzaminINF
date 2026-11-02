import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { validateProjectFiles, validateTaskChecks } from '@zdaj/checker';
import type { TaskVersion } from '@zdaj/shared';
import { topics, exercises } from '@zdaj/content';

export const modeSchema = z.enum(['nauka', 'trening', 'egzamin']);
export const levelSchema = z.enum(['beginner', 'intermediate', 'advanced']);
const text = z.string().trim().min(1).max(50_000);
const id = z.string().regex(/^[a-z0-9][a-z0-9._-]{0,100}$/i);
const url = z
  .url()
  .refine((value) => new URL(value).protocol === 'https:', 'Adres musi używać HTTPS.');
const option = z.object({ id, text, explanation: text }).strict();
const step = z.object({ title: text, body: text, checkpoint: text }).strict();
const criterion = z
  .object({
    id,
    title: text,
    description: text,
    method: z.enum(['file', 'dom', 'style', 'javascript', 'php', 'sql', 'image', 'manual']),
    source: z.enum(['educational', 'official']),
    points: z.number().int().min(0).max(100),
    check: z.object({ type: text }).catchall(z.unknown()).optional(),
  })
  .strict();
const task = z
  .object({
    id,
    version: z.number().int().positive(),
    title: text,
    summary: text,
    qualification: z.enum(['INF.03', 'INF.04']),
    topicIds: z.array(id).min(1).max(20),
    technologies: z.array(text).max(20),
    durationMinutes: z.number().int().min(1).max(600),
    difficulty: levelSchema,
    runtimeProfile: z.enum(['web', 'php-mariadb']),
    requirements: z.array(text).min(1).max(100),
    starterFiles: z
      .array(
        z
          .object({
            path: text,
            content: z.string().max(200_000),
            encoding: z.enum(['utf8', 'base64']).optional(),
          })
          .strict(),
      )
      .max(100),
    guidance: z
      .object({ beginner: z.array(step), intermediate: z.array(step), advanced: z.array(step) })
      .strict(),
    hints: z.array(text).max(30),
    criteria: z.array(criterion).max(100),
    followUp: text,
    origin: z.enum(['original', 'exam']),
    sourceCatalogId: id.optional(),
    supportStatus: z.enum(['full', 'partial', 'catalog-only']).optional(),
  })
  .strict();
const lesson = z
  .object({
    id,
    version: z.number().int().positive(),
    topicId: id,
    title: text,
    summary: text,
    minutes: z.number().int().positive().max(300),
    level: levelSchema,
    body: text,
    objectives: z.array(text),
    exerciseIds: z.array(id),
    order: z.number().int().min(0).max(999).optional(),
  })
  .strict();
const question = z
  .object({
    id,
    version: z.number().int().positive(),
    topicId: id,
    level: levelSchema,
    prompt: text,
    options: z.array(option).length(4),
    correctOptionId: id,
    explanation: text,
    reference: url,
    source: z
      .object({
        catalogId: id,
        url,
        page: z.number().int().positive(),
        questionNumber: z.number().int().positive(),
        top: z.number().min(0).max(1).optional(),
        bottom: z.number().min(0).max(1).optional(),
      })
      .strict()
      .refine(
        (source) =>
          source.top === undefined || source.bottom === undefined || source.top < source.bottom,
      )
      .optional(),
  })
  .strict()
  .refine(
    (value) =>
      new Set(value.options.map((x) => x.id)).size === 4 &&
      new Set(value.options.map((x) => x.text.toLocaleLowerCase('pl-PL'))).size === 4 &&
      value.options.some((x) => x.id === value.correctOptionId),
    'Odpowiedzi muszą mieć unikalne identyfikatory i treść oraz jeden poprawny wariant.',
  );
export const catalogSchema = z
  .object({
    id,
    title: text,
    qualification: z.enum(['INF.03', 'INF.04']),
    formula: text,
    year: z.number().int().min(2000).max(2100).nullable(),
    session: text.nullable(),
    identifier: text.nullable(),
    variant: text.nullable(),
    topics: z.array(text),
    technologies: z.array(text),
    sourceUrl: url,
    sourceName: text,
    attachments: z
      .array(
        z
          .object({
            title: text,
            url,
            type: text,
            sha256: z
              .string()
              .regex(/^[a-f0-9]{64}$/)
              .optional(),
          })
          .strict(),
      )
      .max(30),
    criteriaAvailability: z.enum(['available', 'missing', 'unverified']),
    rightsStatus: z.enum(['original', 'unknown', 'permission-confirmed']),
    importStatus: z.enum(['metadata-only', 'verified', 'incomplete']),
    supportStatus: z.enum(['full', 'partial', 'catalog-only']),
    checkedAt: z.string().nullable(),
    notes: z.string().max(10_000),
  })
  .strict();
const schemas = { task, lesson, question, catalog: catalogSchema };
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new BadRequestException(
      result.error.issues
        .map((x) => `${x.path.join('.')}: ${x.message}`)
        .join('; ')
        .slice(0, 1500),
    );
  return result.data;
}
export function validateContent(kind: string, payload: unknown): Record<string, unknown> {
  if (!(kind in schemas)) throw new BadRequestException('Nieobsługiwany typ materiału.');
  const value = parse(
    schemas[kind as keyof typeof schemas] as z.ZodType<unknown>,
    payload,
  ) as Record<string, unknown>;
  const topicIds = new Set(topics.map((topic) => topic.id));
  if (kind === 'task' && (value.topicIds as string[]).some((topicId) => !topicIds.has(topicId)))
    throw new BadRequestException('Zadanie odwołuje się do nieznanego tematu.');
  if (['lesson', 'question'].includes(kind) && !topicIds.has(value.topicId as string))
    throw new BadRequestException('Materiał odwołuje się do nieznanego tematu.');
  if (
    kind === 'lesson' &&
    (value.exerciseIds as string[]).some(
      (exerciseId) => !exercises.some((exercise) => exercise.id === exerciseId),
    )
  )
    throw new BadRequestException('Lekcja odwołuje się do nieznanego ćwiczenia.');
  if (kind === 'task') {
    try {
      if (value.supportStatus !== 'catalog-only') {
        if (!(value.criteria as unknown[]).length) throw new Error('Missing criteria');
        validateTaskChecks(value as unknown as TaskVersion);
      }
      if ((value.starterFiles as unknown[]).length) validateProjectFiles(value.starterFiles);
    } catch {
      throw new BadRequestException(
        'Zadanie zawiera nieobsługiwany typ sprawdzania, jego parametry lub niepoprawne pliki początkowe.',
      );
    }
  }
  return value;
}
