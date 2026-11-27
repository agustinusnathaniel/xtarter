# ADR-043: Managed Lint Configs by Default

**Status:** Accepted
**Date:** 2026-11-17

## Context

ADR-042 publishes the xtarter rule layer as `@xtarter/config`. xtarterize can now either write a short config that extends that package (managed) or keep writing the whole layer into the project's own config (ejected). Projects that ran earlier versions already have ejected configs, many with local edits.

## Decision

- When xtarterize sets up Biome, Oxlint, or Oxfmt in a project with no existing config for that tool, it writes the managed form: extend the shared core layer plus the framework and router layers that detection selects, plus the project-specific settings the shared package leaves out. It installs `@xtarter/config` along with the tool.
- Ultracite stays installed directly, as ADR-020 requires, because the generated scripts call its CLI.
- An explicit command-line opt-in writes the ejected form instead, the same full config xtarterize writes today.
- After the first write, the config file is the state. A config that extends the shared package is checked as managed. Any other config is checked as ejected and patched as before. xtarterize never converts one form to the other on its own.
- A managed config passes the check when it extends every layer that detection selects. Settings the user adds on top are left alone.

## Rationale

- Import-and-done is the better default for most projects. Rule updates arrive as dependency bumps instead of config diffs.
- Reading the form from the file keeps check, dry run, and apply idempotent without a separate xtarterize settings file.
- Treating existing configs as ejected means upgrading xtarterize never rewrites a config a user has edited.

## Consequences

- New projects carry one more dependency.
- A managed project whose detected stack changes, for example by adding React, is reported as needing the new layer.
- Moving a config between forms is a manual step: remove it and run again with or without the opt-in. A later change can add a command for it if users ask.
- Projects that use Oxlint's JSON config cannot be managed (ADR-042). xtarterize keeps them ejected.

## Alternatives

- **Ejected by default with a managed opt-in.** Rejected: it keeps the current drift-prone default for the majority.
- **Migrate existing configs to managed automatically.** Rejected: it would overwrite local edits and break the rule that a second run changes nothing.
- **Store the choice in an xtarterize settings file.** Rejected: the config file already says which form it is.
