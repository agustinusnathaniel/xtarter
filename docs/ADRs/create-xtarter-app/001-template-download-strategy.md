# ADR 001: Template Download Strategy

## Status
Accepted

## Context
We need a reliable way to download starter templates from GitHub repositories for scaffolding new projects.

## Options Considered

### 1. degit
- **Pros**: Simple, widely used, no dependencies
- **Cons**: Last updated 2021, relies on local git/tar commands, no offline support

### 2. Direct git clone
- **Pros**: No extra dependencies, full git history
- **Cons**: Slower, includes .git folder (needs cleanup), requires git installed

### 3. GitHub API
- **Pros**: Official, supports private repos with auth
- **Cons**: Rate limits, requires API token setup, more complex

### 4. giget
- **Pros**: Zero dependencies, fast (tarball gzip), offline cache, actively maintained, multi-provider support
- **Cons**: Newer, less battle-tested than degit

## Decision
**Use giget** for template downloads.

## Rationale
- No dependency on local git/tar commands = better cross-platform compatibility
- Faster downloads using tarball gzip
- Offline support with disk cache
- Actively maintained (degit last update: 2021)
- Supports multiple providers (GitHub, GitLab, Bitbucket, Sourcehut)
- Sparse checkout for subdirectories

## Implementation
```typescript
import { downloadTemplate } from 'giget';

await downloadTemplate('github:agustinusnathaniel/vite-react-tailwind-starter#main', {
  dir: targetPath,
  force: true,
});
```

## Consequences
- Need to monitor giget for any breaking changes
- Template repos must be public (or provide auth token)
- Smaller bundle size vs degit
