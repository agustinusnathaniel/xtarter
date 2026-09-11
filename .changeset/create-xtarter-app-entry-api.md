---
'create-xtarter-app': minor
---

Clean up failed scaffolds and trim the programmatic entry point

- A failed scaffold now removes the project directory it created, so a partial download, install, or git setup no longer leaves an empty or half-written directory behind.
- `prepareProjectDir` no longer creates the directory; `scaffoldProject` owns creation and cleanup.
- Removed the `CliOptions` type export from the package entry and dropped the unused `SUPPORTED_PACKAGE_MANAGERS` catalog plus the `getInstallCommand`/`getDevCommand` helpers.
