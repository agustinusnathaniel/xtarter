import { fileExists, resolvePath } from '@/utils/fs.js';
import { readPackageJsonOrNull } from '@/utils/pkg.js';

export interface PreflightError {
  code: string;
  hint?: string;
  message: string;
}

export interface PreflightResult {
  errors: Array<PreflightError>;
  valid: boolean;
}

export async function runPreflight(cwd: string): Promise<PreflightResult> {
  const errors: Array<PreflightError> = [];

  const hasPackageJson = await fileExists(resolvePath(cwd, 'package.json'));
  if (!hasPackageJson) {
    errors.push({
      code: 'MISSING_PACKAGE_JSON',
      hint: 'Run xtarterize init from the root of a JS/TS project.',
      message: 'No package.json found',
    });
    return { errors, valid: false };
  }

  const pkg = await readPackageJsonOrNull(cwd);
  if (!pkg?.name) {
    errors.push({
      code: 'INVALID_PACKAGE_JSON',
      hint: 'Add a "name" field to your package.json and try again.',
      message: 'package.json is missing a "name" field',
    });
    return { errors, valid: false };
  }

  const hasGit = await fileExists(resolvePath(cwd, '.git'));
  if (!hasGit) {
    errors.push({
      code: 'MISSING_GIT',
      hint: 'Initialize a git repository with "git init" before running xtarterize.',
      message: 'No .git directory found',
    });
  }

  return { errors, valid: errors.length === 0 };
}
