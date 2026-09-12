import fs from 'node:fs/promises';
import path from 'node:path';

import { withTempDir } from './temp.js';

/** Layout options for the minimal React + TypeScript skills fixture. */
export interface SkillsProjectOptions {
  /** Create these `.agents/skills/<name>` directories without a `SKILL.md`. */
  emptySkillDirs?: ReadonlyArray<string>;
  /** Lockfile basename to write so package-manager detection is deterministic. */
  lockfile?: string;
  /** Create these `.agents/skills/<name>/SKILL.md` files. */
  skillDirs?: ReadonlyArray<string>;
  /** Write a Yarn Berry `.yarnrc.yml` marker. */
  yarnrc?: boolean;
}

/**
 * Run `fn` against a fresh minimal React + TypeScript project.
 *
 * Behavior protected: the skills-install suites hand-built the same
 * package.json/tsconfig/lockfile layout at every site and two sites never
 * removed the directory. This factory owns that layout and delegates cleanup
 * to `withTempDir`, so package-manager detection and already-installed skill
 * state are deterministic per test. No existing helper writes project files.
 */
export async function withSkillsProject<Result>(
  options: SkillsProjectOptions,
  fn: (dir: string) => Promise<Result>
): Promise<Result> {
  return withTempDir('xtarterize-skills-', async (dir) => {
    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify(
        {
          dependencies: { react: '^19.0.0' },
          devDependencies: {
            typescript: '^5.8.0',
            vite: '^7.0.0',
          },
          name: 'skills-fixture',
          private: true,
          type: 'module',
        },
        null,
        2
      )
    );
    await fs.writeFile(
      path.join(dir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'ES2022' } }, null, 2)
    );
    if (options.lockfile) {
      await fs.writeFile(path.join(dir, options.lockfile), '');
    }
    if (options.yarnrc) {
      await fs.writeFile(
        path.join(dir, '.yarnrc.yml'),
        'nodeLinker: node-modules\n'
      );
    }
    for (const skillDir of options.skillDirs ?? []) {
      await fs.mkdir(path.join(dir, '.agents', 'skills', skillDir), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(dir, '.agents', 'skills', skillDir, 'SKILL.md'),
        `# ${skillDir}\n`
      );
    }
    for (const skillDir of options.emptySkillDirs ?? []) {
      await fs.mkdir(path.join(dir, '.agents', 'skills', skillDir), {
        recursive: true,
      });
    }
    return fn(dir);
  });
}
