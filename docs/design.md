# Interface and learning workspace

The primary sections are Nauka, Arkusze, Teoria and Moje prace. Legacy catalogue, practice-list and progress URLs redirect while retaining their query and hash. Every continuation link uses the shared local project restoration helper.

The interface uses a system sans-serif, local IBM Plex Mono for code, `#F5F5F7` backgrounds, `#1D1D1F` text and `#0066CC` actions. Translucency, backdrop blur and soft reflections are restricted to navigation and controls. Instructions, the PDF and editor have stable surfaces. Reduced-motion and reduced-transparency preferences, opaque fallbacks, visible keyboard focus and mobile navigation are supported.

Wide workspaces show instruction, project editor and preview. Medium screens switch the preview with labelled tabs; phones use Lekcja / Kod / Podgląd. The global navigation is hidden in a workspace so it does not compete with the current task. A step change selects a file and instruction without creating or replacing file content. Missing text files require an explicit create action; graphics require upload.

The HTML/CSS preview refreshes without executing scripts. JavaScript starts explicitly; PHP templates expose only literal HTML, extracted by the PHP parser. PHP and SQL are never executed in the browser. The separate educational runtime checks use the trusted worker.

Design guidance used the existing `frontend-design` skill and UI UX Pro Max, installed with the skill installer from [pinned commit 3a13158](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/tree/3a13158ff1f32156cbe144108de48eda2ecaed9a). Its MIT licence remains alongside the local skill installation; invocation paths were adapted for Codex. Layering follows [Apple's material guidance](https://developer.apple.com/design/human-interface-guidelines/materials); this project does not use proprietary Apple interface assets.
