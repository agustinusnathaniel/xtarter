import { sharedConfigPackage } from '@xtarter/config';
import { type ProjectProfile, TaskError } from '@xtarterize/core';
import { inspectConfigProperty, setConfigProperty } from '@xtarterize/patchers';

import type { TargetPolicy, TextTarget } from '@/factory/define-task.js';
import { type LintTaskOptions, newConfigForm } from '@/lint/config-form.js';
import type { VitePlusBlock } from '@/templates/oxfmt-template.js';
import { VITE_CONFIG_EXTENSIONS } from '@/vite/plugin.js';

/**
 * Vite+ runs Oxlint and Oxfmt with its own config discovery: `vp lint`,
 * `vp fmt`, and `vp check` read the `lint` and `fmt` blocks of `vite.config`
 * and ignore standalone Oxlint and Oxfmt config files (ADR-045). A project
 * that already has a standalone config keeps it, because the generated
 * scripts then call Oxlint and Oxfmt directly.
 */
export function usesVitePlusConfig(profile: ProjectProfile): boolean {
  return (
    profile.vitePlus && !(profile.existing.oxlint || profile.existing.oxfmt)
  );
}

export const VITE_CONFIG_FILE = {
  extensions: VITE_CONFIG_EXTENSIONS,
  filepath: 'vite.config',
};

const NEW_VITE_CONFIG = `import { defineConfig } from 'vite-plus';

export default defineConfig({});
`;

type BlockForm = 'absent' | 'managed' | 'ejected' | 'foreign' | 'unsupported';

export interface VitePlusBlockSpec {
  /** Import specifier prefix of an ejected block, such as `ultracite/oxfmt`. */
  ejectedMarker: string;
  id: string;
  key: 'fmt' | 'lint';
  render: (
    profile: ProjectProfile,
    form: 'managed' | 'ejected'
  ) => VitePlusBlock;
  /** Bring a managed block up to date, such as adding a detected layer. */
  upkeep?: (code: string, profile: ProjectProfile) => string | null;
}

/**
 * Which form the block is in, read from the imports it references: the shared
 * package means managed, the Ultracite marker means ejected, anything else is
 * the project's own block.
 */
export function classifyBlock(
  code: string,
  spec: Pick<VitePlusBlockSpec, 'ejectedMarker' | 'key'>
): BlockForm {
  const state = inspectConfigProperty(code, spec.key);
  if (state.kind !== 'present') {
    return state.kind;
  }
  if (
    state.importSources.some((from) =>
      from.startsWith(`${sharedConfigPackage}/`)
    )
  ) {
    return 'managed';
  }
  return state.importSources.some((from) => from.startsWith(spec.ejectedMarker))
    ? 'ejected'
    : 'foreign';
}

function writeBlock(
  code: string,
  spec: VitePlusBlockSpec,
  block: VitePlusBlock
): string {
  const patched = setConfigProperty(code, spec.key, block);
  if (patched === null) {
    throw new TaskError({
      message: `Could not add a \`${spec.key}\` block to vite.config. Add it manually.`,
      taskId: spec.id,
    });
  }
  return patched;
}

function renderVitePlusConfig(
  spec: VitePlusBlockSpec,
  options: LintTaskOptions
): TextTarget['render'] {
  return (profile, existing) => {
    const code = existing ?? NEW_VITE_CONFIG;
    switch (classifyBlock(code, spec)) {
      case 'absent':
        return writeBlock(
          code,
          spec,
          spec.render(profile, newConfigForm(options))
        );
      case 'managed':
        // An unpatchable shape keeps the block and leaves the layer to the user.
        return spec.upkeep?.(code, profile) ?? code;
      case 'ejected':
        return code;
      case 'foreign':
        // Like a standalone config that is not xtarter's, the proposal is the
        // ejected form, reported as a conflict.
        return writeBlock(code, spec, spec.render(profile, 'ejected'));
      case 'unsupported':
        throw new TaskError({
          message: `vite.config has no object export to add a \`${spec.key}\` block to. Add it manually.`,
          taskId: spec.id,
        });
    }
  };
}

function vitePlusPolicy(spec: VitePlusBlockSpec): TargetPolicy {
  return ({ before, after }) => {
    if (before === null) {
      return;
    }
    if (before === after) {
      return 'skip';
    }
    return classifyBlock(before, spec) === 'foreign' ? 'conflict' : 'patch';
  };
}

/** The `vite.config` target that writes one Vite+ tool block. */
export function createVitePlusConfigTarget(
  spec: VitePlusBlockSpec,
  options: LintTaskOptions
): TextTarget {
  return {
    ...VITE_CONFIG_FILE,
    kind: 'text',
    policy: vitePlusPolicy(spec),
    render: renderVitePlusConfig(spec, options),
  };
}
