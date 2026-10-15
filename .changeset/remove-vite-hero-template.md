---
"create-xtarter-app": patch
"@xtarter/create": patch
---

Remove the `vite-hero` template. Its source repository is no longer public, so scaffolding it failed to download. `--template vite-hero` and `vp create @xtarter:vite-hero` now report an unknown template; pick `vite-chakra` or `vite-tailwind` instead. The `next-tailwind` template no longer lists Playwright, which it does not include.
