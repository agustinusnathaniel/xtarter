import worker, {
  markdownCandidates,
  mergeVary,
  wantsMarkdown,
} from '@docs/worker/index.js';
import { describe, expect, vi } from 'vitest';

function createEnv(entries: Array<[string, Response]>, fallback?: Response) {
  const map = new Map(entries);
  const fetchMock = vi.fn(async (input: Request | string) => {
    const req = input instanceof Request ? input : new Request(input);
    const pathname = new URL(req.url).pathname;
    if (map.has(pathname)) {
      const res = map.get(pathname);
      if (res) {
        return res.clone();
      }
    }
    if (fallback) {
      return fallback.clone();
    }
    return new Response('Not Found', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
      status: 404,
    });
  });
  return {
    env: { ASSETS: { fetch: fetchMock } } as unknown as {
      ASSETS: { fetch: typeof fetch };
    },
    fetchMock,
    map,
  };
}

const wantsMarkdownCases: Array<
  [name: string, cases: Array<[input: unknown, expected: boolean]>]
> = [
  ['true for text/markdown', [['text/markdown', true]]],
  [
    'true for text/html, text/markdown;q=0.9',
    [['text/html, text/markdown;q=0.9', true]],
  ],
  [
    'true case-insensitive and with charset param',
    [
      ['TEXT/MARKDOWN', true],
      ['text/markdown; charset=utf-8', true],
    ],
  ],
  [
    'false for text/html only',
    [
      ['text/html', false],
      ['text/html,application/xhtml+xml', false],
    ],
  ],
  [
    'false for text/markdown;q=0 and q=0 with other types',
    [
      ['text/markdown;q=0', false],
      ['text/html, text/markdown;q=0', false],
      ['text/markdown;q=0.0', false],
    ],
  ],
  [
    'false for missing / empty / wrong types',
    [
      ['', false],
      [null, false],
      [undefined, false],
      ['*/*', false],
      ['text/*', false],
      ['application/json', false],
    ],
  ],
  [
    'false for q=0 even when other entries want markdown but are disabled',
    [['text/markdown ; q=0 , text/html', false]],
  ],
  [
    'handles whitespace and ordering',
    [
      [' text/html ; q=0.8 , text/markdown ; q=0.9 ', true],
      ['text/markdown;q=0.9, text/html', true],
    ],
  ],
];

describe('wantsMarkdown', () => {
  for (const [name, cases] of wantsMarkdownCases) {
    test(name, () => {
      for (const [input, expected] of cases) {
        expect(wantsMarkdown(input as string)).toBe(expected);
      }
    });
  }
});

const mergeVaryCases: Array<
  [name: string, cases: Array<[input: unknown, expected: string]>]
> = [
  [
    'merges missing existing to Accept, Accept-Encoding',
    [
      [undefined, 'Accept, Accept-Encoding'],
      ['', 'Accept, Accept-Encoding'],
      [null, 'Accept, Accept-Encoding'],
    ],
  ],
  [
    'dedupes case-insensitively and keeps stable base order',
    [
      ['accept-encoding', 'Accept, Accept-Encoding'],
      ['Accept', 'Accept, Accept-Encoding'],
      ['Accept-Encoding', 'Accept, Accept-Encoding'],
      ['accept', 'Accept, Accept-Encoding'],
    ],
  ],
  [
    'appends extra tokens sorted case-insensitively',
    [
      ['Origin', 'Accept, Accept-Encoding, Origin'],
      [
        'X-Custom, accept-encoding, Accept-Language',
        'Accept, Accept-Encoding, Accept-Language, X-Custom',
      ],
    ],
  ],
  [
    'trims whitespace and ignores empty tokens',
    [['  Origin  , , Accept-Encoding  ', 'Accept, Accept-Encoding, Origin']],
  ],
  [
    'dedupes duplicate custom tokens case-insensitively',
    [['X-Foo, x-foo, X-FOO', 'Accept, Accept-Encoding, X-Foo']],
  ],
];

