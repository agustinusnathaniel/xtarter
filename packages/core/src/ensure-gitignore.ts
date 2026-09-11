import fs from 'node:fs/promises';
import { resolve } from 'pathe';

export interface EnsureGitignoreResult {
  readonly action: 'created' | 'appended' | 'noop';
}

const GITIGNORE_ENTRY = '/.xtarterize/';
const HEADER = '# xtarterize internal artifacts';

export async function ensureXtarterizeGitignore(
  cwd: string
): Promise<EnsureGitignoreResult> {
  const gitignorePath = resolve(cwd, '.gitignore');
  try {
    let content: string;
    try {
      content = await fs.readFile(gitignorePath, 'utf-8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        throw err;
      }
      await fs.writeFile(
        gitignorePath,
        `${HEADER}\n${GITIGNORE_ENTRY}\n`,
        'utf-8'
      );
      return { action: 'created' };
    }
    if (content.split('\n').some((line) => line.trim() === GITIGNORE_ENTRY)) {
      return { action: 'noop' };
    }
    const newContent = content.endsWith('\n')
      ? `${content}${HEADER}\n${GITIGNORE_ENTRY}\n`
      : `${content}\n${HEADER}\n${GITIGNORE_ENTRY}\n`;
    await fs.writeFile(gitignorePath, newContent, 'utf-8');
    return { action: 'appended' };
  } catch {
    return { action: 'noop' };
  }
}
