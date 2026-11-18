# Atlas drzew — course evidence

Task `INF.03-11-26.06-SG` (June 2026), guide `atlas-drzew-study` version 1, task version 1. This is cumulative teaching commentary alongside the CKE paper. One attempt retains its HTML, CSS, JavaScript and SQL across every action.

## Requirement mapping

| Paper page | Route               | Covered requirements                                                                                                          |
| ---------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 3          | structure / sidebar | HTML5, Polish, encoding, title, styl.css; header, aside, nav, main, footer; h3, image block with nine images, search controls |
| 3–4        | content             | Three links (one page, two PNG files) in a ul; `p.opis` from do_strony.txt with `strong`                                      |
| 3–4        | layout / details    | Every size, colour, shadow and scroll rule; 25/55% layout; `.opis`, list items, links, side-image borders with hover, `h1`    |
| 5          | script / behaviour  | Arrays from do_strony.txt; script 1 (clear main, `h2` and `p.opis` via DOM functions); script 2 (search, message if missing)  |
| 2          | database / queries  | `atlas_drzew` import and import.png; four queries with kw1–kw4.png                                                            |
| 3          | graphics            | dab.jpg scaled proportionally to 300 px wide (about 200 px)                                                                   |
| 8          | delivery            | `przegladarka.txt`, all required outputs, exported copy check and paper-specific hand-in                                      |

Expected query results (8 conifers from Cis to Modrzew; ids 24, 95, 115; 1 23, 2 8, 3 22; nine Gdańsk trees) were compared with criteria rows R.1.3–R.1.6 and with the imported data.

Two details of this paper are easy to miss and are taught explicitly. The browser note is spelled `przegladarka.txt`, without "ę"; the course and the catalog keep that spelling, and the hand-in test accepts both spellings. The image files `dab.jpg` and `jarzebina.jpg` have no Polish letters, but the script arrays use "dąb" and "jarzębina", so images pass their array index instead of deriving the name from the file.

## Provenance verified 2026-11-18

Source page: <https://www.kursinf.pl/arkusze/inf03/arkusz/146>. Byte identity with CKE and redistribution rights remain unknown. Published entries link to verified sources; downloaded archives are not committed.

| Artifact   | SHA-256                                                            | Verification                                                                  |
| ---------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Paper      | `a6c2ac8e6951791320fe7868e83e20355054a16b95ece22fa13c9608f06ec6a3` | All eight numbered pages; illustrations 2–4 rendered and read                 |
| pliki21.7z | `d26c73d00e4a60f51b85391de7d45a7e122d86ab046feba88b008e7dd9548a20` | Password `@tSa5Drzew`; 14 files incl. SQL, do_strony.txt and image dimensions |
| Criteria   | `4659a0d65de6eda1da536b396966ca5da9f9038bcd4d4ee3bff86f10c7a59ce0` | Matching code; query results, semantic blocks, styles, DOM-only script rows   |

## Validation boundary

Two private fixtures implement complete text/code outputs: floats with inline `onclick` indices and `replaceChildren`, and a grid (widths from grid columns) with classes and `addEventListener`. Both pass every HTML and measured CSS check in a real browser. In Chromium both show the right tree for the first and last image and for searches "dąb" and "Jarzębina", print the paper's message for "akacja", and lay out header, side block, navigation, main block and footer without overlap. Targeted mistakes (`b` instead of `strong`, missing alt, wrong link, footer without `p`) are rejected.

There is no runtime adapter for this paper yet, so the scripts and the hover colour are manual checks, as are the background image, percentages and the Chiller font, which is not available everywhere. SQL execution, image scaling and screenshots remain manual. A passing subset is partial educational evidence, never an official CKE score.
