// test/styles/tooltip-tokens.test.ts
//
// M3 tooltips specs: Web type tokens and container measurements.
// https://m3.material.io/components/tooltips/specs
import { describe, test, expect, beforeAll } from 'bun:test';
import { compileString } from 'sass';

let css = '';

const rules = (selector: string): string[] => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Array.from(css.matchAll(new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`, 'g')), (m) => m[2]);
};

const value = (selector: string, property: string): string | undefined =>
  rules(selector)
    .map((block) => block.match(new RegExp(`(?:^|;|\\n)\\s*${property}\\s*:\\s*([^;]+);`))?.[1].trim())
    .filter((v): v is string => v !== undefined)
    .pop();

beforeAll(() => {
  css = compileString(`@use 'components/tooltip';`, { loadPaths: ['src/styles'], style: 'expanded' }).css.replace(/,\n/g, ', ');
});

describe('tooltip tokens', () => {
  test('plain: inverse-surface and inverse-on-surface, opaque, no elevation', () => {
    for (const selector of ['.mtrl-tooltip', '.mtrl-tooltip--plain']) {
      expect(value(selector, 'background-color')).toBe('var(--mtrl-sys-color-inverse-surface)');
      expect(value(selector, 'color')).toBe('var(--mtrl-sys-color-inverse-on-surface)');
    }
    expect(value('.mtrl-tooltip--plain', 'border')).toBeUndefined();
    expect(value('.mtrl-tooltip', 'box-shadow')).toBeUndefined();
    expect(value('.mtrl-tooltip--visible', 'opacity')).toBe('1');
  });

  test('plain supporting text uses Body Small without a medium-weight override', () => {
    expect(value('.mtrl-tooltip', 'font-weight')).toBe('400');
    expect(value('.mtrl-tooltip', 'font-size')).toBe('12px');
    expect(value('.mtrl-tooltip', 'line-height')).toBe('16px');
  });

  test('rich container keeps 12dp top, 16dp sides and 8dp bottom padding', () => {
    expect(value('.mtrl-tooltip--rich', 'padding')).toBe('12px 16px 8px');
  });

  test('rich: surface-container, on-surface-variant, CornerMedium, elevation 2, Body Medium, 320dp', () => {
    expect(value('.mtrl-tooltip--rich', 'background-color')).toBe('var(--mtrl-sys-color-surface-container)');
    expect(value('.mtrl-tooltip--rich', 'color')).toBe('var(--mtrl-sys-color-on-surface-variant)');
    expect(value('.mtrl-tooltip--rich', 'border-radius')).toBe('var(--mtrl-sys-shape-corner-medium, 12px)');
    expect(value('.mtrl-tooltip--rich', 'max-width')).toBe('320px');
    expect(value('.mtrl-tooltip--rich', 'font-size')).toBe('14px');
    expect(value('.mtrl-tooltip--rich', 'box-shadow')).toBeDefined();
  });
});
