import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { examStudyGuides, legacyExamStudyGuides } from '@zdaj/content';

describe('exam learning code examples', () => {
  it('adds small explained activities to every step without replacing earlier guide revisions', () => {
    expect(examStudyGuides).toHaveLength(3);
    for (const guide of examStudyGuides) {
      expect(guide.version).toBe(2);
      const legacy = legacyExamStudyGuides.find((item) => item.id === guide.id)!;
      expect(legacy.version).toBe(1);
      expect(guide.taskVersion).toBe(legacy.taskVersion);
      for (const step of guide.steps) {
        expect(step.activities!.length).toBeGreaterThanOrEqual(3);
        const oldStep = legacy.steps.find((item) => item.id === step.id)!;
        expect(oldStep.activities).toBeUndefined();
        expect(step.code).toBe(oldStep.code);
        const ids = step.activities!.map((item) => item.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const activity of step.activities!) {
          expect(activity.explanation.length).toBeGreaterThan(35);
          expect(activity.instruction.length).toBeGreaterThan(15);
          expect(activity.why.length).toBeGreaterThan(0);
          expect(activity.check.type).toBe('self-check');
          expect(activity.check.prompt.length).toBeGreaterThan(15);
        }
      }
    }
  });

  it('calculates selected course prices repeatedly and rejects invalid installment counts', () => {
    const guide = examStudyGuides.find((item) => item.taskId === 'inf03-01-25-01-sg')!;
    const code = guide.steps.find((step) => step.id === 'calculator')!.code;
    let click = () => {};
    const fields: Record<string, Record<string, unknown>> = {
      react: { checked: true },
      javascript: { checked: true },
      raty: { valueAsNumber: 10 },
      miasto: { value: 'Katowice' },
      wynik: { textContent: '' },
      oblicz: {
        addEventListener: (_event: string, callback: () => void) => {
          click = callback;
        },
      },
    };
    runInNewContext(
      code,
      { document: { getElementById: (id: string) => fields[id] } },
      { timeout: 1000 },
    );
    click();
    expect(fields.wynik.textContent).toContain(
      'Koszt całkowity: 8000 zł. Płacisz 10 rat po 800 zł',
    );
    fields.react.checked = false;
    fields.raty.valueAsNumber = 3;
    click();
    expect(fields.wynik.textContent).toContain(
      'Koszt całkowity: 3000 zł. Płacisz 3 rat po 1000 zł',
    );
    for (const value of [0, -1, NaN, 1.5]) {
      fields.raty.valueAsNumber = value;
      click();
      expect(fields.wynik.textContent).toBe('Podaj dodatnią całkowitą liczbę rat.');
    }
  });

  it('keeps exactly one dragon section visible after switching repeatedly', () => {
    const guide = examStudyGuides.find((item) => item.taskId === 'inf03-08-25-06-sg')!;
    const code = guide.steps.find((step) => step.id === 'tabs')!.code;
    const names = ['baza', 'opisy', 'galeria'];
    const listeners: Record<string, () => void> = {};
    const elements = Object.fromEntries(
      names.flatMap((id) => [
        [id, { style: {} as Record<string, string> }],
        [
          'nav-' + id,
          {
            style: {} as Record<string, string>,
            addEventListener: (_event: string, callback: () => void) => {
              listeners[id] = callback;
            },
          },
        ],
      ]),
    ) as Record<string, { style: Record<string, string> }>;
    runInNewContext(
      code,
      { document: { getElementById: (id: string) => elements[id] } },
      { timeout: 1000 },
    );
    for (const selected of ['baza', 'galeria', 'opisy', 'baza']) {
      listeners[selected]();
      expect(names.filter((id) => elements[id].style.display === 'block')).toEqual([selected]);
      expect(
        names.filter((id) => elements['nav-' + id].style.backgroundColor === 'MistyRose'),
      ).toEqual([selected]);
    }
  });
});
