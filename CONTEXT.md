# xtarterize

xtarterize scans JavaScript and TypeScript projects and applies a strict, idempotent conformance baseline (linting, type checking, CI, editor settings) through a task engine.

## Language

**PackageJson owner**:
The single tasks module that writes `package.json` for xtarterize. Authored changes go through it, and it reads fresh rather than from a cache.
_Avoid_: manifest, store.

**PackageJson change**:
A JSON merge patch to `package.json`, expressed by a task and applied by the PackageJson owner against the current file text.
_Avoid_: snapshot, whole-object write.

**Apply plan**:
The resolved, side-effect-free set of task outcomes (status, diffs, dependencies, timing) produced by `planTasks` and executed by `executePlan`.
_Avoid_: dry-run list, snapshot.

**Task spec**:
The declarative description a task is defined by: applicability, targets and actions, and dependencies, resolved once into a status and diffs.
_Avoid_: factory options, config.

**Target**:
A file a task contributes to, declared in a Task spec together with the writer kind that renders it.
_Avoid_: output, destination.

**Action**:
A task effect that is not file content, declared in a Task spec and reported without a file diff.
_Avoid_: command, hook.

**Detection registry**:
The single module that declares what detection reads (files, directories, lockfiles, markers) and which detectors consume it; the fingerprint, diagnostics, cache validation, and the `existing` profile keys derive from it.
_Avoid_: detector list, input list.
