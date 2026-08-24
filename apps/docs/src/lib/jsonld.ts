/**
 * Pure schema.org JSON-LD builders for the docs site.
 *
 * These functions only assemble plain objects: no DOM access, no dates, no
 * randomness, so repeated builds serialize to byte-identical output
 * (idempotency contract). The Astro config registers the result of
 * `serializeJsonLd` through Starlight’s `head` option.
 */

/** Canonical site origin (matches `site` in astro.config.mjs). */
export const SITE_URL = 'https://xtarter.sznm.dev'

/** Stable node identifiers shared by reference (`{@id}`) links. */
export const ORGANIZATION_JSONLD_ID = `${SITE_URL}/#organization`
export const FOUNDER_JSONLD_ID = `${SITE_URL}/#founder`

/** Site description mirrored from Starlight's `description` option. */
export const SITE_DESCRIPTION =
	'Production-grade starter templates and conformance tooling for JavaScript/TypeScript projects.'

/** Existing og:image URL reused as the organization logo. */
const ORG_LOGO_URL =
	'https://og.sznm.dev/api/generate?heading=xtarter&text=Production-grade%20JS/TS%20starters%20%26%20conformance%20tooling&template=color'

/** Verified public channels only: no email, phone, or postal address exists. */
export const GITHUB_ISSUES_URL =
	'https://github.com/agustinusnathaniel/xtarter/issues'
export const MAINTAINER_SITE_URL = 'https://agustinusnathaniel.com/'

/**
 * The founder Person node. Referenced from Organization.founder via
 * `{ '@id': FOUNDER_JSONLD_ID }` and emitted once in the `@graph`.
 */
export function buildFounderPersonJsonLd(): Record<string, string> {
	return {
		'@type': 'Person',
		'@id': FOUNDER_JSONLD_ID,
		name: 'Agustinus Nathaniel',
		url: MAINTAINER_SITE_URL,
	}
}

export function buildWebSiteJsonLd(): Record<string, unknown> {
	return {
		'@type': 'WebSite',
		name: 'xtarter',
		url: `${SITE_URL}/`,
		description: SITE_DESCRIPTION,
		inLanguage: 'en',
		publisher: { '@id': ORGANIZATION_JSONLD_ID },
	}
}

export function buildOrganizationJsonLd(): Record<string, unknown> {
	return {
		'@type': 'Organization',
		'@id': ORGANIZATION_JSONLD_ID,
		name: 'xtarter',
		url: `${SITE_URL}/`,
		logo: ORG_LOGO_URL,
		sameAs: [
			'https://github.com/agustinusnathaniel/xtarterize',
			'https://github.com/agustinusnathaniel/xtarter',
			MAINTAINER_SITE_URL,
		],
		founder: { '@id': FOUNDER_JSONLD_ID },
		contactPoint: [
			{
				'@type': 'ContactPoint',
				contactType: 'technical support',
				url: GITHUB_ISSUES_URL,
			},
		],
	}
}

// biome-ignore lint/complexity/useMaxParams: delegation-specified positional builder signature
export function buildSoftwareApplicationJsonLd(
	name: string,
	description: string,
	url: string,
	codeRepository: string,
): Record<string, unknown> {
	return {
		'@type': 'SoftwareApplication',
		name,
		description,
		url,
		codeRepository,
		applicationCategory: 'DeveloperApplication',
		operatingSystem: 'Cross-platform',
		offers: {
			'@type': 'Offer',
			price: '0',
			priceCurrency: 'USD',
		},
		author: { '@id': ORGANIZATION_JSONLD_ID },
		publisher: { '@id': ORGANIZATION_JSONLD_ID },
	}
}

/**
 * Serialize JSON-LD for safe embedding in a `<script>` element: every `<`
 * becomes `\u003c` so a literal `</script>` inside string values can never
 * terminate the tag early.
 */
export function serializeJsonLd(data: unknown): string {
	return JSON.stringify(data, null, 2).replaceAll('<', '\\u003c')
}
