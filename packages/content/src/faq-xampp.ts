import type { FaqRevision, FaqSource } from '@zdaj/shared';

const guidance = {
  version: 1,
  categoryId: 'xampp',
  reviewedAt: '2026-11-24',
  type: 'advice',
} as const;

const windows = {
  title: 'Apache Friends: XAMPP dla Windows',
  url: 'https://www.apachefriends.org/faq_windows.html',
  section: 'XAMPP Control Panel, MariaDB, katalog htdocs i porty',
} satisfies FaqSource;

const importSql = {
  title: 'phpMyAdmin: import i eksport',
  url: 'https://docs.phpmyadmin.net/en/latest/import_export.html',
  section: 'Import do wybranej bazy i formaty plików',
} satisfies FaqSource;

const ports = {
  title: 'Microsoft Learn: netstat',
  url: 'https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netstat',
  section: 'Adres lokalny, stan połączenia i PID procesu',
} satisfies FaqSource;

const codes = {
  title: 'MariaDB: kody błędów',
  url: 'https://mariadb.com/docs/server/reference/error-codes/mariadb-error-code-reference',
  section: 'Komunikaty serwera i ich kody',
} satisfies FaqSource;

const connection = {
  title: 'MariaDB: diagnoza problemów z połączeniem',
  url: 'https://mariadb.com/docs/server/mariadb-quickstart-guides/mariadb-connection-troubleshooting-guide',
  section: 'Adres, port, stan serwera i dane logowania',
} satisfies FaqSource;

const charset = {
  title: 'PHP: mysqli::set_charset',
  url: 'https://www.php.net/manual/en/mysqli.set-charset.php',
  section: 'Ustawianie kodowania połączenia z bazą',
} satisfies FaqSource;

const examProcedure = {
  title: 'CKE: organizacja i przeprowadzanie egzaminu zawodowego 2026/2027',
  url: 'https://oke.wroc.pl/wp-content/uploads/2026/10/2.2026_2027_PP2019_Inf_EZ_22092026.pdf',
  section: 'Przygotowanie stanowisk i postępowanie w sytuacjach szczególnych',
} satisfies FaqSource;

const onExam =
  'Jeśli na egzaminie moduł nie startuje lub problem dotyczy stanowiska, zgłoś to zespołowi nadzorującemu. Podaj nazwę modułu i komunikat. Zmiany ustawień stanowiska uzgodnij z zespołem.';

