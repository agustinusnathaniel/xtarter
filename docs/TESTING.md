# Testing

This repository optimizes for confidence and maintainability, not test count.

## Scope

Testing is opt-in for each change. An implementation, fix, refactor, or verification request does not automatically justify a new test file, fixture, or test-only helper. Before creating a new test file, record the behavior it protects, why an existing suite is insufficient, and what failure it would distinguish; explain that benefit and obtain explicit approval. If the benefit is not clear, do not add the file.

When testing is warranted:

- Extend the nearest existing suite when it can express the behavior clearly.
- Create a new suite only when a distinct boundary or lifecycle needs one and the benefit is concrete.
- Test observable behavior and meaningful contracts, not source-code strings, private functions, internal data structures, or incidental call order.
- Prefer a direct runtime, browser, integration, or existing command check when it gives better signal with less maintenance.
- Cover business-critical paths, error handling, security boundaries, data integrity, and idempotency. Skip trivial accessors and framework behavior.

## Shape and isolation

Use the smallest test that proves the contract. Prefer plain assertions with useful failure context over custom assertion machinery. Isolate tests so one behavior has one clear failure where practical.

Mock only genuine external seams such as the network, clock, randomness, or a package-manager process. Do not mock the project's own logic to make an implementation shape easier to assert. Await any async work a test starts.

- Use unique temporary directories and remove them in `finally` blocks.
- Restore process-global state such as `console`, streams, environment variables, and `process.exitCode` after each test.
- Do not use wall-clock comparisons as correctness assertions.
- Do not swallow failures from external tools. A skipped or unavailable tool check belongs in an explicitly optional environment check, not in a test that claims validation succeeded.
- Keep test inputs independent of generated output from the same code path when an independent fixture can express the contract.

## Layout and verification

Tests mirror the workspace layout. Add a fixture only for a behavior that cannot be expressed clearly with an existing fixture or temporary project.

Use `vp test` or `pnpm test` for the suite. Run the smallest relevant scope while iterating, then the affected package checks and `pnpm check` when the change is complete. For user-facing command or UI behavior, include a direct runtime or browser check when it gives stronger evidence than a unit assertion. Docs artifact tests are opt-in via `XTARTERIZE_TEST_DOCS_ARTIFACTS=1` after a completed `pnpm docs:build`.
