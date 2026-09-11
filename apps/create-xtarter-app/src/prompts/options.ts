import { confirm } from '@clack/prompts';
import { abortIfCancelled } from '@xtarterize/core';

export async function promptGitInit(): Promise<boolean> {
  const result = await confirm({
    initialValue: true,
    message: 'Initialize a git repository?',
  });

  abortIfCancelled(result);

  return result;
}

export async function promptCleanCI(): Promise<boolean> {
  const result = await confirm({
    initialValue: false,
    message: 'Remove CI/CD configurations (GitHub Actions, Vercel, etc.)?',
  });

  abortIfCancelled(result);

  return result;
}
