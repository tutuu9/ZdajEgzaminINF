# Salon kosmetyczny — course evidence

Task `INF.03-05-24.01-SG`, guide `salon-study` version 1, task version 1. Explanations accompany the unchanged CKE paper. They build the same attempt files cumulatively and never insert a finished solution.

## Requirement mapping

| Paper page | Route                     | Covered requirements                                                                                                                                                 |
| ---------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3          | structure / offer         | HTML5, Polish, charset, title, `styl7.css`, four section blocks plus footer, offer and nested lists, both links, main heading                                        |
| 4          | welcome / calculator-html | Personnel image, author paragraph, exact greeting, relaxation image, telephone; calculator heading, four separately labelled checkboxes, button and result paragraph |
| 4          | appearance                | Every named colour, dimension, font and spacing; two-column layout; mandatory tag selectors for h2/ul/img; image hover and home link padding                         |
| 5          | javascript / runtime      | DOM, checked state, prices 45/30/20/50, fresh sum on each click, result in a paragraph below button, meaningful names; all sixteen combinations                      |
| 2          | database / queries        | Original import into salon; import PNG; four cumulative queries; four full-screen JPEG results including query and taskbar                                           |
| 3          | graphics                  | Actual image resampling to widths 240 and 700, original proportions, JPEG export and preview                                                                         |
| 6          | delivery                  | Browser record, all required outputs, export and paper-specific hand-in                                                                                              |

The database import contains additional unrelated tables. Import the original file intact; relevant operations use `uslugi` and `kadra`. Verified seed results for queries 1 and 2 are Farbowanie 50 / Ustalenie diety 70 / Paznokcie 90, and average 36 with count 5. These are review examples, not a replacement for executing general queries.

## Provenance verified 2026-11-02

Source page: <https://www.kursinf.pl/arkusze/inf03/arkusz/30>. Paper copy: <https://edu-update.pl/wp-content/uploads/2025/10/inf_03_2024_01_05_SG_kolor.pdf>. Code and content matched; no third-party watermark detected in that paper copy. Byte identity with CKE and redistribution rights are unknown. The site publishes source links, not downloaded archives.

| Artifact      | SHA-256                                                            | Verification                                                                                        |
| ------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Paper         | `bdb5e3db8975e1faf127b8a15eaa870fede97b06a5af28479d7e807a7e98eaa5` | All six task pages and requirements                                                                 |
| materialy5.7z | `404e21a11276614bad01f5b08f2524d57aad35b2930e86cfed011b4b97471c65` | Password `Do!!@rozp@#`; `egzamin.sql`, `obraz1.jpg`, `obraz2.jpg`; schema and seed values inspected |
| Criteria      | `c2d6c715383a3e355a0f11f23e9888df54f91d1b93ddaea1c4c33f15ee3e386b` | Matching task code; source-level selectors, script and SQL results checked                          |

Exact archive and criteria links are recorded in guide resources. Downloaded source assets remain ignored local evidence.

## Validation boundary

Two independently authored private code fixtures use floats with explicit conditions and grid with numeric checkbox values plus reduce. IDs and function names are unconstrained. SQL variants are valid text examples but require actual MariaDB execution and manual review; they are not marked automatically passed.

The `salon-calculator` fixed runtime scenario at `runtime/runtime-check` checks all 16 combinations, sums 0 through 145 as appropriate and repeated recalculation without accumulated totals. Structural tests cover the routes and targeted missing nested list, wrong control type and wrong stylesheet. Images, import proof and query screenshots remain explicit manual assets, never fabricated passing fixtures. Layout, CSS selector syntax and untested paper requirements are separate manual criteria; no official score is inferred.
