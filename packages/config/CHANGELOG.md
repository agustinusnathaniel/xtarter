# @xtarter/config

## 0.1.0

### Minor Changes

- [#258](https://github.com/agustinusnathaniel/xtarter/pull/258) [`33f4178`](https://github.com/agustinusnathaniel/xtarter/commit/33f41789f50a131d87363398b93297ce78a294d8) Thanks [@agustinusnathaniel](https://github.com/agustinusnathaniel)! - First release of `@xtarter/config`: the Biome, Oxlint, and Oxfmt rules xtarterize applies, as a package you extend. Each entry extends the Ultracite preset of the same name, with the xtarter layer (file and function size limits, block statements, generic arrays, kebab-case file names, single quotes, import groups, test-file conventions) on `core`. Biome entries are `@xtarter/config/biome/<preset>`, Oxlint entries are `@xtarter/config/oxlint/<preset>`, and Oxfmt is `@xtarter/config/oxfmt`.
