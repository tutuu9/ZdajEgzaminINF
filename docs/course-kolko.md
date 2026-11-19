# Kółko i krzyżyk — course evidence

Task `INF.03-07-26.06-SG` (June 2026), guide `kolko-krzyzyk-study` version 1, task version 1. This is cumulative teaching commentary alongside the CKE paper. One attempt retains its HTML, CSS, JavaScript and SQL across every action.

## Requirement mapping

| Paper page | Route                | Covered requirements                                                                                                              |
| ---------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 3          | structure / content  | HTML5, Polish, encoding, title Gra, styl.css; header h1, main with three sections, 3 × 3 table of nic.png, footer link and number |
| 4          | layout / board-style | Lucida Console, HoneyDew, side sections with radius, right section hidden by `visibility`, middle shadow, image, table and cells  |
| 4          | script / behaviour   | Circle starts, alternate moves on empty cells only, o.png or x.png, side sections swapped with each move                          |
| 2          | database / queries   | `gryTowarzyskie` import and import.png; four queries with kw1–kw4.png, query 3 as a nested query                                  |
| 6          | delivery             | Browser record, all required outputs, exported copy check and paper-specific hand-in                                              |

Expected query results (Państwa - miasta and Kalambury; 12.7500; the same two games by the nested query; Piotruś Pan, Pasjans, Tysiąc) were compared with criteria rows R.1.3–R.1.6 and with the imported data.

Two criteria details are taught explicitly: the right section must be hidden with `visibility: hidden` in CSS (the criteria count `display: none` as an error there), and query 3 must use a nested query (`ORDER BY … LIMIT 1` is an error and would return only one of the two longest games). The archive spells the SQL file `grytowarzyskie.sql` in lower case, while the paper writes `gryTowarzyskie.sql`. This paper has no image-editing task: the three images come ready in the archive, so the catalogue lists no `graphics` for it.

## Provenance verified 2026-11-19

Source page: <https://www.kursinf.pl/arkusze/inf03/arkusz/140>. Byte identity with CKE and redistribution rights remain unknown. Published entries link to verified sources; downloaded archives are not committed.

| Artifact  | SHA-256                                                            | Verification                                                           |
| --------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Paper     | `56aeae582c752deadcc06db27d9078ba5fe2b3b3f52edd2fff5d2cef03328d04` | All six numbered pages; illustrations 2–3 rendered and read            |
| pliki8.7z | `b710d71ceb82d610a7d666d0f84a2506e1960ee200b5cb9b694026d07b999e86` | Password `KoLko+KrzyZyk`; SQL and three 200 × 200 PNG images inspected |
| Criteria  | `69be1b87ec74b3b299001e0057bb1d3db047fe1ade3a2da1f027888acade7b8b` | Matching code; query results, `visibility`, `:active` and script rows  |

## Validation boundary

Two private fixtures implement complete text/code outputs: floats with ids, inline `onclick` and a string player, and a grid with classes, cell listeners and a boolean player. Section checks find the blocks by what they contain, so any id or class works. Both pass every HTML and measured CSS check in a real browser. In Chromium both alternate o and x on four empty cells, swap the visible side section after every move and ignore a click on an occupied cell. Targeted mistakes (a `div` instead of a section, a link without a new window, a missing cell) are rejected.

There is no runtime adapter for this paper yet, so the script and the clicked-cell colour are manual checks. SQL execution and screenshots remain manual. A passing subset is partial educational evidence, never an official CKE score.
