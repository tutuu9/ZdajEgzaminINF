export interface CatalogPdfGuide {
  title: string;
  sourceLabel: string;
  sourceUrl: string;
  pages: { page: number; title: string; focus: string[] }[];
}

/** Original navigation notes; the source PDFs remain unchanged. Reviewed 2026-11-02. */
export const catalogPdfGuides: Record<string, CatalogPdfGuide> = {
  'cke-wedkowanie': {
    title: 'Wędkowanie — oficjalny przykład INF.03',
    sourceLabel: 'Centralna Komisja Egzaminacyjna — źródło oficjalne',
    sourceUrl:
      'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/Przykladowe_zadania/inf_03.pdf',
    pages: [
      {
        page: 1,
        title: 'Instrukcja i czas',
        focus: ['Przeczytaj zasady organizacyjne. Odróżnij czas zapoznania z czasem wykonania.'],
      },
      {
        page: 2,
        title: 'Dane, SQL i dokumentacja',
        focus: [
          'Odszukaj import, cztery polecenia SQL i wymagania zrzutów. Porównaj formaty oraz nazwy plików.',
        ],
      },
      {
        page: 3,
        title: 'Grafika i układ strony',
        focus: [
          'Porównaj ilustrację z opisem bloków. Zaznacz nazwę strony, obrazu, arkusza CSS i tekst alternatywny.',
        ],
      },
      {
        page: 4,
        title: 'CSS oraz PHP',
        focus: [
          'Zwróć uwagę na wymagane selektory. Oddziel wygląd od pobierania danych i ich prezentacji.',
        ],
      },
      {
        page: 5,
        title: 'Komplet rezultatów',
        focus: [
          'Policz pliki z końcowej listy i sprawdź ich pisownię. Przeczytaj instrukcję potwierdzenia działania oraz oddania.',
        ],
      },
      {
        page: 8,
        title: 'Końcowy formularz',
        focus: [
          'PDF ma osiem stron, choć część zadaniowa jest numerowana do pięciu. Końcowy formularz dotyczy dokumentowania oddania.',
        ],
      },
    ],
  },
  'inf03-01-25-01-sg': {
    title: 'Kursy komputerowe — INF.03-01-25.01-SG',
    sourceLabel: 'KURSINF — kopia arkusza egzaminacyjnego',
    sourceUrl:
      'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753367876245_sheet.pdf',
    pages: [
      {
        page: 1,
        title: 'Oznaczenie i instrukcja',
        focus: ['Sprawdź kod, wariant i czas na pierwszej stronie.'],
      },
      {
        page: 2,
        title: 'Baza i uprawnienia',
        focus: [
          'Rozdziel import, zapytania i operacje na koncie użytkownika. Zanotuj wymagane dowody wykonania.',
        ],
      },
      {
        page: 3,
        title: 'Baner i wspólny układ',
        focus: [
          'Odróżnij kadrowanie od skalowania. Zaznacz nazwy dwóch podstron oraz ich wspólne elementy.',
        ],
      },
      {
        page: 4,
        title: 'Zawartość stron i CSS',
        focus: [
          'Przyporządkuj tabelę, formularz i formatowanie do właściwej strony. Zauważ wymagania dotyczące selektorów.',
        ],
      },
      {
        page: 5,
        title: 'Zachowanie kalkulatora',
        focus: [
          'Prześledź wymagane dane wejściowe, zdarzenie uruchamiające oraz zawartość komunikatu wynikowego.',
        ],
      },
      {
        page: 6,
        title: 'Pomoc i lista oddawanych plików',
        focus: [
          'Oddziel tabelę pomocniczą od warunków zadania. Porównaj zapisane pliki z końcową listą.',
        ],
      },
    ],
  },
  'inf03-08-25-06-sg': {
    title: 'Baza Smoków — INF.03-08-25.06-SG',
    sourceLabel: 'KURSINF — kopia arkusza egzaminacyjnego',
    sourceUrl:
      'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1761142765209_sheet.pdf',
    pages: [
      {
        page: 1,
        title: 'Oznaczenie i instrukcja',
        focus: ['Sprawdź kod arkusza, wariant i warunki organizacyjne.'],
      },
      {
        page: 2,
        title: 'Baza, zapytania i zrzuty',
        focus: [
          'Rozdziel odczyt danych, podsumowanie i zmianę struktury. Zaznacz wymagania relacji, grupowania oraz dokumentacji.',
        ],
      },
      {
        page: 3,
        title: 'Układ, formularz i grafika',
        focus: [
          'Porównaj sekcje z ilustracją. Odszukaj nazwy plików, opisy obrazów i sposób wysłania formularza.',
        ],
      },
      {
        page: 4,
        title: 'CSS i dane z PHP',
        focus: [
          'Rozróżnij wymagania selektorów od działania skryptów. Sprawdź, kiedy wynik ma trafić do listy, a kiedy do tabeli.',
        ],
      },
      {
        page: 5,
        title: 'Przełączanie sekcji',
        focus: [
          'Sprawdź oczekiwane stany po każdym kliknięciu: widoczną treść i wygląd nawigacji.',
        ],
      },
      {
        page: 6,
        title: 'Tabele pomocnicze',
        focus: ['Korzystaj z dokumentacji skróconej, nie traktując jej jako gotowego rozwiązania.'],
      },
      {
        page: 7,
        title: 'Oddanie rezultatów',
        focus: [
          'Policz wymagane pliki, sprawdź ich nazwy i przeczytaj końcową instrukcję oddania.',
        ],
      },
    ],
  },
  'inf03-01-24-06-sg': {
    title: 'Motocykle — INF.03-01-24.06-SG',
    sourceLabel: 'Zweryfikowana kopia arkusza CKE w archiwum zewnętrznym',
    sourceUrl:
      'https://nuwaflrhlwnsdvnciltx.supabase.co/storage/v1/object/public/kursinf_main/exam_sheets/inf03/1753444633550_sheet.pdf',
    pages: [
      {
        page: 1,
        title: 'Oznaczenie i czas',
        focus: ['Sprawdź kod, wariant i czas. Oddziel zasady organizacyjne od rezultatów zadania.'],
      },
      {
        page: 2,
        title: 'Baza i zapytania',
        focus: [
          'Odszukaj warunek OR, złączenie tabel, liczbę wycieczek oraz zmianę struktury. Zachowaj wymagane dowody.',
        ],
      },
      {
        page: 3,
        title: 'Grafika i zawartość',
        focus: [
          'Przeskaluj droga1.jpg proporcjonalnie. Odróżnij listę definicji od listy numerowanej.',
        ],
      },
      {
        page: 4,
        title: 'CSS i PHP',
        focus: [
          'Porównaj warstwy obrazu, przezroczyste tła i przewijanie. Ścieżki zdjęć buduj z danych właściwego rekordu.',
        ],
      },
      {
        page: 5,
        title: 'Oddanie pracy',
        focus: ['Sprawdź wszystkie pięć zdjęć, motor.png, motor.php, zapytania i zrzuty.'],
      },
    ],
  },
};
