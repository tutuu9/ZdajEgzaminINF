import type { TaskVersion } from '@zdaj/shared';
import { validatePath } from './archive.js';
const methods = new Set(['file', 'dom', 'style', 'javascript', 'php', 'sql', 'image', 'manual']);
export function validateTaskChecks(task: TaskVersion): void {
  if (!Array.isArray(task.criteria) || !task.criteria.length || task.criteria.length > 100)
    throw new Error('Zadanie musi zawierać od 1 do 100 kryteriów.');
  const ids = new Set<string>();
  for (const criterion of task.criteria) {
    if (
      !criterion.id ||
      ids.has(criterion.id) ||
      !Number.isFinite(criterion.points) ||
      criterion.points <= 0 ||
      !methods.has(criterion.method)
    )
      throw new Error('Nieprawidłowe kryterium.');
    ids.add(criterion.id);
    if (criterion.method === 'manual') continue;
    const check = criterion.check;
    if (!check || !methods.has(check.type) || check.type !== criterion.method)
      throw new Error('Nieobsługiwany rodzaj sprawdzania.');
    if (typeof check.path !== 'string') throw new Error('Brak ścieżki sprawdzanego pliku.');
    validatePath(check.path.split('?')[0]);
    if (
      check.type === 'javascript' &&
      ![
        'workshop-calculator',
        'panel-switching',
        'kursy-calculator',
        'smoki-tabs',
        'firma-contact',
        'salon-calculator',
        'chat-messages',
      ].includes(String(check.action))
    )
      throw new Error('Nieobsługiwany scenariusz JavaScript.');
    if (
      check.selector !== undefined &&
      (typeof check.selector !== 'string' || check.selector.length > 500)
    )
      throw new Error('Nieprawidłowy selektor.');
    if (
      check.queryIndex !== undefined &&
      (!Number.isInteger(check.queryIndex) ||
        Number(check.queryIndex) < 0 ||
        Number(check.queryIndex) > 49)
    )
      throw new Error('Nieprawidłowy numer zapytania.');
    if (check.type === 'sql' && !Array.isArray(check.expectedRows))
      throw new Error('Brak oczekiwanego wyniku zapytania.');
  }
}
