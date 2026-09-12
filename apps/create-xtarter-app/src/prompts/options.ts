import { confirm } from '@clack/prompts';
import { abortIfCancelled } from '@xtarterize/core/plain';

async function confirmPrompt(
  message: string,
  initialValue: boolean
): Promise<boolean> {
  const result = await confirm({ initialValue, message });
  abortIfCancelled(result);
  return result;
}

export async function promptGitInit(): Promise<boolean> {
  return confirmPrompt('Initialize a git repository?', true);
}

export async function promptCleanCI(): Promise<boolean> {
  return confirmPrompt(
    'Remove CI/CD configurations (GitHub Actions, Vercel, etc.)?',
    false
  );
}
