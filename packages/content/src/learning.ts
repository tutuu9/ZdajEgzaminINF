import type { Exercise, Lesson, Topic } from '@zdaj/shared';

export const topics: Topic[] = [
  {
    id: 'tools',
    title: 'Warsztat pracy',
    description: 'Pliki, narzędzia i spokojny start od zera.',
    icon: 'folder',
  },
  {
    id: 'html-css',
    title: 'HTML i CSS',
    description: 'Czytelna struktura, dostępne formularze i układ strony.',
    icon: 'layout',
  },
  {
    id: 'javascript',
    title: 'JavaScript',
    description: 'Zdarzenia, obliczenia i zachowanie interfejsu.',
    icon: 'code',
  },
  {
    id: 'sql',
    title: 'Bazy danych i SQL',
    description: 'Relacje, zapytania i sprawdzanie wyników.',
    icon: 'database',
  },
  {
    id: 'php',
    title: 'PHP',
    description: 'Dane formularzy i strony współpracujące z bazą.',
    icon: 'server',
  },
  {
    id: 'graphics-security',
    title: 'Grafika i publikacja',
    description: 'Formaty obrazów, CMS i bezpieczna praca.',
    icon: 'image',
  },
];

export const exercises: Exercise[] = [
  {
    id: 'paths',
    topicId: 'tools',
    title: 'Znajdź plik z obrazem',
    prompt:
      'Strona jest w katalogu projekt/index.html, a obraz w projekt/img/znak.svg. Uzupełnij src tak, aby użyć ścieżki względnej. Dodaj opis znaku przedstawiającego liść.',
    starter: '<img src="" alt="">',
    language: 'html',
    hints: [
      'Zacznij od katalogu, w którym jest strona.',
      'Przejdź do podkatalogu img; nie wpisuj ścieżki z dysku C:.',
    ],
    solution: '<img src="img/znak.svg" alt="Liść">',
    explanation:
      'Ścieżka img/znak.svg działa względem katalogu strony. Opis alt przekazuje znaczenie obrazu, gdy nie można go zobaczyć.',
  },
  {
    id: 'encoding',
    topicId: 'tools',
    title: 'Polskie znaki od początku',
    prompt: 'Przygotuj początek dokumentu HTML5 po polsku. Ustaw UTF-8 i tytuł Moje ćwiczenie.',
    starter: '<!doctype html>\n<html>\n<head>\n</head>\n<body></body>\n</html>',
    language: 'html',
    hints: [
      'Język dokumentu określa atrybut lang.',
      'Kodowanie zapisuje się w meta w części head.',
    ],
    solution:
      '<!doctype html>\n<html lang="pl">\n<head>\n<meta charset="UTF-8">\n<title>Moje ćwiczenie</title>\n</head>\n<body></body>\n</html>',
    explanation:
      'lang opisuje język treści, a charset sposób odczytu bajtów. Zapisz sam plik w UTF-8; deklaracja nie naprawi pliku zapisanego błędnie.',
  },
  {
    id: 'labels',
    topicId: 'html-css',
    title: 'Pole z etykietą',
    prompt:
      'Dodaj etykietę Liczba biletów do pola number. Powiąż ją z id bilety i ustaw zakres od 1 do 6.',
    starter: '<form>\n<input type="number">\n</form>',
    language: 'html',
    hints: ['for w label powinno odpowiadać id pola.', 'Do granic zakresu służą min i max.'],
    solution:
      '<form>\n<label for="bilety">Liczba biletów</label>\n<input id="bilety" name="bilety" type="number" min="1" max="6" required>\n</form>',
    explanation:
      'Etykieta ma programowe powiązanie z polem. required odrzuca puste pole; zakres nie zastępuje walidacji na serwerze.',
  },
  {
    id: 'grid',
    topicId: 'html-css',
    title: 'Dwie kolumny i małe okno',
    prompt:
      'Dla .uklad ustaw dwie równe kolumny i odstęp 16px. Przy szerokości okna do 600px przejdź do jednej kolumny.',
    starter: '.uklad {\n\n}',
    language: 'css',
    hints: ['Użyj CSS Grid i jednostki fr.', 'Regułę dla małego okna umieść w @media.'],
    solution:
      '.uklad { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }\n@media (max-width: 600px) { .uklad { grid-template-columns: minmax(0, 1fr); } }',
    explanation:
      'repeat tworzy dwie kolumny. minmax(0, 1fr) pozwala dzielić miejsce po równo mimo szerokiej treści; długi tekst może wymagać dodatkowego zawijania. Zapytanie medialne zmienia układ, a nie treść dokumentu.',
  },
  {
    id: 'sum',
    topicId: 'javascript',
    title: 'Obliczenie bez sklejania tekstu',
    prompt:
      'Napisz funkcję koszt(liczbaTekst), która zamienia tekst na liczbę, akceptuje wyłącznie całkowitą liczbę od 1 do 8 i zwraca cenę przy 25 zł za sztukę. Dla niepoprawnych danych zwróć null.',
    starter: 'function koszt(liczbaTekst) {\n\n}',
    language: 'javascript',
    hints: [
      'Number zamienia tekst na wartość liczbową. Pusty tekst trzeba odrzucić osobno.',
      'Sprawdź Number.isInteger oraz obie granice.',
    ],
    solution:
      'function koszt(liczbaTekst) {\n  if (liczbaTekst.trim() === "") return null;\n  const liczba = Number(liczbaTekst);\n  if (!Number.isInteger(liczba) || liczba < 1 || liczba > 8) return null;\n  return liczba * 25;\n}',
    explanation:
      'Puste pole nie powinno zostać potraktowane jak zero. Walidacja odbywa się przed obliczeniem, a null jednoznacznie oznacza brak poprawnego wyniku.',
  },
  {
    id: 'event',
    topicId: 'javascript',
    title: 'Zmiana tekstu po kliknięciu',
    prompt:
      'Przycisk ma id pokaz, a akapit id informacja. Po kliknięciu wpisz do akapitu Gotowe! bez interpretowania tekstu jako HTML.',
    starter: 'const przycisk = document.querySelector("#pokaz");\n',
    language: 'javascript',
    hints: ['Zarejestruj obsługę zdarzenia click.', 'Do zwykłego tekstu wybierz textContent.'],
    solution:
      'const przycisk = document.querySelector("#pokaz");\nprzycisk.addEventListener("click", () => {\n  document.querySelector("#informacja").textContent = "Gotowe!";\n});',
    explanation:
      'Funkcja zostanie wywołana przy kliknięciu, a nie podczas rejestrowania. textContent nie wykonuje znaczników z przekazanego tekstu.',
  },
  {
    id: 'select',
    topicId: 'sql',
    title: 'Wybierz i uporządkuj',
    prompt:
      'Tabela produkty ma kolumny id, nazwa, cena. Wybierz nazwy i ceny produktów tańszych niż 40, rosnąco według ceny i następnie nazwy.',
    starter: 'SELECT\n',
    language: 'sql',
    hints: [
      'WHERE filtruje wiersze przed sortowaniem.',
      'ORDER BY może wskazywać więcej niż jedną kolumnę.',
    ],
    solution: 'SELECT nazwa, cena FROM produkty WHERE cena < 40 ORDER BY cena ASC, nazwa ASC;',
    explanation:
      'Warunek jest ścisły: cena równa 40 nie przejdzie. Drugi klucz sortowania rozstrzyga kolejność produktów o tej samej cenie.',
  },
  {
    id: 'join',
    topicId: 'sql',
    title: 'Połącz dwie tabele',
    prompt:
      'Tabela zamowienia(id, klient_id) wskazuje tabelę klienci(id, nazwa). Zwróć identyfikator zamówienia i nazwę jego klienta. Użyj aliasów z oraz k.',
    starter: 'SELECT\n',
    language: 'sql',
    hints: [
      'Powiązane wartości to zamowienia.klient_id i klienci.id.',
      'Warunek złączenia umieść po ON.',
    ],
    solution: 'SELECT z.id, k.nazwa FROM zamowienia AS z JOIN klienci AS k ON z.klient_id = k.id;',
    explanation:
      'Złączenie łączy odpowiadające sobie wiersze po kluczu. Samo podobieństwo nazw kolumn nie tworzy relacji w zapytaniu.',
  },
  {
    id: 'escape',
    topicId: 'php',
    title: 'Tekst w HTML',
    prompt:
      'Zmienna $nazwa zawiera tekst użytkownika. Wypisz ją wewnątrz akapitu jako tekst, z kodowaniem znaków specjalnych dla HTML.',
    starter: '<?php\n$nazwa = "<b>Ola</b>";\n',
    language: 'php',
    hints: [
      'Nie wstawiaj nieznanego tekstu bezpośrednio do HTML.',
      'htmlspecialchars przyjmuje tekst, flagi i kodowanie.',
    ],
    solution:
      '<?php\n$nazwa = "<b>Ola</b>";\necho "<p>" . htmlspecialchars($nazwa, ENT_QUOTES, "UTF-8") . "</p>";',
    explanation:
      'Na stronie zobaczysz dosłowny tekst <b>Ola</b>, a nie pogrubione imię. To kodowanie wyjścia HTML; nie jest to mechanizm parametryzacji SQL.',
  },
  {
    id: 'prepared',
    topicId: 'php',
    title: 'Parametr zamiast fragmentu SQL',
    prompt:
      'Masz połączenie PDO w $pdo oraz zweryfikowane całkowite $id. Pobierz rekord z produkty o podanym id przez zapytanie parametryzowane.',
    starter: '<?php\n',
    language: 'php',
    hints: [
      'W SQL użyj symbolu zastępczego :id.',
      'Wartość przekaż przy execute, oddzielnie od tekstu zapytania.',
    ],
    solution:
      '<?php\n$stmt = $pdo->prepare("SELECT id, nazwa FROM produkty WHERE id = :id");\n$stmt->execute(["id" => $id]);\n$produkt = $stmt->fetch(PDO::FETCH_ASSOC);',
    explanation:
      'Wartość parametru pozostaje danymi. Nie jest składana z tekstem SQL. Po fetch trzeba dodatkowo obsłużyć przypadek braku rekordu.',
  },
  {
    id: 'svg',
    topicId: 'graphics-security',
    title: 'Zachowaj proporcje',
    prompt:
      'Obraz SVG ma rozmiar 800 × 400 i viewBox 0 0 800 400. Zmień wymiary wyświetlania na szerokość 200, zachowując proporcje i układ współrzędnych.',
    starter:
      '<svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">\n</svg>',
    language: 'html',
    hints: [
      'Wysokość zmniejsz tyle samo razy co szerokość.',
      'Nie musisz zmieniać viewBox, aby zmienić rozmiar wyświetlania.',
    ],
    solution:
      '<svg width="200" height="100" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">\n</svg>',
    explanation:
      'Szerokość i wysokość zmniejszono czterokrotnie. viewBox opisuje wewnętrzny układ współrzędnych, dzięki czemu kształty skalują się razem.',
  },
  {
    id: 'backup',
    topicId: 'graphics-security',
    title: 'Plan aktualizacji CMS',
    prompt:
      'Zapisz krótki plan bezpiecznej aktualizacji CMS, który obejmuje pliki, bazę, sprawdzenie kopii i test po zmianie. Nie wpisuj prawdziwych haseł.',
    starter: '1.\n2.\n3.\n4.',
    language: 'text',
    hints: [
      'Sama kopia plików może nie zawierać wpisów zapisanych w bazie.',
      'Kopia jest użyteczna dopiero, gdy wiadomo, jak ją przywrócić.',
    ],
    solution:
      '1. Wykonuję kopię plików i bazy, poza publicznym katalogiem strony.\n2. Sprawdzam odtworzenie kopii w odizolowanym środowisku.\n3. Aktualizuję CMS i zaufane dodatki, najpierw na kopii testowej.\n4. Sprawdzam logowanie, formularze i kluczowe podstrony; mam plan przywrócenia.',
    explanation:
      'Kopia obejmuje oba rodzaje danych. Test odtwarzania sprawdza jej użyteczność, a test po aktualizacji wykrywa niezgodności dodatków.',
  },
];