describe('mergeVary', () => {
  for (const [name, cases] of mergeVaryCases) {
    test(name, () => {
      for (const [input, expected] of cases) {
        expect(mergeVary(input as string)).toBe(expected);
      }
    });
  }
});

const markdownCandidatesCases: Array<
  [name: string, cases: Array<[input: unknown, expected: Array<string>]>]
> = [
  ['"/" => ["/index.md"]', [['/', ['/index.md']]]],
  [
    'handles trailing slash',
    [
      ['/xtarterize/guide/', ['/xtarterize/guide/index.md']],
      ['/foo/', ['/foo/index.md']],
    ],
  ],
  [
    'without trailing slash returns file and index candidates',
    [
      [
        '/xtarterize/guide/cli/overview',
        [
          '/xtarterize/guide/cli/overview.md',
          '/xtarterize/guide/cli/overview/index.md',
        ],
      ],
      ['/foo', ['/foo.md', '/foo/index.md']],
    ],
  ],
  [
    'handles empty and missing leading slash',
    [
      ['', ['/index.md']],
      [
        'xtarterize/guide',
        ['/xtarterize/guide.md', '/xtarterize/guide/index.md'],
      ],
      [null, ['/index.md']],
    ],
  ],
];

describe('markdownCandidates', () => {
  for (const [name, cases] of markdownCandidatesCases) {
    test(name, () => {
      for (const [input, expected] of cases) {
        expect(markdownCandidates(input as string)).toEqual(expected);
      }
    });
  }
});

