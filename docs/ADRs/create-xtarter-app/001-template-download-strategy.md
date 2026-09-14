# ADR 001: Template Download Strategy

## Status
Accepted

## Context

The CLI needs a reliable way to download starter templates from GitHub repositories when scaffolding new projects, without assuming a local toolchain.

## Decision

Use giget for template downloads.

## Rationale

- No dependency on local git or tar commands, so downloads work across platforms.
- Fast, tarball-based downloads with an offline disk cache.
- Actively maintained and provider-agnostic (GitHub, GitLab, Bitbucket, Sourcehut).
- Supports sparse checkout for subdirectories.

## Alternatives Considered

- **degit:** simple and widely used, but unmaintained since 2021 and dependent on local git/tar commands.
- **Direct git clone:** slower, includes a `.git` folder that must be cleaned up, and requires git.
- **GitHub API:** official and supports private repositories, but has rate limits and needs token setup.

## Consequences

- giget must be monitored for breaking changes, since it is newer and less battle-tested than degit.
- Template repositories must be public unless an auth token is provided.
