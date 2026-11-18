# Salon rowerowy — course evidence

Task `INF.03-12-26.06-SG` (June 2026), guide `salon-rowerowy-study` version 1, task version 1. This is cumulative teaching commentary alongside the CKE paper. One attempt retains its HTML, CSS, JavaScript and SQL across every action.

## Requirement mapping

| Paper page | Route                             | Covered requirements                                                                                                     |
| ---------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 3–4        | structure / header-content / form | HTML5, Polish, encoding, title, styl.css; header, main, aside, two footers; five images; radios in labels, range, number |
| 4          | aside / footers                   | Aside h1 and five paragraphs with classes in one attribute; nested list in the first item; 2 × 2 table with a date cell  |
| 4          | layout / details                  | Fixed header, 80% body, 60/20% blocks, shadow, footers; round images, label boxes with hover, logo classes, ul markers   |
| 5–6        | script / behaviour                | Range → number field; `.checked` factor 0.26/0.3/0.28, ÷ 2.54, rounding and the paper's sentence; `Date` as DD.MM.RRRR   |
| 2          | database / queries                | `rowery` import and import.png; four queries with kw1–kw4.png, the last one an `UPDATE` run once                         |
| 3          | graphics                          | 1.jpg mirrored about the vertical axis and scaled proportionally to 400 px wide (about 306 px)                           |
| 8          | delivery                          | `przegladarka.txt`, all required outputs, exported copy check and paper-specific hand-in                                 |

Expected query results (9 mountain bikes from Fuse Comp 22 to Roscoe 6; 6 producers; ids 5, 7, 13, 16, 18, 29, 52; 5 updated gravel rows) were compared with criteria rows R.1.3–R.1.6 and with the imported data. For 180 cm the frame sizes are 18, 21 and 20 inches.

Like INF.03-11-26.06-SG, this paper spells the browser note `przegladarka.txt`. The fixed header gets `width: 80%` in the course because a fixed element does not inherit the body's width; the step states that this is the course's choice. The archive password `{Row3RY}` includes its braces.

## Provenance verified 2026-11-18

Source page: <https://www.kursinf.pl/arkusze/inf03/arkusz/147>. Byte identity with CKE and redistribution rights remain unknown. Published entries link to verified sources; downloaded archives are not committed.

| Artifact   | SHA-256                                                            | Verification                                                                   |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Paper      | `86570bdd94a84123b15c6d98c0712e2070ef085a5731661b732abdb9fa05707c` | All eight numbered pages; illustrations 2 and 3 rendered and read              |
| pliki22.7z | `1e0cd068ad2c459a085dc9b7b4d8cf1c8e371d6a07e846ee059457727436cbee` | Password `{Row3RY}`; rowery.sql and five JPEG photos inspected                 |
| Criteria   | `21971944ba8082f9742b5059714ae6a6d3db0068de28f65bb7cb2ff59e31f3ab` | Matching code; query results, form controls, class rules and three script rows |

## Validation boundary

Two private fixtures implement complete text/code outputs: floats with radios nested in labels and inline handlers, and flex with `for`/`id` labels, `data-factor` and listeners (range `change` event, `toLocaleDateString`). Both pass every HTML and measured CSS check in a real browser. In Chromium both copy the slider value into the number field, give 18, 21 and 20 inches for 180 cm, keep one radio selected, show today's date as DD.MM.RRRR, keep the header at the top after scrolling and lay out the blocks like illustration 3. Targeted mistakes (wrong range minimum, two class attributes, list nested outside its item, no default selection) are rejected.

There is no runtime adapter for this paper yet, so the scripts and the hover colour are manual checks, as are percentage widths. SQL execution, graphics and screenshots remain manual. A passing subset is partial educational evidence, never an official CKE score.
