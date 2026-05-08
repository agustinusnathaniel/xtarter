import type { Bundler, Router } from './types.js'

/**
 * Detects the router from dependencies and bundler
 * @param deps - Record of package names to versions
 * @param bundler - Detected bundler
 * @returns Detected router or null if undetectable
 */
export function detectRouter(
	deps: Record<string, string>,
	bundler: Bundler,
): Router {
	if (bundler === 'nextjs') return 'next'
	if (bundler === 'expo') return 'expo-router'
	if (deps['@tanstack/react-router']) return 'tanstack-router'
	if (deps['react-router'] || deps['react-router-dom']) return 'react-router'
	if (deps['vue-router']) return 'vue-router'
	return null
}
