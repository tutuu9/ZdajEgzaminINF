/**
 * "Jak wygląda egzamin" — the practical part of INF.03 as a sequence of stages.
 *
 * Every point names where it comes from, so a learner can tell a CKE rule from what one
 * example paper asked for and from practical advice:
 * - `cke`: CKE pages or documents listed in `EXAM_DAY_SOURCES`;
 * - `sheet`: the example paper INF.03-02-24.06-SG (details differ between papers);
 * - `advice`: platform advice, not a rule.
 */
export type PointOrigin = 'cke' | 'sheet' | 'advice';

export interface ExamDayPoint {
  text: string;
  origin: PointOrigin;
}

export interface ExamDayStage {
  id: string;
  when: string;
  title: string;
  points: ExamDayPoint[];
  /** FAQ entry ids with the detailed, sourced answer. */
  faq: { id: string; label: string }[];
  /** Where to practise the stage in this application. */
  practice?: { to: string; label: string };
}

export const ORIGIN_LABELS: Record<PointOrigin, string> = {
  cke: 'Zasada CKE',
  sheet: 'Przykład z arkusza',
  advice: 'Porada',
};

export const EXAM_DAY_STAGES: ExamDayStage[] = [
  {
    id: 'stanowisko',
    when: 'Przed startem',
    title: 'Stanowisko egzaminacyjne',
    points: [
      {
        origin: 'cke',
        text: 'Pracujesz sam przy komputerze bez dostępu do sieci i internetu.',
      },
      {
        origin: 'cke',
        text: 'Na komputerze jest pakiet XAMPP z serwerem Apache, bazą MySQL (MariaDB), PHP i phpMyAdmin.',
      },
      {
        origin: 'cke',
        text: 'Kod piszesz w edytorze z kolorowaniem składni (np. Notepad++, Visual Studio Code) — bez funkcji WYSIWYG.',
      },
      {
        origin: 'cke',
        text: 'Są też przeglądarki internetowe, edytory grafiki rastrowej i wektorowej (np. GIMP, Inkscape) oraz program do archiwów (np. 7-Zip).',
      },
      {
        origin: 'advice',
        text: 'Dokładne programy i wersje zna Twój ośrodek. Przećwicz pracę w środowisku wskazanym przez szkołę.',
      },
    ],
    faq: [
      { id: 'inf03-workstation-software', label: 'Jakie programy i wersje będą na stanowisku?' },
      { id: 'inf03-permitted-aids', label: 'Co wolno przynieść i czego nie wolno używać?' },
    ],
  },
  {
    id: 'zapoznanie',
    when: '10 minut',
    title: 'Zapoznanie z zadaniem',
    points: [
      {
        origin: 'sheet',
        text: 'Przed rozpoczęciem pracy masz 10 minut na zapoznanie się z zadaniem i stanowiskiem. Ten czas nie wlicza się do czasu egzaminu.',
      },
      {
        origin: 'sheet',
        text: 'Sprawdzasz, czy arkusz ma wszystkie strony, i wpisujesz numer PESEL oraz dane na KARCIE OCENY.',
      },
      {
        origin: 'advice',
        text: 'Przeczytaj całe zadanie do końca, zanim otworzysz pierwszy program. Zaznacz nazwy plików i listę rezultatów.',
      },
    ],
    faq: [
      { id: 'inf03-first-page', label: 'Co sprawdzić na pierwszej stronie arkusza?' },
      { id: 'inf03-practical-duration', label: 'Ile trwa praktyka?' },
      { id: 'inf03-reading-requirements', label: 'Jak czytać wymagania i listę rezultatów?' },
    ],
  },
  {
    id: 'start',
    when: 'Pierwsze minuty',
    title: 'Konto, archiwum i folder',
    points: [
      {
        origin: 'sheet',
        text: 'Logujesz się na konto wskazane w arkuszu (w przykładzie: „Egzamin”, bez hasła).',
      },
      {
        origin: 'sheet',
        text: 'Na pulpicie leży archiwum z plikami zadania, zabezpieczone hasłem podanym w arkuszu.',
      },
      {
        origin: 'sheet',
        text: 'Tworzysz na pulpicie folder nazwany numerem zdającego (PESEL), rozpakowujesz do niego pliki i tam zapisujesz wszystkie wyniki.',
      },
      {
        origin: 'advice',
        text: 'Ćwicząc w serwisie, nie wpisuj prawdziwego numeru PESEL do projektu ani do zrzutów.',
      },
    ],
    faq: [{ id: 'inf03-file-names', label: 'Jak nazywać pliki, foldery i bazę danych?' }],
  },
  {
    id: 'baza',
    when: 'Część bazodanowa',
    title: 'Baza danych w phpMyAdmin',
    points: [
      {
        origin: 'advice',
        text: 'W panelu XAMPP uruchom moduły Apache i MySQL, a phpMyAdmin otwórz pod adresem http://localhost/phpmyadmin.',
      },
      {
        origin: 'sheet',
        text: 'Tworzysz bazę o nazwie i z kodowaniem podanym w arkuszu, a następnie importujesz plik .sql z rozpakowanego archiwum.',
      },
      {
        origin: 'sheet',
        text: 'Zapytania SQL zapisujesz w pliku kwerendy.txt. Po imporcie i po każdym zapytaniu robisz zrzut ekranu pod wskazaną nazwą (np. kw1.jpg).',
      },
      {
        origin: 'sheet',
        text: 'W przykładowym arkuszu zrzuty mają obejmować cały ekran z widocznym paskiem zadań i nie wolno ich kadrować. Zawsze sprawdź warunki we własnym arkuszu.',
      },
    ],
    faq: [{ id: 'inf03-screenshots', label: 'Kiedy i jak wykonywać zrzuty ekranu?' }],
    practice: {
      to: '/arkusze',
      label: 'Ćwicz zapytania w zakładce „Baza i PHP” podczas nauki z arkuszem',
    },
  },
  {
    id: 'grafika',
    when: 'Część graficzna',
    title: 'Obraz do witryny',
    points: [
      {
        origin: 'sheet',
        text: 'Obrabiasz grafikę z archiwum w edytorze grafiki (np. kadrowanie, skalowanie) i zapisujesz ją pod nazwą i w formacie z arkusza.',
      },
      {
        origin: 'advice',
        text: 'Zachowaj oryginalny plik. Jeśli zepsujesz obróbkę, łatwo zaczniesz od nowa.',
      },
    ],
    faq: [],
  },
  {
    id: 'witryna',
    when: 'Najdłuższa część',
    title: 'Witryna, style i skrypt',
    points: [
      {
        origin: 'sheet',
        text: 'Budujesz stronę HTML z blokami opisanymi w arkuszu, style piszesz w zewnętrznym pliku CSS, a skrypt w JavaScript lub PHP.',
      },
      {
        origin: 'advice',
        text: 'Stronę z PHP otwieraj przez serwer Apache (adres http://localhost/…), a nie podwójnym kliknięciem pliku (file://) — inaczej PHP się nie wykona.',
      },
      {
        origin: 'sheet',
        text: 'Ostatnie strony arkusza zawierają tabele pomocnicze, np. wybrane metody DOM, zdarzenia HTML i funkcje MySQL. Korzystaj z nich.',
      },
    ],
    faq: [{ id: 'inf03-practical-skills', label: 'Jakie języki i narzędzia ćwiczyć?' }],
    practice: { to: '/arkusze', label: 'Przejdź kurs krok po kroku z oryginalnym arkuszem' },
  },
  {
    id: 'koniec',
    when: 'Ostatnie minuty',
    title: 'Sprawdzenie i oddanie pracy',
    points: [
      {
        origin: 'sheet',
        text: 'Jeśli arkusz tego wymaga, tworzysz plik przeglądarka.txt z nazwą przeglądarki, w której sprawdzałeś witrynę.',
      },
      {
        origin: 'sheet',
        text: 'Nagrywasz płytę z folderem wyników, sprawdzasz, czy da się ją odczytać, opisujesz ją numerem zdającego i zostawiasz na stanowisku z arkuszem.',
      },
      {
        origin: 'sheet',
        text: 'Po zakończeniu pracy możesz opuścić salę dopiero za zgodą zespołu nadzorującego.',
      },
      {
        origin: 'advice',
        text: 'Porównaj zawartość folderu z listą plików w arkuszu i otwórz każdy plik, zanim nagrasz płytę.',
      },
    ],
    faq: [{ id: 'inf03-handover', label: 'Jak sprawdzić i oddać gotową pracę?' }],
  },
  {
    id: 'wynik',
    when: 'Po egzaminie',
    title: 'Wynik',
    points: [
      {
        origin: 'cke',
        text: 'Aby zdać, potrzebujesz co najmniej 50% punktów z części pisemnej (20 z 40) i co najmniej 75% punktów z części praktycznej.',
      },
      {
        origin: 'cke',
        text: 'Część pisemna to 40 pytań zamkniętych w 60 minut, z jedną poprawną odpowiedzią spośród czterech.',
      },
      {
        origin: 'cke',
        text: 'Wynik ustala i przekazuje okręgowa komisja egzaminacyjna.',
      },
    ],
    faq: [
      { id: 'inf03-pass-threshold', label: 'Ile punktów potrzeba, żeby zdać?' },
      { id: 'inf03-results-access', label: 'Kiedy i gdzie sprawdzę wyniki?' },
    ],
    practice: { to: '/teoria', label: 'Ćwicz pytania z części pisemnej' },
  },
];

export const EXAM_DAY_SOURCES = [
  {
    title: 'CKE: egzamin zawodowy formuła 2019 — o egzaminie',
    url: 'https://cke.gov.pl/egzamin-zawodowy/egzamin-zawodowy-formula-2019/o-egzaminie/',
    note: 'Część pisemna, warunki zdania, ustalanie wyniku.',
  },
  {
    title: 'CKE: wyposażenie ośrodków INF.03 na lata 2021–2023',
    url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/Wyposazenie/2021-2023/INF.03_wyp_2021-2023_dk.pdf',
    note: 'Opis stanowiska i oprogramowania. Aktualny wykaz dla sesji podaje ośrodek.',
  },
  {
    title: 'Arkusz INF.03-02-24.06-SG (Chat) — kopia archiwalna',
    url: 'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753525305768_sheet.pdf',
    note: 'Instrukcja dla zdającego, folder, zrzuty, tabele pomocnicze i oddanie pracy.',
  },
];
