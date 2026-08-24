import { describe, expect, it } from 'vite-plus/test'
import {
	buildFounderPersonJsonLd,
	buildOrganizationJsonLd,
	buildSoftwareApplicationJsonLd,
	buildWebSiteJsonLd,
	serializeJsonLd,
} from '../../apps/docs/src/lib/jsonld'

/** Recursively collect every object key name in a JSON-like graph. */
function collectKeys(value: unknown, seen = new Set<unknown>()): string[] {
	if (value === null || typeof value !== 'object') return []
	if (seen.has(value)) return []
	seen.add(value)

	const keys: string[] = []
	for (const [key, child] of Object.entries(value)) {
		keys.push(key)
		keys.push(...collectKeys(child))
	}
	return keys
}

describe('buildOrganizationJsonLd', () => {
	it('exposes GitHub issues as the only contact point', () => {
		const org = buildOrganizationJsonLd()
		const contactPoints = org.contactPoint as Record<string, string>[]
		expect(contactPoints).toHaveLength(1)
		expect(contactPoints[0].contactType).toBe('technical support')
		expect(contactPoints[0].url).toBe(
			'https://github.com/agustinusnathaniel/xtarter/issues',
		)
	})

	it('never contains address, email, or telephone anywhere in the graph', () => {
		const org = buildOrganizationJsonLd()
		const keys = collectKeys(org).map((key) => key.toLowerCase())
		expect(keys).not.toContain('address')
		expect(keys).not.toContain('email')
		expect(keys).not.toContain('telephone')

		const serialized = JSON.stringify(org)
		expect(serialized).not.toMatch(/address|email|telephone/i)
	})

	it('references the founder via stable @id', () => {
		const org = buildOrganizationJsonLd()
		expect((org.founder as Record<string, string>)['@id']).toBe(
			'https://xtarter.sznm.dev/#founder',
		)
	})
})

describe('buildSoftwareApplicationJsonLd', () => {
	it('offers the tools at price 0 USD as DeveloperApplication', () => {
		const app = buildSoftwareApplicationJsonLd(
			'xtarterize',
			'A conformance CLI.',
			'https://xtarter.sznm.dev/xtarterize/',
			'https://github.com/agustinusnathaniel/xtarterize',
		)
		expect(app['@type']).toBe('SoftwareApplication')
		expect(app.applicationCategory).toBe('DeveloperApplication')
		const offers = app.offers as Record<string, string>
		expect(offers.price).toBe('0')
		expect(offers.priceCurrency).toBe('USD')
	})
})

describe('buildWebSiteJsonLd + buildFounderPersonJsonLd', () => {
	it('uses canonical site url, language, and publisher reference', () => {
		const site = buildWebSiteJsonLd()
		expect(site.url).toBe('https://xtarter.sznm.dev/')
		expect(site.inLanguage).toBe('en')
		expect((site.publisher as Record<string, string>)['@id']).toBe(
			'https://xtarter.sznm.dev/#organization',
		)

		const person = buildFounderPersonJsonLd()
		expect(person['@type']).toBe('Person')
		expect(person.name).toBe('Agustinus Nathaniel')
	})
})

describe('serializeJsonLd', () => {
	it('escapes < so </script> can never terminate the tag early', () => {
		const data = {
			description: 'evil </script><script>alert(1)</script> payload <tag>',
		}
		const serialized = serializeJsonLd(data)
		expect(serialized).not.toContain('</script')
		expect(serialized).toContain('\\u003c/script>')
	})

	it('JSON.parse of the output round-trips to the input', () => {
		const data = {
			'@context': 'https://schema.org',
			'@graph': [
				buildWebSiteJsonLd(),
				buildOrganizationJsonLd(),
				buildFounderPersonJsonLd(),
				buildSoftwareApplicationJsonLd(
					'create-xtarter-app',
					'A scaffolding CLI <with> angle brackets.',
					'https://xtarter.sznm.dev/create-xtarter-app/',
					'https://github.com/agustinusnathaniel/xtarterize',
				),
			],
		}
		expect(JSON.parse(serializeJsonLd(data))).toEqual(data)
	})
})
