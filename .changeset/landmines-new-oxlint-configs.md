---
"xtarterize": minor
---

New Oxlint configs extend the landmines layer.

- When xtarterize creates an Oxlint config, standalone or as the `lint` block of a Vite+ `vite.config`, it now extends `@xtarter/config/oxlint/landmines` after the detected layers (`ultracite/oxlint/landmines` with `--eject`), repeats its `jsPlugins` at the root so Knip sees the plugin, and installs `@interfere/landmines`. The rules catch shortcuts coding agents take to get a green check: module mocks of the code under test, fixed sleeps, retries, raised timeouts, and comments narrating the diff. They also reject most comments, annotated return types, and `.spec.ts` names.
- Existing Oxlint configs are unchanged: sync never adds the layer, and a config without it still passes the check. To adopt it, extend the layer and install `@interfere/landmines`.
- Running `init` on an existing codebase with no Oxlint config yet applies the rules to its existing code. Projects that name tests `.spec.ts` (Playwright, Cypress, Angular, NestJS) should turn off `landmines-structure/test-file-names`.
- The generated `plopfile.ts` now passes Ultracite and landmines: no header comment, a named arrow function, and plop's `NodePlopAPI` type instead of `any`. An existing `plopfile.ts` from the old template is reported as a conflict until you accept the new one.