describe('worker fetch handler', () => {
  test('Accept text/markdown + twin exists => 200 text/markdown with Vary', async () => {
    const mdBody = '# Hello markdown';
    const mdResponse = new Response(mdBody, {
      headers: { 'content-type': 'text/plain' },
      status: 200,
    });
    const { env, fetchMock } = createEnv([
      ['/xtarterize/guide/cli/overview.md', mdResponse],
    ]);
    // original HTML would also exist but should not be fetched if twin found
    const req = new Request(
      'https://example.com/xtarterize/guide/cli/overview',
      {
        headers: { Accept: 'text/markdown' },
      }
    );
    const res = await worker.fetch(req, env as never, {} as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8'
    );
    expect(res.headers.get('vary')).toMatch(/Accept/);
    expect(res.headers.get('vary')).toMatch(/Accept-Encoding/);
    const text = await res.text();
    expect(text).toBe(mdBody);
    // should have tried candidate before original
    expect(fetchMock).toHaveBeenCalled();
    const firstUrl = new URL((fetchMock.mock.calls[0][0] as Request).url)
      .pathname;
    expect(firstUrl).toBe('/xtarterize/guide/cli/overview.md');
  });

  test('also serves index.md twin for trailing-slash-like directory', async () => {
    const mdBody = '# Index twin';
    const { env } = createEnv([
      [
        '/xtarterize/guide/cli/overview/index.md',
        new Response(mdBody, { status: 200 }),
      ],
    ]);
    const req = new Request(
      'https://example.com/xtarterize/guide/cli/overview',
      { headers: { Accept: 'text/markdown' } }
    );
    const res = await worker.fetch(req, env as never, {} as never);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe(mdBody);
    expect(res.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8'
    );
  });

  test('no twin -> fallback to HTML 200 with Vary', async () => {
    const htmlBody = '<html>hello</html>';
    const htmlResponse = new Response(htmlBody, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
      status: 200,
    });
    const { env } = createEnv([
      ['/xtarterize/guide/cli/overview', htmlResponse],
    ]);
    const req = new Request(
      'https://example.com/xtarterize/guide/cli/overview',
      {
        headers: { Accept: 'text/markdown' },
      }
    );
    const res = await worker.fetch(req, env as never, {} as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('vary')).toContain('Accept');
    expect(await res.text()).toBe(htmlBody);
  });

  test('HEAD with markdown also negotiates', async () => {
    const mdBody = '# HEAD twin';
    const { env } = createEnv([
      ['/foo.md', new Response(mdBody, { status: 200 })],
    ]);
    const req = new Request('https://example.com/foo', {
      headers: { Accept: 'text/markdown' },
      method: 'HEAD',
    });
    const res = await worker.fetch(req, env as never, {} as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8'
    );
  });

  test('404 + Accept markdown => 404 text/markdown with llms link and Vary', async () => {
    const { env } = createEnv([]);
    const req = new Request('https://example.com/definitely-not-a-real-page', {
      headers: { Accept: 'text/markdown' },
    });
    const res = await worker.fetch(req, env as never, {} as never);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8'
    );
    expect(res.headers.get('vary')).toMatch(/Accept/);
    const body = await res.text();
    expect(body).toContain('/llms.txt');
    expect(body).toContain('404');
  });

  test('404 + browser Accept => 404 HTML with Vary', async () => {
    const html404 = '<html>custom 404</html>';
    const fallback404 = new Response(html404, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
      status: 404,
    });
    const { env } = createEnv([], fallback404);
    const req = new Request('https://example.com/missing-page', {
      headers: { Accept: 'text/html,application/xhtml+xml' },
    });
    const res = await worker.fetch(req, env as never, {} as never);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(res.headers.get('vary')).toMatch(/Accept/);
    const body = await res.text();
    expect(body).toBe(html404);
  });

  test('404 non-html + no markdown negotiate tries /404.html', async () => {
    const json404 = new Response('{"error":"not found"}', {
      headers: { 'content-type': 'application/json' },
      status: 404,
    });
    const explicit404 = new Response('<html>404 page</html>', {
      headers: { 'content-type': 'text/html; charset=utf-8' },
      status: 200,
    });
    const { env, fetchMock } = createEnv([
      ['/missing', json404],
      ['/404.html', explicit404],
    ]);
    const req = new Request('https://example.com/missing', {
      headers: { Accept: 'text/html' },
    });
    const res = await worker.fetch(req, env as never, {} as never);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('text/html');
    expect(await res.text()).toBe('<html>404 page</html>');
    expect(fetchMock).toHaveBeenCalled();
  });

  test('non-GET (POST) passthrough without markdown lookup', async () => {
    const ok = new Response('posted', {
      headers: { 'content-type': 'text/html' },
      status: 200,
    });
    const { env, fetchMock } = createEnv([['/api/submit', ok]]);
    const req = new Request('https://example.com/api/submit', {
      body: 'data',
      headers: { Accept: 'text/markdown' },
      method: 'POST',
    });
    const res = await worker.fetch(req, env as never, {} as never);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('posted');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = new URL((fetchMock.mock.calls[0][0] as Request).url)
      .pathname;
    expect(calledUrl).toBe('/api/submit');
  });

  test('binary asset (.png) not rewritten even with Accept markdown', async () => {
    const pngBytes = new Uint8Array([137, 80, 78, 71]);
    const pngResponse = new Response(pngBytes, {
      headers: { 'content-type': 'image/png' },
      status: 200,
    });
    const { env } = createEnv([['/assets/logo.png', pngResponse]]);
    const req = new Request('https://example.com/assets/logo.png', {
      headers: { Accept: 'text/markdown' },
    });
    const res = await worker.fetch(req, env as never, {} as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('image/png');
    // binary should not have Vary injected
    expect(res.headers.get('vary')).toBeNull();
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf[0]).toBe(137);
  });

  test('HTML 200 with Vary merging preserves existing tokens', async () => {
    const htmlResponse = new Response('<html>hi</html>', {
      headers: {
        'content-type': 'text/html',
        vary: 'Origin',
      },
      status: 200,
    });
    const { env } = createEnv([['/foo', htmlResponse]]);
    const req = new Request('https://example.com/foo', {
      headers: { Accept: 'text/html' },
    });
    const res = await worker.fetch(req, env as never, {} as never);
    expect(res.headers.get('vary')).toBe('Accept, Accept-Encoding, Origin');
  });
});
