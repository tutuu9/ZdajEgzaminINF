# Zdaj Egzamin INF

Polski · [English](README.md)

Polskojęzyczna pracownia do przygotowania do kwalifikacji **INF.03**, z planem rozszerzenia o INF.04. Czytaj oryginalne arkusze, rozwiązuj zadania lokalnie i ćwicz na opublikowanych przykładach pytań CKE.

Nowe próby korzystają z **3 oryginalnych arkuszy praktycznych CKE i 25 opublikowanych przykładów pytań CKE**, wspartych 12 lekcjami objaśniającymi. Dwa arkusze pochodzą z jawnie oznaczonego archiwum zewnętrznego. To nie pełny bank pytań ani oficjalny system egzaminacyjny. Wcześniejsze autorskie zadania i pytania pozostają wyłącznie dla zgodności starych prób i testów mechanizmu sprawdzania.

## Możliwości

- Trzy poziomy przygotowania oraz **Nauka**, **Trening** i praktyczny **Egzamin**.
- Edytor projektu, odizolowany podgląd HTML/CSS/JavaScript, import/eksport ZIP i lokalny zapis zakończenia pracy. Obecne arkusze CKE nie mają automatycznej oceny; zakończenie nie przyznaje punktów.
- Podgląd oryginalnych PDF z nawigacją po stronach i oddzielnymi wskazówkami do czytania. W trybie Egzamin wskazówki są ukryte do zakończenia pracy. Więcej: [oryginalne PDF i wskazówki](docs/reading-exam-pdfs.md).
- Nauka na jednym rosnącym projekcie dla trzech arkuszy: krótkie wyjaśnienie i mała zmiana rzeczywistych plików. Przejście do innego kroku nie zastępuje kodu. HTML/CSS mają kontrole z wyjaśnieniem, wybrane zachowania JavaScript sprawdza osobny wykonawca, a PHP, SQL i grafika mają jawną kontrolę ręczną. Wersja kursu, plik, kursor i projekt zapisują się lokalnie. `!` + Tab tworzy podstawowy HTML. Dawne notatniki pozostają w archiwum; przykłady i [gotowe rozwiązania](docs/solution-sources.md) są oddzielone od projektu i niedostępne przed zakończeniem Egzaminu.
- Interfejs Liquid Glass z czterema sekcjami: **Nauka**, **Arkusze**, **Teoria**, **Moje prace**. Lekcja, edytor i podgląd są obok siebie, a na mniejszych ekranach mają podpisane zakładki.
- Nauka i trening teorii na sprawdzonych fragmentach oficjalnego informatora. Źródło zawiera dostępny klucz, dlatego nie oferujemy z niego egzaminu z ukrytymi odpowiedziami ani sztucznie uzupełnionego zestawu 40 pytań.
- Postęp i szkice przechowywane w przeglądarce oraz eksport kopii zapasowej. Bez kont uczniów i automatycznej synchronizacji urządzeń.
- Panel administratora: wersje materiałów, katalog źródeł, zarządzanie sprawdzaniem i zbiorcza statystyka działania.
- Opcjonalne wyjaśnienia DeepSeek, niedostępne bez klucza i włączenia przez administratora. Początkowy budżet aplikacji wynosi **2 USD łącznie**, bez automatycznego odnowienia.

Interfejs i materiały są po polsku, dokumentacja techniczna po angielsku. Projekty pozostają w przeglądarce; jawne sprawdzenie zachowania skryptu przesyła tymczasowo kod do wykonawcy. Administrator nie otrzymuje trwałej historii prac ucznia. Szczegóły: [architektura](docs/architecture.md) i [sprawdzanie](docs/checking.md).

## Uruchomienie lokalne

Potrzebujesz Node.js **24.13 lub nowszego z linii 24.x**, npm oraz Docker Desktop z kontenerami Linux/WSL2 w Windows. Uruchamiaj polecenia w katalogu głównym repozytorium.

```powershell
npm ci
npm run setup:local
npm run db:generate
docker compose up -d postgres
npm run db:migrate
npm run db:seed
npm run sandbox:build
npm run dev
```

Aby korzystać z zachowanej infrastruktury sprawdzania, uruchom jej proces w drugim terminalu:

