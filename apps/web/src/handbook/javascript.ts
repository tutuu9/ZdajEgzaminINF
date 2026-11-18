import type { HandbookBook } from './types';

export const javascriptBook: HandbookBook = {
  id: 'javascript',
  title: 'JavaScript',
  description: 'Zdarzenia, dane z formularza, zmiana strony, nowe elementy, obliczenia i data.',
  chapters: [
    {
      id: 'zdarzenia',
      title: 'Zdarzenia: kiedy skrypt się uruchamia',
      summary: 'onclick, addEventListener, input i change, load.',
      sections: [
        {
          heading: 'Funkcja i zdarzenie',
          body: `Skrypt to zwykle funkcja wywoływana przez zdarzenie. Dwa równoważne sposoby, oba uznawane przez kryteria:

- w HTML: \`<button onclick="przelicz()">\` — z nawiasami, bo to wywołanie;
- w skrypcie: \`przycisk.addEventListener("click", przelicz)\` — **bez** nawiasów, bo przekazujesz funkcję do wywołania później.

Inne zdarzenia z arkuszy: \`input\` (każdy ruch suwaka), \`change\` (po zmianie i puszczeniu), \`load\` na \`body\` (po wczytaniu strony).`,
          example: {
            kind: 'web',
            show: 'js',
            html: `<input type="range" id="suwak" min="100" max="220" value="150">
<input type="number" id="wzrost" value="150">`,
            js: `const suwak = document.getElementById("suwak");
suwak.addEventListener("input", function () {
  document.getElementById("wzrost").value = suwak.value;
});`,
          },
        },
        {
          heading: 'Znaczące nazwy',
          body: `Kryteria wymagają nazw zmiennych i funkcji po polsku lub angielsku, które mówią, do czego służą: \`dodajZadanie\`, \`wzrost\`, \`showBinary\`. Nazwy \`a\`, \`x\`, \`funkcja1\` nie spełniają tego wymagania.`,
        },
      ],
      mistakes: [
        '`addEventListener("click", przelicz())` — nawiasy wywołują funkcję od razu, przy wczytaniu strony.',
        'Skrypt w `<head>` bez `defer` szuka elementów, których jeszcze nie ma.',
        'Nazwy bez znaczenia (`a`, `f1`).',
      ],
      papers: [
        {
          taskId: 'inf03-12-26-06-sg',
          title: 'Salon rowerowy',
          note: 'Suwak przepisuje wartość do pola; data pokazywana po załadowaniu strony.',
        },
        {
          taskId: 'inf03-02-25-06-sg',
          title: 'Moje zadania',
          note: 'Przyciski Dodaj i Wykonane wywołują funkcje skryptu.',
        },
      ],
    },
    {
      id: 'formularz',
      title: 'Dane z pól formularza',
      summary: 'value to tekst, puste pole, Number i zaznaczone pole radio.',
      sections: [
        {
          heading: 'value jest zawsze tekstem',
          body: `\`document.getElementById("szerokosc").value\` zwraca tekst — także w polu \`type="number"\`. Pusty tekst \`""\` oznacza puste pole. Do obliczeń zamień tekst na liczbę: \`Number(tekst)\`. Mnożenie zamienia automatycznie, ale dodawanie (\`+\`) skleja teksty: \`"2" + "3"\` daje \`"23"\`.

Odczytuj \`value\` w chwili kliknięcia, wewnątrz funkcji — nie raz na początku skryptu, kiedy pole jest jeszcze puste.`,
        },
        {
          heading: 'Które pole radio jest zaznaczone',
          body: `\`checked\` mówi, czy pole jest zaznaczone. Przejdź po polach grupy i weź \`value\` zaznaczonego.`,
          example: {
            kind: 'web',
            show: 'js',
            html: `<label><input type="radio" name="panel" value="12" checked> laminowane</label>
<label><input type="radio" name="panel" value="18"> deska</label>
<input type="number" id="pole" value="12">
<button id="oblicz">Oblicz</button>
<p id="wynik"></p>`,
            js: `document.getElementById("oblicz").addEventListener("click", function () {
  const pole = document.getElementById("pole").value;
  let stawka = 0;
  for (const opcja of document.getElementsByName("panel")) {
    if (opcja.checked) stawka = Number(opcja.value);
  }
  const wynik = document.getElementById("wynik");
  if (pole === "") {
    wynik.textContent = "Wprowadź poprawne dane.";
  } else {
    wynik.textContent = "Koszt montażu: " + pole * stawka;
  }
});`,
          },
        },
      ],
      mistakes: [
        'Dodawanie wartości z pól bez `Number` — wynik jest sklejonym tekstem.',
        'Sprawdzanie `value` zamiast `checked`, żeby poznać zaznaczone pole radio.',
        'Odczyt pola poza funkcją, raz przy otwarciu strony.',
      ],
      papers: [
        {
          taskId: 'inf03-02-25-01-sg',
          title: 'Panele podłogowe',
          note: 'Kryteria sprawdzają użycie .value i .checked oraz komunikat dla pustego pola.',
        },
        {
          taskId: 'inf03-12-26-06-sg',
          title: 'Salon rowerowy',
          note: 'Współczynnik z zaznaczonego pola radio.',
        },
      ],
    },
    {
      id: 'zmiana-strony',
      title: 'Zmiana treści i wyglądu',
      summary: 'textContent, innerText i innerHTML, style oraz classList.',
      sections: [
        {
          heading: 'Tekst czy HTML',
          body: `- \`textContent\` / \`innerText\` — wstawia zwykły tekst; znaki \`<\` i \`>\` nie stworzą znaczników.
- \`innerHTML\` — wstawia kod HTML. Używaj go, gdy potrzebujesz znacznika (np. \`<sub>(2)</sub>\`) i treść pochodzi z Twoich obliczeń, nie wprost z pola wpisanego przez użytkownika.`,
          example: {
            kind: 'web',
            show: 'js',
            html: '<p id="wynik">Brak obliczeń</p>',
            js: 'document.getElementById("wynik").innerHTML = "10 0001 1001" + "<sub>(2)</sub>";',
          },
        },
        {
          heading: 'Styl i klasy',
          body: `\`element.style.textDecoration = "line-through"\` zmienia jedną cechę wyglądu. \`element.classList.add("opis")\` nadaje klasę, której wygląd opisuje arkusz stylów — dzięki temu nowy element wygląda jak pozostałe.

\`przycisk.parentElement\` to element, w którym leży przycisk — tak przekreślisz właśnie ten wpis listy, przy którym kliknięto.`,
          example: {
            kind: 'web',
            show: 'js',
            html: `<ul>
  <li>Gimnastyka <button>Wykonane</button></li>
  <li>Zakupy <button>Wykonane</button></li>
</ul>`,
            js: `for (const przycisk of document.querySelectorAll("li button")) {
  przycisk.addEventListener("click", function () {
    przycisk.parentElement.style.textDecoration = "line-through";
  });
}`,
          },
        },
      ],
      mistakes: [
        '`innerHTML` z tekstem wpisanym przez użytkownika — może wstawić obcy kod.',
        'Zmiana stylu wszystkich elementów zamiast tego jednego, przy którym kliknięto.',
      ],
      papers: [
        {
          taskId: 'inf03-06-25-01-sg',
          title: 'Systemy liczbowe',
          note: 'Wynik z oznaczeniem (2) w indeksie dolnym w akapicie pod przyciskiem.',
        },
        {
          taskId: 'inf03-02-25-06-sg',
          title: 'Moje zadania',
          note: 'Przekreślenie tylko wpisu powiązanego z klikniętym przyciskiem.',
        },
      ],
    },
    {
      id: 'nowe-elementy',
      title: 'Tworzenie nowych elementów',
      summary: 'createElement, appendChild i czyszczenie bloku — bez innerHTML +=.',
      sections: [
        {
          heading: 'Trzy kroki',
          body: `1. \`document.createElement("li")\` tworzy element poza stroną.
2. Ustawiasz jego tekst, klasy i atrybuty.
3. \`lista.appendChild(element)\` dokłada go na końcu bloku.

Kryteria części arkuszy wprost uznają \`innerHTML +=\` za błąd — dopisywanie tekstu HTML przebudowuje cały blok i gubi wcześniejsze zmiany. \`blok.replaceChildren()\` usuwa całą zawartość bloku przed wstawieniem nowej.`,
          example: {
            kind: 'web',
            show: 'js',
            html: `<input id="zadanie" placeholder="Dodaj zadanie...">
<button id="dodaj">Dodaj</button>
<ul id="lista"><li>Gimnastyka</li></ul>`,
            js: `document.getElementById("dodaj").addEventListener("click", function () {
  const wpis = document.createElement("li");
  wpis.textContent = document.getElementById("zadanie").value;
  document.getElementById("lista").appendChild(wpis);
});`,
          },
        },
        {
          heading: 'Nagłówek i opis z dwóch tablic',
          body: `Gdy nazwy i opisy są w dwóch tablicach pod tymi samymi indeksami, wystarczy jedna funkcja z parametrem indeksu. Wywołuje ją kliknięcie obrazu i wyszukiwarka (\`indexOf\` zwraca indeks albo -1).`,
          example: {
            kind: 'web',
            show: 'js',
            html: `<button id="buk">buk</button> <button id="lipa">lipa</button>
<main><p>Wybierz drzewo.</p></main>`,
            js: `const nazwy = ["buk", "lipa"];
const opisy = ["Duże drzewo liściaste z gładką, szarą korą.", "Drzewo o sercowatych liściach."];
function pokazDrzewo(indeks) {
  const blok = document.querySelector("main");
  blok.replaceChildren();
  const naglowek = document.createElement("h2");
  naglowek.innerText = nazwy[indeks];
  const opis = document.createElement("p");
  opis.innerText = opisy[indeks];
  opis.classList.add("opis");
  blok.appendChild(naglowek);
  blok.appendChild(opis);
}
document.getElementById("buk").onclick = () => pokazDrzewo(nazwy.indexOf("buk"));
document.getElementById("lipa").onclick = () => pokazDrzewo(1);`,
          },
        },
      ],
      mistakes: [
        '`innerHTML +=` zamiast `createElement` i `appendChild`.',
        'Nowy element bez klasy lub bez przycisku, który mają pozostałe — wygląda i działa inaczej.',
        'Nazwa wyliczana z nazwy pliku (`dab.jpg`) zamiast z tablicy („dąb”).',
      ],
      papers: [
        {
          taskId: 'inf03-11-26-06-sg',
          title: 'Atlas drzew',
          note: 'h2 i akapit z klasą opis tworzone funkcjami DOM; innerHTML += jest błędem.',
        },
        {
          taskId: 'inf03-02-25-06-sg',
          title: 'Moje zadania',
          note: 'Nowy wpis listy z działającym przyciskiem Wykonane.',
        },
        {
          taskId: 'inf03-02-24-06-sg',
          title: 'Chat',
          note: 'Nowa wiadomość dołączana na końcu historii rozmowy.',
        },
      ],
    },
    {
      id: 'obliczenia-data',
      title: 'Obliczenia, pętle i data',
      summary: 'Math, reszta z dzielenia, pętle, tablice, napisy i obiekt Date.',
      sections: [
        {
          heading: 'Zaokrąglanie i reszta',
          body: `- \`Math.round(x)\` — do najbliższej liczby całkowitej, \`Math.floor(x)\` — w dół;
- \`%\` — reszta z dzielenia: \`537 % 2\` to \`1\`;
- \`Math.floor(Math.random() * tablica.length)\` — losowy indeks od 0 do ostatniego.`,
          example: {
            kind: 'web',
            show: 'js',
            html: '<p id="wynik"></p>',
            js: `let liczba = 537;
let binarna = "";
do {
  binarna = (liczba % 2) + binarna;
  liczba = Math.floor(liczba / 2);
} while (liczba > 0);
const rama = Math.round((180 * 0.26) / 2.54);
document.getElementById("wynik").textContent =
  "537 dwójkowo: " + binarna + "; rama dla 180 cm: " + rama + " cali";`,
          },
        },
        {
          heading: 'Dzisiejsza data',
          body: `\`new Date()\` tworzy obiekt z bieżącą datą. \`getMonth()\` liczy miesiące **od zera**, więc dodaj 1. \`String(liczba).padStart(2, "0")\` dopisuje zero z przodu, żeby 5 dało „05”.`,
          example: {
            kind: 'web',
            show: 'js',
            html: '<p>Aktualna data: <span id="data"></span></p>',
            js: `const dzisiaj = new Date();
const dzien = String(dzisiaj.getDate()).padStart(2, "0");
const miesiac = String(dzisiaj.getMonth() + 1).padStart(2, "0");
document.getElementById("data").textContent = dzien + "." + miesiac + "." + dzisiaj.getFullYear();`,
          },
        },
      ],
      mistakes: [
        '`getMonth()` bez `+ 1` — data przesunięta o miesiąc.',
        '`Math.random() * 9` bez `Math.floor` — indeks nie jest liczbą całkowitą.',
        'Pętla `while` zamiast `do…while` przy zamianie liczby 0 — wynik pusty.',
      ],
      papers: [
        {
          taskId: 'inf03-06-25-01-sg',
          title: 'Systemy liczbowe',
          note: 'Zamiana na system dwójkowy algorytmem K1–K6 i grupy po cztery cyfry.',
        },
        {
          taskId: 'inf03-12-26-06-sg',
          title: 'Salon rowerowy',
          note: 'Rozmiar ramy zaokrąglony do liczby całkowitej; data DD.MM.RRRR.',
        },
        {
          taskId: 'inf03-02-24-06-sg',
          title: 'Chat',
          note: 'Losowanie jednej z dziewięciu odpowiedzi.',
        },
      ],
    },
  ],
};
