import type { HandbookBook } from './types';

export const phpBook: HandbookBook = {
  id: 'php',
  title: 'PHP',
  description: 'Uruchom stronę w XAMPP, odbierz formularz i wyświetl dane z MariaDB.',
  chapters: [
    {
      id: 'xampp',
      title: 'Uruchomienie w XAMPP',
      summary: 'Sprawdź, czy żądanie z przeglądarki trafia do PHP na Twoim komputerze.',
      sections: [
        {
          heading: 'Katalog projektu i adres',
          body: 'Uruchom Apache w panelu XAMPP, a do pracy z bazą także usługę oznaczoną jako MySQL. Rozpakuj projekt do folderu pod `htdocs` w katalogu instalacji, np. `C:\\xampp\\htdocs\\inf03`. Zachowaj nazwy plików i podfoldery z arkusza. Otwórz `http://localhost/inf03/motor.php`, jeśli Twój plik to `motor.php`. Jeśli Apache działa na innym porcie, dodaj ten port do adresu. [Instrukcja XAMPP dla Windows](https://www.apachefriends.org/faq_windows.html).',
        },
        {
          heading: 'Sprawdź samo PHP',
          body: 'Na własnym komputerze zapisz ten przykład w osobnym pliku `sprawdz.php` w folderze projektu. Pod adresem `http://localhost/inf03/sprawdz.php` zobaczysz komunikat. Potem wróć do pliku wymaganego w arkuszu.',
          example: { kind: 'php', code: "<?php\necho 'PHP działa';" },
        },
      ],
      mistakes: [
        'Otwarcie pliku z dysku przez file:// omija Apache. Użyj adresu http://localhost.',
        'Błąd 404 oznacza brak pliku pod podanym adresem. Sprawdź folder, nazwę oraz rozszerzenie.',
      ],
      papers: [
        {
          taskId: 'inf03-01-24-06-sg',
          title: 'Motocykle',
          note: 'Na stronie 3 arkusz wymaga motor.php. Kroki kursu najpierw budują w nim HTML, a potem dodają skrypty.',
        },
      ],
    },
    {
      id: 'formularze',
      title: 'Odbieranie formularza POST',
      summary: 'Powiąż atrybut name kontrolki z kluczem w tablicy $_POST.',
      sections: [
        {
          heading: 'Od pola do wartości',
          body: 'W formularzu `method="post"` przeglądarka przesyła wartość pod nazwą z atrybutu `name`. Przy pierwszym otwarciu strony klucza może jeszcze nie być. Użyj `??`, by wczytać wartość domyślną, i sprawdź typ, zanim użyjesz danych.',
        },
        {
          heading: 'Odbierz pole i pokaż jego treść',
          body: 'To krótki przykład działania POST na polu `kraj` używanym w kursie Baza Smoków. Gdy wyświetlasz tekst wpisany przez użytkownika, zakoduj znaki specjalne HTML przez `htmlspecialchars`. [Dokumentacja PHP](https://www.php.net/manual/en/function.htmlspecialchars.php).',
          example: {
            kind: 'php',
            code: `<form method="post">
  <label>Kraj <input name="kraj" required></label>
  <button type="submit">Pokaż</button>
</form>
<?php
$kraj = $_POST['kraj'] ?? '';
if (is_string($kraj) && trim($kraj) !== '') {
    echo '<p>' . htmlspecialchars(trim($kraj), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8') . '</p>';
}`,
          },
        },
      ],
      mistakes: [
        'Samo id służy do wiązania etykiet i pracy w DOM. Do wysłania wartości pole potrzebuje name.',
        'Pusta wartość i pierwsze wejście na stronę wymagają obsługi. Sprawdź formularz przed wysłaniem i po nim.',
      ],
      papers: [
        {
          taskId: 'inf03-08-25-06-sg',
          title: 'Baza Smoków',
          note: 'Strony 3–4 łączą wybór kraju w formularzu z pobraniem danych po jego przesłaniu.',
        },
        {
          taskId: 'inf03-03-24-06-sg',
          title: 'Poziomy rzek',
          note: 'Na stronach 3–4 jedna wartość pola radio wybiera filtr wierszy z pomiarami.',
        },
      ],
    },
    {
      id: 'polaczenie',
      title: 'Połączenie z MariaDB',
      summary: 'Najpierw zaimportuj dane z arkusza, potem sprawdź połączenie w PHP.',
      sections: [
        {
          heading: 'Import przed uruchomieniem',
          body: 'Uruchom bazę w XAMPP. W phpMyAdmin utwórz bazę o nazwie wymaganej w arkuszu i zaimportuj oryginalny plik SQL. Sprawdź, czy w tej bazie widać tabele. Do skryptu wpisz dane logowania właściwe dla swojego lokalnego środowiska.',
        },
        {
          heading: 'Kodowanie i czas życia połączenia',
          body: 'Przykład używa nazwy bazy z arkusza Poziomy rzek. Podstaw swój login i hasło. Ustaw `utf8mb4` przed zapytaniami, a połączenie zamknij po ostatnim odczycie lub zapisie.',
          example: {
            kind: 'php',
            code: `<?php
$db = new mysqli('localhost', 'twoj_login', 'twoje_haslo', 'rzeki');
$db->set_charset('utf8mb4');
// Tutaj wykonaj zapytania i odczytaj wyniki.
$db->close();`,
          },
        },
      ],
      mistakes: [
        'Unknown database zwykle wskazuje na inną nazwę bazy albo brak importu.',
        'Plik PHP i dokument HTML też powinny używać UTF-8. Samo kodowanie połączenia dotyczy wymiany danych z bazą.',
      ],
      papers: [
        {
          taskId: 'inf03-03-24-06-sg',
          title: 'Poziomy rzek',
          note: 'Kurs pokazuje import na stronie 3 oraz jedno połączenie dla skryptów ze stron 4–5.',
        },
        {
          taskId: 'cke-wedkowanie',
          title: 'Wędkowanie — oficjalny przykład',
          note: 'Skrypty ze strony 4 korzystają z jednej bazy, aby wypełnić listę i tabelę.',
        },
      ],
    },
    {
      id: 'wyniki',
      title: 'Zapytanie i wyświetlanie wierszy',
      summary: 'Powiąż parametr z zapytaniem i przetwórz każdy rekord w pętli.',
      sections: [
        {
          heading: 'Parametry zapytania',
          body: 'Znak `?` oznacza miejsce na wartość. `bind_param("s", ...)` przekazuje tam tekst. Zapytanie ma stałą strukturę niezależnie od danych przesłanych w formularzu. [Dokumentacja przygotowanych zapytań PHP](https://www.php.net/manual/en/mysqli.quickstart.prepared-statements.php).',
        },
        {
          heading: 'Od wyniku SQL do tabeli HTML',
          body: 'Ten fragment korzysta z połączenia `$db` z bazą `smoki` i z już sprawdzonej tekstowej zmiennej `$kraj`. Wstaw go w istniejące `tbody`. Pobiera tylko nazwy, żeby pokazać pętlę. Pełny zakres kolumn i filtrowania znajdziesz w arkuszu.',
          example: {
            kind: 'php',
            code: `<?php
$zapytanie = $db->prepare('SELECT nazwa FROM smok WHERE pochodzenie = ?');
$zapytanie->bind_param('s', $kraj);
$zapytanie->execute();
$wynik = $zapytanie->get_result();
while ($wiersz = $wynik->fetch_assoc()) {
    $nazwa = htmlspecialchars($wiersz['nazwa'], ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    echo '<tr><td>' . $nazwa . '</td></tr>';
}
$zapytanie->close();`,
          },
        },
      ],
      mistakes: [
        'Gdy łączysz tekst wpisany w formularzu z treścią SQL, użytkownik może zmienić składnię zapytania. Użyj parametru.',
        'Pole w tablicy wyniku musi mieć nazwę kolumny lub alias z SELECT.',
      ],
      papers: [
        {
          taskId: 'inf03-08-25-06-sg',
          title: 'Baza Smoków',
          note: 'Na stronie 4 formularz filtruje smoki po pochodzeniu, a skrypt wpisuje wynik do tabeli.',
        },
        {
          taskId: 'inf03-01-24-06-sg',
          title: 'Motocykle',
          note: 'Na stronie 4 kolejne rekordy wycieczek tworzą pozycje listy definicji.',
        },
      ],
    },
    {
      id: 'bledy',
      title: 'Biała strona i błędy PHP',
      summary: 'Ustal, na którym etapie wykonanie przestaje działać.',
      sections: [
        {
          heading: 'Adres, składnia, log Apache',
          body: 'Zacznij od adresu `http://localhost/…` i sprawdź, czy działa osobny plik PHP z krótkim `echo`. Następnie w PowerShell sprawdź składnię pliku przez `C:\\xampp\\php\\php.exe -l C:\\xampp\\htdocs\\inf03\\motor.php`, dopasowując ścieżki. W panelu XAMPP otwórz log błędów Apache i sprawdź wpis z czasu ostatniego żądania.',
        },
        {
          heading: 'Sprawdź, gdzie dotarł skrypt',
          body: 'Jeśli składnia jest poprawna, sprawdź nazwę bazy i uruchom zapytanie w phpMyAdmin. Gdy potrzebujesz zawęzić miejsce błędu w PHP, zapisz do logu nazwę etapu. Po sprawdzeniu usuń tymczasowy wpis.',
          example: { kind: 'php', code: "<?php\nerror_log('Rozpoczynam odczyt wyników');" },
        },
      ],
      mistakes: [
        'Poprawna składnia nie oznacza, że działa połączenie z bazą. Sprawdź te rzeczy osobno.',
        'Pusta tabela może oznaczać poprawny wynik bez rekordów. Sprawdź zapytanie dla konkretnego wyboru formularza.',
      ],
      papers: [
        {
          taskId: 'inf03-01-24-06-sg',
          title: 'Motocykle',
          note: 'Po dodaniu statystyk pod koniec pracy ze stroną 4 kurs prowadzi do sprawdzenia motor.php w XAMPP.',
        },
      ],
    },
  ],
};
