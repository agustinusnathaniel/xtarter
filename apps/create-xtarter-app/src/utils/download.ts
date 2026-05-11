import consola from 'consola'
import { downloadTemplate } from 'giget'
import type { TemplateConfig } from '@/templates/registry'

export interface DownloadOptions {
	offline?: boolean
	targetPath: string
	template: TemplateConfig
}

const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function downloadTemplateFiles({
	template,
	targetPath,
	offline = false,
}: DownloadOptions): Promise<void> {
	const logger = consola.withTag('download')

	let lastError: Error | null = null

	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			logger.start(
				`Downloading template ${template.name}...${attempt > 1 ? ` (attempt ${attempt}/${MAX_RETRIES})` : ''}`,
			)

			// Build the source string for giget
			// Format: github:owner/repo#branch
			const source = `github:${template.repo}#${template.branch}`

			await downloadTemplate(source, {
				dir: targetPath,
				force: true,
				offline,
			})

			logger.success(`Template downloaded to ${targetPath}`)
			return // Success, exit retry loop
		} catch (error) {
			lastError = error instanceof Error ? error : new Error('Unknown error')

			// Check if it's a network error (retryable)
			const isNetworkError =
				lastError.message.includes('ENOTFOUND') ||
				lastError.message.includes('ECONNREFUSED') ||
				lastError.message.includes('ETIMEDOUT') ||
				lastError.message.includes('network') ||
				lastError.message.includes('fetch')

			if (!isNetworkError || attempt === MAX_RETRIES) {
				logger.fail(`Failed to download template: ${lastError.message}`)
				throw lastError
			}

			logger.warn(`Network error, retrying in ${RETRY_DELAY / 1000}s...`)
			await sleep(RETRY_DELAY)
		}
	}

	// Should never reach here, but just in case
	throw lastError || new Error('Download failed after retries')
}
