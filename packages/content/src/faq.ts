import type { FaqRevision } from '@zdaj/shared';

// Reviewed explanations; official rules and platform advice remain separately identified.
export const faq: FaqRevision[] = [
  {
    id: 'inf03-qualification',
    version: 1,
    categoryId: 'about',
    question: 'Czym jest kwalifikacja INF.03?',
    answer:
      'INF.03 obejmuje tworzenie i administrowanie stronami oraz aplikacjami internetowymi, a także bazami danych. Przygotowanie łączy budowę witryny, programowanie i pracę z danymi.\n\nZakres wymagań sprawdzaj w części informatora oznaczonej INF.03. Sam symbol przedmiotu w szkolnym planie lekcji nie określa całego zakresu egzaminu.',
    order: 1,
    sources: [
      {
        title: 'CKE: informator dla technika programisty, aktualizacja 25.08.2022',
        url: 'https://bip.cke.gov.pl/attachments/download/8580',
        section: 'Rozdziały 2.1–2.2 oraz 3.1–3.2, kwalifikacja INF.03',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
  },
  {
    id: 'inf03-versus-inf04',
    version: 1,
    categoryId: 'about',
    question: 'Czym różnią się INF.03 i INF.04?',
    answer:
      'INF.03 skupia się na stronach, aplikacjach internetowych i bazach danych. INF.04 dotyczy projektowania, programowania oraz testowania aplikacji, w tym aplikacji desktopowych i mobilnych.\n\nTo odrębne kwalifikacje. Przy wyborze arkusza sprawdź symbol na okładce; zadanie INF.04 nie zastępuje ćwiczenia INF.03.',
    order: 2,
    sources: [
      {
        title: 'CKE: informator dla technika programisty, aktualizacja 25.08.2022',
        url: 'https://bip.cke.gov.pl/attachments/download/8580',
        section: 'Rozdział 2.1 oraz części 3.1–3.4',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
  },
  {
    id: 'inf03-exam-parts',
    version: 1,
    categoryId: 'about',
    question: 'Z jakich części składa się egzamin?',
    answer:
      'Egzamin składa się z części pisemnej i praktycznej. W pisemnej rozwiązujesz test, a w praktycznej wykonujesz zadanie na przygotowanym stanowisku.\n\nObie części dotyczą tej samej kwalifikacji, ale mogą odbywać się w różne dni. Sprawdź osobno swoje terminy.',
    order: 3,
    sources: [
      {
        title: 'Ministerstwo Edukacji: informacja o egzaminie zawodowym',
        url: 'https://www.gov.pl/web/edukacja/informacja-o-egzaminie-zawodowym',
        section: 'Forma egzaminu, warunki zdania i dokumenty',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
  },
  {
    id: 'inf03-pass-threshold',
    version: 1,
    categoryId: 'about',
    question: 'Ile punktów potrzeba, żeby zdać?',
    answer:
      'Potrzebujesz co najmniej 50% punktów z części pisemnej i 75% z praktycznej. Przy 40 pytaniach pisemnych próg oznacza 20 poprawnych odpowiedzi.\n\nOba warunki muszą być spełnione. Wysoki wynik jednej części nie wyrównuje wyniku poniżej progu w drugiej.',
    order: 4,
    sources: [
      {
        title: 'Ministerstwo Edukacji: informacja o egzaminie zawodowym',
        url: 'https://www.gov.pl/web/edukacja/informacja-o-egzaminie-zawodowym',
        section: 'Forma egzaminu, warunki zdania i dokumenty',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
  },
  {
    id: 'inf03-certificate-diploma',
    version: 1,
    categoryId: 'about',
    question: 'Czym różni się certyfikat kwalifikacji od dyplomu?',
    answer:
      'Certyfikat potwierdza zdanie egzaminu z jednej kwalifikacji, na przykład INF.03. Dyplom zawodowy wymaga potwierdzenia wszystkich kwalifikacji właściwych dla danego zawodu oraz odpowiedniego poziomu wykształcenia.\n\nSamo zdanie INF.03 nie oznacza jeszcze uzyskania całego dyplomu. Warunki dla swojego zawodu potwierdź w szkole lub OKE.',
    order: 5,
    sources: [
      {
        title: 'Ministerstwo Edukacji: informacja o egzaminie zawodowym',
        url: 'https://www.gov.pl/web/edukacja/informacja-o-egzaminie-zawodowym',
        section: 'Forma egzaminu, warunki zdania i dokumenty',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
  },
  {
    id: 'inf03-declaration-place',
    version: 1,
    categoryId: 'registration',
    question: 'Gdzie składam deklarację?',
    answer:
      'Uczeń lub słuchacz składa deklarację dyrektorowi swojej szkoły, a absolwent — zasadniczo szkole, którą ukończył. Uczestnik kwalifikacyjnego kursu zawodowego zgłasza się przez organizatora kursu. Egzamin eksternistyczny i niektóre szczególne sytuacje obsługuje właściwa OKE.\n\nDobierz formularz do swojego statusu. Jeśli szkoła została zlikwidowana, zapytaj OKE o właściwy tryb; zapis na tej stronie nie jest zgłoszeniem na egzamin.',
    order: 6,
    sources: [
      {
        title: 'OKE w Krakowie: deklarowanie przystąpienia do egzaminu',
        url: 'https://egzaminy.gov.pl/okekrakow/zalatw-sprawe/deklarowanie-checi-przystapienia-do-egzaminu-zawodowego',
        section: 'Wymagane dokumenty i sposób złożenia deklaracji',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-declaration-deadline',
    version: 1,
    categoryId: 'registration',
    question: 'Do kiedy zgłaszam się na najbliższą sesję?',
    answer:
      'W roku szkolnym 2026/2027 zwykły termin deklaracji na sesję Zima 2027 upłynął 15 września 2026 r. Na sesję Lato 2027 deklarację składa się do 7 lutego 2027 r.\n\nDla osób ponownie przystępujących po wynikach sesji zimowej kalendarz przewiduje termin do 7 kwietnia 2027 r. Tryb eksternistyczny i inne szczególne sytuacje mogą wymagać dodatkowego wniosku — ustal je z OKE. Nie czekaj z dokumentami do ostatniego dnia.',
    order: 7,
    sources: [
      {
        title: 'CKE: harmonogram egzaminu zawodowego 2026/2027',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/komunikaty/1.2026_2027_PP2019_EZ.pdf',
        section: 'Terminy deklaracji: strony 3–4',
      },
      {
        title: 'OKE w Krakowie: deklarowanie przystąpienia do egzaminu',
        url: 'https://egzaminy.gov.pl/okekrakow/zalatw-sprawe/deklarowanie-checi-przystapienia-do-egzaminu-zawodowego',
        section: 'Terminy dla różnych grup zdających',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-session-dates',
    version: 1,
    categoryId: 'registration',
    question: 'Kiedy odbywa się INF.03 w roku szkolnym 2026/2027?',
    answer:
      'Praktyczna część INF.03 przypada 11–13 stycznia 2027 r. w sesji zimowej oraz 8–10 czerwca 2027 r. w letniej. Ogólne przedziały części pisemnej to odpowiednio 7–13 stycznia 2027 r. i 2–10 czerwca 2027 r.\n\nTo przedziały organizacyjne, a nie wybór dnia przez zdającego. Obowiązuje konkretny termin wyznaczony dla Ciebie przez ośrodek.',
    order: 8,
    sources: [
      {
        title: 'CKE: harmonogram egzaminu zawodowego 2026/2027',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/komunikaty/1.2026_2027_PP2019_EZ.pdf',
        section: 'Terminy główne i tabela kwalifikacji INF.03, strony 3–4 i 6',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-individual-appointment',
    version: 1,
    categoryId: 'registration',
    question: 'Skąd poznam swój dokładny dzień, godzinę i miejsce?',
    answer:
      'Informację przekaże szkoła, organizator kursu albo właściwa OKE, zależnie od sposobu zgłoszenia. Potwierdź osobno termin pisemny i praktyczny oraz adres sali.\n\nNa część praktyczną zgłoś się co najmniej 30 minut przed rozpoczęciem, z dokumentem ze zdjęciem potwierdzającym tożsamość.',
    order: 9,
    sources: [
      {
        title: 'CKE: organizacja egzaminu zawodowego 2026/2027',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/komunikaty/2.2026_2027_PP2019_Informacja%20_o_EZ.pdf',
        section: 'Punkty 15.5 oraz 15.9.4 i 15.9.7',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-absence',
    version: 1,
    categoryId: 'registration',
    question: 'Co zrobić w razie choroby lub nieobecności?',
    answer:
      'Natychmiast skontaktuj się ze szkołą. Uprawniony uczeń lub słuchacz, który z przyczyn zdrowotnych albo losowych nie przystąpił do danej części lub ją przerwał, może wnioskować o termin dodatkowy. Udokumentowany wniosek składa się do dyrektora szkoły najpóźniej w dniu tej części egzaminu; decyzję podejmuje OKE.\n\nTermin dodatkowy nie jest zwykłą poprawką po niezdaniu. Nie każda nieobecność ani dobrowolne wcześniejsze zakończenie daje do niego prawo. Osoby zgłoszone inną ścieżką powinny od razu ustalić postępowanie z OKE.',
    order: 10,
    sources: [
      {
        title: 'OKE w Krakowie: wniosek o termin dodatkowy',
        url: 'https://egzaminy.gov.pl/okekrakow/zalatw-sprawe/wnioskowanie-o-termin-dodatkowy-egzaminu-zawodowego',
        section: 'Uprawnieni zdający, dokumenty i terminy',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-written-duration',
    version: 1,
    categoryId: 'written',
    question: 'Ile jest pytań i ile mam czasu?',
    answer:
      'Część pisemna obejmuje 40 pytań i standardowo trwa 60 minut. Odbywa się z wykorzystaniem elektronicznego systemu egzaminacyjnego.\n\nUzgodnione dostosowania mogą zmieniać warunki. Podczas nauki ćwicz też czytanie poleceń i rozkładanie czasu.',
    order: 11,
    sources: [
      {
        title: 'CKE: organizacja egzaminu zawodowego 2026/2027',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/komunikaty/2.2026_2027_PP2019_Informacja%20_o_EZ.pdf',
        section: 'Punkt 15.8.1–2',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-one-answer',
    version: 1,
    categoryId: 'written',
    question: 'Czy każde pytanie ma jedną poprawną odpowiedź?',
    answer:
      'Tak. Każde pytanie ma cztery warianty odpowiedzi, a poprawny jest jeden. Za poprawne rozwiązanie otrzymujesz punkt; maksymalnie można zdobyć 40 punktów.\n\nPrzeczytaj wszystkie warianty. W kodzie zwracaj uwagę na operator, nawiasy i typ danych, nie tylko na podobieństwo do znanego przykładu.',
    order: 12,
    sources: [
      {
        title: 'CKE: informator dla technika programisty, aktualizacja 25.08.2022',
        url: 'https://bip.cke.gov.pl/attachments/download/8580',
        section: 'Wstęp, strona 4',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
  },
  {
    id: 'inf03-question-bank',
    version: 1,
    categoryId: 'written',
    question: 'Czy istnieje pełna publiczna baza pytań CKE?',
    answer:
      'CKE nie publikuje pełnego banku zadań używanych w części pisemnej ani algorytmu tworzenia zestawów. Udostępnione przykłady są materiałem do przygotowania, a nie kompletną listą przyszłych pytań.\n\nNie traktuj obietnicy „wszystkich pytań CKE” jako potwierdzenia, że serwis ma oficjalny bank.',
    order: 13,
    sources: [
      {
        title: 'CKE: przykładowe zadania pisemne i zasady publikacji',
        url: 'https://cke.gov.pl/egzamin-zawodowy/egzamin-zawodowy-formula-2019/przykladowe-zadania/pisemny/',
        section: 'Informacja o nieudostępnianiu banku zadań',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
  },
  {
    id: 'inf03-theory-preparation',
    version: 1,
    categoryId: 'written',
    question: 'Czy przykłady z informatora wystarczą do przygotowania?',
    answer:
      'Przykłady pokazują sposób sprawdzania umiejętności, lecz nie wyczerpują zakresu egzaminu. Ucz się również zagadnień opisanych w wymaganiach INF.03.\n\nPo odpowiedzi wyjaśnij własnymi słowami, dlaczego wybrany wariant jest poprawny. Następnie sprawdź krótkim przykładem działanie kodu albo zapytania. Zapamiętywanie samej litery odpowiedzi nie pomoże, gdy zmienią się dane.',
    order: 14,
    sources: [
      {
        title: 'CKE: informator dla technika programisty, aktualizacja 25.08.2022',
        url: 'https://bip.cke.gov.pl/attachments/download/8580',
        section: 'Wstęp, strona 4; zakres INF.03, strony 6–17',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'advice',
  },
  {
    id: 'inf03-provisional-result',
    version: 1,
    categoryId: 'written',
    question: 'Czy wynik pokazany po teście jest już oficjalny?',
    answer:
      'Nie. Bezpośrednio po części pisemnej możesz otrzymać wstępną informację o liczbie poprawnych odpowiedzi. Oficjalny wynik ustala dyrektor właściwej OKE i udostępnia w terminie ogłoszenia wyników.\n\nSprawdź go później w Portalu Zdającego SIOEZ. Wyniku treningu w tym serwisie również nie można traktować jako wyniku egzaminu.',
    order: 15,
    sources: [
      {
        title: 'OKE w Krakowie: sprawdzenie wyniku egzaminu zawodowego',
        url: 'https://egzaminy.gov.pl/okekrakow/zalatw-sprawe/sprawdzenie-wyniku-egzaminu-zawodowego',
        section: 'Wynik wstępny, Portal Zdającego i terminy',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
  },
  {
    id: 'inf03-practical-duration',
    version: 1,
    categoryId: 'practical',
    question: 'Ile trwa praktyka i do czego służy pierwsze 10 minut?',
    answer:
      'W harmonogramie organizacyjnym 2026/2027 praktyka INF.03 trwa 150 minut. Przed rozpoczęciem pracy masz 10 minut na zapoznanie się z zadaniem i wyposażeniem stanowiska; nie wlicza się ich do czasu wykonania.\n\nWykorzystaj ten moment na przejrzenie wszystkich stron i zauważenie brakujących materiałów.',
    order: 16,
    sources: [
      {
        title: 'CKE: organizacja egzaminu zawodowego 2026/2027',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/komunikaty/2.2026_2027_PP2019_Informacja%20_o_EZ.pdf',
        section: 'Tabela INF.03 na drukowanej stronie 51; punkt 15.9.15',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-public-practical',
    version: 1,
    categoryId: 'practical',
    question: 'Czy zadanie INF.03 jest znane przed egzaminem?',
    answer:
      'INF.03 nie znajduje się na liście kwalifikacji z jawnymi zadaniami praktycznymi na rok szkolny 2026/2027. Nie ma więc podstaw, żeby uznać dowolny stary arkusz za zapowiedziane zadanie najbliższej sesji.\n\nArchiwalne arkusze pomagają ćwiczyć wymagane umiejętności. Ucz się sposobu pracy, a nie jednego projektu na pamięć.',
    order: 17,
    sources: [
      {
        title: 'CKE: lista kwalifikacji z jawnymi zadaniami 2026/2027',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/komunikaty/4.2026_2027_PP2019_JAWNE.pdf',
        section: 'Lista kwalifikacji na stronie 2',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-first-page',
    version: 1,
    categoryId: 'practical',
    question: 'Co sprawdzić na pierwszej stronie arkusza?',
    answer:
      'Sprawdź kwalifikację, czas, kompletność stron i instrukcję oznaczenia pracy. Brak lub nieczytelność arkusza zgłoś zespołowi nadzorującemu.\n\nNa prawdziwym egzaminie stosuj wskazany sposób identyfikacji. Podczas ćwiczeń w serwisie używaj danych przykładowych — nie wpisuj prawdziwego numeru PESEL do projektu ani zrzutów.',
    order: 18,
    sources: [
      {
        title: 'CKE: przykładowy arkusz INF.03 — Wędkowanie',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/Przykladowe_zadania/inf_03.pdf',
        section: 'Instrukcja dla zdającego, strona 1',
      },
      {
        title: 'Zdaj Egzamin INF: czytanie oryginalnych arkuszy',
        url: 'https://github.com/tutuu9/ZdajEgzaminINF/blob/main/docs/reading-exam-pdfs.md',
        section: 'Reading guide',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'advice',
  },
  {
    id: 'inf03-reading-requirements',
    version: 1,
    categoryId: 'practical',
    question: 'Jak czytać wymagania i listę rezultatów?',
    answer:
      'Najpierw wypisz, co trzeba oddać: pliki strony, CSS, skrypty, zapytania, grafikę i wymagane potwierdzenia. Przy każdym zapisz dokładną nazwę oraz miejsce zapisu.\n\nPotem powiąż wymagania z fragmentami projektu. Oddziel treść, wygląd, działanie i dokumentację. Obraz strony jest pomocą do porównania; nie zastępuje szczegółowych poleceń. Skreślaj wymaganie dopiero po sprawdzeniu rezultatu.',
    order: 19,
    sources: [
      {
        title: 'Zdaj Egzamin INF: czytanie oryginalnych arkuszy',
        url: 'https://github.com/tutuu9/ZdajEgzaminINF/blob/main/docs/reading-exam-pdfs.md',
        section: 'Reading guide: sześć etapów czytania arkusza',
      },
      {
        title: 'CKE: przykładowy arkusz INF.03 — Wędkowanie',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/Przykladowe_zadania/inf_03.pdf',
        section: 'Treść zadania i lista plików',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'advice',
  },
  {
    id: 'inf03-practical-skills',
    version: 1,
    categoryId: 'practical',
    question: 'Jakie języki i narzędzia ćwiczyć?',
    answer:
      'Ćwicz HTML i CSS, JavaScript, PHP oraz SQL, a także obsługę bazy danych i przygotowanie grafiki. Dobieraj ćwiczenie do wymagań konkretnego arkusza.\n\nUmiejętność samodzielnego połączenia plików jest równie ważna jak pojedyncza komenda. Uruchamiaj stronę, sprawdzaj zapytania i odczytuj błędy. Teoria obejmuje też inne obszary informatora, między innymi bezpieczeństwo i język zawodowy.',
    order: 20,
    sources: [
      {
        title: 'CKE: informator dla technika programisty, aktualizacja 25.08.2022',
        url: 'https://bip.cke.gov.pl/attachments/download/8580',
        section: 'Zakres INF.03 i przykłady, strony 6–24',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'advice',
  },
  {
    id: 'inf03-workstation-software',
    version: 1,
    categoryId: 'practical',
    question: 'Jakie programy i wersje będą na stanowisku?',
    answer:
      'Zapytaj swój ośrodek o przygotowane oprogramowanie i sprawdź instrukcje do konkretnego arkusza. Nie zakładaj, że będzie identyczne jak na Twoim komputerze.\n\nPrzećwicz otwieranie projektu, uruchamianie serwera i import bazy w środowisku wskazanym przez szkołę. Wersja PHP, bazy lub edytora używana przez ten serwis nie jest obietnicą wyposażenia egzaminacyjnego.',
    order: 21,
    sources: [
      {
        title: 'CKE: organizacja egzaminu zawodowego 2026/2027',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/komunikaty/2.2026_2027_PP2019_Informacja%20_o_EZ.pdf',
        section: 'Przygotowanie stanowisk egzaminacyjnych, rozdział 4',
      },
      {
        title: 'Zdaj Egzamin INF: czytanie oryginalnych arkuszy',
        url: 'https://github.com/tutuu9/ZdajEgzaminINF/blob/main/docs/reading-exam-pdfs.md',
        section: 'Practical sheets: wymagania konkretnego arkusza',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'advice',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-permitted-aids',
    version: 1,
    categoryId: 'practical',
    question: 'Co wolno przynieść i czy można używać telefonu, internetu albo AI?',
    answer:
      'Obowiązuje komunikat CKE o przyborach dla danej sesji. Niedozwolone urządzenia, pomoce i niesamodzielne wykonanie mogą skutkować unieważnieniem. Dla niezbędnych urządzeń medycznych istnieją uzgodnione wyjątki.\n\nNie planuj rozwiązywania zadania z wyszukiwarką, telefonem ani AI. Korzystaj tylko z dopuszczonych zasobów stanowiska; dostępność programu nie oznacza zgody na dowolne użycie. To praktyczna wskazówka wynikająca z wymogu samodzielności, nie cytat z osobnego przepisu CKE o AI.',
    order: 22,
    sources: [
      {
        title: 'CKE: organizacja egzaminu zawodowego 2026/2027',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/komunikaty/2.2026_2027_PP2019_Informacja%20_o_EZ.pdf',
        section: 'Punkty 15.2.16, 15.6.9–11 oraz 15.9.24',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'advice',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-file-names',
    version: 1,
    categoryId: 'practical',
    question: 'Jak nazywać pliki, foldery i bazę danych?',
    answer:
      'Przepisuj nazwy i rozszerzenia z aktualnego arkusza. Sprawdź, czy odnośniki w HTML, CSS i PHP wskazują właśnie te pliki oraz czy połączenie używa wymaganej nazwy bazy.\n\nNie przenoś nazw ze starszego zadania. Przed oddaniem wyświetl rozszerzenia plików, aby wychwycić np. przypadkowe „.txt” po nazwie strony.',
    order: 23,
    sources: [
      {
        title: 'Zdaj Egzamin INF: czytanie oryginalnych arkuszy',
        url: 'https://github.com/tutuu9/ZdajEgzaminINF/blob/main/docs/reading-exam-pdfs.md',
        section: 'Reading guide: nazwy, rozszerzenia, miejsca zapisu',
      },
      {
        title: 'CKE: przykładowy arkusz INF.03 — Wędkowanie',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/Przykladowe_zadania/inf_03.pdf',
        section: 'Wymagania dotyczące katalogu, bazy i plików',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'advice',
  },
  {
    id: 'inf03-screenshots',
    version: 1,
    categoryId: 'practical',
    question: 'Kiedy i jak wykonywać zrzuty ekranu?',
    answer:
      'Wykonuj zrzuty wtedy, gdy wymaga ich arkusz. Sprawdź treść dowodu, format, nazwę, zakres obrazu i to, czy wolno go kadrować.\n\nPrzykładowo Wędkowanie wymaga pełnego ekranu z paskiem zadań przy imporcie i wynikach zapytań, ale nie należy uogólniać tych warunków na każdy arkusz. Otwórz zapisany obraz i upewnij się, że wynik jest czytelny.',
    order: 24,
    sources: [
      {
        title: 'CKE: przykładowy arkusz INF.03 — Wędkowanie',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/Przykladowe_zadania/inf_03.pdf',
        section: 'Operacje na bazie danych, strona 2',
      },
      {
        title: 'Zdaj Egzamin INF: czytanie oryginalnych arkuszy',
        url: 'https://github.com/tutuu9/ZdajEgzaminINF/blob/main/docs/reading-exam-pdfs.md',
        section: 'Reading guide: potwierdzenia i zrzuty ekranu',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'advice',
  },
  {
    id: 'inf03-technical-failure',
    version: 1,
    categoryId: 'practical',
    question: 'Co zrobić, gdy komputer lub program przestanie działać?',
    answer:
      'Zgłoś problem zespołowi nadzorującemu przez podniesienie ręki i opisz, co przestało działać. Nie naprawiaj samodzielnie wyposażenia i nie zmieniaj stanowiska bez zgody.\n\nWarto regularnie zapisywać pliki. Nie zakładaj automatycznego przedłużenia czasu — postępowanie ustala zespół według procedury egzaminu.',
    order: 25,
    sources: [
      {
        title: 'CKE: organizacja egzaminu zawodowego 2026/2027',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/komunikaty/2.2026_2027_PP2019_Informacja%20_o_EZ.pdf',
        section: 'Rozdziały 4 i 6: organizacja stanowisk i obsługa awarii',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'advice',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-handover',
    version: 1,
    categoryId: 'practical',
    question: 'Jak sprawdzić i oddać gotową pracę?',
    answer:
      'Porównaj zawartość folderu z listą rezultatów w arkuszu. Otwórz zapisane pliki i sprawdź, czy oddajesz finalne wersje, wymagane zapytania i obrazy.\n\nZastosuj sposób przekazania wskazany w tym zadaniu i przez zespół nadzorujący. Gdy kończysz wcześniej, zgłoś to i zaczekaj na zgodę na wyjście. Sam podgląd działającej strony nie zastępuje zapisania wymaganych plików.',
    order: 26,
    sources: [
      {
        title: 'CKE: przykładowy arkusz INF.03 — Wędkowanie',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/Przykladowe_zadania/inf_03.pdf',
        section: 'Instrukcja dla zdającego oraz zakończenie zadania',
      },
      {
        title: 'Zdaj Egzamin INF: czytanie oryginalnych arkuszy',
        url: 'https://github.com/tutuu9/ZdajEgzaminINF/blob/main/docs/reading-exam-pdfs.md',
        section: 'Reading guide: lista rezultatów i przekazanie pracy',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'advice',
  },
  {
    id: 'inf03-results-access',
    version: 1,
    categoryId: 'results',
    question: 'Kiedy i gdzie sprawdzę wyniki?',
    answer:
      'Wyniki sesji Zima 2027 są zaplanowane na 31 marca 2027 r., a Lato 2027 na 27 sierpnia 2027 r. Sprawdzisz je w Portalu Zdającego SIOEZ.\n\nDane dostępowe otrzymasz od szkoły, organizatora kursu lub właściwej OKE. W razie problemów z logowaniem skontaktuj się z podmiotem, który Cię zgłosił. Odbiór dokumentów to osobna czynność.',
    order: 27,
    sources: [
      {
        title: 'CKE: harmonogram egzaminu zawodowego 2026/2027',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/komunikaty/1.2026_2027_PP2019_EZ.pdf',
        section: 'Ogłoszenie wyników, strony 3–4',
      },
      {
        title: 'OKE w Krakowie: sprawdzenie wyniku egzaminu zawodowego',
        url: 'https://egzaminy.gov.pl/okekrakow/zalatw-sprawe/sprawdzenie-wyniku-egzaminu-zawodowego',
        section: 'Dostęp do Portalu Zdającego i odbiór dokumentów',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-retake-scope',
    version: 1,
    categoryId: 'results',
    question: 'Czy poprawiam obie części, jeśli nie zdałem jednej?',
    answer:
      'Zasadniczo ponownie przystępujesz do niezdanej części, w kolejnej dostępnej sesji, po złożeniu deklaracji. Zdany wynik nie jest jednak zachowywany bezterminowo.\n\nPrzepisy przewidują okres pięcioletni oraz zasady zależne od statusu zdającego, w tym egzaminu eksternistycznego. Po dłuższej przerwie poproś szkołę lub OKE o ustalenie, czy musisz zdawać już obie części i od jakiej daty liczy się okres w Twojej sytuacji.',
    order: 28,
    sources: [
      {
        title: 'OKE w Krakowie: informacje dla zdających w Formule 2019',
        url: 'https://egzaminy.gov.pl/okekrakow/egzaminy-zawodowe/formula-2019/organizacja-egzaminu/formula-2019-kwalifikacje-trzyliterowe',
        section: 'Ponowne przystąpienie do egzaminu zawodowego',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-retake-fee',
    version: 1,
    categoryId: 'results',
    question: 'Czy poprawka jest płatna?',
    answer:
      'To zależy od statusu i liczby podejść. Opłata dotyczy między innymi absolwentów szkół i osób po kwalifikacyjnym kursie zawodowym przystępujących po raz trzeci lub kolejny oraz zdających eksternistycznie. Za ucznia będącego młodocianym pracownikiem opłatę wnosi pracodawca.\n\nPrzed zgłoszeniem ustal w swojej OKE, czy opłata Cię dotyczy, za którą część, w jakiej wysokości i do kiedy. Nie korzystaj z kwoty ani numeru konta znalezionych dla innej sesji lub komisji.',
    order: 29,
    sources: [
      {
        title: 'OKE w Krakowie: wniesienie opłaty za egzamin zawodowy',
        url: 'https://egzaminy.gov.pl/okekrakow/zalatw-sprawe/wniesienie-oplaty-za-egzamin-zawodowy',
        section: 'Osoby zobowiązane do opłaty i terminy',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-inspection',
    version: 1,
    categoryId: 'results',
    question: 'Jak obejrzeć ocenioną pracę?',
    answer:
      'Złóż wniosek o wgląd do właściwej OKE, korzystając z jej aktualnej procedury. Prawo wglądu przysługuje w ciągu 3 miesięcy od wydania certyfikatu kwalifikacji albo informacji o wynikach.\n\nMożesz zapoznać się z odpowiedziami lub kartą oceny i właściwą dokumentacją oraz zasadami oceniania. Przygotuj dokument tożsamości. Sam wgląd nie zmienia punktacji; gdy zauważysz błąd, potrzebny jest osobny wniosek o weryfikację.',
    order: 30,
    sources: [
      {
        title: 'OKE w Jaworznie: wglądy i weryfikacja punktów — Lato 2026',
        url: 'https://egzaminy.gov.pl/okejaworzno/aktualnosci/wglady-do-prac-egzaminacyjnych-oraz-weryfikacja-sumy-punktow-sesja-lato-2026-2',
        section: 'I. Wniosek o wgląd; ogólne zasady i termin 3 miesięcy',
      },
      {
        title: 'CKE: organizacja egzaminu zawodowego 2026/2027',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/komunikaty/2.2026_2027_PP2019_Informacja%20_o_EZ.pdf',
        section: 'Rozdział 12.1–12.3: termin i zakres wglądu',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-result-review',
    version: 1,
    categoryId: 'results',
    question: 'Jak zgłosić błąd w punktacji lub naruszenie procedury?',
    answer:
      'Po wglądzie możesz złożyć do OKE uzasadniony wniosek o weryfikację sumy punktów w ciągu 2 dni roboczych. Wskaż konkretne zadanie lub kryterium i powód zastrzeżenia.\n\nPo weryfikacji części pisemnej można odwołać się do Kolegium Arbitrażu Egzaminacyjnego przez OKE — w ciągu 7 dni od otrzymania wyniku weryfikacji. Ta ścieżka KAE dotyczy części pisemnej.\n\nNaruszenie zasad przeprowadzania egzaminu zgłasza się osobno, w ciągu 2 dni roboczych od danej części. Nie czekaj z takim zgłoszeniem na wyniki.',
    order: 31,
    sources: [
      {
        title: 'OKE w Krakowie: weryfikacja sumy punktów',
        url: 'https://egzaminy.gov.pl/okekrakow/zalatw-sprawe/wnioskowanie-o-weryfikacje-sumy-punktow',
        section: 'Wniosek i terminy',
      },
      {
        title: 'OKE w Krakowie: odwołanie do KAE',
        url: 'https://egzaminy.gov.pl/okekrakow/zalatw-sprawe/odwolanie-do-kae',
        section: 'Zakres odwołania i termin 7 dni',
      },
      {
        title: 'OKE w Krakowie: zastrzeżenia do przebiegu egzaminu',
        url: 'https://egzaminy.gov.pl/okekrakow/zalatw-sprawe/zgloszenie-zastrzezen-dotyczacych-naruszenia-przepisow-przeprowadzenia-egzaminu-zawodowego',
        section: 'Zgłoszenie naruszenia przepisów i terminy',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-accommodations',
    version: 1,
    categoryId: 'accommodations',
    question: 'Jak ubiegać się o dostosowanie warunków?',
    answer:
      'Zgłoś potrzeby w szkole lub OKE możliwie wcześnie i dostarcz wymagany dokument, np. orzeczenie, opinię poradni albo zaświadczenie lekarskie. Uczeń z opinią o specyficznych trudnościach w uczeniu się przekazuje ją wraz z deklaracją.\n\nDostosowania zależą od udokumentowanej sytuacji i komunikatu CKE. Dysleksja nie oznacza automatycznie takiego samego dodatkowego czasu dla każdego. Poproś o informację, jakie warunki przyznano konkretnie Tobie. Nagłą chorobę lub potrzebę korzystania ze sprzętu medycznego zgłoś niezwłocznie.',
    order: 32,
    sources: [
      {
        title: 'CKE: dostosowania egzaminu zawodowego 2026/2027',
        url: 'https://cke.gov.pl/images/_EGZAMIN_ZAWODOWY/Formula_2019/komunikaty/3.2026_2027_Dostosowania-PP2019.pdf',
        section: 'Uprawnieni zdający, wymagane dokumenty i tabela dostosowań',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'rules',
    schoolYear: '2026/2027',
  },
  {
    id: 'inf03-platform-score',
    version: 1,
    categoryId: 'service',
    question: 'Czy wynik w tym serwisie jest oceną CKE?',
    answer:
      'Nie. Zdaj Egzamin INF jest serwisem do nauki, a jego kontrole i wskazówki mają charakter edukacyjny. Oficjalny wynik egzaminu ustala OKE.\n\nOryginalny arkusz, nasze objaśnienia i ewentualne rozwiązania przykładowe są rozdzielone. Kontrola ręczna oznacza własne potwierdzenie wykonania, a nie automatycznie zdobyte punkty. Brak sprawdzenia danego wymagania nie oznacza ani sukcesu, ani błędu.',
    order: 33,
    sources: [
      {
        title: 'Zdaj Egzamin INF: opis możliwości i ograniczeń',
        url: 'https://github.com/tutuu9/ZdajEgzaminINF/blob/main/README.pl.md',
        section: 'Możliwości oraz źródła i ograniczenia',
      },
      {
        title: 'OKE w Krakowie: sprawdzenie wyniku egzaminu zawodowego',
        url: 'https://egzaminy.gov.pl/okekrakow/zalatw-sprawe/sprawdzenie-wyniku-egzaminu-zawodowego',
        section: 'Ustalenie oficjalnego wyniku przez dyrektora OKE',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'service',
  },
  {
    id: 'inf03-platform-learning',
    version: 1,
    categoryId: 'service',
    question: 'Jak uczyć się z arkusza krok po kroku?',
    answer:
      'Wybierz arkusz i tryb Nauka. Czytaj jeden krok, wykonaj małą zmianę w istniejącym pliku i sprawdź rezultat. Kolejne kroki rozwijają ten sam projekt — przejście dalej lub wstecz nie powinno zastępować Twojego kodu.\n\nPorównuj instrukcję z oryginalnym PDF. Gdy potrzebna jest lokalna baza, PHP lub program graficzny, wykonaj czynność w swoim środowisku. Gotowy wariant potraktuj jako materiał do analizy po własnej próbie. W praktycznym trybie Egzamin pomoc jest ukryta do zakończenia pracy.',
    order: 34,
    sources: [
      {
        title: 'Zdaj Egzamin INF: opis możliwości i ograniczeń',
        url: 'https://github.com/tutuu9/ZdajEgzaminINF/blob/main/README.pl.md',
        section: 'Nauka na jednym rosnącym projekcie i tryby pracy',
      },
      {
        title: 'Zdaj Egzamin INF: czytanie oryginalnych arkuszy',
        url: 'https://github.com/tutuu9/ZdajEgzaminINF/blob/main/docs/reading-exam-pdfs.md',
        section: 'Practical sheets',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'service',
  },
  {
    id: 'inf03-platform-backup',
    version: 1,
    categoryId: 'service',
    question: 'Gdzie zapisuje się moja praca i jak zrobić kopię?',
    answer:
      'Pliki projektu, postęp i zapisane próby pozostają w tej przeglądarce. Nie ma kont uczniów ani automatycznej synchronizacji między urządzeniami. Usunięcie danych witryny może usunąć także pracę.\n\nOtwórz Moje prace i wybierz „Eksportuj postęp”. Zachowaj pobraną kopię poza danymi przeglądarki; na innym urządzeniu użyj „Importuj kopię”. Eksport ZIP pojedynczego projektu służy pracy z jego plikami, a pełna kopia postępu zachowuje także historię nauki.\n\nPrzy błędzie zapisu od razu pobierz kopię dostępnej pracy. Nie zakładaj, że samo pozostawienie otwartej karty chroni przed utratą danych.',
    order: 35,
    sources: [
      {
        title: 'Zdaj Egzamin INF: opis możliwości i ograniczeń',
        url: 'https://github.com/tutuu9/ZdajEgzaminINF/blob/main/README.pl.md',
        section: 'Postęp, eksport i brak synchronizacji',
      },
      {
        title: 'Zdaj Egzamin INF: przechowywanie danych',
        url: 'https://github.com/tutuu9/ZdajEgzaminINF/blob/main/docs/architecture.md',
        section: 'Data ownership i Content revisions',
      },
    ],
    reviewedAt: '2026-11-02',
    type: 'service',
  },
];
