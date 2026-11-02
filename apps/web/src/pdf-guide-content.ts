import type { Level } from '@zdaj/shared';

export const readingGuideIntro =
  'To wskazówki do czytania poleceń, nie dodatkowe wymagania ani oficjalne zasady CKE. O tym, co masz wykonać, decyduje treść wybranego zadania.';

export const readingGuideSections = [
  {
    id: 'deliverables',
    title: 'Ile plików oddajesz i jak dokładnie się nazywają?',
    summary: 'Wypisz wymagane pliki, ich rozszerzenia i miejsca zapisu.',
    detail:
      'Zaznacz każdą nazwę podaną w poleceniu. Zachowaj pisownię, wielkość liter i rozszerzenie. Odróżnij pliki otrzymane na start od plików, które masz utworzyć lub zmienić. Wymagana lista plików pomaga sprawdzić komplet pracy przed oddaniem.',
  },
  {
    id: 'inputs',
    title: 'Z jakich danych i materiałów korzystasz?',
    summary: 'Odszukaj bazę, tabele, obrazy i pozostałe pliki wejściowe.',
    detail:
      'Przeczytaj, co należy zaimportować, jaka jest nazwa bazy i które dane mają pozostać bez zmian. Zwróć uwagę na nazwy pól i powiązania opisane w zadaniu. Przy grafice rozróżnij rozmiar pliku, proporcje rysunku i rozmiar obrazu na stronie.',
  },
  {
    id: 'outputs',
    title: 'Co ma zwrócić zapytanie, a co pokazać strona?',
    summary: 'Rozdziel wyniki SQL, treść PHP i zachowanie JavaScript.',
    detail:
      'Dla każdego zapytania znajdź wymagane kolumny, warunki i kolejność wyników. Osobno zaznacz elementy strony oraz reakcje na działania użytkownika. Zapis zapytania w pliku i wyświetlenie danych przez PHP mogą być odrębnymi wymaganiami.',
  },
  {
    id: 'exact-values',
    title: 'Które nazwy i wartości są podane dokładnie?',
    summary: 'Zaznacz identyfikatory, kolory, wymiary, ceny, jednostki i zakresy.',
    detail:
      'Przepisz dokładne wartości do własnej listy kontrolnej. Rozróżnij kolor tekstu i tła, szerokość i szerokość maksymalną oraz nazwę pola i jego identyfikator. Sprawdź także wymagany tekst, kodowanie, etykiety formularza i format wyniku.',
  },
  {
    id: 'method',
    title: 'Czy polecenie wymaga konkretnego sposobu wykonania?',
    summary: 'Odszukaj wskazane technologie, metody i zasady działania.',
    detail:
      'Jeśli zadanie wymaga np. zewnętrznego CSS, zapytania parametryzowanego albo działania bez przeładowania, uwzględnij to w planie pracy. Gdy określa tylko rezultat i dopuszcza różne rozwiązania, dobierz zgodną metodę. Przykładowy kod z lekcji nie ustanawia dodatkowego obowiązku.',
  },
  {
    id: 'evidence',
    title: 'Jak sprawdzisz pracę i potwierdzisz jej wykonanie?',
    summary: 'Porównaj komplet plików i działanie z każdym punktem polecenia.',
    detail:
      'Sprawdź wymagane wyniki, połączenia między plikami, czytelność i obsługę błędnych danych, jeśli są opisane. Zrzuty ekranu, wydruki lub dodatkowe dokumenty przygotuj wtedy, gdy wymaga ich dane zadanie; zachowaj wskazane nazwy i zawartość. Raport automatyczny może pozostawić część wymagań do samodzielnej kontroli.',
  },
] as const;

export interface TaskReadingFocus {
  version: number;
  items: string[];
  byLevel: Record<Level, string[]>;
}

