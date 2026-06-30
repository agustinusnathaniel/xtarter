# @xtarterize/agent-catalog

> Prototype - standalone agent skill catalog extracted from `@xtarterize/tasks`.

Zero-dependency package that defines which agent skills are available,
grouped by project stack (framework, bundler, dependencies).

## Exports

```ts
import {
  SKILL_CATALOG, // raw SkillDefinition[]
  getSkillsToInstall, // filter catalog by profile + deps
  hasDep, // helper: check single dep
  hasAnyDep, // helper: check any of multiple deps
} from "@xtarterize/agent-catalog";

import type {
  SkillDefinition, // { source, skill, condition }
  SkillEntry, // { source, skill }
  SkillProfile, // minimal project profile for conditions
} from "@xtarterize/agent-catalog";
```

## Usage

```ts
const skills = getSkillsToInstall(profile, deps);
// => [{ source: 'antfu/skills', skill: 'vite' }, ...]
```

The `SkillProfile` type is a subset of `@xtarterize/core`'s `ProjectProfile`

- structurally compatible, no import needed.
