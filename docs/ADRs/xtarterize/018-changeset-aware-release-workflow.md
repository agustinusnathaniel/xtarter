# ADR 018: Changeset-Aware Release Workflow

## Status

Accepted

## Date

2026-05-12

## Context

The `ci/release` task generates a `.github/workflows/release.yml` file. Previously it only produced a simple tag-push workflow (`on: push: tags: - 'v*'`) that assumed a `release` script exists. This approach had two problems:

1. **Changeset projects got the wrong workflow**: Projects using `@changesets/cli` need a fundamentally different release workflow - triggered by pushes to `main` on changeset-related paths, using `changesets/action@v1` to create version PRs and publish, with OIDC permissions for trusted publishing.

2. **No graceful coexistence**: If a project already has a custom release workflow (especially changeset-based), xtarterize would flag it as `conflict` and refuse to touch it, even when it could provide value by syncing best-practices (permissions, concurrency, triggers).

## Decision

We make the release workflow task **changeset-aware** with two distinct templates and smart detection:

### 1. Detection

A new `changeset` boolean field is added to `ProjectProfile.existing`. It detects changeset usage via two signals:

- Presence of `.changeset/config.json`
- `@changesets/cli` in `dependencies` or `devDependencies`

### 2. Two Templates

**Tag-push workflow** (for non-changeset projects):

```yaml
on:
  push:
    tags:
      - "v*"
jobs:
  release:
    steps:
      - checkout → setup → install → lint → typecheck → test → release
```

**Changeset workflow** (for changeset projects):

```yaml
on:
  push:
    branches: [main]
    paths: [.changeset/**, CHANGELOG.md, package.json, release.yml]
  pull_request: [opened, synchronize]
  workflow_dispatch: [version bump type]
concurrency: group=${{ github.workflow }}-${{ github.ref }}
permissions:
  [contents: write, packages: write, id-token: write, pull-requests: write]
jobs:
  release:
    steps:
      - checkout (fetch-depth: 0) → setup → install → build
      - changesets/action@v1 (version + publish)
```

### 3. Smart Check Logic

| Scenario                                               | Status                              |
| ------------------------------------------------------ | ----------------------------------- |
| No existing workflow                                   | `new` - render appropriate template |
| Existing matches template exactly                      | `skip`                              |
| Changeset project with `changesets/action` in workflow | `patch` - sync permissions/triggers |
| Changeset project with non-changeset release job       | `conflict` - manual intervention    |
| Non-changeset project with release job                 | `patch` - can update                |
| Non-changeset project without release job              | `conflict` - unexpected             |

### 4. Package Scripts Awareness

When `packageScriptsTask` detects a changeset project, it adds changeset-specific scripts instead of `commit-and-tag-version`:

- `changeset` → `changeset`
- `version-packages` → `changeset version`
- `release` → `changeset publish`

## Consequences

### Positive

- ✅ Changeset projects get a proper release workflow with OIDC, concurrency, and `workflow_dispatch`
- ✅ Non-changeset projects continue to get the simple tag-push workflow
- ✅ Existing changeset workflows can be incrementally updated (patch)
- ✅ Package scripts are consistent with the workflow template
- ✅ Minimal new code - reuses existing `createFileTask`, `YamlStep`, and `renderSteps` infrastructure

### Negative

- ⚠️ Two workflow templates to maintain
- ⚠️ The `renderReleaseWorkflow` function signature changed from `(profile)` to `(profile, existing)` - all callers updated
- ⚠️ Projects with highly customized changeset workflows that don't use `changesets/action@v1` will flag as conflict

### Future enhancements

- Support additional release tools (semantic-release, release-it) with their own templates
- Make the changeset workflow template configurable (custom version/publish script names)
- Allow partial sync of specific sections (e.g., only update permissions without changing steps)
