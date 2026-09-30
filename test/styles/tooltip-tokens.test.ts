// test/styles/tooltip-tokens.test.ts
//
// FLO-324: the tooltip against Compose's PlainTooltipTokens and
// RichTooltipTokens. The plain variant had its own surface-container-high with
// an outline, the base a 90% opacity and a shadow, and the rich variant only a
// padding.
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

  test('rich: surface-container, on-surface-variant, CornerMedium, elevation 2, Body Medium, 320dp', () => {
    expect(value('.mtrl-tooltip--rich', 'background-color')).toBe('var(--mtrl-sys-color-surface-container)');
    expect(value('.mtrl-tooltip--rich', 'color')).toBe('var(--mtrl-sys-color-on-surface-variant)');
    expect(value('.mtrl-tooltip--rich', 'border-radius')).toBe('12px');
    expect(value('.mtrl-tooltip--rich', 'max-width')).toBe('320px');
    expect(value('.mtrl-tooltip--rich', 'font-size')).toBe('14px');
    expect(value('.mtrl-tooltip--rich', 'box-shadow')).toBeDefined();
  });
});
