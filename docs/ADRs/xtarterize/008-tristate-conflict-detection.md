# ADR-008: Tristate Conflict Detection for JSON Config Tasks

**Status:** Accepted
**Date:** 2026-04-29

## Decision

Tasks that patch JSON config files detect three states: a missing key is patched with the recommended value, a key that already matches is skipped, and a key with a different value is reported as a conflict. Conflicts are never overwritten.

## Rationale

A binary present-or-absent check caused permanent patch loops. When a user explicitly set a value that differed from the recommendation, the task kept queuing a patch, the merge kept leaving the user's value in place, and the next check queued the same patch again. Treating an explicit mismatch as a conflict ends the loop and respects user overrides.

## Alternatives Considered

- Keep the binary check: known to loop forever on explicit user values.
- Overwrite user values with recommended ones: silent data loss and destructive to intentional configuration.

## Consequences

- Explicit user choices surface as conflicts for manual resolution instead of looping silently.
- Missing keys still get populated automatically.
- Matching values skip cleanly.
