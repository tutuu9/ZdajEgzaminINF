# Panele podłogowe — course evidence

Task `INF.03-02-25.01-SG` (January 2025), guide `panele-podlogowe-study` version 1, task version 1. This is cumulative teaching commentary alongside the CKE paper. One attempt keeps three HTML pages, one stylesheet, a script and the SQL file across every action.

## Requirement mapping

| Paper page | Route              | Covered requirements                                                                                                         |
| ---------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 4          | structure / home   | Shared Polish HTML5 layout on index.html: title, style.css, header image, three-link nav, main, footer h5; home content      |
| 4          | offer              | Shared layout copied to oferta.html; h1 and the 4 × 5 table with rowspan and colspan read from the rendered illustration 4   |
| 4          | calculator-page    | Shared layout copied to koszty.html; two labelled number fields, Typ panelu, three radios in one group, Oblicz, result p     |
| 5          | style              | Georgia, centred body, opposite vertical gradients, Wheat blocks, Sienna links with hover underline, collapsed table borders |
| 5          | script / behaviour | `.value` and `.checked`, area and cost from table 1 (12/14/18 zł/m²), message for empty fields, text under the button        |
| 2          | database / queries | `przewozy` import and import.png; four queries with kw1–kw4.png, the last one `ALTER TABLE … DROP COLUMN`                    |
| 3          | graphics           | montaz_paneli.png 400 × 50 with a colour picked from laminowane.png (kolor.png); three images scaled exactly to 500 × 70     |
| 7          | delivery           | Browser record, all required outputs, exported copy check and paper-specific hand-in                                         |

Expected query results (2 rows; 2019-11-06 and 2021-01-26; A. 2, G. 2, K. 1, W. 2 — or 6 rows with LEFT JOIN) were compared with criteria rows R.1.3–R.1.6 and with the imported data. The calculator example 4 × 3 m² with deska podłogowa gives 216, as in illustration 5.

The paper asks for kolor.png on page 3 but does not repeat it in the page 7 list; the course keeps it as a required output and the catalog hand-in list keeps the printed page 7 list. Treating "no panel selected" like an empty field is the course's choice, stated in the step; the paper only requires the message for empty fields.

## Provenance verified 2026-11-18

Source page: <https://www.kursinf.pl/arkusze/inf03/arkusz/4>. Byte identity with CKE and redistribution rights remain unknown. Published entries link to verified sources; downloaded archives are not committed.

| Artifact   | SHA-256                                                            | Verification                                                                        |
| ---------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Paper      | `5c52d74efe881e721b28c0d648dad08d05bb8a65a1fb1741bc7ce3831c797e6e` | All seven numbered pages; illustrations 4 and 5 rendered and read                   |
| pliki12.7z | `604e742467605a67232958672460d80da3f125b8dff66547079c4c55577c78ca` | Password `P@neLePodLoGowe!+`; baza.sql and three 480 × 300 PNG images inspected     |
| Criteria   | `3064004584a1a86f9e96da1e00eb51ba17e9e4168b1b566392d33fff680f61d3` | Matching code; query results, merged table, tag selectors, `.value`/`.checked` rows |

## Validation boundary

Two private fixtures implement all three pages: inline links with radio `value` rates and an `onclick` handler, and a list menu with `data-rate` attributes and `addEventListener`. Both pass every HTML and measured CSS check in a real browser. In Chromium both calculators give 144, 168 and 216 for 4 × 3 m², show the message for empty fields and keep one radio selected; the offer table renders 3, 2, 4, 4 and 4 cells per row. Targeted mistakes (footer `h4`, missing colspan, text field, wrong link) are rejected.

There is no runtime adapter for this paper yet, so the script, the hover underline and the table width are manual checks. SQL execution, graphics and screenshots remain manual. A passing subset is partial educational evidence, never an official CKE score.
