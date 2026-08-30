import { confirm } from '@clack/prompts';
import { abortIfCancelled } from '@xtarterize/core';

export async function promptGitInit(skipGit?: boolean): Promise<boolean> {
  if (skipGit !== undefined) {
    return !skipGit;
  }

  const result = await confirm({
    initialValue: true,
    message: 'Initialize a git repository?',
  });

  abortIfCancelled(result);

  return result;
}

export async function promptCleanCI(cleanMode?: boolean): Promise<boolean> {
  if (cleanMode !== undefined) {
    return cleanMode;
  }

  const result = await confirm({
    initialValue: false,
    message: 'Remove CI/CD configurations (GitHub Actions, Vercel, etc.)?',
  });

  abortIfCancelled(result);

  return result;
}
