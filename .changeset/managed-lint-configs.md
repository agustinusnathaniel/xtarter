---
"xtarterize": minor
---

Lint and format configs now extend `@xtarter/config` by default. New `biome.json`, `oxlint.config.ts`, and `oxfmt.config.ts` files are a few lines long, and rule updates arrive as a dependency bump. Pass `--eject` to `init`, `sync`, or `add` to write the full rule set into the file instead. Existing configs keep their form: a config that already extends `@xtarter/config` is checked for newly detected layers (for example after adding React), and any other config is updated as before.

ESLint and Prettier are reported once as unsupported, by the run and by `doctor`. ESLint skips the linting tasks and Prettier skips the formatting tasks, so a Vite+ project with ESLint now gets Oxfmt, and a project with Prettier no longer gets Biome on top of it. Prettier is now detected from its config files and dependency.

Generated Biome configs put `useConsistentTestIt` in the `style` group, where Biome 2.6 expects it. Earlier configs had it under `nursery`, which Biome 2.6 rejects; `sync` moves it.
