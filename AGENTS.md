# Agent Workflow

> This is the mandatory entry point for any AI agent working on `xtarterize`. Read this entire file before planning or writing any code.

`xtarterize` is a CLI tool that scans JavaScript/TypeScript projects and applies production-grade conformance configurations (linting, type checking, CI, editor settings, etc.) via a task-based engine. It is a **pnpm monorepo** with Turborepo orchestration.

---

## Values

- **Idempotency is the contract.** Running `check`, `dryRun`, or `apply` twice must produce the same result. If a change breaks idempotency, it is incorrect.
- **Conformance over convenience.** Generated configs must be strict. Never ship a looser default because it's easier.
- **Composition over coupling.** No task assumes another has run. Entangled tasks are split, not orchestrated.
- **Prefer the ecosystem.** Only invent when existing tools can't express the constraint.

---

## Non-Obvious Architecture

- The Task interface is the universal pattern: `applicable()` → `check()` → `dryRun()` → `apply()`. Anything that doesn't fit needs scrutiny.
- JSON/YAML modifications go through `packages/patchers/`. Direct string writes to config files are almost always wrong.
- Package boundaries exist because crossing them created maintenance problems. Core has zero patcher or task deps. `docs` imports from published packages only. `create-xtarter-app` is intentionally isolated.
- ADRs record every significant architecture decision. Read the relevant one before touching architecture.

---

## Workflow

1. **Understand the Project**
   - `git pull`; check recent commits with `git log --oneline -20`
   - Determine which package(s) are affected: core, patchers, tasks, xtarterize, create-xtarter-app, xtarter-create, or docs (`pnpm-workspace.yaml` defines `packages/*` and `apps/*`)

2. **Understand the Problem**
   - Map the problem to existing abstractions (Task interface, patchers, detection engine) before inventing new ones

3. **Read the ADRs**
   - Read relevant ADRs in `docs/ADRs/` before implementing
   - Create a new ADR (Status, Date, Context, Decision, Rationale, Alternatives, Consequences) if your change introduces new architecture or dependencies

4. **Reuse Before Reinventing**
   - Check `packages/core/src/`, `packages/patchers/src/`, `packages/tasks/src/` before writing new helpers
   - Only introduce a new dependency when no existing abstraction fits

5. **Implementation & Testing**
    - Run `vp test`, `pnpm typecheck`, `pnpm build`, `pnpm ultracite:check`, `pnpm check`
   - Ensure idempotency - running the same operation twice produces the same result
   - Tasks must follow the interface: `applicable`, `check`, `dryRun`, `apply`
   - Add tests in `test/tasks/`, `test/patchers/`, or `test/core/` for new behavior

6. **Dependency Updates**
   - Run `npx taze minor --write -r` for safe updates; `pnpm install && pnpm dedupe` afterward
   - If a dep update fails verification, revert that package - don't fix the breakage inline

7. **Committing**
   - Create a changeset if user-facing: `pnpm changeset`
   - Bump rules: minor for `feat`, patch for everything else, major for breaking
   - Commit with Conventional Commits (feat, fix, refactor, chore, docs, test, style)
   - Split unrelated concerns into separate commits

8. **Documentation**
   - Add or update ADRs in the appropriate `docs/ADRs/` subdirectory
   - Update Starlight docs in `apps/docs/src/content/docs/` if behavior or features change
   - Preview with `pnpm docs:dev`; ensure `pnpm docs:build` passes

---

## Quick Reference

| Concern                | Location                        |
| ---------------------- | ------------------------------- |
| Task interface         | `packages/core/src/_base.ts`    |
| Core utilities         | `packages/core/src/`            |
| Patching engine        | `packages/patchers/src/`        |
| Task implementations   | `packages/tasks/src/`           |
| CLI commands           | `apps/xtarterize/src/commands/` |
| Scaffolding CLI        | `apps/create-xtarter-app/src/`  |
| vp create integration  | `apps/xtarter-create/`          |
| Documentation site     | `apps/docs/`                    |
| Publishable docs       | `apps/docs/src/content/docs/`   |
| Architecture decisions | `docs/ADRs/`                    |
| Tests                  | `test/`                         |


# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `pnpm dlx ultracite fix`
- **Check for issues**: `pnpm dlx ultracite check`
- **Diagnose setup**: `pnpm dlx ultracite doctor`

Biome (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**
- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**
- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**
- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Biome Can't Help

Biome's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Biome can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Biome. Run `pnpm dlx ultracite fix` before committing to ensure compliance.