export const xamppFaq: FaqRevision[] = [
  {
    ...guidance,
    id: 'xampp-start',
    order: 1,
    question: 'Jak uruchomić Apache i MariaDB w XAMPP?',
    answer:
      'Otwórz XAMPP Control Panel i kliknij Start przy Apache, a potem przy MySQL. W panelu XAMPP moduł bazy MariaDB ma nazwę MySQL. Gdy nazwy obu modułów są podświetlone, a panel pokazuje PID i porty, sprawdź działanie w przeglądarce: otwórz http://localhost/ oraz http://localhost/phpmyadmin/. Przy niestandardowym porcie Apache dopisz go do adresu, np. http://localhost:8080/phpmyadmin/. 3306 to typowy port bazy, który podajesz w ustawieniach połączenia z MariaDB.\n\nUtwórz folder projektu pod htdocs w katalogu XAMPP, np. C:\\xampp\\htdocs\\inf03-demo. Plik sprawdz.php w tym folderze sprawdzisz pod adresem http://localhost/inf03-demo/sprawdz.php. W próbie domowej znajdziesz kod i dalsze kroki.\n\nW „Baza i PHP” zapytania wykonuje MariaDB 11.4, a baza powstaje na nowo przy każdym uruchomieniu. W XAMPP pracujesz z własną bazą, która zachowuje dane między uruchomieniami. Wersje programów na egzaminie potwierdź w swoim ośrodku.',
    sources: [
      windows,
      {
        title: 'Zdaj Egzamin INF: uruchamianie SQL i PHP',
        url: 'https://github.com/tutuu9/ZdajEgzaminINF/blob/main/docs/checking.md#learner-initiated-runs',
        section: 'Środowisko i czas życia bazy',
      },
    ],
  },
  {
    ...guidance,
    id: 'xampp-import',
    order: 2,
    question: 'Jak zaimportować plik .sql w phpMyAdmin?',
    answer:
      'Uruchom Apache i MySQL w XAMPP. Otwórz http://localhost/phpmyadmin/ z portem Apache, jeżeli jest inny niż 80. Rozpakuj paczkę z materiałami do arkusza. Sprawdź w poleceniu dokładną nazwę bazy oraz wymagane kodowanie lub porównywanie napisów.\n\nUtwórz bazę i wybierz ją w lewej kolumnie. Sprawdź nazwę u góry strony, otwórz Import, wskaż oryginalny plik .sql, wybierz format SQL i zatwierdź. Jeśli plik zawiera polecenie USE, sprawdź wskazaną w nim bazę przed importem.\n\nPo komunikacie o powodzeniu wybierz zakładkę Struktura lub odśwież listę tabel. Otwórz jedną z nich i sprawdź, czy zawiera oczekiwane wiersze. Jeśli import zgłosi błąd, przeczytaj pierwszy komunikat przed ponowną próbą.',
    sources: [windows, importSql],
  },
  {
    ...guidance,
    id: 'xampp-home-practice',
    order: 3,
    question: 'Próba na własnym komputerze: od XAMPP do strony z danymi',
    answer:
      'To próba techniczna na dwóch przykładowych wierszach. Jeśli potrzebujesz XAMPP, pobierz wersję dla Windows z witryny Apache Friends. W panelu uruchom Apache i MySQL. Po starcie oba moduły powinny pokazywać porty i PID.\n\n1. W katalogu htdocs instalacji utwórz folder inf03-demo. Zapisz pierwszy przykład poniżej jako sprawdz.php w kodowaniu UTF-8. Wejdź na http://localhost/inf03-demo/sprawdz.php. Oczekiwany napis to „PHP działa”. Jeśli Apache działa np. na 8080, użyj http://localhost:8080/ w całej próbie.\n\n2. W phpMyAdmin utwórz pustą bazę inf03_xampp_demo z porównywaniem utf8mb4_unicode_ci i wybierz ją w lewej kolumnie. Pobierz miasta.sql z tej odpowiedzi i zaimportuj go w zakładce Import. W tabeli miasta powinny pojawić się dwa wiersze: Łódź i Gdańsk. Jeśli masz już bazę z tą nazwą, użyj nowej nazwy także w następnym pliku i w próbie z poleceniem USE.\n\n3. Zapisz drugi przykład jako miasta.php w tym samym folderze. Wpisz login i hasło swojego lokalnego konta w MariaDB oraz port MySQL widoczny w XAMPP. Jeśli Twoje konto lokalne nie ma hasła, w przykładzie zostaw pusty ciąg. Otwórz http://localhost/inf03-demo/miasta.php. Strona ma pokazać obie nazwy miast z polskimi znakami.\n\n4. Wpisz w adresie sprawdzx.php zamiast sprawdz.php. Po błędzie 404 popraw adres. Następnie w zakładce SQL w phpMyAdmin wykonaj USE inf03_xampp_demo_typo; dla nieistniejącej bazy. Po błędzie #1049 wybierz właściwą bazę i ponownie sprawdź tabelę miasta oraz obie strony PHP.\n\n5. Po próbie zatrzymaj moduły przyciskiem Stop. Na egzaminie użyj nazw, danych i instrukcji z własnego arkusza.',
    sources: [
      windows,
      {
        title: 'Apache Friends: pobieranie XAMPP',
        url: 'https://www.apachefriends.org/download.html',
        section: 'Pakiety dla Windows',
      },
      importSql,
      charset,
      codes,
    ],
  },
  {
    ...guidance,
    id: 'xampp-apache',
    order: 4,
    question: 'Apache nie startuje: Apache shutdown unexpectedly lub zajęty port',
    answer:
      'W panelu XAMPP przeczytaj ostatnie wiersze po kliknięciu Start. Obok Apache wybierz Logs i otwórz error.log. Komunikaty „Port 80 in use”, „Port 443 in use” lub „could not bind to address” sugerują konflikt portów. Jeżeli Apache nie zdążył zapisać dziennika, zacznij od komunikatu w panelu.\n\nNa własnym komputerze uruchom netstat -ano -p tcp. W adresie lokalnym znajdź port 80 lub 443 w stanie nasłuchiwania, a po numerze PID odszukaj proces w Menedżerze zadań. Zakończ go z poziomu jego aplikacji, jeśli wiesz, że możesz go zatrzymać. Po ponownym uruchomieniu Apache sprawdź adres localhost. Zmianę portu własnego Apache zacznij od sprawdzenia dyrektywy Listen i konfiguracji HTTPS; potem używaj nowego portu w adresach.\n\nJeśli dziennik wskazuje błąd konfiguracji, sprawdź nazwany plik i numer wiersza. Na swoim komputerze możesz sprawdzić składnię przez httpd.exe -t z katalogu apache\\bin instalacji.\n\n' +
      onExam,
    sources: [
      windows,
      ports,
      {
        title: 'Apache HTTP Server: adresy i porty',
        url: 'https://httpd.apache.org/docs/2.4/bind.html',
        section: 'Dyrektywa Listen i konflikt nasłuchiwania',
      },
      examProcedure,
    ],
  },
  {
    ...guidance,
    id: 'xampp-mariadb',
    order: 5,
    question: 'MariaDB nie startuje: MySQL shutdown unexpectedly lub port 3306',
    answer:
      'Przy module MySQL wybierz Logs. Sprawdź log wskazany w panelu lub ustawieniu log_error w my.ini. Przeczytaj pierwszą przyczynę w próbie startu. Przy „Bind on TCP/IP port” lub „port 3306 in use” sprawdź w netstat -ano -p tcp, który PID już nasłuchuje. Może to być inny serwer MySQL lub MariaDB.\n\nNa własnym komputerze wznów pracę na właściwej instancji. Jeśli używasz innego portu MariaDB, dopasuj do niego phpMyAdmin i połączenie w PHP. Gdy log wskazuje „Permission denied”, sprawdź ścieżkę oraz uprawnienia do katalogu danych. Przy komunikatach InnoDB o uszkodzeniu zachowaj log i zleć diagnozę na kopii danych. Nie kasuj, nie nadpisuj i nie przenoś plików z mysql\\data w ramach próby naprawy.\n\n' +
      onExam,
    sources: [
      ports,
      {
        title: 'MariaDB: log błędów',
        url: 'https://mariadb.com/docs/server/server-management/server-monitoring-logs/error-log',
        section: 'Błędy uruchamiania, pliki logów i uszkodzenia tabel',
      },
      examProcedure,
    ],
  },
  {
    ...guidance,
    id: 'xampp-localhost',
    order: 6,
    question: 'Dlaczego localhost zwraca ERR_CONNECTION_REFUSED?',
    answer:
      'Sprawdź, czy Apache nadal działa i jaki port pokazuje w panelu XAMPP. Otwórz http://localhost/ dla portu 80 lub np. http://localhost:8080/ dla portu 8080. W razie problemów z nazwą localhost sprawdź także http://127.0.0.1/ z tym samym portem. Do próby użyj HTTP, jeśli Apache jest skonfigurowany tylko dla HTTP.\n\nJeśli strona startowa działa, otwórz dopiero adres projektu lub /phpmyadmin/. Jeśli połączenie nadal jest odrzucane, odczytaj komunikat Apache w panelu i log. 3306 to zwykle port MariaDB; do przeglądarki potrzebujesz portu Apache.',
    sources: [windows],
  },
  {
    ...guidance,
    id: 'xampp-http-errors',
    order: 7,
    question: 'Strona w localhost pokazuje 403 Forbidden lub 404 Not Found',
    answer:
      '404 Not Found: porównaj adres z folderem pod htdocs i rzeczywistą nazwą pliku. Dla C:\\xampp\\htdocs\\inf03-demo\\sprawdz.php użyj http://localhost/inf03-demo/sprawdz.php. Sprawdź literówki, podfoldery oraz to, czy plik nie nazywa się sprawdz.php.txt. W Eksploratorze włącz widok rozszerzeń nazw plików.\n\n403 Forbidden: podaj adres konkretnego pliku, bo wyświetlanie zawartości katalogu może być wyłączone. Jeśli istniejący plik nadal jest niedostępny, odczytaj ostatni wpis w error.log Apache i sprawdź wskazany katalog oraz jego uprawnienia. Na egzaminie zgłoś problem z uprawnieniami stanowiska nadzorującym.',
    sources: [
      windows,
      {
        title: 'Apache HTTP Server: mapowanie adresów na pliki',
        url: 'https://httpd.apache.org/docs/2.4/urlmapping.html',
        section: 'DocumentRoot i katalogi',
      },
      examProcedure,
    ],
  },
  {
    ...guidance,
    id: 'xampp-php-source',
    order: 8,
    question: 'Przeglądarka pokazuje lub pobiera kod PHP zamiast wyniku',
    answer:
      'Zacznij od paska adresu. Przy file:///… przeglądarka otwiera plik z dysku. Serwer podglądu statycznego, np. Live Server, również może zwrócić sam kod. Użyj adresu HTTP i portu Apache z XAMPP; plik powinien znajdować się pod htdocs i mieć rozszerzenie .php.\n\nJeśli http://localhost/inf03-demo/sprawdz.php nadal pokazuje kod, sprawdź znacznik otwierający <?php i log Apache. Gdy nietknięty plik testowy nie działa, poproś o sprawdzenie konfiguracji PHP w Apache. Własny plik z danymi logowania zostaw lokalnie.',
    sources: [
      windows,
      {
        title: 'PHP: pierwszy skrypt PHP',
        url: 'https://www.php.net/manual/en/tutorial.firstpage.php',
        section: 'Uruchamianie skryptu przez serwer WWW',
      },
    ],
  },
  {
    ...guidance,
    id: 'xampp-php-error',
    order: 9,
    question: 'Pusta strona, błąd 500, Parse error lub brak mysqli_connect',
    answer:
      'Sprawdź najpierw osobny plik sprawdz.php. Jeśli działa, odtwórz problem w docelowym pliku i otwórz log błędów Apache. Poszukaj wpisu z momentu żądania. Jeśli PHP ma osobny log, sprawdź ścieżkę w ustawieniu error_log.\n\nPrzy „Parse error” sprawdź wskazaną linię i poprzedni wiersz. W PowerShell możesz użyć C:\\xampp\\php\\php.exe -l C:\\xampp\\htdocs\\inf03-demo\\sprawdz.php, podstawiając własne ścieżki. -l sprawdza składnię. Uruchom stronę jeszcze raz w przeglądarce, by sprawdzić działanie.\n\n„Call to undefined function mysqli_connect()” zwykle oznacza brak aktywnego rozszerzenia mysqli w PHP obsługującym Apache. Sprawdź wczytany plik php.ini przez panel lub stronę informacyjną PHP na własnym komputerze. Po zmianie ustawień własnego XAMPP uruchom ponownie Apache. Problem z oprogramowaniem na stanowisku zgłoś zespołowi nadzorującemu.',
    sources: [
      {
        title: 'PHP: opcje wiersza poleceń',
        url: 'https://www.php.net/manual/en/features.commandline.options.php',
        section: 'Sprawdzenie składni opcją -l',
      },
      {
        title: 'PHP: instalacja rozszerzenia mysqli',
        url: 'https://www.php.net/manual/en/mysqli.installation.php',
        section: 'Rozszerzenie mysqli w systemie Windows',
      },
      windows,
    ],
  },
  {
    ...guidance,
    id: 'xampp-phpmyadmin',
    order: 10,
    question: 'Apache działa, ale phpMyAdmin się nie otwiera',
    answer:
      'Sprawdź przycisk Admin przy MySQL w panelu XAMPP lub otwórz http://localhost/phpmyadmin/. Użyj tego samego portu Apache, na którym działa strona startowa. Jeśli widzisz 404, sprawdź, czy instalacja zawiera phpMyAdmin i czy adres prowadzi do właściwego Apache. Jeśli pojawia się 403, odczytaj wpis w jego logu i sprawdź, czy wchodzisz z tego samego komputera przez localhost.\n\nJeśli strona phpMyAdmin pokazuje komunikat MariaDB, połączenie z Apache już działa. Odczytaj kod, sprawdź status MySQL, port bazy i dane logowania. Na egzaminie wskaż nadzorującym, na którym etapie pojawia się problem.',
    sources: [windows, connection],
  },
  {
    ...guidance,
    id: 'xampp-connection',
    order: 11,
    question: 'Jak rozwiązać #2002 lub #2003 przy łączeniu z MariaDB?',
    answer:
      'Komunikaty #2002, #2003, „Connection refused” i „Can’t connect to MySQL server” wskazują problem z dotarciem do serwera bazy. W panelu sprawdź stan MySQL i jego port. Przy lokalnym połączeniu TCP użyj 127.0.0.1 i portu modułu w ustawieniach PHP lub phpMyAdmin. Port Apache w adresie przeglądarki służy do HTTP.\n\nJeśli phpMyAdmin działa i tylko PHP zgłasza ten błąd, porównaj host i port w swoim skrypcie z działającym połączeniem. Jeśli moduł nie działa, zacznij od jego logu.',
    sources: [connection, windows],
  },
  {
    ...guidance,
    id: 'xampp-access',
    order: 12,
    question: 'Co oznacza Access denied: #1044 lub #1045?',
    answer:
      '#1045 Access denied for user: sprawdź login, hasło, adres serwera i konto przypisane do danego hosta. „Using password: YES” mówi, że klient wysłał hasło; nie potwierdza jego poprawności. Użyj danych właściwych dla swojej instalacji lub podanych na stanowisku.\n\n#1044 Access denied to database: konto nie ma dostępu do wskazanej bazy. Porównaj nazwę bazy i konto z tymi używanymi w działającym phpMyAdmin. Jeżeli brakuje uprawnień na egzaminie, zgłoś to nadzorującym. Na własnym komputerze poproś administratora bazy o przyznanie potrzebnych uprawnień do tej konkretnej bazy.',
    sources: [codes, connection],
  },
  {
    ...guidance,
    id: 'xampp-schema',
    order: 13,
    question: 'Co zrobić z #1046, #1049 lub #1146: nie działa baza albo tabela?',
    answer:
      '#1046 No database selected: wybierz bazę w lewej kolumnie phpMyAdmin przed otwarciem karty SQL lub Import. W PHP podaj nazwę bazy w wywołaniu mysqli.\n\n#1049 Unknown database: porównaj nazwę ze spisem baz i z arkuszem. Popraw literówkę lub utwórz bazę o wymaganej nazwie i zaimportuj dane.\n\n#1146 Table … doesn’t exist: sprawdź aktywną bazę, zakładkę Struktura, dokładną nazwę tabeli i wynik importu. Jeśli import zatrzymał się na błędzie, wyjaśnij go przed ponowną próbą.',
    sources: [codes, importSql],
  },
  {
    ...guidance,
    id: 'xampp-import-errors',
    order: 14,
    question: 'Import .sql kończy się błędem #1050, #1062 albo #1273',
    answer:
      '#1050 Table already exists lub #1062 Duplicate entry: sprawdź, czy wybrana baza zawiera już tę tabelę lub rekord. Zweryfikuj wynik poprzedniego importu. Na własnym komputerze przetestuj import w nowej pustej bazie po sprawdzeniu, czy plik SQL nie przełącza bazy poleceniem USE. Zachowaj działającą bazę i jej dane.\n\n#1273 Unknown collation: odczytaj nazwę porównywania napisów z błędu i sprawdź, czy serwer ją obsługuje. Zachowaj oryginał pliku. Na własnym komputerze użyj zgodnej wersji bazy lub uzgodnij zmianę na kopii pliku. Na egzaminie zgłoś niezgodność środowiska.\n\nJeśli nie widzisz kodu, sprawdź też, czy wybrano rozpakowany plik .sql, właściwą bazę i format SQL, a nie np. CSV.',
    sources: [codes, importSql, examProcedure],
  },
  {
    ...guidance,
    id: 'xampp-sql-errors',
    order: 15,
    question: 'Jak znaleźć przyczynę #1054 Unknown column lub #1064 w SQL?',
    answer:
      '#1054 Unknown column: w zakładce Struktura sprawdź nazwę kolumny w wybranej tabeli. Jeśli używasz JOIN, porównaj też alias tabeli i miejsce, w którym odwołujesz się do kolumny. Wartość tekstową, np. Łódź, ujmij w apostrofy.\n\n#1064: wykonaj jedno zapytanie w karcie SQL i przeczytaj fragment po „near”. Sprawdź także część przed nim: przecinek, apostrof, nawias i kolejność klauzul. Zacznij od prostego SELECT z jednej istniejącej tabeli i dodawaj warunki po kolei. Dopiero działające zapytanie przenieś do PHP.',
    sources: [codes],
  },
  {
    ...guidance,
    id: 'xampp-encoding',
    order: 16,
    question: 'Dlaczego polskie znaki w bazie lub na stronie są zepsute?',
    answer:
      'Sprawdź, na którym etapie zmienia się napis. Jeżeli już w phpMyAdmin zamiast „Łódź” widzisz przypadkowe znaki, sprawdź kodowanie oryginalnego pliku .sql i ustawienia importu, a następnie kodowanie bazy i kolumny. Wypróbuj poprawny import w czystej bazie testowej na własnym komputerze.\n\nJeśli w phpMyAdmin napis jest poprawny, ale w PHP nie, zapisz plik w UTF-8 i ustaw w połączeniu mysqli kodowanie utf8mb4 przed pierwszym zapytaniem. Ustaw UTF-8 w nagłówku HTTP lub <meta charset="utf-8"> w HTML. Sprawdź znak na stronie po odświeżeniu. Zmiana ustawienia kodowania sama nie naprawia danych, które już zapisano z błędnymi znakami.',
    sources: [importSql, charset],
  },
];
