# Testing

This repository optimizes for confidence and maintainability, not test count.

## Default decision

Testing is opt-in for each change. An implementation, fix, refactor, or verification request does not automatically justify a new test file, fixture, or test-only helper.

When testing is warranted:

- Extend the nearest existing suite when it can express the behavior clearly.
- Create a new test file only when a distinct boundary or lifecycle needs its own suite and the benefit is concrete.
- Test observable behavior and meaningful contracts, not source-code strings, private functions, internal data structures, or incidental call order.
- Prefer a direct runtime, browser, integration, or existing command check when it gives better signal with less maintenance.
- Add coverage for business-critical paths, error handling, security boundaries, data integrity, and idempotency. Skip trivial accessors and framework behavior.

## Test shape

Use the smallest test that proves the contract. Plain assertions with useful failure context are preferred over wrappers and custom assertion machinery. Tests should be isolated so one behavior has one clear failure where practical.

Mock only genuine external seams such as the network, clock, randomness, or a package-manager process. Do not mock the project's own logic to make an implementation shape easier to assert. If async work is started, the test must await an exposed completion point.

## Isolation and determinism

- Use unique temporary directories and remove them in `finally` blocks.
- Restore process-global state such as `console`, streams, environment variables, and `process.exitCode` after each test.
- Do not use wall-clock comparisons as correctness assertions.
- Do not swallow failures from external tools. A skipped or unavailable tool check belongs in an explicitly optional environment check, not in a test that claims validation succeeded.
- Keep test inputs independent of generated output from the same code path when an independent fixture can express the contract.

## Repository layout

- `test/core/` covers the detection, resolution, apply, backup, diagnostics, plugin, and inquiry behavior.
- `test/patchers/` covers JSON, YAML, and AST patching.
- `test/tasks/` covers task applicability, status, dry-run output, and selected apply behavior.
- `test/integration/` covers command execution, filesystem effects, exit codes, and machine-readable output.
- `test/ui/` covers terminal and machine-readable presentation contracts.
- `test/docs/` and colocated app tests cover the docs worker and scaffold utilities.
- `test/fixtures/` contains representative project inputs. Add a fixture only for a behavior that cannot be expressed clearly with an existing fixture or temporary project.

## Verification

Use `vp test` or `pnpm test` for the suite. Run the smallest relevant test scope while iterating, then run the affected package checks and the repository `pnpm check` when the change is complete. For user-facing command or UI behavior, include a direct runtime or browser check when it provides stronger evidence than a unit assertion. Docs artifact tests are opt-in after a completed `pnpm docs:build`: `XTARTERIZE_TEST_DOCS_ARTIFACTS=1 vp test run test/docs/artifacts.test.ts`.

Before creating a new test file, record the behavior it protects, why an existing suite is insufficient, and what failure it would distinguish. Explain that benefit and obtain explicit approval before creating the file. If the benefit is not clear, do not add the file.
