import fs from 'node:fs/promises';
import { Effect } from 'effect';
import JSON5 from 'json5';
import { dirname, resolve } from 'pathe';

import { FileSystemError } from '@/errors.js';

export function ensureDir(dirPath: string): Promise<void> {
  return Effect.runPromise(
    Effect.tryPromise({
      catch: (cause) => new FileSystemError({ cause, path: dirPath }),
      try: () => fs.mkdir(dirPath, { recursive: true }).then(() => undefined),
    })
  );
}

export function readFile(filePath: string): Promise<string> {
  return Effect.runPromise(
    Effect.tryPromise({
      catch: (cause) => new FileSystemError({ cause, path: filePath }),
      try: () => fs.readFile(filePath, 'utf-8'),
    })
  );
}

export function writeFile(
  filePath: string,
  content: string,
  mode?: number
): Promise<void> {
  return Effect.runPromise(
    Effect.tryPromise({
      catch: (cause) => new FileSystemError({ cause, path: filePath }),
      try: async () => {
        await fs.mkdir(dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, { mode });
      },
    })
  );
}

export function fileExists(filePath: string): Promise<boolean> {
  return Effect.runPromise(
    Effect.orElseSucceed(
      Effect.tryPromise({
        catch: (cause) => new FileSystemError({ cause, path: filePath }),
        try: () => fs.access(filePath).then(() => true),
      }),
      () => false
    )
  );
}

export async function findConfigFile(
  cwd: string,
  baseName: string,
  extensions: Array<string>
): Promise<string | null> {
  const candidates = extensions.map((ext) => {
    const filePath = resolvePath(cwd, `${baseName}${ext}`);
    return fileExists(filePath).then((exists) => (exists ? filePath : null));
  });
  const results = await Promise.all(candidates);
  return results.find((r): r is string => r !== null) ?? null;
}

export async function readJson<T = Record<string, unknown>>(
  filePath: string
): Promise<T> {
  const content = await readFile(filePath);
  try {
    return JSON5.parse(content) as T;
  } catch (cause) {
    throw new FileSystemError({ cause, path: filePath });
  }
}

export async function writeJson(
  filePath: string,
  data: unknown
): Promise<void> {
  await Effect.runPromise(
    Effect.tryPromise({
      catch: (cause) => new FileSystemError({ cause, path: filePath }),
      try: async () => {
        await fs.mkdir(dirname(filePath), { recursive: true });
        await fs.writeFile(
          filePath,
          `${JSON.stringify(data, null, 2)}\n`,
          'utf-8'
        );
      },
    })
  );
}

export async function readJsonIfExists<T = Record<string, unknown>>(
  filePath: string
): Promise<T | null> {
  const exists = await fileExists(filePath);
  if (!exists) {
    return null;
  }
  return readJson<T>(filePath);
}

export async function copyFile(src: string, dest: string): Promise<void> {
  await Effect.runPromise(
    Effect.tryPromise({
      catch: (cause) => new FileSystemError({ cause, path: dest }),
      try: async () => {
        await fs.mkdir(dirname(dest), { recursive: true });
        await fs.cp(src, dest);
      },
    })
  );
}

export function resolvePath(cwd: string, ...segments: Array<string>): string {
  return resolve(cwd, ...segments);
}
