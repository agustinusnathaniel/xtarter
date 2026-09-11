#!/usr/bin/env node
import { resolve } from 'node:path';
import { cancel, intro, note, outro } from '@clack/prompts';
import {
  consola,
  createInvocationGuard,
  findFirstPositionalIndex,
  pc,
} from '@xtarterize/core';
import {
  type ArgsDef,
  type CommandDef,
  defineCommand,
  runMain,
  type SubCommandsDef,
  showUsage,
} from 'citty';

import { APP_NAME, BANNER, DEFAULT_TEMPLATE, VERSION } from '@/constants';
import { promptCleanCI, promptGitInit } from '@/prompts/options';
import { promptPackageManager } from '@/prompts/package-manager';
import { previewTemplate } from '@/prompts/preview';
import { promptProjectName } from '@/prompts/project-name';
import { promptTemplate } from '@/prompts/template';
import {
  prepareProjectDir,
  resolveProjectPath,
  scaffoldProject,
} from '@/scaffold';
import type { PackageManager } from '@/types';

// ── Argument definitions ──

type ArgDef = ArgsDef[string];
type BooleanArg = Extract<ArgDef, { type?: 'boolean' }>;
type ValueArg = Extract<ArgDef, { type?: 'string' }>;
type PositionalArg = Extract<ArgDef, { type?: 'positional' }>;
type FlagOptions = Pick<
  BooleanArg,
  'alias' | 'default' | 'negativeDescription'
>;
type ValueOptions = Pick<ValueArg, 'alias'>;

function flag(description: string, options: FlagOptions = {}): BooleanArg {
  return { ...options, description, type: 'boolean' };
}

function value(description: string, options: ValueOptions = {}): ValueArg {
  return { ...options, description, type: 'string' };
}

function positional(description: string): PositionalArg {
  return { description, required: false, type: 'positional' };
}

const scaffoldArgs = {
  clean: flag('Remove CI/CD configs'),
  color: flag('Colorize output', {
    default: true,
    negativeDescription: 'Disable colorized output',
  }),
  force: flag('Overwrite existing directory', { alias: 'f' }),
  git: flag('Initialize a git repository', {
    default: true,
    negativeDescription: 'Skip git initialization',
  }),
  json: flag('Output scaffold result as JSON', { default: false }),
  name: positional('Project name (use "." for current directory)'),
  pm: value('Package manager (pnpm|npm|bun|yarn)', { alias: 'p' }),
  quiet: flag('Suppress banners, progress output, and decorative text', {
    default: false,
  }),
  ref: value('Git ref (branch/tag/commit) to download'),
  template: value('Template to use', { alias: 't' }),
  yes: flag('Use defaults (pnpm, git init, no clean)', { alias: 'y' }),
} satisfies ArgsDef;

// ── Sub-commands ──

const previewCommand = defineCommand({
  args: {
    template: positional('Template ID to preview'),
  },
  meta: {
    description: 'Preview template details',
    name: 'preview',
  },
  async run({ args }) {
    await previewTemplate(args.template as string | undefined);
  },
});

async function promptProjectDetails(
  args: Record<string, unknown>,
  useDefaults: boolean
) {
  let projectName = args.name as string | undefined;
  let projectPath: string;
  if (projectName) {
    const resolved = resolveProjectPath(projectName);
    projectName = resolved.projectName;
    projectPath = resolved.projectPath;
  } else {
    projectName = await promptProjectName();
    projectPath = resolve(process.cwd(), projectName);
  }
  const template = await promptTemplate(
    args.yes && !args.template
      ? DEFAULT_TEMPLATE
      : (args.template as string | undefined)
  );
  const packageManager = await promptPackageManager(
    (args.pm as PackageManager | undefined) ??
      (useDefaults ? 'pnpm' : undefined)
  );
  const shouldCleanCI =
    (args.clean as boolean | undefined) ??
    (useDefaults ? false : await promptCleanCI());
  const shouldInitGit =
    args.git === false ? false : useDefaults || (await promptGitInit());
  // Resolve the target last: `--force` must not delete an existing
  // directory before every explicit input has been validated.
  await prepareProjectDir(
    projectName,
    projectPath,
    args.force as boolean | undefined
  );
  return {
    packageManager,
    projectName,
    projectPath,
    shouldCleanCI,
    shouldInitGit,
    template,
  };
}

function reportScaffoldSettings(
  details: Awaited<ReturnType<typeof promptProjectDetails>>,
  quiet: boolean
) {
  if (quiet) {
    return;
  }
  note(
    [
      `Project: ${pc.cyan(details.projectName)}`,
      `Template: ${pc.cyan(details.template.name)}`,
      `Package Manager: ${pc.cyan(details.packageManager)}`,
      `Git Init: ${pc.cyan(details.shouldInitGit ? 'Yes' : 'No')}`,
      `Clean CI/CD: ${pc.cyan(details.shouldCleanCI ? 'Yes' : 'No')}`,
    ].join('\n'),
    'Scaffolding with these settings'
  );
}

