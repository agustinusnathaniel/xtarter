---
"xtarterize": patch
---

`editor/vscode` now maps `.css` files to Tailwind CSS only when Tailwind is detected, instead of in every Vite project. Vite+ projects are also detected as Vite before they have a `vite.config.*`, so a second `xtarterize init` on a fresh Vite+ project no longer changes `.vscode/settings.json` or adds the Vite agent skill after the first run wrote `vite.config.ts`.
