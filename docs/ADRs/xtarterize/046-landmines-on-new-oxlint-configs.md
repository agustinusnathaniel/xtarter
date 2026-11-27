# ADR-046: Landmines on New Oxlint Configs

**Status:** Accepted
**Date:** 2026-11-19

## Context

`@xtarter/config` publishes an opt-in `landmines` layer (ADR-042) for `@interfere/landmines`: Oxlint rules against the shortcuts coding agents take to get a green check, such as mocking the code under test, fixed sleeps, retries, raised timeouts, and comments that narrate a diff. xtarterize targets projects that coding agents work in, so these rules fit its purpose. They are also strict about more than tests: they reject most comments, annotated return types, and `.spec.ts` file names, so turning them on in an established codebase can produce many errors that have no auto-fix.

## Decision

- When xtarterize writes a new Oxlint config, it extends the detected layers followed by `landmines`, repeats the layer's `jsPlugins` at the root for Knip, and installs `@interfere/landmines`. This covers the managed and ejected forms, standalone `oxlint.config.ts`, and the `lint` block of a Vite+ `vite.config`.
- Upkeep of an existing config never adds `landmines`, and a config without it still passes the check. The layers detection selects stay the only ones xtarterize keeps up to date (ADR-043).
- Biome projects do not get it: the rules run only through Oxlint's JS plugins.
- Files xtarterize generates must pass these rules. The generated `plopfile.ts` drops its header comment and uses plop's `NodePlopAPI` type in a named arrow function.

## Rationale

- New configs get the strictest defaults, following "conformance over convenience", while projects set up earlier keep the rules they agreed to. A second run changes nothing, because the layer is part of what a new config contains, not part of what detection requires.
- Installing the plugin package only when the written config references the layer keeps dependencies tied to the file, as with `@xtarter/config` itself.

## Consequences

- A project that runs `xtarterize init` for the first time on an existing codebase, with no Oxlint config yet, gets the landmines rules on its existing code.
- Projects whose tests follow a `.spec.ts` convention (Playwright, Cypress, Angular, NestJS) need to turn off `landmines-structure/test-file-names`. xtarterize does not detect test runners, so it cannot do this for them.
- Existing projects whose `plopfile.ts` matches the old template see it reported as a conflict until they accept the new one.
- Adopting landmines in an existing config is a manual step: extend the layer and install the package.

## Alternatives

- **Add it to every Oxlint project, including existing managed configs.** Rejected: established projects would start failing lint on their next sync, with no auto-fix for most of the rules.
- **Opt in with a flag.** Rejected: new projects would not get the rules unless someone knew to ask for them.
- **Offer it as an interactive task choice (ADR-040).** Rejected: non-interactive runs apply every option, so it would be on by default anyway, with an extra prompt in interactive runs.
