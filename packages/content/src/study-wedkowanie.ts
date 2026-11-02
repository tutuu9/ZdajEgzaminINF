import type { ExamStudyGuide } from '@zdaj/shared';

const solution =
  'https://zawodowe.edu.pl/arkusze-praktyczne/inf-03/inf03-2022-czerwiec-01/rozwiazanie/';
const checkedAt = '2026-11-02T00:00:00.000Z';

export const wedkowanieStudy: ExamStudyGuide = {
  id: 'cke-wedkowanie-study',
  taskId: 'cke-wedkowanie',
  taskVersion: 1,
  version: 1,
  title: 'Wędkowanie: od polecenia do działającego fragmentu',
  introduction:
    'Uczysz się na oryginalnym przykładzie CKE. Poniższe fragmenty i objaśnienia są materiałem platformy, nie gotowym rozwiązaniem ani dodatkowymi wymaganiami egzaminu. Najpierw wpisz własną wersję, potem porównaj ją z omówieniem. Materiały archiwalne INF.03-01-22.06-SG mają zgodną treść zadania, ale pozostają osobnym źródłem zewnętrznym.',
  prerequisites: [
    'Otwórz oryginalny PDF i przygotuj lokalny XAMPP z Apache, PHP i MariaDB/MySQL. Podgląd HTML w tej aplikacji nie wykonuje PHP ani importu bazy.',
    'Pobierz wejściowe pliki1.zip, rozpakuj hasłem z PDF i zachowaj bazę oraz obraz. Archiwum wejściowe nie jest ZIP-em gotowego rozwiązania.',
    'Załóż katalog ćwiczenia w htdocs. Stronę PHP otwieraj przez http://localhost, nie przez dwuklik pliku. Dane połączenia root bez hasła dotyczą wyłącznie lokalnego stanowiska opisanego w arkuszu.',
  ],
  steps: [
    {
      id: 'database',
      title: '1. Najpierw zobacz dane, z których skorzystasz',
      requirement: 'Przygotowanie bazy i import danych — część bazodanowa oryginalnego PDF.',
      page: 2,
      explanation:
        'W phpMyAdmin utwórz bazę wedkowanie i zaimportuj baza.sql. Następnie obejrzyj strukturę tabel potrzebnych w zadaniu: ryby, lowisko i okres_ochronny. Odczytaj pisownię nazw z importu; ilustracja nie zastępuje sprawdzenia rzeczywistego schematu. Dodatkowe tabele z archiwum nie są powodem do zmieniania polecenia.',
      starterCode:
        '-- Po imporcie wybierz bazę wedkowanie.\n-- Wyświetl jej tabele, a potem strukturę tabeli ryby.\n',
      code: 'USE wedkowanie;\nSHOW TABLES;\nDESCRIBE ryby;',
      language: 'sql',
      fileName: 'rozpoznanie.sql',
      why: [
        'USE wybiera bazę dla kolejnych poleceń; samo utworzenie bazy nie importuje tabel.',
        'DESCRIBE pokazuje nazwy i typy kolumn. Dzięki temu nie zgadujesz nazwy pola w późniejszym SELECT.',
        'Ten plik służy do nauki. Nie zastępuje wymaganych kwerendy.txt ani dowodu importu.',
      ],
      commonMistakes: [
        'Wpisanie wędkowanie z polskim znakiem zamiast nazwy bazy z zadania.',
        'Import do przypadkowo zaznaczonej bazy albo traktowanie samego pliku SQL jak działającej bazy.',
      ],
      checkpoint:
        'W strukturze ryby odnajdujesz id, nazwa, wystepowanie i styl_zycia. Potrafisz wskazać bazę, do której zostały zaimportowane.',
    },
    {
      id: 'select',
      title: '2. Rozłóż zdanie na kolumny, tabelę i warunek',
      requirement: 'Samodzielne przygotowanie zapytań i ich dokumentacji — strona 2 PDF.',
      page: 2,
      explanation:
        'Czytaj polecenie w trzech częściach: co ma być widoczne, skąd pobierasz dane i które wiersze wybierasz. Napisz zapytanie dotyczące drapieżników. Wartość kodu styl_zycia odczytaj z opisu bazy. Nie wpisuj na sztywno identyfikatorów ryb znalezionych w aktualnych danych.',
      starterCode:
        'SELECT /* trzy wymagane kolumny */\nFROM ryby\nWHERE /* warunek wynikający z opisu bazy */;',
      code: 'SELECT id, nazwa, wystepowanie\nFROM ryby\nWHERE styl_zycia = 1;',
      language: 'sql',
      fileName: 'kwerendy.txt',
      why: [
        'Lista po SELECT określa wynikowe kolumny. Gwiazdka zwróciłaby również niezamówione pola.',
        'WHERE opisuje cechę ryby, dlatego działa także po zmianie danych.',
        'Najpierw uruchom zapytanie w bazie, następnie zachowaj jego treść i wymagany dowód działania.',
      ],
      commonMistakes: [
        'Porównywanie styl_zycia z napisem zamiast kodem liczbowym opisanym w zadaniu.',
        'Przepisanie wyniku zamiast zapytania lub pominięcie pozostałych trzech poleceń.',
      ],
      checkpoint:
        'Wynik ma wyłącznie trzy wymagane kolumny. Wyjaśniasz różnicę między treścią zapytania, jego wynikiem a zrzutem ekranu.',
    },
    {
      id: 'join',
      title: '3. Połącz rybę z jej łowiskiem',
      requirement: 'Zapytanie korzystające z relacji między rybą i łowiskiem — strona 2 PDF.',
      page: 2,
      explanation:
        'Nazwa gatunku jest w ryby, a opis miejsca w lowisko. Zacznij od połączenia tych tabel po polu wskazującym rybę. Pokazany fragment jest etapem diagnostycznym: samodzielnie dobierz ostateczne kolumny i warunek dotyczący rodzaju łowiska z PDF.',
      starterCode:
        'SELECT r.nazwa, l.akwen\nFROM ryby AS r\nJOIN lowisko AS l ON /* powiąż odpowiednie klucze */;',
      code: 'SELECT r.nazwa, l.akwen\nFROM ryby AS r\nJOIN lowisko AS l ON l.Ryby_id = r.id;',
      language: 'sql',
      fileName: 'kwerendy.txt',
      why: [
        'Aliasy r i l skracają nazwy tabel; nie zmieniają danych ani nazw kolumn w bazie.',
        'lowisko.Ryby_id wskazuje ryby.id. Nie należy łączyć tabel tylko dlatego, że obie mają kolumnę id.',
        'Dopiero po sprawdzeniu relacji dodaj filtrowanie. Brak filtra w tym fragmencie jest celowy; nie jest to gotowe zapytanie 3.',
      ],
      commonMistakes: [
        'Łączenie lowisko.id z ryby.id zamiast użycia pola Ryby_id.',
        'Użycie dwóch tabel bez warunku połączenia, co tworzy niepowiązane kombinacje wierszy.',
      ],
      checkpoint:
        'Potrafisz wskazać, skąd pochodzi każda kolumna. Uzupełniasz zapytanie o brakujące pole i warunek bez zgadywania wartości kodu.',
    },
    {
      id: 'html',
      title: '4. Zbuduj kontener na dane, zanim dodasz PHP',
      requirement: 'Struktura witryny i tabela w drugim bloku lewym — strona 3 PDF.',
      page: 3,
      explanation:
        'Utwórz wedkuj.php z deklaracją HTML5, językiem polskim, UTF-8 i odnośnikiem do styl_1.css. Podziel body na części z rysunku. Najpierw zbuduj pustą tabelę z nagłówkami: dzięki temu oddzielisz błędy HTML od błędów pobierania danych.',
      starterCode:
        '<table>\n  <tr>\n    <!-- Uzupełnij trzy komórki nagłówkowe według PDF. -->\n  </tr>\n  <!-- Tutaj później pojawią się wiersze z PHP. -->\n</table>',
      code: '<table>\n  <tr>\n    <th>L.p.</th>\n    <th>Gatunek</th>\n    <th>Występowanie</th>\n  </tr>\n</table>',
      language: 'html',
      fileName: 'wedkuj.php',
      why: [
        'tr tworzy wiersz, th opisuje nagłówek kolumny, a td będzie zawierać zwykłe dane.',
        'Tabela jest tylko jednym elementem strony; nagłówki, lista, obraz, odsyłacz i stopka nadal wynikają z PDF.',
        'Nie zastępuj danych z bazy ręcznie wpisanymi wierszami tylko dlatego, że wyglądają podobnie.',
      ],
      commonMistakes: [
        'Wpisanie samych td bez otaczającego tr albo użycie td zamiast wymaganych nagłówków.',
        'Nazwa pliku styl.css zamiast styl_1.css lub otwarcie PHP z dysku bez serwera.',
      ],
      checkpoint:
        'W przeglądarce przez localhost widzisz trzy nagłówki i polskie znaki. Znasz miejsce, do którego trafi wynik pętli PHP.',
    },
    {
      id: 'css',
      title: '5. Dobierz selektor, a potem właściwość i jednostkę',
      requirement: 'Formatowanie tabeli i wymagany rodzaj selektorów — strona 4 PDF.',
      page: 4,
      explanation:
        'Dla każdego punktu CSS zapisz najpierw, jaki element ma zmienić wygląd. W tym arkuszu część stylów musi używać selektorów znaczników. Poniższy fragment ćwiczy tabelę; pozostałe kolory, bloki, obraz i efekt hover dopisz samodzielnie z PDF. Obraz przeskaluj w edytorze grafiki — sama szerokość CSS nie zmienia pliku JPEG.',
      starterCode:
        'table, td, th {\n  /* Wspólne obramowanie i sposób łączenia krawędzi. */\n}\ntable {\n  /* Szerokość i margines z polecenia. */\n}\ntd, th {\n  /* Odstęp wewnątrz komórek. */\n}',
      code: 'table, td, th {\n  border: 1px solid #4FB3BF;\n  border-collapse: collapse;\n}\ntable {\n  width: 80%;\n  margin: auto;\n}\ntd, th {\n  padding: 4px;\n}',
      language: 'css',
      fileName: 'styl_1.css',
      why: [
        'Przecinki grupują selektory. Zapis table td bez przecinka znaczyłby coś innego: komórki wewnątrz tabeli.',
        'padding zwiększa odstęp wewnątrz komórki, a margin określa odstęp na zewnątrz elementu.',
        'Wymagany selektor jest częścią zadania; podobny wygląd uzyskany wyłącznie klasą nie spełnia tego konkretnego ograniczenia.',
      ],
      commonMistakes: [
        'Użycie klasy zamiast wyraźnie wymaganego selektora znacznika.',
        'Pomylenie jednostek % i px lub wpisanie stylów do HTML mimo wymaganego osobnego pliku CSS.',
      ],
      checkpoint:
        'W narzędziach przeglądarki wskazujesz regułę odpowiedzialną za obramowanie i odstęp komórek. Uzupełniasz pozostałe style na podstawie PDF.',
    },
    {
      id: 'php',
      title: '6. Zamień każdy rekord na wiersz HTML',
      requirement:
        'Połączenie z bazą i skrypt tabeli — strona 4; komplet rezultatów — strona 5 PDF.',
      page: 4,
      explanation:
        'Umieść przykład wewnątrz przygotowanej tabeli, po wierszu nagłówkowym. PHP działa na serwerze: wysyła zapytanie, odczytuje kolejne rekordy i wypisuje HTML. To fragment drugiego skryptu, nie całej strony. Po dodaniu pierwszego skryptu wspólne połączenie zamykaj dopiero po ostatniej operacji na bazie.',
      starterCode:
        '<?php\n$db = mysqli_connect("localhost", "root", "", "wedkowanie");\n// Wyślij własne zapytanie dotyczące drapieżników.\n// W pętli utwórz tr z trzema komórkami td.\nmysqli_close($db);\n?>',
      code: '<?php\n$db = mysqli_connect("localhost", "root", "", "wedkowanie");\nmysqli_set_charset($db, "utf8mb4");\n$result = mysqli_query($db, "SELECT id, nazwa, wystepowanie FROM ryby WHERE styl_zycia = 1");\nwhile ($fish = mysqli_fetch_assoc($result)) {\n    echo "<tr>";\n    foreach (["id", "nazwa", "wystepowanie"] as $column) {\n        echo "<td>" . htmlspecialchars((string) $fish[$column], ENT_QUOTES, "UTF-8") . "</td>";\n    }\n    echo "</tr>";\n}\nmysqli_close($db);\n?>',
      language: 'php',
      fileName: 'wedkuj.php',
      why: [
        'mysqli_query zwraca wynik zapytania; samo wysłanie SELECT nie wypisuje go na stronie.',
        'while pobiera kolejne rekordy, a wewnętrzna pętla tworzy trzy komórki w ustalonej kolejności.',
        'htmlspecialchars jest dodatkową dobrą praktyką: tekst z bazy nie staje się przypadkowo znacznikiem HTML.',
        'Dane root bez hasła są tu odwzorowaniem lokalnego stanowiska CKE, nie konfiguracją publicznego serwera.',
      ],
      commonMistakes: [
        'Zamykanie połączenia przed drugim skryptem lub oczekiwanie, że przeglądarka sama wykona kod PHP.',
        'Wypisywanie jednego rekordu bez pętli albo umieszczenie tr poza tabelą.',
        'Uznanie fragmentu za gotową pracę: nadal potrzebne są pierwszy skrypt, grafika, pozostałe zapytania i rezultaty wymienione w PDF.',
      ],
      checkpoint:
        'Porównujesz wiersze tabeli z wynikiem zapytania w phpMyAdmin. Następnie sprawdzasz własną listę plików ze stroną 5 PDF, łącznie z wymaganymi dowodami i plikiem przeglądarka.txt.',
    },
  ],
  resources: [
    {
      id: 'wedkowanie-inputs',
      title: 'Pliki wejściowe: baza.sql i ryba1.jpg',
      url: 'https://zawodowe.edu.pl/arkusz-praktyczny/inf03-2022-czerwiec-01/zalacznik/36/pliki1.zip',
      kind: 'starter-archive',
      publisher: 'zawodowe.edu.pl — archiwum zewnętrzne',
      provenance: 'third-party',
      description:
        'Archiwum pliki1.zip dla zgodnej treści INF.03-01-22.06-SG. To dane do samodzielnej pracy, nie rozwiązanie. Hasło odczytaj z oryginalnego PDF; nie potwierdzono hostowanej przez CKE kopii tego archiwum.',
      checkedAt,
    },
    {
      id: 'wedkowanie-walkthrough',
      title: 'Zewnętrzne rozwiązanie krok po kroku',
      url: solution,
      kind: 'walkthrough',
      publisher: 'Bartosz Bryniarski · zawodowe.edu.pl',
      provenance: 'third-party',
      description:
        'Opracowanie zgodnego zadania INF.03-01-22.06-SG, z kodem i omówieniem. Autor udostępnia własną warstwę na CC BY-NC 4.0; nie jest to oficjalne rozwiązanie CKE.',
      checkedAt,
    },
    {
      id: 'wedkowanie-solution',
      title: 'Gotowe pliki rozwiązania — osobny ZIP',
      url: `${solution}pobierz.zip`,
      kind: 'solution-archive',
      publisher: 'Bartosz Bryniarski · zawodowe.edu.pl',
      provenance: 'third-party',
      description:
        'Zawiera kod, arkusz CSS, przeskalowany obraz i README. Nie zawiera wejściowej bazy ani własnych zrzutów ucznia. Udostępniony jako materiał porównawczy, bez gwarancji automatycznej oceny.',
      checkedAt,
    },
    {
      id: 'wedkowanie-criteria',
      title: 'Kryteria zgodnego arkusza INF.03-01-22.06-SG',
      url: 'https://zawodowe.edu.pl/arkusz-praktyczny/inf03-2022-czerwiec-01/klucz-odpowiedzi.pdf',
      kind: 'criteria',
      publisher: 'zawodowe.edu.pl — kopia kryteriów CKE',
      provenance: 'third-party',
      description:
        'Treść zadania odpowiada przykładowi CKE, lecz kryteria mają własny identyfikator arkusza. Kopia zawiera pustą pozycję R.2.10; platforma nie wylicza na jej podstawie fikcyjnego procentu.',
      checkedAt,
    },
  ],
  variants: [
    {
      id: 'wedkowanie-procedural',
      title: 'Wariant z proceduralnym MySQLi',
      description:
        'Zewnętrzny przykład prostego przepływu zapytanie → pętla → HTML. Sprawdź go względem swojego PDF; gotowy ZIP nie zastępuje importu ani dokumentacji wykonanej samodzielnie.',
      approach:
        'MySQLi, układ opływany, plik wedkuj.php. Materiał autora na CC BY-NC 4.0, nie certyfikowane rozwiązanie CKE.',
      url: solution,
      downloadUrl: `${solution}pobierz.zip`,
    },
    {
      id: 'wedkowanie-pdo',
      title: 'Wariant porównawczy z PDO i Grid',
      description:
        'Pozwala porównać organizację kodu i układu. Kryteria arkusza 2022 dopuszczają PDO, a sam przykład CKE nie narzuca float. Pozostałe wymagania, w tym selektory znaczników, nadal obowiązują.',
      approach:
        'PDO i CSS Grid; alternatywa autora, bez potwierdzenia pełnej zgodności całego rozwiązania przez platformę.',
      url: `${solution}nowoczesny/`,
      downloadUrl: `${solution}nowoczesny/pobierz.zip`,
    },
  ],
};
