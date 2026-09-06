---
'create-xtarter-app': minor
---

Fix the primary scaffold flow under citty 0.2: `create-xtarter-app my-app` no longer fails with "Unknown command". Unmatched positionals are project names again; the `preview` subcommand dispatches only when invoked, and it no longer falls through into the scaffold flow after printing. Help output keeps `preview` discoverable.

Flag cleanup: `--git` and `--color` are now declared booleans (default on) with `--no-git`/`--no-color` negations shown in `--help`, matching what the docs advertise. Invalid invocations (unknown command or option) exit `1` with a suggested correction instead of being silently ignored.
