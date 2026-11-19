# Karta produktu — course evidence

Task `INF.03-03-26.06-SG` (June 2026), guide `karta-produktu-study` version 1, task version 1. This is cumulative teaching commentary alongside the CKE paper. One attempt keeps two pages, one stylesheet, a script and the SQL file across every action.

## Requirement mapping

| Paper page | Route                         | Covered requirements                                                                                                                                        |
| ---------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4          | structure / gallery / article | HTML5, Polish, encoding, title Fotel, styl.css; header with hr; section with main image, thumbnails and the window block; article content; footer with `em` |
| 4          | shop                          | sklep.html with the "strona w trakcie budowy" text, reached from "Do strony głównej"                                                                        |
| 5          | layout / details              | Century Gothic, Beige, 140%, 50/50 section and article, button, `.obraz`, `.miniatury`, fixed hidden `.okno`, `.obrazOkno`, `.zamknij`                      |
| 5          | script / behaviour            | Thumbnail replaces the main image; the main image opens the window with its source; × closes it                                                             |
| 2          | database / queries            | `sklep` import and import.png; four queries with kw1–kw4.png, including `CREATE VIEW` and a query reading the view                                          |
| 4          | graphics                      | fotel1–3.png cut from the first column of fotele.png, cropped to the edges, transparent, not scaled                                                         |
| 7          | delivery                      | Browser record, all required outputs, exported copy check and paper-specific hand-in                                                                        |

Expected query results (700, 800, 1000; the view with idMeble 4–8; 2180, 700 and 4000; two clients left) were compared with criteria rows R.1.3–R.1.7 and with the imported data. The dump stores prices as quoted values in a `decimal` column; the comparison used numeric prices, as MySQL does.

The catalogue records the three chair images as transparent PNGs without fixed sizes (the paper forbids scaling and asks for cropping to the chair, so no size is prescribed); the "Grafika z arkusza" panel therefore checks format and transparency, and the course step points to it. The paper also asks not to rename the five classes; the criteria check their assignment to seven elements.

## Provenance verified 2026-11-19

Source page: <https://www.kursinf.pl/arkusze/inf03/arkusz/136>. Byte identity with CKE and redistribution rights remain unknown. Published entries link to verified sources; downloaded archives are not committed.

| Artifact  | SHA-256                                                            | Verification                                                                 |
| --------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Paper     | `9797b7c2bbaca314a85fbe2cba917d44ce097c1dc3ce1f323d6613edf28ca948` | All seven numbered pages; illustrations 2–4 rendered and read                |
| pliki3.7z | `eeae9c1709f42146f46750fcbbdbf67acc5e219ed12e69348b155b722487dc46` | Password `#Kart@ProduKtu`; sklep.sql, opisFotel.txt and fotele.png inspected |
| Criteria  | `296e05dcc1743a293abb2f7bfc00b73e434eac341a9c095a3c72cf7811ff21f5` | Matching code; query results, view use, class rows, window styles and script |

## Validation boundary

Two private fixtures implement both pages: flex with ids and inline handlers, and floats with classes and listeners. Both pass every HTML and measured CSS check in a real browser, including the fixed hidden window and the absolutely positioned close button. In Chromium both keep the window hidden at first, replace the main image with the third thumbnail, open the window with that image and close it with ×; the close sign sits 15 px from the top and 35 px from the right of the window. Targeted mistakes (a `div` instead of `article`, `b` instead of `strong`, a plain X instead of `&times;`, `i` instead of `em`) are rejected.

There is no runtime adapter for this paper yet, so the script and the pointer cursor are manual checks. SQL execution, cropping and screenshots remain manual. A passing subset is partial educational evidence, never an official CKE score.
