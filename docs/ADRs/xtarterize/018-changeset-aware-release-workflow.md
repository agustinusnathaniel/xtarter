# ADR 018: Changeset-Aware Release Workflow

## Status

Accepted

## Date

2026-05-12

## Context

The release workflow task previously generated one tag-push workflow that assumed a release script. Projects using Changesets need a different flow: version pull requests and publishing with trusted publishing permissions. The task also refused to touch an existing release workflow, even when it could sync improvements such as permissions and triggers.

## Decision

Detect Changesets usage from a changeset config or the Changesets CLI dependency, then:

- Render a changeset-aware release workflow for changeset projects and keep the tag-push workflow for the rest.
- Patch an existing changeset workflow to sync permissions and triggers when it already uses the Changesets action.
- Report a conflict when a changeset project's release job does not use the Changesets action, or when a non-changeset project has no release job.
- Add changeset-specific scripts in place of the version-and-tag tooling.

## Rationale

A changeset project with a tag-push workflow is broken: it never opens version pull requests and may publish without trusted publishing. Two templates let each project get a working flow, while existing customizations can be improved incrementally instead of being flagged as conflicts.

## Alternatives Considered

- Keep one tag-push template: wrong for changeset projects.
- Always conflict on an existing release workflow: prevents useful syncing of permissions and triggers.

## Consequences

- Two templates must be maintained.
- Changeset projects get a working release flow and can be patched incrementally.
- Heavily customized changeset workflows that do not use the Changesets action still require manual resolution.
