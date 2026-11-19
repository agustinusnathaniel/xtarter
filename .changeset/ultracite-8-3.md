---
"@xtarter/config": minor
---

Upgrade Ultracite to 8.3.1.

- Peer ranges rise to Biome 2.6.7 and Oxlint 1.94, which Ultracite 8.3 requires.
- New errors: Biome `core` adds `style/noExcessiveClassesPerFile` and `suspicious/noImportCycles`, `style/useImportType` now asks for separate type imports, and Markdown files are formatted. Oxlint `js-plugins` adds React Doctor rules and `sonarjs/shorthand-property-grouping`.
- Relaxed: Biome `core` turns off `useSortedKeys`, `noVoid`, `noBarrelFile`, and `noNamespaceImport`; Oxlint `core` turns off `sort-keys` and `no-negated-condition` and loosens `no-unused-vars` (underscore names and rest siblings) and `no-use-before-define` (variables).
