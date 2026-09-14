# RFC-001: TUI Mode with OpenTUI

**Status:** Draft
**Date:** 2026-05-14

## Summary

Add an optional `--tui` flag to xtarterize that launches a full-screen terminal interface built with [OpenTUI](https://opentui.com). The flag works with any subcommand and leaves the default CLI experience unchanged.

## Motivation

Linear prompts suit simple yes/no flows, but not scrollable syntax-highlighted diffs, a searchable task list for `init`, a dashboard for `doctor` and `check` results, or multi-panel setup wizards. An opt-in flag keeps the default CLI fast and minimal while unlocking a richer interface.

## Design

- The core CLI must not depend on OpenTUI. Either the TUI ships as a separate app that `--tui` shells out to, or as an internal package with OpenTUI as an optional peer dependency.
- A missing install or a failed native addon load falls back to the standard CLI with a clear message.
- `Ctrl+C` and `Escape` exit gracefully.

## Open Questions

The main prerequisite is unresolved: OpenTUI ships prebuilt native binaries, so installation is ordinary, but loading the addon from Node.js is unverified, and requiring the Bun runtime would be a significant adoption barrier. A decision also waits on a minimal prototype, an install size measurement, and choices on bindings and testing strategy.

## References

- [OpenTUI documentation](https://opentui.com/docs/getting-started)
- [OpenTUI GitHub](https://github.com/anomalyco/opentui)
