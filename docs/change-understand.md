# Change and understand

**Zmień i zrozum** helps learners connect a small edit in their own HTML/CSS to the resulting page. It is available at every preparation level in unfinished **Nauka** projects across the eight cumulative CKE INF.03 courses. Trening, Egzamin and completed attempts do not expose this teaching panel.

The panel uses the existing pinned guide's current activity and its declared HTML/CSS checks. It does not replace or republish CKE requirements, insert example code, change assessment criteria or award a score. PHP/SQL execution, JavaScript behaviour and graphics work remain outside this comparison's scope. Literal HTML in PHP templates can be compared without executing PHP.

## Learner workflow

1. Read the small conceptual explanation next to the current requirement. **Pokaż miejsce zmiany** opens the relevant own source when it can be located; uncertain locations use file-level guidance.
2. For selected concepts, optionally answer **Jak myślisz, co się zmieni?** and read the explanation. This is a learning prompt, not a completion gate or an examination question.
3. Write a change in the existing editor. **Co zmieniłem?** lists changed HTML/CSS source lines with textual addition/removal labels. Large inputs have explicit bounds; the interface does not claim a complete diff when analysis is truncated.
4. Choose **Porównaj przed i po**, then **Przed** or **Po**. Both views use the learner's files, at the same selected entry page. Comparing never writes either version into the editor.
5. If needed, choose **Przywróć punkt sprzed kroku** and confirm **Zachowaj kopię i przywróć**. The current newer project is first preserved as a separate local attempt. **Otwórz zachowaną kopię** opens that work; it is also listed in **Moje prace**.

Explanations distinguish source changes from visible browser results. A modified declaration is not automatically described as the sole cause of a visual effect: selectors, inheritance, conditional rules and other edits may affect the result. No AI request is needed.

## Checkpoints and restoration

A checkpoint captures the current project when an eligible step is first visited. Existing projects capture their current files; they are never reset to a course starter. Revisiting or reloading a retained checkpoint keeps its original files and identifier. The history is bounded to the latest eight checkpoints and 20 MiB in total; it is not unlimited version control. The current learner project is independent of this history.

If a project is too large for a checkpoint, the existing files remain editable and comparison stays unavailable. After reducing the project size, **Spróbuj zapisać punkt ponownie** captures the current files on the same step. A pending or failed IndexedDB write is not presented as a confirmed saved checkpoint.

Checkpoint state is an optional addition to `AttemptSnapshot`. It includes guide identity/version, activity identity, source files, entry/editor file and an optional prediction. Published guides and server API contracts are unchanged. Progress backups preserve this state, and earlier version-1/version-2 backups without it remain accepted.

Restoration is a single IndexedDB transaction: create the separate copy and compare-and-swap the original revision. A quota error, conflicting tab or intervening edit must not leave a half-restored project or discard newly typed code. The saved copy has its own local ID and independent temporary server ticket lifecycle. It retains the learner's guide and accumulated assistance history. Restoring does not turn old check results into fresh successful checks; changed content still needs verification.

## Preview boundary

Before and after are static HTML/CSS previews in opaque sandboxed iframes. Learner scripts, handlers and outside network requests are blocked. PHP is never evaluated. Preview preparation keeps the existing local-resource and CSP restrictions. Comparison does not provide an alternate route to server execution or relax the existing inspector's message boundary.

## Verification

Focused browser coverage exercises all eight courses, own-source edits, retained checkpoints, Przed/Po navigation during autosave, reload and backup import, predictions, explicit restoration, quota/conflicting-tab failures, oversized-checkpoint recovery, keyboard/mobile navigation, themes and unavailable modes. Unit tests cover checkpoint/restore transactions and bounded source analysis. Run the browser suite with `npm run test:e2e -- tests/e2e/change-understand.spec.ts`; prerequisites are in [local development](local-development.md).

Release publication and production deployment remain separately authorized operations.
