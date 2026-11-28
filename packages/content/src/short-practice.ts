import type { PostShortPractice, SqlJoinPractice, SqlShortPractice } from '@zdaj/shared';
import { allExamStudyGuides } from './exam-study.js';

function sqlStep(guideId: string, version: number, stepId: string, queryNumber: number) {
  const guide = allExamStudyGuides.find((item) => item.id === guideId && item.version === version);
  const step = guide?.steps.find((item) => item.id === stepId);
  if (!guide || !step?.page) throw new Error(`Missing source for ${guideId} v${version}/${stepId}`);

  return {
    source: { catalogId: guide.taskId, page: step.page, queryNumber },
    fragment(activityId: string) {
      const sql = step.activities
        ?.find((activity) => activity.id === activityId)
        ?.exampleCode.trim();
      if (!sql)
        throw new Error(`Missing SQL example for ${guideId} v${version}/${stepId}/${activityId}`);
      return sql;
    },
  };
}

const chat = sqlStep('chat-study', 1, 'queries', 3);
const dragons = sqlStep('baza-smokow-study', 3, 'sql', 3);
const select = dragons.fragment('average');
const groupYears = dragons.fragment('group-years');

export const sqlJoinPractice: SqlJoinPractice = {
  id: 'sql-join-v1',
  example: {
    source: chat.source,
    sql: `${chat.fragment('join').replace(/;$/, '')}\n${chat.fragment('prefix')};`,
    explanation:
      "Warunek ON wiąże uczestnicy.logowanie_id z logowanie.id. W wyniku obok imienia i nazwiska pojawia się nick i hasło tej samej osoby. Warunek WHERE imie LIKE 'J%' wybiera osoby, których imię zaczyna się na J.",
  },
  exercise: {
    source: dragons.source,
    prompt:
      'Uzupełnij złączenia, żeby obliczyć średnią długość smoków dla każdego roku po 2005. W edytorze masz już wybór kolumn, filtr lat i grupowanie.',
    tables: [
      { name: 'parada', columns: ['id', 'rok'] },
      { name: 'udzial', columns: ['id_parada', 'id_smok'] },
      { name: 'smok', columns: ['id', 'dlugosc'] },
    ],
    starterSql: `${select}\n-- Dopisz złączenia w tym miejscu\n${groupYears}`,
    exampleSql: `${select}\n${dragons.fragment('joins')}\n${groupYears}`,
    hint: 'Zacznij od parady. W tabeli udzial znajdź pole wskazujące paradę i pole wskazujące smoka. Zapisz osobny warunek dla każdej pary kluczy.',
  },
};

const rivers = sqlStep('poziomy-rzek-study', 1, 'queries', 4);
const tasks = sqlStep('moje-zadania-study', 1, 'queries', 4);
const countNotes = tasks.fragment('count').replace(/;$/, '');

export const sqlGroupByPractice: SqlShortPractice = {
  id: 'sql-group-by-v1',
  example: {
    source: rivers.source,
    sql: rivers.fragment('query-four'),
    explanation:
      'GROUP BY dataPomiaru tworzy osobną grupę pomiarów dla każdej daty. AVG oblicza średnią osobno w każdej z tych grup.',
  },
  exercise: {
    source: tasks.source,
    prompt: 'Uzupełnij zapytanie 4, żeby zwrócić imię i liczbę notatek dla każdej osoby.',
    tables: [
      { name: 'notatki', columns: ['id', 'Osoby_id'] },
      { name: 'osoby', columns: ['id', 'imie'] },
    ],
    starterSql: `${countNotes}\n-- Dopisz grupowanie`,
    exampleSql: `${countNotes}\n${tasks.fragment('group')}`,
    hint: 'COUNT już liczy notatki. Pogrupuj wiersze po kolumnie imie, żeby dostać osobną liczbę dla każdej osoby.',
  },
};

export const riverPostPractice: PostShortPractice = {
  source: { catalogId: rivers.source.catalogId, page: 4 },
  taskVersion: 1,
  stepId: 'php-form',
  activityId: 'read-option',
  starterFiles: [
    {
      path: 'poziomRzek.php',
      content: `<?php
// Odczytaj wybór z POST i zapisz go w zmiennej $filtr.
?>
<!doctype html>
<html lang="pl">
<head><meta charset="utf-8"><title>Wybór poziomu rzek</title></head>
<body>
  <form method="post">
    <fieldset>
      <legend>Wybierz pomiary</legend>
      <label><input type="radio" name="poziom" value="wszystkie" checked> Wszystkie</label>
      <label><input type="radio" name="poziom" value="ostrzegawczy"> Ponad stan ostrzegawczy</label>
      <label><input type="radio" name="poziom" value="alarmowy"> Ponad stan alarmowy</label>
    </fieldset>
    <button type="submit">Pokaż</button>
  </form>
  <p>Odczytany filtr: <output><?= htmlspecialchars($filtr ?? 'brak', ENT_QUOTES, 'UTF-8') ?></output></p>
</body>
</html>
`,
    },
  ],
};
