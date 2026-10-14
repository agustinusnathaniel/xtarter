import {
  buildFounderPersonJsonLd,
  buildOrganizationJsonLd,
  buildSoftwareApplicationJsonLd,
  buildWebSiteJsonLd,
  serializeJsonLd,
} from '@docs/src/lib/jsonld';
import { describe, expect } from 'vite-plus/test';

/** Recursively collect every object key name in a JSON-like graph. */
function collectKeys(value: unknown, seen = new Set<unknown>()): Array<string> {
  if (value === null || typeof value !== 'object') {
    return [];
  }
  if (seen.has(value)) {
    return [];
  }
  seen.add(value);

  const keys: Array<string> = [];
  for (const [key, child] of Object.entries(value)) {
    keys.push(key);
    keys.push(...collectKeys(child));
  }
  return keys;
}

describe('buildOrganizationJsonLd', () => {
  test('never contains address, email, or telephone anywhere in the graph', () => {
    const org = buildOrganizationJsonLd();
    const keys = collectKeys(org).map((key) => key.toLowerCase());
    expect(keys).not.toContain('address');
    expect(keys).not.toContain('email');
    expect(keys).not.toContain('telephone');

    const serialized = JSON.stringify(org);
    expect(serialized).not.toMatch(/address|email|telephone/i);
  });
});

describe('serializeJsonLd', () => {
  test('escapes < so </script> can never terminate the tag early', () => {
    const data = {
      description: 'evil </script><script>alert(1)</script> payload <tag>',
    };
    const serialized = serializeJsonLd(data);
    expect(serialized).not.toContain('</script');
    expect(serialized).toContain('\\u003c/script>');
  });

  test('JSON.parse of the output round-trips to the input', () => {
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
          'https://github.com/agustinusnathaniel/xtarterize'
        ),
      ],
    };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });
});
