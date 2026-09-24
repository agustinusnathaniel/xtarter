import { describe, expect } from 'vite-plus/test';

import { generateBadgeSvg } from '../../apps/xtarterize/src/ui/badge.js';

describe('generateBadgeSvg', () => {
  test('generates valid SVG with 100% conformance', () => {
    const svg = generateBadgeSvg({ conformant: 10, total: 10 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('10/10');
    expect(svg).toContain('100%');
    expect(svg).toContain('all conformant');
  });

  test('generates valid SVG with 0% conformance', () => {
    const svg = generateBadgeSvg({ conformant: 0, total: 10 });
    expect(svg).toContain('0/10');
    expect(svg).toContain('0%');
    expect(svg).toContain('10 remaining');
  });

  test('generates valid SVG with partial conformance', () => {
    const svg = generateBadgeSvg({ conformant: 7, total: 10 });
    expect(svg).toContain('7/10');
    expect(svg).toContain('70%');
    expect(svg).toContain('3 remaining');
  });

  test('handles zero total gracefully', () => {
    const svg = generateBadgeSvg({ conformant: 0, total: 0 });
    expect(svg).toContain('100%');
    expect(svg).toContain('all conformant');
  });

  test('includes aria-label for accessibility', () => {
    const svg = generateBadgeSvg({ conformant: 5, total: 10 });
    expect(svg).toContain('aria-label');
    expect(svg).toContain('conformance: 5/10 (50%)');
  });

  test('rounds percentage to nearest integer', () => {
    const svg = generateBadgeSvg({ conformant: 1, total: 3 });
    expect(svg).toContain('33%');
  });
});
