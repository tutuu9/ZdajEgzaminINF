# Inspecting a learner's page

The page inspector connects static preview elements to the learner's own HTML and CSS. It is available in the study workspace of an open **Nauka** project with a cumulative guide, at every assistance level. It does not grade a submission or alter project files. Existing guide versions and backup formats are unchanged.

## Source mapping

`parse5` indexes opening tags before preview resource rewriting. Offsets use LF-normalized UTF-16 text, matching CodeMirror. PHP is never evaluated. Literal template segments retain their original offsets; a location crossing a removed PHP fragment opens its file with an explanation rather than selecting an invented range. Browser-generated elements also have a file-only fallback.

The CSS index uses the installed CodeMirror parser, covering local stylesheets, style blocks and inline declarations. Inline attributes select the original whole attribute, avoiding incorrect offsets after HTML entity decoding. Rules are source candidates, not cascade winners. The inspector displays matching declarations separately from resolved browser values, and distinguishes ancestor rules and conditional rules. External resources and imports remain blocked. Unsupported CSS constructs are identified rather than interpreted as successful analysis.

## Preview boundary

Inspection recreates a static preview with learner scripts and event handlers removed. Only the fixed inspection bridge runs. Running learner JavaScript exits inspection. The visible iframe retains its opaque origin, sandbox and restrictive CSP. The hidden CSS grading frame remains script-free and receives no inspector instrumentation.

Each preview generation has new element IDs and a random generation identifier. The parent validates the current iframe window, opaque origin, message shape, generation, known element/rule IDs and bounded measurements. Files and source ranges come exclusively from the parent-owned index. Messages cannot edit a project or supply arbitrary editor positions. Editing files or changing the step, entry page, project or mode invalidates the previous map.

Overlays are rendered outside the iframe so they cannot change learner layout or selectors. Updates after scroll, resize and image loading do not move editor focus. Hidden mobile previews retain their last visible measurements. Complex geometry receives a numeric explanation instead of falsely precise coloured regions.

## Verification

Unit tests cover source offsets, CSS indexing and message validation. The page-inspector browser suite covers all eight course routes, HTML-to-CSS navigation, edit persistence, mobile and keyboard interaction, theme support, Undo, inline/conditional styles, box geometry, script isolation, backup import and unavailable modes. Run it with `npm run test:e2e -- tests/e2e/page-inspector.spec.ts`; the prerequisites are in [local development](local-development.md).

CI also runs the complete existing browser and integration suites. Public deployment is a separate owner-authorized operation.