// These notes restate the requirements of the matching published revision.
// Unknown or newer revisions must use the generic reading guide instead.
export const taskReadingFocus: Record<string, TaskReadingFocus> = {
  biblioteka: {
    version: 2,
    items: [
      'Wymagane pliki (5): index.php, style.css, baza.sql, kwerendy.sql i logo.svg. Zachowaj dokładne nazwy.',
      'Dane: import baza.sql do bazy biblioteka; tabele authors i books. Oddziel dwa zapytania w kwerendy.sql od listy książek tworzonej przez PHP.',
      'Wyniki: pierwszy SQL ma podać dostępne książki i autorów w kolejności tytułów; drugi — ich liczbę w kolumnie liczba. Strona pokazuje dostępne książki pobrane z bazy, po jednej w każdym li listy ul#ksiazki.',
      'Szczegóły: logo.svg 320 × 160, proporcje zachowane i alt="Książka"; tekst body #172b4d; maksymalna szerokość main 960px; zewnętrzny style.css. Polecenie nie wymaga zrzutów ekranu.',
    ],
    byLevel: {
      beginner: [
        'Przeczytaj polecenie z listą pięciu plików obok. Przy każdym wymaganiu dopisz, którego pliku dotyczy.',
        'Podkreśl słowa „dostępna”, „autor” i „rosnąco”. Odszukaj ich znaczenie w opisie danych i oczekiwanego wyniku przed rozpoczęciem kodowania.',
        'Na koniec wróć do drobnych wymagań: polskich znaków, tekstu alternatywnego, proporcji grafiki i zewnętrznego CSS.',
      ],
      intermediate: [
        'Przygotuj osobne listy kontroli dla zapytań SQL i treści generowanej przez PHP. Sprawdź, które warunki obowiązują w obu miejscach.',
        'Zapisz dokładnie alias liczba, warunek dostępności i porządek tytułów. MySQLi oraz PDO są dopuszczone w tym zadaniu.',
        'Zostaw czas na kontrolę nieocenianą w pełni automatycznie: komplet plików, poprawne kodowanie tekstu HTML i zachowanie po błędzie połączenia.',
      ],
      advanced: [
        'Wyodrębnij wymagania zależne od danych oraz wymagania dotyczące plików i wyglądu. Dla każdego zaplanuj własny sposób sprawdzenia.',
        'Zweryfikuj, czy wynik rzeczywiście pochodzi z bazy i czy autor odpowiada konkretnej książce. Nie dopisuj ograniczeń sposobu implementacji, których nie ma w poleceniu.',
        'Przed oddaniem porównaj pracę z całością polecenia, w tym obsługą błędów, kodowaniem wyjścia i grafiką, także gdy testy automatyczne są zielone.',
      ],
    },
  },
  warsztaty: {
    version: 2,
    items: [
      'Wymagane pliki (4): index.html, oferta.html, style.css i app.js. Obie strony mają wspólny CSS i nawigację między sobą.',
      'Formularz: #kalkulator, select#kurs z wartościami html/js/php, input#osoby typu number, checkbox#rabat, przycisk submit i output#wynik. Pola wymagają powiązanych etykiet.',
      'Reguły: ceny za osobę 120/180/220 zł, rabat 10%, całkowita liczba osób 1–20. Wynik ma dwie cyfry po separatorze oraz zł; poprawna wycena powstaje bez przeładowania strony.',
      'Oferta: tabela trzech kursów z cenami, nagłówkami i podpisem. Wygląd: main z display: grid i gap: 24px, tło body #f5f8fc, czytelność w wąskim oknie. Polecenie nie wymaga zrzutów ekranu.',
    ],
    byLevel: {
      beginner: [
        'Podziel polecenie na dwie strony. Zaznacz, gdzie ma być formularz, a gdzie tabela oferty.',
        'Wypisz każde pole formularza wraz z dokładną nazwą, typem i etykietą. Zaznacz oddzielnie miejsce na wynik.',
        'Odszukaj liczby w treści: trzy ceny, rabat, zakres osób i odstęp CSS. Zapisz też jednostkę wyniku i wymaganą liczbę cyfr po separatorze.',
      ],
      intermediate: [
        'Oddziel wymagania HTML/CSS od reguł obliczeń i walidacji. Przy każdej regule zaznacz, gdzie będzie widoczny jej rezultat.',
        'Zwróć uwagę na „za osobę”, „cały koszt” i „bez przeładowania”. Sprawdź warunki dotyczące pustej i niecałkowitej liczby osób.',
        'Porównaj formularz z tabelą oferty: nazwy kursów i ceny muszą sobie odpowiadać. Osobno sprawdź etykiety, podpis tabeli i obie strony nawigacji.',
      ],
      advanced: [
        'Ułóż krótką listę przypadków obejmującą wszystkie kursy, oba stany rabatu, granice zakresu oraz dane odrzucane w poleceniu.',
        'Uwzględnij kolejne obliczenie po zmianie danych, format kwoty i zachowanie bez przeładowania. To kontrola wymaganego działania, bez narzucania dodatkowej architektury kodu.',
        'Przejrzyj obie strony pod kątem zależności między plikami, powiązań etykiet i czytelności w wąskim oknie. Sama obecność elementów tabeli nie potwierdza poprawnego przypisania cen.',
      ],
    },
  },
  planszowki: {
    version: 2,
    items: [
      'Wymagane pliki (5): index.php, style.css, app.js, baza.sql i kwerendy.sql. Import dotyczy bazy planszowki, a dane wejściowe pozostają bez zmian.',
      'Dane mają trzy różne znaczenia: players to liczba graczy, seats to liczba miejsc spotkania, a liczba spotkań jest wynikiem podsumowania. Odczytaj wymagania każdego z dwóch zapytań osobno.',
      'PHP: formularz GET z name="minPlayers", lista ul#gry i dane pobierane zapytaniem parametryzowanym. Filtr dotyczy minimalnej liczby graczy; każda pozycja zawiera tytuł gry i liczbę graczy.',
      'JavaScript: przyciski data-panel i sekcje gry-panel/spotkania-panel; początkowo widoczny tylko katalog gier. CSS: tekst body #172b4d, main maksymalnie 960px, pliki CSS i JS zewnętrzne. Polecenie nie wymaga zrzutów ekranu.',
    ],
    byLevel: {
      beginner: [
        'Zaznacz w opisie dwie tabele i znaczenie ich pól. Szczególnie odróżnij liczbę graczy, miejsc oraz spotkań.',
        'Podziel wymagania na trzy grupy: plik z zapytaniami SQL, filtrowanie listy przez PHP i przełączanie sekcji przez JavaScript.',
        'Przepisz dokładnie minPlayers, gry-panel i spotkania-panel. Sprawdź, które nazwy należą do formularza, a które łączą przyciski z sekcjami.',
      ],
      intermediate: [
        'Dla każdego zapytania zapisz oczekiwane kolumny i sposób sortowania. Drugie zapytanie ma nazwać kolumnę z liczbą spotkań liczba.',
        'Oddziel parametr filtra GET od przełączania paneli w przeglądarce. Odszukaj stan początkowy i wymagane zachowanie po kliknięciu.',
        'Zwróć uwagę na wskazany sposób wykonania: zapytanie parametryzowane, zweryfikowany parametr, kodowanie tekstu HTML oraz zewnętrzny CSS i JS.',
      ],
      advanced: [
        'Przejrzyj wymagania dla pełnej listy, listy przefiltrowanej, pustego wyniku i zmiany panelu. Zaplanuj kontrolę każdej z tych sytuacji.',
        'Porównaj kolejność i znaczenie wyników obu zapytań; podsumowanie spotkań nie jest sumą ich miejsc.',
        'Zachowaj czas na kontrolę wymaganego sposobu wykonania i szczegółów: parametryzacji, aliasu liczba, formularza GET, etykiety, kodowania wyjścia i koloru tekstu.',
      ],
    },
  },
};