type LessonInput = Omit<Lesson, 'version'>;
const lesson = (input: LessonInput): Lesson => ({ version: 1, ...input });

export const lessons: Lesson[] = [
  lesson({
    id: 'pliki-projektu',
    topicId: 'tools',
    title: 'Pierwszy folder projektu',
    summary: 'Zbuduj porządek, dzięki któremu strona działa także na innym komputerze.',
    minutes: 8,
    level: 'beginner',
    objectives: [
      'Rozpoznajesz plik, katalog i rozszerzenie.',
      'Tworzysz ścieżki względne.',
      'Oddajesz tylko potrzebne pliki.',
    ],
    exerciseIds: ['paths'],
    body: `## Zacznij od jednego miejsca

Utwórz osobny folder dla zadania. Włącz widoczność rozszerzeń plików, aby odróżnić index.html od index.html.txt. Zapisuj zmiany w edytorze przed odświeżeniem strony. Przeglądarka nie zawsze widzi niezapisany tekst edytora.

## Ścieżka opisuje drogę

Jeżeli index.html i style.css leżą obok siebie, użyj ścieżki style.css. Gdy obraz leży w podfolderze img, ścieżka to img/znak.svg. Unikaj C:\\Users\\… w plikach oddawanych do sprawdzenia: taka droga istnieje tylko na twoim komputerze. W adresach zasobów WWW używaj ukośnika /.

## Mała próba

Utwórz stronę, dodaj jeden obraz i otwórz narzędzia przeglądarki. Jeśli obraz się nie pojawia, sprawdź nazwę i wielkość liter, lokalizację oraz zapis pliku. Na wielu serwerach Logo.svg i logo.svg oznaczają różne nazwy. Nie zmieniaj losowo kilku rzeczy naraz.

Przed oddaniem rozpakuj własny ZIP do nowego folderu. Sprawdź, czy ma wszystkie zasoby i nie zawiera haseł, kopii bazy platformy ani niepotrzebnych katalogów zależności.`,
  }),
  lesson({
    id: 'przegladarka-serwer',
    topicId: 'tools',
    title: 'Przeglądarka, serwer i polskie znaki',
    summary: 'Dowiedz się, gdzie wykonywany jest kod i jak znaleźć pierwszy błąd.',
    minutes: 10,
    level: 'beginner',
    objectives: [
      'Odróżniasz HTML/JS od PHP.',
      'Ustawiasz UTF-8 i język dokumentu.',
      'Czytasz błędy konsoli i żądań.',
    ],
    exerciseIds: ['encoding'],
    body: `## Dwie strony połączenia

Przeglądarka pobiera dokument i zasoby, interpretuje HTML oraz CSS, a także wykonuje JavaScript strony. PHP wykonuje serwer: przeglądarka otrzymuje wynik, zwykle HTML. Samo otwarcie pliku PHP z dysku nie tworzy środowiska PHP. W tym kursie możesz użyć własnej lokalnej konfiguracji, a przy oddawaniu projekt uruchomi odizolowany sprawdzający.

## Jedno kodowanie na całej drodze

Zapisuj pliki w UTF-8. W HTML dodaj deklarację charset, a w bazie i połączeniu używaj utf8mb4. lang="pl" informuje o języku; nie ustawia kodowania. Sprawdź zdanie „Zażółć gęślą jaźń”, także po pobraniu z bazy.

## Szukaj dowodu

W zakładce Network sprawdzisz, czy zasób został znaleziony. Kod 404 wskazuje brak zasobu pod danym adresem. Konsola pokazuje błędy JavaScript, ale awarie PHP sprawdza się również po stronie serwera. Najpierw przeczytaj dokładny komunikat i nazwę pliku, potem zmień jedną rzecz i sprawdź efekt.

Nie umieszczaj kluczy API w JavaScript wysyłanym do przeglądarki. Każdy odwiedzający może odczytać pobrane pliki.`,
  }),
  lesson({
    id: 'html-struktura',
    topicId: 'html-css',
    title: 'HTML opisuje znaczenie',
    summary: 'Nagłówki, listy i formularze, które da się zrozumieć i obsłużyć.',
    minutes: 12,
    level: 'beginner',
    objectives: [
      'Dobierasz znaczniki do znaczenia treści.',
      'Łączysz label z polem.',
      'Wiesz, dlaczego tabela ma nagłówki.',
    ],
    exerciseIds: ['labels'],
    body: `## Najpierw treść

Rozpisz, co znajduje się na stronie: tytuł, nawigacja, główna treść, lista, formularz i stopka. Dobierz odpowiednio h1, nav, main, ul lub ol, form oraz footer. Nie wybieraj nagłówka tylko dlatego, że domyślnie jest duży — wygląd zmienisz w CSS.

## Formularz jest rozmową

Każde pole powinno mieć zrozumiałą etykietę. Wartość for elementu label powinna pasować do id pola. Atrybut name określa nazwę wysyłanej wartości, natomiast id pomaga powiązać element z etykietą i skryptem. To różne role.

Używaj właściwego typu pola i ograniczeń required, min oraz max. Ułatwiają wpisanie poprawnych danych, ale nie zastępują sprawdzenia na serwerze. Przyciski niezwiązane z wysłaniem formularza oznacz jako type="button".

## Dane w tabeli

Tabela służy do danych, a nie układania całej strony. Dodaj caption opisujący zestawienie, th dla nagłówków i td dla wartości. Przeczytaj tabelę bez kolorów: jeśli jej sens znika, popraw strukturę. Na koniec przejdź przez formularz klawiszem Tab i sprawdź, czy wiesz, które pole jest aktywne.`,
  }),
  lesson({
    id: 'css-uklad',
    topicId: 'html-css',
    title: 'CSS: odstępy i elastyczny układ',
    summary: 'Zamień poprawną strukturę w stronę czytelną na różnych ekranach.',
    minutes: 14,
    level: 'intermediate',
    objectives: [
      'Rozróżniasz margin, border i padding.',
      'Budujesz układ Grid.',
      'Dostosowujesz go do szerokości okna.',
    ],
    exerciseIds: ['grid'],
    body: `## Zobacz pudełko

Element ma treść, wewnętrzny odstęp padding, obramowanie i zewnętrzny odstęp margin. Przy box-sizing: border-box zadana szerokość obejmuje także padding i border. To ułatwia przewidywanie szerokości elementów formularza.

## Układ zamiast przypadkowych przesunięć

Grid nadaje się do podziału na kolumny i wiersze. Flexbox pomaga ułożyć elementy w jednym kierunku. Wybierz mechanizm pasujący do relacji treści; nie pozycjonuj wszystkich elementów absolutnie, by odtworzyć jeden zrzut ekranu.

W narzędziach przeglądarki sprawdzaj style obliczone. Reguła może być poprawnie napisana, ale przegrywać z bardziej szczegółowym selektorem albo późniejszą regułą o tej samej wadze. Najpierw ustal, dlaczego dana wartość obowiązuje.

## Sprawdź skrajne warunki

Zwęż okno, powiększ tekst i wpisz dłuższą etykietę. Media query powinno zmieniać układ wtedy, gdy treść przestaje się mieścić. Zachowaj widoczny fokus klawiatury. Kolor może wspierać informację o błędzie, ale komunikat tekstowy musi wyjaśniać, co poprawić.`,
  }),
  lesson({
    id: 'js-liczby',
    topicId: 'javascript',
    title: 'Od wartości pola do poprawnego wyniku',
    summary: 'Konwersja typów, walidacja i proste funkcje obliczeniowe.',
    minutes: 12,
    level: 'beginner',
    objectives: [
      'Zamieniasz tekst na liczbę.',
      'Odrzucasz błędne wartości.',
      'Oddzielasz obliczenia od wyświetlania.',
    ],
    exerciseIds: ['sum'],
    body: `## Pole zwraca tekst

Wartość value zwykłego pola formularza jest tekstem. Operator + może sklejać teksty, dlatego "2" + "3" daje "23". Zanim obliczysz cenę, świadomie wykonaj konwersję. Number potrafi zwrócić NaN dla tekstu, którego nie można zamienić na liczbę.

## Kolejność ma znaczenie

Najpierw sprawdź, czy pole nie jest puste. Następnie zamień je na liczbę, sprawdź całkowitość i zakres. Dopiero wtedy wykonuj obliczenie. Dla pustego tekstu Number zwraca 0, dlatego sama konwersja nie jest pełną walidacją.

## Funkcja pomaga testować

Funkcja obliczeniowa powinna przyjmować dane i zwracać wynik, bez odczytywania całego dokumentu. Osobna funkcja obsługi formularza pobiera wartości i pokazuje komunikat. Dzięki temu łatwo sprawdzisz przypadki na kartce i porównasz je z kodem.

Testuj minimum, maksimum, wartość spoza zakresu, tekst i liczbę niecałkowitą. Formatowanie do dwóch miejsc dziesiętnych wykonuj przy wyświetlaniu — sformatowany tekst nie powinien udawać surowej wartości liczbowej.`,
  }),
  lesson({
    id: 'js-zdarzenia',
    topicId: 'javascript',
    title: 'Zdarzenia i zmiany w dokumencie',
    summary: 'Powiąż działanie użytkownika z przewidywalną zmianą strony.',
    minutes: 12,
    level: 'intermediate',
    objectives: [
      'Rejestrujesz zdarzenia przez addEventListener.',
      'Obsługujesz submit bez przeładowania.',
      'Wstawiasz zwykły tekst bez interpretowania HTML.',
    ],
    exerciseIds: ['event'],
    body: `## Znajdź, zarejestruj, zareaguj

querySelector zwraca pierwszy pasujący element lub null. Zanim użyjesz wyniku, upewnij się, że element istnieje i skrypt uruchamia się po utworzeniu dokumentu. Zewnętrzny skrypt z defer wykonuje się po przetworzeniu HTML.

Przekaż funkcję do addEventListener. Nie wywołuj jej od razu przy rejestrowaniu. Dla formularza zwykle obsługujesz submit, aby działało zarówno kliknięcie przycisku, jak i wysłanie klawiszem Enter. preventDefault zatrzymuje domyślne zachowanie konkretnego zdarzenia.

## Tekst lub struktura

Do wyświetlania zwykłego komunikatu używaj textContent. innerHTML interpretuje znaczniki, więc używanie go do nieznanych danych może wprowadzić wykonywalną treść. Gdy potrzebujesz nowego elementu, możesz utworzyć go przez createElement i wypełnić tekstem.

## Jeden aktualny stan

Przy przełączaniu paneli ustal, który ma być widoczny. Następnie ustaw właściwość hidden wszystkich paneli zgodnie z tym wyborem. Testuj wielokrotne przełączanie: dobrze działający pierwszy klik nie dowodzi, że można wrócić do poprzedniego widoku.`,
  }),
  lesson({
    id: 'sql-zapytania',
    topicId: 'sql',
    title: 'SELECT krok po kroku',
    summary: 'Wybierz kolumny, odfiltruj wiersze i sprawdź kolejność wyniku.',
    minutes: 14,
    level: 'beginner',
    objectives: [
      'Piszesz SELECT z WHERE.',
      'Rozumiesz sortowanie.',
      'Porównujesz wynik z wymaganiem.',
    ],
    exerciseIds: ['select'],
    body: `## Zacznij od pytania

Przeczytaj wymaganie i zaznacz trzy rzeczy: jakie kolumny pokazać, które wiersze wybrać i w jakiej kolejności. SELECT wskazuje wynikowe wyrażenia, FROM źródło danych, WHERE warunek, a ORDER BY kolejność.

Najpierw uruchom prosty wybór, potem dodaj filtr i sortowanie. Dzięki temu widzisz wpływ każdej części. Używaj kolumn wskazanych w zadaniu zamiast SELECT *, gdy wymagany jest konkretny zestaw danych.

## Nie zgaduj na podstawie kilku wierszy

Bez ORDER BY nie zakładaj stałej kolejności wyniku. W warunkach zwracaj uwagę na różnicę między < i <=. NULL oznacza brak wartości; sprawdza się go przez IS NULL, a nie = NULL. Nawiasy pomagają jednoznacznie połączyć AND i OR.

Porównaj liczbę wierszy, nazwy kolumn i konkretne wartości z oczekiwaniem. Własną kopię danych uzupełnij o przypadek graniczny, ale przed oddaniem zachowaj dane wejściowe wymagane w zadaniu.`,
  }),
  lesson({
    id: 'sql-relacje',
    topicId: 'sql',
    title: 'Relacje i podsumowania',
    summary: 'Połącz tabele, a potem policz właściwe rekordy.',
    minutes: 16,
    level: 'intermediate',
    objectives: [
      'Łączysz tabele po kluczach.',
      'Rozróżniasz INNER JOIN i LEFT JOIN.',
      'Używasz GROUP BY i funkcji agregujących.',
    ],
    exerciseIds: ['join'],
    body: `## Jedna informacja w jednym miejscu

Zamiast powtarzać dane klienta w każdym zamówieniu, zapisujesz klienta w osobnej tabeli. Klucz obcy wskazuje jego identyfikator. JOIN pozwala odczytać dane obu tabel w jednym wyniku. Warunek ON opisuje, które wiersze do siebie pasują.

INNER JOIN zwraca dopasowane wiersze. LEFT JOIN zachowuje również wiersze lewej tabeli bez dopasowania; kolumny prawej mają wtedy NULL. Wybór zależy od tego, czy chcesz pokazać także obiekty bez powiązań.

## Licz świadomie

GROUP BY tworzy grupy, dla których można obliczyć COUNT, SUM lub AVG. COUNT(*) liczy wiersze; COUNT(kolumna) pomija NULL tej kolumny. Ta różnica jest szczególnie ważna po LEFT JOIN.

WHERE filtruje wiersze przed grupowaniem. HAVING filtruje już utworzone grupy. W zapytaniu podsumowującym dodaj czytelny alias, np. AS liczba. Zawsze sprawdź, czy złączenie nie powieliło danych i czy policzono właściwy obiekt, a nie przypadkowo jego powiązania.`,
  }),
  lesson({
    id: 'php-zadanie',
    topicId: 'php',
    title: 'PHP: żądanie i odpowiedź',
    summary: 'Odbierz dane formularza i wyświetl bezpieczny tekst.',
    minutes: 14,
    level: 'beginner',
    objectives: [
      'Rozpoznajesz zmienne PHP.',
      'Odczytujesz parametry żądania.',
      'Kodujesz dane wstawiane do HTML.',
    ],
    exerciseIds: ['escape'],
    body: `## Kod po stronie serwera

Fragment PHP rozpoczyna się od <?php. Nazwa zmiennej zaczyna się od $. Serwer wykonuje instrukcje i wysyła odpowiedź; przeglądarka nie potrzebuje kodu źródłowego PHP do wyświetlenia wyniku.

W tablicy $_GET znajdziesz parametry adresu, a w $_POST typowe dane formularza wysłanego metodą POST. Nie zakładaj, że pole istnieje i zawiera oczekiwany typ. Brak wartości, tekst zamiast liczby i niepoprawny zakres to oddzielne przypadki do obsłużenia.

## Walidacja i kodowanie to różne zadania

Walidacja rozstrzyga, czy dane spełniają reguły, np. czy liczba miejsc mieści się w zakresie. Kodowanie wyjścia sprawia, że tekst jest poprawnie umieszczony w konkretnym kontekście. Dla tekstu wewnątrz HTML użyj htmlspecialchars z odpowiednimi flagami i UTF-8.

Nie traktuj htmlspecialchars jako ochrony zapytań SQL. W SQL potrzebujesz parametrów. Nie pokazuj odwiedzającym haseł, pełnych komunikatów bazy ani ścieżek systemowych. Komunikat użytkownika powinien wyjaśniać, co może zrobić dalej.`,
  }),
  lesson({
    id: 'php-baza',
    topicId: 'php',
    title: 'PHP i baza danych',
    summary: 'Wykonaj zapytanie, przejdź po wynikach i obsłuż brak rekordu.',
    minutes: 18,
    level: 'intermediate',
    objectives: [
      'Oddzielasz tekst SQL od parametrów.',
      'Iterujesz po wyniku zapytania.',
      'Obsługujesz puste wyniki i awarie.',
    ],
    exerciseIds: ['prepared'],
    body: `## Najpierw sprawdzony SQL

Przetestuj zapytanie bez PHP. Dopiero gdy zwraca poprawne kolumny i wiersze, dodaj połączenie programu z bazą. MySQLi i PDO to różne interfejsy; oba mogą służyć do poprawnego rozwiązania, jeśli zadanie nie narzuca jednego.

Ustaw kodowanie połączenia. Rozróżniaj nazwę bazy, użytkownika i hasło od nazw tabel. Dane root z pustym hasłem występują w niektórych odizolowanych zadaniach szkoleniowych; nie przenoś ich na publiczny serwer.

## Parametry są danymi

W zapytaniu zależnym od formularza użyj symbolu zastępczego, a wartość przekaż oddzielnie. Nie sklejaj fragmentów SQL z parametrem adresu. Zweryfikuj też sens danych: parametryzacja nie sprawi, że ujemna liczba miejsc stanie się poprawna.

## Każdy wynik ma znaczenie

Przetwarzaj wszystkie wiersze w pętli. Pojedyncze fetch nie oznacza odczytu całej tabeli. Odróżnij pusty wynik od błędu zapytania. Do HTML wstawiaj zakodowany tekst. Przy błędzie użytkownik ma dostać prosty komunikat, a dane techniczne nie powinny pojawić się w odpowiedzi strony.`,
  }),
  lesson({
    id: 'grafika-formaty',
    topicId: 'graphics-security',
    title: 'Obraz: format, rozmiar i znaczenie',
    summary: 'Dobierz plik do zadania i sprawdź wynik jego przeskalowania.',
    minutes: 10,
    level: 'beginner',
    objectives: [
      'Odróżniasz raster od wektora.',
      'Zachowujesz proporcje obrazu.',
      'Dodajesz znaczący opis alternatywny.',
    ],
    exerciseIds: ['svg'],
    body: `## Format odpowiada na potrzebę

Fotografia składa się z pikseli. JPEG może mocno zmniejszyć jej rozmiar kosztem jakości. PNG obsługuje przezroczystość i zapis bezstratny. SVG opisuje kształty wektorowe i nadaje się np. do prostego znaku. Nie wystarczy zmienić rozszerzenia, aby przekonwertować zawartość pliku.

## Proporcje można policzyć

Jeżeli szerokość zmniejszasz czterokrotnie, wysokość również zmniejsz czterokrotnie. Zmiana obu wymiarów niezależnie może rozciągnąć rysunek. Przycięcie usuwa fragment obrazu, a skalowanie zmienia jego rozmiar — to różne operacje.

W SVG viewBox opisuje wewnętrzny układ współrzędnych. width i height mogą określać rozmiar wyświetlania. Sprawdź wymaganie: rozmiar pliku obrazu i rozmiar nadany przez CSS nie zawsze są tym samym kryterium.

## Obraz niesie informację

Dodaj alt opisujący znaczenie ważnego obrazu w danym miejscu. Dla czysto dekoracyjnego obrazu zwykle wystarczy pusty alt. Korzystaj z własnych materiałów lub takich, których warunki użycia znasz; sama dostępność pliku w internecie nie wyjaśnia jego licencji.`,
  }),
  lesson({
    id: 'cms-publikacja',
    topicId: 'graphics-security',
    title: 'Publikacja i podstawy bezpieczeństwa',
    summary: 'Przygotuj aktualizację, kopię danych i kontrolę po uruchomieniu strony.',
    minutes: 14,
    level: 'intermediate',
    objectives: [
      'Rozróżniasz pliki CMS i jego bazę.',
      'Przygotowujesz sprawdzalną kopię.',
      'Rozumiesz rolę HTTPS i uprawnień.',
    ],
    exerciseIds: ['backup'],
    body: `## Co składa się na stronę CMS

CMS zarządza treścią, ale nadal potrzebuje plików, bazy danych i środowiska serwera. Motyw odpowiada głównie za prezentację, a wtyczka dodaje funkcje. Instaluj tylko potrzebne dodatki z wiarygodnego źródła i utrzymuj je aktualne.

## Kopia musi dać się odtworzyć

Zapisz kopię plików oraz bazy. Przechowuj ją poza publicznym katalogiem WWW. Sprawdź przywrócenie na odizolowanej kopii, zanim aktualizacja stanie się potrzebą awaryjną. Testuj kluczowe podstrony, logowanie i formularze po zmianach.

## Każda warstwa ma własną rolę

HTTPS chroni transmisję między przeglądarką a serwerem, ale nie naprawia błędów SQL ani źle przyznanych uprawnień. Konto powinno mieć tylko uprawnienia potrzebne do swojej pracy. Klucze API i hasła nie mogą znaleźć się w publicznym repozytorium ani plikach JavaScript.

Zanim opublikujesz projekt, sprawdź komunikaty błędów, brak zbędnych kopii plików, działanie odnośników, telefon i klawiaturę. Zapisz, co było sprawdzone, a czego jeszcze nie potrafisz potwierdzić. Uczciwa lista ograniczeń jest użyteczniejsza niż niezweryfikowane zapewnienie o pełnej poprawności.`,
  }),
];
