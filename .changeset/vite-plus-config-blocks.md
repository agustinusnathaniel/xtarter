---
"xtarterize": patch
---

Vite+ projects now get the xtarter lint and format rules. Vite+ reads Oxlint and Oxfmt settings only from the `lint` and `fmt` blocks of `vite.config.ts`, so the `oxlint.config.ts` and `oxfmt.config.ts` files xtarterize wrote there were ignored: `vp fmt` used its defaults and `vp lint` ran only the default rules. In a Vite+ project without a standalone Oxlint or Oxfmt config, `lint/oxlint` and `lint/oxfmt` now write those blocks into `vite.config.ts` (creating it when missing), in the managed form by default or the full rule set with `--eject`. Projects that already have standalone files keep them; delete `oxlint.config.ts` and `oxfmt.config.ts` and run `xtarterize sync` to move the settings into `vite.config.ts`.
