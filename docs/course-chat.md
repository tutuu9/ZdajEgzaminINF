# Chat — course evidence

Task `INF.03-02-24.06-SG`, guide `chat-study` version 1, task version 1. This is cumulative teaching commentary alongside the CKE paper. One attempt retains its HTML, CSS, JavaScript and SQL across every action. The result is the specified browser front-end prototype, not a multi-user messaging service.

## Requirement mapping

| Paper page | Route                       | Covered requirements                                                                                                                                                                              |
| ---------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3          | structure / sidebar         | HTML5, Polish, encoding, title, CSS link, semantic header/main/aside/footer; both headings, two-item list with four nested topics, participant names and image descriptions (continued on page 4) |
| 4          | conversation                | Two initial messages with images and paragraphs, separate history window, labelled input and two buttons, footer h5                                                                               |
| 4          | appearance / messages-style | Every specified font, colour, size, border and spacing; 80/20 layout; mandatory img tag selector; shared message class; opposite image floats; permanently scrollable history                     |
| 4–5        | send-script                 | Read current input, create image and paragraph inside a new Jolanta block, append without destroying previous messages                                                                            |
| 5          | random-script / runtime     | Exact nine source phrases, random index 0–8, Krzysztof block appended last, automatic scrolling for both actions after overflow; meaningful identifiers                                           |
| 2          | database / queries          | Original import into chat with Polish encoding, full import PNG; five cumulative SQL queries and five full-screen JPEG results                                                                    |
| 3          | graphics                    | Square crop containing whole Jolanta face, real 70×70 JPEG; preserve source Krzysiek.jpg                                                                                                          |
| 7          | delivery                    | Browser record, all required outputs, exported copy check and paper-specific hand-in                                                                                                              |

The nine exact replies are copied from verified `pliki2/tekstyDoChatu.txt`, including its original casing and punctuation. The route asks the learner to inspect and copy that input resource, never inserts a finished script. The SQL instructions use `uczestnicy.logowanie_id` to find Jeremi's login identifier (3 in this seed), not a general assumption that participant and login IDs match. The account password ends in `&`; erroneous OCR punctuation was checked against the PDF.

## Provenance verified 2026-11-02

Source page: <https://www.kursinf.pl/arkusze/inf03/arkusz/16>. The paper copy has matching code/content; no third-party watermark was detected in that paper. Byte identity with CKE and redistribution rights remain unknown. Published entries link to verified sources; downloaded archives are not committed.

| Artifact   | SHA-256                                                            | Verification                                                                                    |
| ---------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Paper      | `3e9839d4a9087cbb4510624e7795692e363d03c2cf4115b8796040196feb8301` | All seven task pages; exact script, SQL and visual requirements                                 |
| pliki2.zip | `b51121f08885d56df273ca1c89007928c7b39c0f414c874793e7a675ed6292f6` | Password `ChaT_Ch@t`; original pliki2 wrapper, baza.sql, two images and reply text inspected    |
| Criteria   | `268344cbccec3c92a3dec6134951998c8a5fb58bb5218aee40d55b72228162b6` | Matching code; semantic header/footer, common message class, image selector and script criteria |

Exact archive and criteria URLs are preserved in guide resources and catalog provenance. Raw evidence remains in ignored temporary storage.

## Validation boundary

Two private fixtures implement complete text/code outputs: floats with created DOM nodes and scrollTop, and grid with cloned message articles and scrollIntoView. They use different selectors and function names. Both contain all nine source replies and append messages without deleting history. Original photos and screenshots are listed explicitly as manual assets and are not fabricated.

The fixed `chat-messages` scenario at `runtime/runtime-check` verifies source answers, repeated sends, previous-message retention and scrolling after both actions. Structural checks reject missing semantic footer, broken nested topics and wrong input type. Source-level requirements (array declaration, selector syntax, meaningful names), photo crop, SQL execution and screenshots remain explicit manual checks. A successful runtime result is partial educational evidence, never an official CKE score.
