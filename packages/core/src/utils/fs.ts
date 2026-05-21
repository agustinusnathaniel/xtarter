import fs from 'node:fs/promises'
import { Effect } from 'effect'
import JSON5 from 'json5'
import { dirname, resolve } from 'pathe'

function tryEffect<A>(f: () => Promise<A>): Effect.Effect<A, Error> {
	return Effect.tryPromise({
		try: (_signal) => f(),
		catch: (cause) => new Error(String(cause)),
	})
}

export function ensureDir(dirPath: string): Promise<void> {
	return Effect.runPromise(
		tryEffect(() =>
			fs.mkdir(dirPath, { recursive: true }).then(() => undefined),
		),
	)
}

export function readFile(filePath: string): Promise<string> {
	return Effect.runPromise(tryEffect(() => fs.readFile(filePath, 'utf-8')))
}

export function writeFile(
	filePath: string,
	content: string,
	mode?: number,
): Promise<void> {
	return Effect.runPromise(
		tryEffect(async () => {
			await fs.mkdir(dirname(filePath), { recursive: true })
			await fs.writeFile(filePath, content, { mode })
		}),
	)
}

export function fileExists(filePath: string): Promise<boolean> {
	return Effect.runPromise(
		Effect.orElseSucceed(
			tryEffect(() => fs.access(filePath).then(() => true)),
			() => false,
		),
	)
}

export async function findConfigFile(
	cwd: string,
	baseName: string,
	extensions: string[],
): Promise<string | null> {
	for (const ext of extensions) {
		const filePath = resolvePath(cwd, `${baseName}${ext}`)
		if (await fileExists(filePath)) return filePath
	}
	return null
}

export async function readJson<T = Record<string, unknown>>(
	filePath: string,
): Promise<T> {
	const content = await readFile(filePath)
	return JSON5.parse(content) as T
}

export async function writeJson(
	filePath: string,
	data: unknown,
): Promise<void> {
	await Effect.runPromise(
		tryEffect(async () => {
			await fs.mkdir(dirname(filePath), { recursive: true })
			await fs.writeFile(
				filePath,
				`${JSON.stringify(data, null, 2)}\n`,
				'utf-8',
			)
		}),
	)
}

export async function readJsonIfExists<T = Record<string, unknown>>(
	filePath: string,
): Promise<T | null> {
	const exists = await fileExists(filePath)
	if (!exists) return null
	return readJson<T>(filePath)
}

export async function copyFile(src: string, dest: string): Promise<void> {
	await Effect.runPromise(
		tryEffect(async () => {
			await fs.mkdir(dirname(dest), { recursive: true })
			await fs.cp(src, dest)
		}),
	)
}

export function resolvePath(cwd: string, ...segments: string[]): string {
	return resolve(cwd, ...segments)
}
