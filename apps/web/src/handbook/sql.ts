import type { HandbookBook } from './types';

export const sqlBook: HandbookBook = {
  id: 'sql',
  title: 'SQL',
  description: 'Wybieranie, warunki, funkcje agregujące, relacje i zmiany w bazie.',
  chapters: [
    {
      id: 'select',
      title: 'SELECT, WHERE i ORDER BY',
      summary: 'Wybierz tylko potrzebne kolumny, odfiltruj wiersze i ustaw kolejność.',
      sections: [
        {
          heading: 'Kolejność części zapytania',
          body: `\`SELECT kolumny FROM tabela WHERE warunek ORDER BY kolumna LIMIT liczba;\`

Arkusz pisze „wybierające **jedynie** nazwę i priorytet” — wypisz dokładnie te kolumny. \`SELECT *\` pokaże wszystkie i nie spełni kryterium. \`ORDER BY\` sortuje rosnąco, \`DESC\` — malejąco. \`LIMIT 10\` zostawia pierwsze dziesięć wierszy.`,
          example: {
            kind: 'sql',
            code: `SELECT nazwa, nazwaNaukowa, sredniaDlugoscZycia
FROM gatunki
WHERE rodzaj = 2
ORDER BY sredniaDlugoscZycia DESC;`,
            result: {
              columns: ['nazwa', 'nazwaNaukowa', 'sredniaDlugoscZycia'],
              rows: [
                ['Cis', 'Taxus', '1000'],
                ['Cedr', 'Cedrus', '1000'],
                ['Cyprys', 'Cupressus', '500'],
                ['Daglezja', 'Pseudotsuga', '500'],
                ['Jodła', 'Abies', '300'],
                ['Świerk', 'Picea', '200'],
                ['Sosna', 'Pinus', '150'],
                ['Modrzew', 'Larix', '100'],
              ],
              source: 'baza atlas_drzew z arkusza INF.03-11-26.06-SG',
            },
          },
        },
        {
          heading: 'Tekst w apostrofach, liczby bez',
          body: `\`WHERE typ = 'górski'\` — tekst i daty piszesz w apostrofach (MySQL przyjmie też cudzysłów). Liczby bez: \`WHERE cena <= 4500\`. Nazwy kolumn przepisuj dokładnie, z wielkością liter i podkreśleniami (\`rozmiar_ramy\`, \`nazwaNaukowa\`).`,
        },
      ],
      mistakes: [
        '`SELECT *` tam, gdzie arkusz wymaga „jedynie” wybranych kolumn.',
        '`ORDER BY` przed `WHERE` — zła kolejność części zapytania.',
        'Brak średnika między zapytaniami w kwerendy.txt.',
      ],
      papers: [
        {
          taskId: 'inf03-11-26-06-sg',
          title: 'Atlas drzew',
          note: 'Gatunki iglaste posortowane malejąco według długości życia.',
        },
        {
          taskId: 'inf03-06-25-01-sg',
          title: 'Systemy liczbowe',
          note: 'Dziesięć zawodników o najniższym rankingu: ORDER BY i LIMIT.',
        },
      ],
    },
    {
      id: 'warunki',
      title: 'Warunki: LIKE, AND, daty i puste wartości',
      summary: 'Wzorce tekstu, łączenie warunków i różnica między pustym tekstem a NULL.',
      sections: [
        {
          heading: 'LIKE i znak %',
          body: `\`%\` oznacza dowolny ciąg znaków:

- \`'A%'\` — zaczyna się od A;
- \`'%a'\` — kończy się na a;
- \`'%na%'\` — zawiera „na” w dowolnym miejscu (także w „Weterynarz”).

Data w formacie RRRR-MM-DD też jest tekstem do porównania: \`LIKE '2020-07%'\` to cały lipiec 2020.`,
          example: {
            kind: 'sql',
            code: `SELECT nazwa, priorytet FROM notatki WHERE nazwa LIKE '%na%';`,
            result: {
              columns: ['nazwa', 'priorytet'],
              rows: [
                ['Gimnastyka', '1'],
                ['Projekt na geografię', '2'],
                ['Wyjazd na wakacje', '5'],
                ['Weterynarz Brutus', '5'],
              ],
              source: 'baza notatki z arkusza INF.03-02-25.06-SG',
            },
          },
        },
        {
          heading: 'Pusty tekst to nie NULL',
          body: `\`NULL\` oznacza brak wartości i sprawdza się przez \`IS NULL\` / \`IS NOT NULL\` — porównanie \`= NULL\` nigdy nie jest prawdziwe. Ale część baz zapisuje brak tytułu jako **pusty tekst** \`''\`. Wtedy warunek to \`tytul != ''\`. Zajrzyj do danych w phpMyAdmin, zanim wybierzesz warunek — w *Systemach liczbowych* kryteria wprost uznają \`IS NOT NULL\` za błąd.`,
          example: {
            kind: 'sql',
            code: `SELECT pseudonim, tytul FROM zawodnicy WHERE klasa = '3A' AND tytul != '';`,
            result: {
              columns: ['pseudonim', 'tytul'],
              rows: [
                ['Botas Bross', 'KM'],
                ['BananD', 'PM'],
                ['DavNav', 'OM'],
                ['JanNie', 'OM'],
              ],
              source: 'baza szachy z arkusza INF.03-06-25.01-SG',
            },
          },
        },
      ],
      mistakes: [
        "`LIKE 'na%'` zamiast `'%na%'` — znajduje tylko początek nazwy.",
        '`= NULL` zamiast `IS NULL`.',
        '`IS NOT NULL`, gdy brak wartości jest zapisany jako pusty tekst.',
      ],
      papers: [
        {
          taskId: 'inf03-02-25-06-sg',
          title: 'Moje zadania',
          note: 'Notatki, których nazwa zawiera cząstkę „na”.',
        },
        {
          taskId: 'inf03-06-25-01-sg',
          title: 'Systemy liczbowe',
          note: "Tytuły zdobyte w lipcu 2020 i niepusty tytuł porównywany z ''.",
        },
        {
          taskId: 'inf03-11-26-06-sg',
          title: 'Atlas drzew',
          note: 'Nazwy kończące się na literę a.',
        },
      ],
    },
    {
      id: 'agregaty',
      title: 'COUNT, MIN, MAX, AVG i GROUP BY',
      summary: 'Jedna wartość dla tabeli albo dla każdej grupy, z czytelną nazwą kolumny.',
      sections: [
        {
          heading: 'Funkcja agregująca',
          body: `\`COUNT\`, \`MIN\`, \`MAX\`, \`AVG\`, \`SUM\` liczą jedną wartość z wielu wierszy. Bez \`GROUP BY\` — dla całego wyniku.`,
          example: {
            kind: 'sql',
            code: `SELECT MIN(priorytet) FROM notatki WHERE Osoby_id = 3;`,
            result: {
              columns: ['MIN(priorytet)'],
              rows: [['2']],
              source: 'baza notatki z arkusza INF.03-02-25.06-SG',
            },
          },
        },
        {
          heading: 'Grupa i alias',
          body: `\`GROUP BY rodzaj\` tworzy jedną grupę na każdą wartość, a funkcja liczy w każdej z nich. Kolumna wypisana w \`SELECT\` bez funkcji powinna być w \`GROUP BY\`.

\`AS\` nadaje kolumnie nazwę z arkusza. Alias ze spacją lub polską literą ujmij w backticki albo cudzysłów, np. \`\` \`średnia cena\` \`\` albo \`"ilość"\`.`,
          example: {
            kind: 'sql',
            code: 'SELECT rodzaj, COUNT(*) AS `ilość` FROM gatunki GROUP BY rodzaj;',
            result: {
              columns: ['rodzaj', 'ilość'],
              rows: [
                ['1', '23'],
                ['2', '8'],
                ['3', '22'],
              ],
              source: 'baza atlas_drzew z arkusza INF.03-11-26.06-SG',
            },
          },
        },
      ],
      mistakes: [
        'Brak `GROUP BY` — jeden wiersz zamiast wiersza na każdą grupę.',
        'Alias z polską literą bez backticków lub cudzysłowu.',
        'Kolumna w `SELECT` spoza `GROUP BY` i bez funkcji agregującej.',
      ],
      papers: [
        {
          taskId: 'inf03-12-26-06-sg',
          title: 'Salon rowerowy',
          note: 'MIN, AVG i MAX ceny dla każdego producenta z trzema aliasami.',
        },
        {
          taskId: 'inf03-11-26-06-sg',
          title: 'Atlas drzew',
          note: 'Liczba gatunków w każdym rodzaju z aliasem „ilość”.',
        },
        {
          taskId: 'inf03-02-25-06-sg',
          title: 'Moje zadania',
          note: 'Najmniejszy priorytet osoby o id 3.',
        },
      ],
    },
    {
      id: 'relacje',
      title: 'Relacje i JOIN',
      summary: 'Klucz obcy, JOIN … ON, nazwy z tabelą, dwa złączenia i LEFT JOIN.',
      sections: [
        {
          heading: 'Klucz obcy wskazuje wiersz w innej tabeli',
          body: `Pole \`notatki.Osoby_id\` przechowuje \`id\` osoby z tabeli \`osoby\`. Gdy arkusz pisze „należy posłużyć się relacją”, połącz tabele po tych kluczach:

\`FROM notatki JOIN osoby ON notatki.Osoby_id = osoby.id\`

Bez warunku \`ON\` każda notatka połączy się z każdą osobą. Kryteria uznają też zapis \`FROM notatki, osoby WHERE notatki.Osoby_id = osoby.id\`.`,
          example: {
            kind: 'sql',
            code: `SELECT imie, nazwa
FROM notatki JOIN osoby ON notatki.Osoby_id = osoby.id
WHERE priorytet = 5;`,
            result: {
              columns: ['imie', 'nazwa'],
              rows: [
                ['Krzysiek', 'Wyprowadzić psa'],
                ['Krzysiek', 'Spacer z kumplem'],
                ['Ewelina', 'Wyjazd na wakacje'],
                ['Ewelina', 'Weterynarz Brutus'],
                ['Ewelina', 'Lekarz'],
              ],
              source: 'baza notatki z arkusza INF.03-02-25.06-SG',
            },
          },
        },
        {
          heading: 'Kolumna o tej samej nazwie w dwóch tabelach',
          body: `Gdy obie tabele mają kolumnę \`id\`, zapisz \`drzewa.id\` — samo \`id\` jest niejednoznaczne i zapytanie się nie wykona. Trzy tabele łączysz dwoma \`JOIN\`, każdy z własnym \`ON\`.`,
        },
        {
          heading: 'LEFT JOIN pokazuje też wiersze bez pary',
          body: `\`JOIN\` pokazuje tylko osoby, które mają zadania. \`LEFT JOIN\` pokazuje wszystkie osoby z lewej tabeli, a \`COUNT\` daje 0 tym bez zadań. W *Panelach podłogowych* kryteria uznają oba wyniki: 4 wiersze z \`JOIN\` albo 6 z \`LEFT JOIN\`.`,
          example: {
            kind: 'sql',
            code: `SELECT nazwisko, COUNT(id_zadania) AS \`Liczba zadań\`
FROM osoby LEFT JOIN zadania ON id_osoba = osoba_id
GROUP BY nazwisko;`,
            result: {
              columns: ['nazwisko', 'Liczba zadań'],
              rows: [
                ['A.', '2'],
                ['C.', '0'],
                ['G.', '2'],
                ['K.', '1'],
                ['L.', '0'],
                ['W.', '2'],
              ],
              source:
                'baza przewozy z arkusza INF.03-02-25.01-SG (kolejność wierszy może się różnić)',
            },
          },
        },
      ],
      mistakes: [
        'Złączenie bez `ON` — iloczyn kartezjański, wynik ma za dużo wierszy.',
        'Złączenie po niewłaściwych polach (np. `notatki.id = osoby.id`).',
        'Niejednoznaczne `id` bez nazwy tabeli.',
      ],
      papers: [
        {
          taskId: 'inf03-02-25-06-sg',
          title: 'Moje zadania',
          note: 'Imię osoby i nazwa notatki z priorytetem 5 przez relację.',
        },
        {
          taskId: 'inf03-11-26-06-sg',
          title: 'Atlas drzew',
          note: 'Trzy tabele: drzewa, gatunki i lokalizacje.',
        },
        {
          taskId: 'inf03-02-25-01-sg',
          title: 'Panele podłogowe',
          note: 'Liczba zadań dla nazwisk; JOIN albo LEFT JOIN.',
        },
      ],
    },
    {
      id: 'zmiany',
      title: 'Zmiany w danych, strukturze i kontach',
      summary: 'INSERT, UPDATE, ALTER TABLE, CREATE USER, GRANT i praca w phpMyAdmin.',
      sections: [
        {
          heading: 'Zmiana danych',
          body: `- \`INSERT INTO logowanie (id, nick, haslo) VALUES (3, 'Jeremi', 'Jer123');\` — jawne nazwy kolumn wiążą wartości z właściwymi polami.
- \`UPDATE rowery SET cena = cena * 0.75 WHERE typ = 'gravel';\` — obniżka o 25% to 75% ceny. **Bez WHERE zmienisz wszystkie wiersze.** Wykonaj UPDATE tylko raz: każde kolejne wykonanie obniży ceny ponownie.
- \`DELETE FROM … WHERE …\` — usuwa wiersze; też zawsze z warunkiem.`,
          example: {
            kind: 'sql',
            code: `-- Najpierw sprawdź, ile wierszy obejmie warunek UPDATE:
SELECT COUNT(*) FROM rowery WHERE typ = 'gravel';`,
            result: {
              columns: ['COUNT(*)'],
              rows: [['5']],
              source: 'baza rowery z arkusza INF.03-12-26.06-SG — tyle wierszy zmieni UPDATE',
            },
          },
        },
        {
          heading: 'Zmiana struktury i uprawnień',
          body: `- \`ALTER TABLE osoby DROP COLUMN telefon;\` — usuwa kolumnę razem z danymi; \`ADD COLUMN\` dodaje nową.
- \`CREATE USER 'uczestnik'@'localhost' IDENTIFIED BY 'Ucz123&';\` — konto z hostem i hasłem z arkusza.
- \`GRANT SELECT, UPDATE ON chat.uczestnicy TO 'uczestnik'@'localhost';\` — prawa tylko do jednej tabeli. \`chat.*\` albo \`*.*\` dałoby więcej, niż wymaga arkusz.`,
        },
        {
          heading: 'phpMyAdmin, kwerendy.txt i zrzuty',
          body: `1. Utwórz bazę o nazwie z arkusza z porównywaniem \`utf8_unicode_ci\`.
2. Zaimportuj plik .sql z archiwum i zrób zrzut \`import.png\`.
3. Wykonaj każde zapytanie w zakładce SQL, zapisz je w \`kwerendy.txt\` (każde zakończone średnikiem) i zrób zrzut wyniku pod nazwą z arkusza.

Zrzut ma obejmować **cały ekran z paskiem zadań** — kryteria nie oceniają wykadrowanych zrzutów. Sprawdź też format: część arkuszy wymaga JPEG (\`kw1.jpg\`), część PNG (\`kw1.png\`).`,
        },
      ],
      mistakes: [
        '`UPDATE` bez `WHERE` albo wykonany kilka razy.',
        'Prawa nadane na `baza.*` zamiast na jedną tabelę.',
        'Wykadrowany zrzut albo zrzut w innym formacie niż w arkuszu.',
      ],
      papers: [
        {
          taskId: 'inf03-12-26-06-sg',
          title: 'Salon rowerowy',
          note: 'UPDATE obniżający cenę rowerów gravelowych o 25% (5 wierszy).',
        },
        {
          taskId: 'inf03-02-25-01-sg',
          title: 'Panele podłogowe',
          note: 'ALTER TABLE usuwający kolumnę telefon.',
        },
        {
          taskId: 'inf03-02-24-06-sg',
          title: 'Chat',
          note: 'INSERT, CREATE USER i GRANT do jednej tabeli.',
        },
      ],
    },
  ],
};
