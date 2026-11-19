---
"@xtarter/config": minor
---

Add the opt-in `@xtarter/config/oxlint/landmines` layer.

- `landmines` extends Ultracite's preset for [@interfere/landmines](https://github.com/interfere-inc/landmines): no module mocks or stubbed dependencies in tests, no fixed sleeps, unsignaled polls, retries, or raised timeouts, no narrating comments, no annotated return types, `.test.ts` files beside their subject, and explicit package entrypoints instead of wildcard source exports. Install `@interfere/landmines` 0.1.1 or newer.
- Layers that load JS plugins (`anti-slop`, `gdp`, `js-plugins`, `landmines`, `shadcn`) now export their `jsPlugins`, so a config can repeat them at its root for Knip.
