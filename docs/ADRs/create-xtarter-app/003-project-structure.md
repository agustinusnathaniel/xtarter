# ADR 003: Project Structure

## Status
Accepted

## Context
Organizing the CLI codebase for maintainability and scalability.

## Structure

```
create-xtarter-app/
├── src/
│   ├── cli.ts                 # Main entry point
│   ├── constants.ts           # CLI constants, banner, help text
│   ├── index.ts               # Programmatic API exports
│   ├── types.ts               # TypeScript types/interfaces
│   ├── prompts/               # Interactive prompts
│   │   ├── project-name.ts
│   │   ├── template.ts
│   │   ├── package-manager.ts
│   │   └── options.ts
│   ├── templates/
│   │   └── registry.ts        # Template definitions
│   └── utils/                 # Utility functions
│       ├── download.ts        # giget wrapper
│       ├── install.ts         # Package manager install
│       ├── git.ts             # Git initialization
│       └── modify-package.ts  # Post-scaffold modifications
├── docs/
│   └── adr/                   # Architectural Decision Records
├── dist/                      # Build output (gitignored)
└── package.json
```

## Naming Conventions
- Files: kebab-case (`modify-package.ts`)
- Functions: camelCase (`downloadTemplateFiles`)
- Types: PascalCase (`TemplateConfig`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_TEMPLATE`)

## Import Strategy
- Use `@/` alias for all internal imports
- Relative imports only within same directory
- Group imports: stdlib → external → internal

## Module Boundaries
- `prompts/` - Only prompt logic, no side effects
- `utils/` - Pure functions, testable in isolation
- `templates/` - Static configuration only
- `cli.ts` - Orchestrates flow, handles errors

## Consequences
- Clear separation of concerns
- Easy to add new prompts or templates
- Utils can be tested independently
- Programmatic API via `index.ts`
