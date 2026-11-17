---
"@xtarter/config": minor
---

First release of `@xtarter/config`: the Biome, Oxlint, and Oxfmt rules xtarterize applies, as a package you extend. Each entry extends the Ultracite preset of the same name, with the xtarter layer (file and function size limits, block statements, generic arrays, kebab-case file names, single quotes, import groups, test-file conventions) on `core`. Biome entries are `@xtarter/config/biome/<preset>`, Oxlint entries are `@xtarter/config/oxlint/<preset>`, and Oxfmt is `@xtarter/config/oxfmt`.
