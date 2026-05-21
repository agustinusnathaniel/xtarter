import { Equal } from 'effect'

export function deepEqual(a: unknown, b: unknown): boolean {
	return Equal.equals(a, b)
}
