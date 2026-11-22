import type { SqlJoinPractice } from '@zdaj/shared';
import { allExamStudyGuides } from './exam-study.js';

function sqlStep(guideId: string, version: number, stepId: string) {
  const guide = allExamStudyGuides.find((item) => item.id === guideId && item.version === version);
  const step = guide?.steps.find((item) => item.id === stepId);
  if (!guide || !step?.page) throw new Error(`Missing source for ${guideId} v${version}/${stepId}`);

  return {
    source: { catalogId: guide.taskId, page: step.page, queryNumber: 3 },
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

const chat = sqlStep('chat-study', 1, 'queries');
const dragons = sqlStep('baza-smokow-study', 3, 'sql');
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
