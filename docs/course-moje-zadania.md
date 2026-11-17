# Moje zadania — course evidence

Task `INF.03-02-25.06-SG` (June 2025), guide `moje-zadania-study` version 1, task version 1. This is cumulative teaching commentary alongside the CKE paper. One attempt retains its HTML, CSS, JavaScript and SQL across every action.

## Requirement mapping

| Paper page | Route               | Covered requirements                                                                                                                        |
| ---------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 3          | structure / content | HTML5, Polish, encoding, title Planer zadań, styl.css; aside, header, nav, main, footer; image alt, placeholder, Dodaj, six entries, footer |
| 4          | layout / list-style | Verdana, every specified size, colour and text shadow; 20/80 layout; list margins, border, markers, padding, even rows, hover, list buttons |
| 4          | script / behaviour  | Wykonane strikes only its own entry in any order; Dodaj appends the field text with a working, identically styled button; meaningful names  |
| 2          | database / queries  | pliki2.7z, notatki with Polish collation, import.png; four cumulative queries with kw1.jpg–kw4.jpg                                          |
| 3          | graphics            | obraz.jpg 480×640 scaled proportionally to 610 px height (about 458 px wide)                                                                |
| 6          | delivery            | Browser record, all required outputs, exported copy check and paper-specific hand-in                                                        |

The six entries come from verified `pliki2/zadania.txt`. Note that the database stores `Odrabianie lekcji z ` (truncated by `varchar(20)`), while the page uses the full text from `zadania.txt`. The expected query results in the course (2; four `%na%` rows; five priority-5 rows; Ewelina 5, Grześ 1, Krzysiek 4, Paula 3) were compared with criteria rows R.1.3–R.1.6 and with the imported data.

## Provenance verified 2026-11-17

Source page: <https://www.kursinf.pl/arkusze/inf03/arkusz/89>. Byte identity with CKE and redistribution rights remain unknown. Published entries link to verified sources; downloaded archives are not committed.

| Artifact  | SHA-256                                                            | Verification                                                                         |
| --------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| Paper     | `f1fa2eb78660104e0fc402672b984f771fa4e2932b7636acc754b13b82bc5e37` | All six numbered pages; exact SQL, CSS, script and hand-in requirements              |
| pliki2.7z | `c85f92f08acc6ab714b27e2fe9217421082397d2c3437f40ff8c5ca52f1b463c` | Password `#ToDoList@`; baza.sql, obraz.jpg (480×640) and zadania.txt inspected       |
| Criteria  | `3775f99b3098e7c8371c3e76b5ed2d2d23aa9546a1cad63485c471c0447aef9d` | Matching code; query results, semantic blocks, CSS and script rows; watermarked copy |

## Validation boundary

Two private fixtures implement complete text/code outputs: floats with inline `onclick` handlers and `parentElement`, and grid with a delegated click listener, classes and `<span>` labels. Both pass every HTML and measured CSS check in a real browser and were exercised in Chromium: clicking the second and fifth entries strikes only those, and a new entry receives a working, identically styled button. Targeted mistakes (footer `h4`, wrong `alt`, `value` instead of `placeholder`, a missing entry) are rejected.

There is no runtime adapter for this paper yet, so the script and the hover colour are explicit manual checks. A missing image is drawn as its alternative text, so the 610 px image height is a manual check too. SQL execution, image scaling and screenshots remain manual. A passing subset is partial educational evidence, never an official CKE score.
