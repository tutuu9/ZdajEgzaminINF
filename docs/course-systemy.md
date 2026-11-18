# Systemy liczbowe — course evidence

Task `INF.03-06-25.01-SG` (January 2025), guide `systemy-liczbowe-study` version 1, task version 1. This is cumulative teaching commentary alongside the CKE paper. One attempt retains its HTML, CSS, JavaScript and SQL across every action.

## Requirement mapping

| Paper page | Route                              | Covered requirements                                                                                                        |
| ---------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 3–4        | structure / header-content / table | HTML5, Polish, encoding, title, styl.css; header, three blocks, footer with `em`; animation alt, h1; 3 × 7 table with th    |
| 4          | converter / glossary               | Number input with placeholder, button, result paragraph; h2, `dl` with three terms, link on Heksadecymalny                  |
| 4          | layout / details                   | Every colour, size, padding and margin; 30/30/40% layout; tag-only selectors for table, p and dt; cell borders              |
| 5          | script / behaviour                 | Read the field, K1–K6 conversion, groups of four from the right, `(2)` in `sub`, shown under the button                     |
| 2          | database / queries                 | `szachy` import and import.png; four queries with kw1–kw4.png                                                               |
| 3          | graphics                           | 2.png mirrored about the vertical axis in 0000FF on transparency; cyfry.gif (16 frames, 750 ms) and its settings screenshot |
| 6          | delivery                           | Browser record, all required outputs, exported copy check and paper-specific hand-in                                        |

The table values were read from the rendered illustration 4. The glossary comes from verified `systemy.txt`. Expected query results (3, 4, 10 and 30 rows) were compared with criteria rows R.1.3–R.1.6 and with the imported data. Query 2 compares the title with an empty string because the criteria mark `IS NOT NULL` as wrong for this data. Query 4 depends on today's date; only the row count and the first row are fixed.

## Provenance verified 2026-11-18

Source page: <https://www.kursinf.pl/arkusze/inf03/arkusz/8>. Byte identity with CKE and redistribution rights remain unknown. Published entries link to verified sources; downloaded archives are not committed.

| Artifact     | SHA-256                                                            | Verification                                                                      |
| ------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Paper        | `55da817ce0badf21157a9e7c54feb005443768641e03d4d63e16744f1dfdcb26` | All six numbered pages; illustration 4 rendered and read                          |
| pliki14 (7z) | `2278c0477e453cca6a4d365adc70188c8ee01182e76e896f60daaee2f966f971` | Password `Cyf3rki#`; 16 images 200 × 200 px, systemy.txt and szachy.sql inspected |
| Criteria     | `32b114fa2a51cd9b9ccdcff81aabcdfd8f9ab9e8441c6ab16cd770a23d29c411` | Matching code; query results, tag selectors, `em`, number input and script rows   |

## Validation boundary

Two private fixtures implement complete text/code outputs: floats with ids and a division loop, and flex with classes, `toString(2)` and a created `sub`. Block checks find the three columns by what they contain (`:has(> table)` and so on), so any id or class name is accepted. Both fixtures pass every HTML and measured CSS check in a real browser, and in Chromium they convert 537, 15, 16, 255 and 0 exactly as illustration 5 shows. Targeted mistakes (`i` instead of `em`, `td` header row, text input, missing link) are rejected.

There is no runtime adapter for this paper yet, so the script is a manual check. A missing animation is drawn as its alternative text, so its 50 px width is checked by eye. SQL execution, graphics, the animation and screenshots remain manual. A passing subset is partial educational evidence, never an official CKE score.
