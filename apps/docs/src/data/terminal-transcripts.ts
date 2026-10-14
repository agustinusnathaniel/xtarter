/**
 * Transcripts replayed by the landing-page terminals (HeroTerminal.astro).
 *
 * Ownership: trimmed from real CLI runs, not invented. The xtarterize
 * transcripts (`init --dry-run`, `check`, `diff`, `add`, `undo`) come from
 * runs against a copy of the test/fixtures/react-vite-tailwind fixture
 * (xtarterize v2.0.4); the
 * create-xtarter-app transcript mirrors the clack prompts and log lines in
 * apps/create-xtarter-app/src. When the CLI output changes shape, re-run the
 * commands and update the lines here.
 */
export type TerminalTone =
  | 'base'
  | 'muted'
  | 'accent'
  | 'add'
  | 'patch'
  | 'fail';

export interface TerminalSegment {
  text: string;
  tone?: TerminalTone;
}

export type TerminalLine = Array<TerminalSegment>;

export interface TerminalTranscript {
  command: string;
  id: string;
  /** Tab label; the visible name of the tab and its panel. */
  label: string;
  lines: Array<TerminalLine>;
}

const blank: TerminalLine = [{ text: '' }];

export const TERMINAL_TRANSCRIPTS: Array<TerminalTranscript> = [
  {
    command: 'pnpm create xtarter-app@latest',
    id: 'create',
    label: 'create',
    lines: [
      [
        { text: '◇  ', tone: 'accent' },
        { text: 'What is your project named?' },
      ],
      [
        { text: '│  ', tone: 'muted' },
        { text: 'my-app', tone: 'muted' },
      ],
      [
        { text: '◇  ', tone: 'accent' },
        { text: 'Which template would you like to use?' },
      ],
      [
        { text: '│  ', tone: 'muted' },
        { text: 'Vite + React + Tailwind', tone: 'muted' },
      ],
      [
        { text: '◇  ', tone: 'accent' },
        { text: 'Which package manager would you like to use?' },
      ],
      [
        { text: '│  ', tone: 'muted' },
        { text: 'pnpm', tone: 'muted' },
      ],
      blank,
      [{ text: '✔ ', tone: 'add' }, { text: 'Template downloaded to my-app' }],
      [{ text: '✔ ', tone: 'add' }, { text: 'package.json updated' }],
      [
        { text: '✔ ', tone: 'add' },
        { text: 'Dependencies installed successfully' },
      ],
      [{ text: '✔ ', tone: 'add' }, { text: 'Git repository initialized' }],
      blank,
      [{ text: 'Next steps:' }],
      [
        { text: '  1. ', tone: 'muted' },
        { text: 'cd my-app', tone: 'accent' },
        { text: '   2. ', tone: 'muted' },
        { text: 'pnpm dev', tone: 'accent' },
      ],
    ],
  },
  {
    command: 'pnpx xtarterize@latest init --dry-run',
    id: 'init',
    label: 'init --dry-run',
    lines: [
      [{ text: 'Framework: ', tone: 'muted' }, { text: 'react' }],
      [{ text: 'Bundler: ', tone: 'muted' }, { text: 'vite' }],
      [{ text: 'Package Manager: ', tone: 'muted' }, { text: 'pnpm' }],
      blank,
      [{ text: 'Conformance plan' }],
      [
        { text: ' new    ', tone: 'add' },
        { text: 'Biome (lint + format)          ' },
        { text: 'lint/biome', tone: 'muted' },
      ],
      [
        { text: ' patch  ', tone: 'patch' },
        { text: 'tsconfig - incremental: true   ' },
        { text: 'ts/incremental', tone: 'muted' },
      ],
      [
        { text: ' patch  ', tone: 'patch' },
        { text: 'vite-plugin-checker            ' },
        { text: 'vite/checker', tone: 'muted' },
      ],
      [
        { text: ' new    ', tone: 'add' },
        { text: 'Git hooks (pre-commit, …)      ' },
        { text: 'release/git-hooks', tone: 'muted' },
      ],
      [
        { text: ' new    ', tone: 'add' },
        { text: 'Knip (unused code detection)   ' },
        { text: 'quality/knip', tone: 'muted' },
      ],
      [
        { text: ' new    ', tone: 'add' },
        { text: 'VSCode settings + extensions   ' },
        { text: 'editor/vscode', tone: 'muted' },
      ],
      [
        { text: ' new    ', tone: 'add' },
        { text: 'AGENTS.md                      ' },
        { text: 'agent/agents-md', tone: 'muted' },
      ],
      [{ text: '        …and 15 more tasks', tone: 'muted' }],
      blank,
      [
        { text: 'Total: ' },
        { text: '+428', tone: 'add' },
        { text: ' ' },
        { text: '-7', tone: 'fail' },
        { text: ' across 25 files', tone: 'muted' },
      ],
    ],
  },
  {
    command: 'pnpx xtarterize@latest check',
    id: 'check',
    label: 'check',
    lines: [
      [{ text: 'Conformance audit' }],
      blank,
      [
        { text: '✗ ', tone: 'fail' },
        { text: 'Biome (lint + format)            ' },
        { text: 'new', tone: 'add' },
      ],
      [
        { text: '✔ ', tone: 'add' },
        { text: 'tsconfig - strict compiler options ' },
        { text: 'skip', tone: 'muted' },
      ],
      [
        { text: '✔ ', tone: 'add' },
        { text: 'tsconfig - path aliases          ' },
        { text: 'skip', tone: 'muted' },
      ],
      [
        { text: '~ ', tone: 'patch' },
        { text: 'tsconfig - incremental: true     ' },
        { text: 'patch', tone: 'patch' },
      ],
      [
        { text: '~ ', tone: 'patch' },
        { text: 'vite-plugin-checker              ' },
        { text: 'patch', tone: 'patch' },
      ],
      [
        { text: '✗ ', tone: 'fail' },
        { text: 'Git hooks (pre-commit, …)        ' },
        { text: 'new', tone: 'add' },
      ],
      [
        { text: '✗ ', tone: 'fail' },
        { text: 'AGENTS.md                        ' },
        { text: 'new', tone: 'add' },
      ],
      [{ text: '  …and 15 more tasks', tone: 'muted' }],
      blank,
      [{ text: '2/22 conformant' }],
    ],
  },
  {
    command: 'pnpx xtarterize@latest diff',
    id: 'diff',
    label: 'diff',
    lines: [
      [{ text: 'Files to change' }],
      [
        { text: ' create  ', tone: 'add' },
        { text: 'biome.json             ' },
        { text: '+125 -0', tone: 'muted' },
      ],
      [
        { text: ' modify  ', tone: 'patch' },
        { text: 'tsconfig.json          ' },
        { text: '+3 -1', tone: 'muted' },
      ],
      [
        { text: ' modify  ', tone: 'patch' },
        { text: 'package.json           ' },
        { text: '+21 -1', tone: 'muted' },
      ],
      [{ text: '         …and 22 more files', tone: 'muted' }],
      [
        { text: '  Total: ' },
        { text: '+428', tone: 'add' },
        { text: ' ' },
        { text: '-7', tone: 'fail' },
        { text: ' across 25 files', tone: 'muted' },
      ],
      blank,
      [{ text: '+++ b/tsconfig.json  ' }, { text: '+3 -1', tone: 'muted' }],
      [{ text: '@@ -26,1 +28,3 @@', tone: 'accent' }],
      [{ text: '      "@/*": ["./src/*"]', tone: 'muted' }],
      [{ text: '-    }', tone: 'fail' }],
      [{ text: '+    },', tone: 'add' }],
      [{ text: '+    "incremental": true,', tone: 'add' }],
      [{ text: '+    "tsBuildInfoFile": ".tsbuildinfo"', tone: 'add' }],
      [{ text: '  },', tone: 'muted' }],
    ],
  },
  {
    command: 'pnpx xtarterize@latest add ts/incremental',
    id: 'add',
    label: 'add',
    lines: [
      [{ text: ' patch  ', tone: 'patch' }, { text: 'ts/incremental' }],
      blank,
      [{ text: '◇  ', tone: 'accent' }, { text: 'Apply this change?' }],
      [
        { text: '│  ', tone: 'muted' },
        { text: 'Yes', tone: 'muted' },
      ],
      [{ text: '│', tone: 'muted' }],
      [
        { text: '◇  ', tone: 'accent' },
        { text: ' patch  ', tone: 'patch' },
        { text: 'tsconfig - incremental: true' },
      ],
      [{ text: '✔ ', tone: 'add' }, { text: 'Applied 1 tasks' }],
      blank,
      [{ text: 'Timing' }],
      [{ text: '  Detection    ', tone: 'muted' }, { text: '8ms' }],
      [{ text: '  Resolution   ', tone: 'muted' }, { text: '80ms' }],
      [{ text: '  Apply        ', tone: 'muted' }, { text: '17ms' }],
    ],
  },
  {
    command: 'pnpx xtarterize@latest undo',
    id: 'undo',
    label: 'undo',
    lines: [
      [{ text: '◇  ', tone: 'accent' }, { text: 'Manifest loaded' }],
      [
        { text: 'Last run: ', tone: 'muted' },
        { text: '2026-10-14T14:55:41.773Z' },
      ],
      [{ text: 'Files modified: ', tone: 'muted' }, { text: '1' }],
      [{ text: '  tsconfig.json' }],
      [{ text: '│', tone: 'muted' }],
      [
        { text: '◇  ', tone: 'accent' },
        { text: 'Restore 1 file(s) to their previous state?' },
      ],
      [
        { text: '│  ', tone: 'muted' },
        { text: 'Yes', tone: 'muted' },
      ],
      [{ text: '│', tone: 'muted' }],
      [{ text: '◇  ', tone: 'accent' }, { text: 'Files restored' }],
      [{ text: '✔ ', tone: 'add' }, { text: 'Restored 1/1 files' }],
    ],
  },
];