async function scaffoldAndInstall(options: {
  details: Awaited<ReturnType<typeof promptProjectDetails>>;
  args: Record<string, unknown>;
  quiet: boolean;
  json: boolean;
}) {
  const { details, args, quiet, json } = options;
  const result = await scaffoldProject({
    cleanCI: details.shouldCleanCI,
    initGit: details.shouldInitGit,
    packageManager: details.packageManager,
    projectName: details.projectName,
    projectPath: details.projectPath,
    ref: args.ref as string | undefined,
    template: details.template,
  });
  if (!quiet) {
    outro(pc.green(`Successfully created ${pc.cyan(details.projectName)}!`));
  }
  const cdCommand = args.name === '.' ? undefined : `cd ${details.projectName}`;
  if (json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ciConfigsCleaned: result.ciCleaned,
          dependenciesInstalled: result.dependenciesInstalled,
          gitInitialized: result.gitInitialized,
          nextSteps: [
            ...(cdCommand ? [cdCommand] : []),
            `${result.packageManager} dev`,
          ],
          packageManager: result.packageManager,
          projectPath: result.projectPath,
          success: true as const,
          template: result.template.id,
        },
        null,
        2
      )}\n`
    );
    return;
  }
  if (quiet) {
    return;
  }
  console.log(`\n${pc.bold('Next steps:')}
${cdCommand ? `  ${pc.dim('1.')} ${pc.cyan(cdCommand)}\n` : ''}  ${pc.dim('2.')} ${pc.cyan(`${result.packageManager} dev`)}
  ${pc.dim('3.')} Open ${pc.cyan('http://localhost:3000')} (or the port shown)

${pc.bold('Template:')} ${result.template.name}
${pc.bold('Docs:')} ${pc.underline(`https://github.com/${result.template.repo}`)}
`);
}

function handleScaffoldError(error: unknown, json: boolean) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  if (json) {
    process.stderr.write(
      `${JSON.stringify({ error: message, success: false as const }, null, 2)}\n`
    );
  } else {
    cancel(`${pc.red('Error:')} ${message}`);
  }
  process.exit(1);
}

// ── Main command ──

/**
 * Whether the invocation targets the `preview` subcommand, mirroring how
 * citty locates a subcommand name before dispatch.
 */
function invocationTargetsPreview(): boolean {
  const argv = process.argv.slice(2);
  const commandIndex = findFirstPositionalIndex(argv, scaffoldArgs);
  return argv[commandIndex] === 'preview';
}

const isPreviewInvocation = invocationTargetsPreview();

const mainCommand = defineCommand({
  args: scaffoldArgs,
  meta: {
    description: 'Fast project scaffolding for modern web apps',
    name: 'create-xtarter-app',
    version: VERSION,
  },
  plugins: [
    createInvocationGuard({
      commandLabel: 'create-xtarter-app',
      requireKnownSubcommand: false,
      subcommands: { preview: async () => previewCommand },
    }),
  ],
  async run(ctx) {
    // citty runs the parent's `run` even after dispatching a subcommand;
    // bail out so a preview is not followed by the scaffold flow.
    if (isPreviewInvocation) {
      return;
    }
    const args = ctx.args as Record<string, unknown>;
    const json = Boolean(args.json);
    const quiet = Boolean(args.quiet || args.json);
    const useDefaults = args.yes === true;
    if (args.color === false) {
      process.env.NO_COLOR = '1';
    }
    if (quiet) {
      consola.level = 0;
    } else {
      console.log(BANNER);
    }
    try {
      if (!quiet) {
        intro(`${APP_NAME} - Let's create your project!`);
      }
      const details = await promptProjectDetails(args, useDefaults);
      reportScaffoldSettings(details, quiet);
      await scaffoldAndInstall({ args, details, json, quiet });
    } catch (error) {
      handleScaffoldError(error, json);
    }
  },
  // citty 0.2 rejects any unmatched first positional as an unknown command,
  // but positionals here are project names. Only expose `preview` as a
  // subcommand when the invocation actually targets it.
  subCommands: (): SubCommandsDef =>
    isPreviewInvocation ? { preview: previewCommand } : {},
});

function renderUsageWithPreview<T extends ArgsDef>(
  cmd: CommandDef<T>,
  parent?: CommandDef<T>
): Promise<void> {
  if (cmd !== mainCommand) {
    return showUsage(cmd, parent);
  }
  // Keep `preview` discoverable: the dynamic subCommands resolver above
  // hides it whenever the first positional is a project name, which would
  // otherwise drop the COMMANDS section from the rendered usage. The entry
  // command is only ever resolved at the top level, so there is no parent.
  return showUsage({
    ...mainCommand,
    subCommands: { preview: previewCommand },
  });
}

runMain(mainCommand, { showUsage: renderUsageWithPreview });
