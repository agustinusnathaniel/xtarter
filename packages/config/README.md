# @xtarter/config

Opinionated Biome, Oxlint, and Oxfmt configs: [Ultracite](https://ultracite.ai/)'s presets plus the xtarter rule layer that [xtarterize](https://xtarter.sznm.dev/xtarterize/) applies. Install it, extend it, and skip the tinkering.

```json
// biome.json
{ "extends": ["@xtarter/config/biome/core", "@xtarter/config/biome/react"] }
```

```ts
// oxlint.config.ts
import { defineConfig } from 'oxlint';
import core from '@xtarter/config/oxlint/core';
import react from '@xtarter/config/oxlint/react';

export default defineConfig({ extends: [core, react] });
```

```ts
// oxfmt.config.ts
import { defineConfig } from 'oxfmt';
import xtarter from '@xtarter/config/oxfmt';

export default defineConfig({ ...xtarter });
```

Install the tools you use next to the package: `@biomejs/biome`, `oxlint`, or `oxfmt`. List `core` first, then the layers for your stack. The full list of layers, setup notes, and the versioning policy are on the [docs page](https://xtarter.sznm.dev/config/).