```powershell
npm run worker
```

Otwórz [lokalną stronę](http://127.0.0.1:5173). API działa na porcie 3001, a PostgreSQL projektu na 54329. `setup:local` tworzy prywatny `.env` z losowymi lokalnymi sekretami i nie nadpisuje istniejącej konfiguracji. Nie tworzy administratora ani nie ustawia płatnego klucza API.

Administratora utworzysz w interaktywnym terminalu:

```powershell
npm run admin:create
```

Aby uruchomić aplikację w kontenerach, wykonaj `npm ci` i `npm run setup:local`, aby przygotować `.env`, a następnie `docker compose up --build`. Compose buduje aplikację i obraz środowiska sprawdzającego, wykonuje migracje oraz dodaje materiały. Osobne `npm run sandbox:build` jest potrzebne tylko w opisanym wyżej trybie programistycznym lub przy niezależnych testach sprawdzania. Otwórz [stronę kontenerową](http://localhost:8080). Dostęp do gniazda Docker ma wyłącznie zaufany proces sprawdzający. Więcej informacji znajduje się w [instrukcji lokalnej](docs/local-development.md).

## Weryfikacja

```powershell
npm run check
npm run build
npm run test:integration
npm run test:e2e
```

Testy integracyjne wymagają PostgreSQL projektu i wygenerowanego klienta Prisma. Testy API tworzą osobną testową bazę; testy sprawdzającego wymagają obrazu sandbox. Wymagania testów przeglądarkowych opisuje [instrukcja lokalna](docs/local-development.md). Lista poleceń opisuje sposób kontroli, a nie certyfikację dowolnego środowiska.

## Źródła i ograniczenia

Każde nowe zadanie praktyczne i pytanie teoretyczne odsyła do zweryfikowanego, opublikowanego dokumentu CKE. Źródło oficjalne i kopia z archiwum są wyraźnie rozróżnione. Katalog opisuje brakujące pliki, nieustalone prawa i zakres wsparcia. Podgląd pobiera sprawdzone PDF bez przepisywania ich treści i bez trwałego zapisu kopii na serwerze. Repozytorium nie zawiera cudzych archiwów egzaminacyjnych. Zobacz [rejestr źródeł](docs/sources.md).

25 pytań to niewielki opublikowany zestaw, nie pełne pokrycie programu. Pominięto pytanie wymagające filmu. Nieścisłość typograficzna jednego przykładu CSS jest objaśniona po oddaniu, z zachowaniem oryginalnej treści i klucza CKE. Kursy są powiązane z wymaganiami PDF; przykłady i cudze rozwiązania nie są certyfikowanymi pracami. PHP/SQL i kompletność projektu wymagają własnego środowiska oraz kontroli ręcznej. Kontrole edukacyjne nie wystawiają punktów CKE.

Profil programistyczny Windows **nie stanowi potwierdzenia gotowości do publicznego uruchamiania obcego kodu**. Publiczne sprawdzanie wymaga profilu Linux/gVisor oraz oddzielnych testów izolacji i zasobów. Parametry docelowego VPS i możliwość takiego wdrożenia nie zostały jeszcze potwierdzone. Projekt nie publikuje się automatycznie na GitHub ani na hostingu.

## Struktura projektu

- `apps/web`, `apps/api`, `apps/worker`: interfejs, API NestJS i zaufany proces sprawdzający.
- `packages/shared`, `packages/content`, `packages/database`, `packages/checker`: kontrakty, treści, zapis danych i sprawdzanie.
- `fixtures/content`: alternatywne poprawne rozwiązania i celowe błędy; nie są częścią danych wysyłanych uczniowi.
- `docs`: dokumentacja [formatu treści](docs/content-format.md), [architektury](docs/architecture.md), [sprawdzania](docs/checking.md) i [rozwoju](docs/roadmap.md).

Zasady współpracy opisuje [CONTRIBUTING.md](CONTRIBUTING.md). Kod, komentarze objaśniające i autorskie dane testowe są dostępne na [licencji MIT](LICENSE); arkusze CKE oraz pozostałe materiały zewnętrzne zachowują własny status. Licencje fontów znajdują się w [informacjach o składnikach zewnętrznych](docs/third-party-notices.md).
