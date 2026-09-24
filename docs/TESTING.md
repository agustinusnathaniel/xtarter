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

## Do not add

The following kinds of tests cost maintenance without adding confidence. Do not add them.

- Tautological tests are harmful. A test that restates the implementation proves nothing. Example patterns to reject: asserting a function returns exactly what its own code path constructs, asserting a mock returns the canned value it was configured to return, or asserting configuration output matches a literal copy of the expected object built from the same inputs without checking observable effect.
- Change-detector tests are harmful. A test that fails on any refactor without a behavior change locks implementation shape in place. Example patterns to reject: snapshots of generated files or CLI output that do not assert a user-visible contract, assertions on call order or internal call counts, and assertions on private function names or file layout.
- Do not add a regression test for a bug fix unless the fix closes a genuine gap in behavior testing. If an existing suite, runtime check, or integration check already covers the corrected behavior, extend its coverage instead of adding a new test. A new regression test needs the same justification as any new test file: the behavior it protects, why the existing suite cannot express it, and what failure it would distinguish.
- Do not write unit tests after implementation. A unit test written to match already-written code can only confirm the code does what it does. It cannot validate the contract and it becomes a change detector on the next refactor.

## Complex features

For a complex feature, strongly prefer end-to-end verification as the sole testing mechanism over a set of unit tests. Exercise the feature through its real entry point (CLI command, scaffolded project, or browser flow) rather than through isolated functions.

End the work with a verifiable, repeatable artifact: the exact command or script run, the fixture or temporary project used, and the expected observable outcome. Prefer a direct runtime, browser, or integration check that a reviewer can rerun over a unit assertion that only the author can interpret.

## Isolation testing order

Opt-in remains the default. Most changes need no new test file. Test-first applies only after isolation testing is already justified under Scope above.

When isolation testing is unavoidable, enumerate all plausible failure modes before writing the code: valid inputs, invalid inputs, boundary values, error paths, concurrency or ordering risks, and external-seam failures. Write the test list from that enumeration first, then implement to satisfy it. Do not implement first and add unit tests afterward to describe what was built.

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
