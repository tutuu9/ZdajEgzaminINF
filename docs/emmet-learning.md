# Emmet learning

**Pisz szybciej** explains HTML abbreviations at relevant activities in the eight cumulative INF.03 courses. It is available at every preparation level in unfinished **Nauka** projects. The **Skróty HTML** reference remains available within that lesson panel even when the current activity has no suitable shortcut. Trening, Egzamin and completed work do not show the new teaching aid; existing editor completions remain unchanged.

## Learner workflow

1. Read the current instruction and the short, optional shortcut explanation. The tip identifies the file and insertion context; it never tells learners to replace their whole project.
2. Expand **Zobacz HTML** to inspect what the abbreviation actually generates. Examples are illustrative teaching commentary, not an alternative examination paper or complete model solution.
3. Type the abbreviation at the appropriate HTML insertion point and press Tab. **Kopiuj skrót** only copies the abbreviation to the clipboard; it does not open, insert into or change a project file. Clipboard denial has a visible manual-copy fallback.
4. Edit the generated markup to satisfy the current requirement. For example, `link:css` creates `href="style.css"` and selects the first field, `style`. Change the filename to the declared requirement, such as `styl.css`; the link does not create a stylesheet. There is no multi-field Tab navigation session.
5. Run the ordinary step check. Manually written HTML is equally valid, and a correct existing fragment should be retained. Using Emmet is never a completion condition.

The seven reference topics cover starter shortcuts, child/sibling operators, text, climb-up, repetition/numbering, classes/IDs/attributes and grouping. A separate incremental explanation reads `header>h1{Tytuł}^main>p{Treść}^footer`. The starter `!` is for a new document, not for duplicating a scaffold already present in an attempt. Source: [Emmet abbreviation syntax](https://docs.emmet.io/abbreviations/syntax/), reviewed 2026-11-07.

## Implementation boundaries

The web application owns the teaching catalog and reviewed activity mappings. It uses the learner's pinned public guide; it does not import private content, answer keys or grading fixtures. A mapping mismatch or unsupported guide version results in reference-only help rather than a guessed contextual example. Required filenames come from declared HTML criteria, not inferred filenames.

Examples use the same bounded expansion helper as editor completions and are rendered as escaped code text, never executed or inserted into a preview. The editor still checks syntax context and accepts HTML in `.html`, `.htm` and HTML regions of `.php`. It declines expansions inside PHP, JavaScript, CSS, comments and attribute values. Existing token, output and repetition bounds remain enforced. One Undo restores an abbreviation; ordinary Tab indentation remains the fallback.

The aid does not write progress, predictions, checkpoints or results. No API, database, published-guide, IndexedDB or backup-format changes are required. Closing help, switching steps, reloading and importing an existing backup never replace project code. The UI uses the existing theme tokens, native disclosure controls and keyboard-accessible copy buttons.

## Verification

Unit coverage checks real editor expansions, bounded direct helper calls, Polish text, climb-up/grouping, catalog examples and reviewed mappings against all eight published guides. Browser coverage verifies stylesheet expansion and manual filename correction, ordinary step checking, Undo, reload/import, clipboard failure, read-only help, mode restrictions, keyboard interaction and mobile/light/dark layouts. Use `npm run check`, `npm run build`, and `npm run test:e2e -- tests/e2e/emmet.spec.ts tests/e2e/emmet-learning.spec.ts`; the complete Playwright suite also runs in CI before merge.

Production deployment and GitHub Release publication require separate owner instructions.
