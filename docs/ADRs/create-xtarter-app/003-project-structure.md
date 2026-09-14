# ADR 003: Project Structure

## Status
Accepted

## Context

The CLI codebase needs an organization that separates interactive prompts, template data, and side effects, so that logic stays maintainable and testable.

## Decision

Organize the source into focused areas with explicit responsibilities:

- Interactive prompts define prompt logic only and produce no side effects.
- Utilities are pure functions, testable in isolation.
- Template definitions are static configuration.
- The CLI entry orchestrates the flow and handles errors.
- The package exposes a programmatic API alongside the CLI.

Internal imports use the `@/` path alias; relative imports are used only within the same directory. Naming stays consistent: kebab-case files, camelCase functions, PascalCase types, UPPER_SNAKE_CASE constants.

## Rationale

- Clear separation of concerns makes new prompts and templates easy to add.
- Pure utilities can be tested without the CLI runtime.
- A single orchestration point keeps error handling in one place.

## Consequences

- Every new prompt, utility, or template must fit the existing responsibility split.
- Contributors must follow the alias and naming conventions.
