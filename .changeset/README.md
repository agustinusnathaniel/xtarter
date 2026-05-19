# Changesets

## How it works

1. When you make changes, run `pnpm changeset` to create a changeset
2. Choose the bump type (major, minor, patch)
3. Write a description of your changes
4. Commit the changeset file
5. When merged to `main`, the release workflow will:
   - Version bump all packages together (fixed versioning)
   - Update CHANGELOG.md
   - Publish `xtarterize` CLI to npm
   - Create a GitHub release

## Internal packages

`@xtarterize/core`, `@xtarterize/patchers`, and `@xtarterize/tasks` are marked as `private: true` and won't be published to npm. They share version numbers with `xtarterize` CLI through fixed versioning.

## Independent releases

`create-xtarter-app` releases independently from the monorepo's fixed version group. It imports 4 utilities from `@xtarterize/core` (`consola`, `pc`, `abortIfCancelled`, `logWarn`) as a `devDependency`. Those symbols are bundled by `vp pack` (Rolldown/tsdown) at build time, so the published package only contains production dependencies (`@clack/prompts`, `citty`, `giget`, `tinyexec`, `tinyglobby`).
