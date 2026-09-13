import { describe, expect } from 'vite-plus/test';

import { generateBadgeSvg } from '../../apps/xtarterize/src/ui/badge.js';

const badgeCases: Array<
  [
    name: string,
    conformant: number,
    total: number,
    expectedContains: Array<string>,
  ]
> = [
  [
    'generates valid SVG with 100% conformance',
    10,
    10,
    ['<svg', '</svg>', '10/10', '100%', '#22c55e', 'all conformant'],
  ],
  [
    'generates valid SVG with 0% conformance',
    0,
    10,
    ['0/10', '0%', '#ef4444', '10 remaining'],
  ],
  [
    'generates valid SVG with partial conformance',
    7,
    10,
    ['7/10', '70%', '#84cc16', '3 remaining'],
  ],
  ['uses yellow for 50-69% range', 5, 10, ['50%', '#eab308']],
  ['handles zero total gracefully', 0, 0, ['100%', 'all conformant']],
];

describe('generateBadgeSvg', () => {
  for (const [name, conformant, total, expectedContains] of badgeCases) {
    test(name, () => {
      const svg = generateBadgeSvg({ conformant, total });
      for (const expected of expectedContains) {
        expect(svg).toContain(expected);
      }
    });
  }

  test('includes aria-label for accessibility', () => {
    const svg = generateBadgeSvg({ conformant: 5, total: 10 });
    expect(svg).toContain('aria-label');
    expect(svg).toContain('conformance: 5/10 (50%)');
  });

  test('rounds percentage to nearest integer', () => {
    const svg = generateBadgeSvg({ conformant: 1, total: 3 });
    expect(svg).toContain('33%');
  });

  test('shows status text based on score', () => {
    expect(generateBadgeSvg({ conformant: 10, total: 10 })).toContain(
      'excellent'
    );
    expect(generateBadgeSvg({ conformant: 7, total: 10 })).toContain('good');
    expect(generateBadgeSvg({ conformant: 5, total: 10 })).toContain('fair');
    expect(generateBadgeSvg({ conformant: 0, total: 10 })).toContain(
      'needs work'
    );
  });

  test('includes progress bar', () => {
    const svg = generateBadgeSvg({ conformant: 5, total: 10 });
    expect(svg).toContain('Progress bar');
    expect(svg).toContain('width="40"'); // 50% of 80px bar
  });
});
