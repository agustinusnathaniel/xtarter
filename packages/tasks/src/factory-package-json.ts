// Re-export from new module structure for backward compatibility

// Also export equivalence utilities that might be used elsewhere
export {
	areEquivalent,
	findEquivalentScriptKey,
	hasScriptWithEquivalentValue,
} from './scripts/equivalence.js'
export type {
	PackageJsonScriptEntry,
	PackageJsonTaskOptions,
} from './scripts/task.js'
export { createPackageJsonTask } from './scripts/task.js'
