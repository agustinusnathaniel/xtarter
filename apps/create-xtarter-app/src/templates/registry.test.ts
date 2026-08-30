import { describe, expect, test } from 'vite-plus/test';

import {
  getTemplateById,
  getTemplateChoices,
  TEMPLATES,
} from '@/templates/registry';

describe('Template Registry', () => {
  describe('TEMPLATES', () => {
    test('should have at least one template', () => {
      expect(TEMPLATES.length).toBeGreaterThan(0);
    });

    test('should have valid template structure', () => {
      for (const template of TEMPLATES) {
        expect(template.id).toBeDefined();
        expect(template.name).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.features).toBeDefined();
        expect(template.features.length).toBeGreaterThan(0);
        expect(template.repo).toBeDefined();
        expect(template.branch).toBe('main');
        expect(template.provider).toBe('github');
      }
    });
  });

  describe('getTemplateById', () => {
    test('should find template by id', () => {
      const template = getTemplateById('vite-tailwind');
      expect(template).toBeDefined();
      expect(template?.id).toBe('vite-tailwind');
      expect(template?.name).toBe('Vite + React + Tailwind');
    });

    test('should return undefined for unknown template', () => {
      const template = getTemplateById('unknown-template');
      expect(template).toBeUndefined();
    });

    test('should be case-sensitive', () => {
      const template = getTemplateById('VITE-TAILWIND');
      expect(template).toBeUndefined();
    });
  });

  describe('getTemplateChoices', () => {
    test('should return choices for all templates', () => {
      const choices = getTemplateChoices();
      expect(choices.length).toBe(TEMPLATES.length);
    });

    test('should have value and label for each choice', () => {
      const choices = getTemplateChoices();
      for (const choice of choices) {
        expect(choice).toHaveProperty('value');
        expect(choice).toHaveProperty('label');
        expect(typeof choice.value).toBe('string');
        expect(typeof choice.label).toBe('string');
      }
    });

    test('should include template name in label', () => {
      const choices = getTemplateChoices();
      const viteTailwind = choices.find((c) => c.value === 'vite-tailwind');
      expect(viteTailwind?.label).toContain('Vite + React + Tailwind');
    });
  });
});
