# @xtarter/config

## 0.2.0

### Minor Changes

- [#262](https://github.com/agustinusnathaniel/xtarter/pull/262) [`901e41d`](https://github.com/agustinusnathaniel/xtarter/commit/901e41df09225a9a1372dae7909ac038060fb9f4) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Add the opt-in `@xtarter/config/oxlint/landmines` layer.
  
  - `landmines` extends Ultracite's preset for [@interfere/landmines](https://github.com/interfere-inc/landmines): no module mocks or stubbed dependencies in tests, no fixed sleeps, unsignaled polls, retries, or raised timeouts, no narrating comments, no annotated return types, `.test.ts` files beside their subject, and explicit package entrypoints instead of wildcard source exports. Install `@interfere/landmines` 0.1.1 or newer.
  - Layers that load JS plugins (`anti-slop`, `gdp`, `js-plugins`, `landmines`, `shadcn`) now export their `jsPlugins`, so a config can repeat them at its root for Knip.

- [#262](https://github.com/agustinusnathaniel/xtarter/pull/262) [`901e41d`](https://github.com/agustinusnathaniel/xtarter/commit/901e41df09225a9a1372dae7909ac038060fb9f4) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - Upgrade Ultracite to 8.3.1.
  
  - Peer ranges rise to Biome 2.6.7 and Oxlint 1.94, which Ultracite 8.3 requires.
  - New errors: Biome `core` adds `style/noExcessiveClassesPerFile` and `suspicious/noImportCycles`, `style/useImportType` now asks for separate type imports, and Markdown files are formatted. Oxlint `js-plugins` adds React Doctor rules and `sonarjs/shorthand-property-grouping`.
  - Relaxed: Biome `core` turns off `useSortedKeys`, `noVoid`, `noBarrelFile`, and `noNamespaceImport`; Oxlint `core` turns off `sort-keys` and `no-negated-condition` and loosens `no-unused-vars` (underscore names and rest siblings) and `no-use-before-define` (variables).

## 0.1.0

### Minor Changes

- [#258](https://github.com/agustinusnathaniel/xtarter/pull/258) [`33f4178`](https://github.com/agustinusnathaniel/xtarter/commit/33f41789f50a131d87363398b93297ce78a294d8) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - First release of `@xtarter/config`: the Biome, Oxlint, and Oxfmt rules xtarterize applies, as a package you extend. Each entry extends the Ultracite preset of the same name, with the xtarter layer (file and function size limits, block statements, generic arrays, kebab-case file names, single quotes, import groups, test-file conventions) on `core`. Biome entries are `@xtarter/config/biome/<preset>`, Oxlint entries are `@xtarter/config/oxlint/<preset>`, and Oxfmt is `@xtarter/config/oxfmt`.
