# ADR-045: Vite+ Lint and Format Settings Live in the Vite Config

**Status:** Accepted
**Date:** 2026-11-18

## Context

ADR-014 made Oxlint and Oxfmt the default lint and format stack for Vite+ projects, and the generated scripts call Vite+'s own lint, format, and check commands. Vite+ runs both tools with its own config discovery: it reads the `lint` and `fmt` blocks of the project's Vite config and ignores standalone Oxlint and Oxfmt config files. xtarterize wrote standalone files for Vite+ projects, so those projects never got the xtarter rules: formatting fell back to defaults and only the default lint rules ran.

## Decision

- In a Vite+ project with no standalone Oxlint or Oxfmt config, the Oxlint and Oxfmt tasks write their settings as the `lint` and `fmt` blocks of the Vite config, through AST patching. When there is no Vite config, they create one.
- The managed and ejected forms of ADR-043 carry over unchanged. A managed block extends or spreads `@xtarter/config`; an ejected block inlines the Ultracite presets and the xtarter layer. The form is read from the imports the block references, so a second run changes nothing.
- A managed lint block gains newly detected layers. A block that references neither form is the project's own and is reported as a conflict, as a standalone config would be.
- A Vite+ project that already has a standalone Oxlint or Oxfmt config keeps it, because the generated scripts then call Oxlint and Oxfmt directly, and those read the standalone files.

## Rationale

- The settings have to be where the tool that runs them looks. Vite+ documents the Vite config blocks as the place for its lint and format settings and recommends against standalone files.
- Keying the choice on the same signal as the generated scripts keeps the config and the commands that read it in agreement.
- Reading the form from the block keeps ADR-043's rule that the file is the state.

## Consequences

- Vite+ projects that earlier versions set up have standalone files their scripts ignore. They keep getting those files updated until the user deletes them and runs xtarterize again, which moves the settings into the Vite config.
- The Vite config now holds lint and format settings beside build settings, and its imports include the shared config entries.
- Generated binding names carry a prefix so they cannot clash with the config's own imports, such as a React plugin import.
- A Vite config whose default export is not an object literal, such as a function, cannot be patched; the task fails with a message to add the block by hand.

## Alternatives

- **Point the scripts at the standalone files with an explicit config flag.** Rejected: Vite+ expects its own config shape there, and editors and the check command would still miss the settings.
- **Move existing standalone configs into the Vite config automatically.** Rejected: it would rewrite files the user may have edited, as ADR-043 rejects for form changes.
