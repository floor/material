// test/styles/fab-menu.test.ts
//
// The FAB menu stylesheet (FLO-306) against FabMenuBaselineTokens and the
// m3.material.io FAB menu specs: the close button, the list and its items,
// the three colour sets, and reduced motion (no stagger, no movement, a fade).
import { describe, test, expect, beforeAll } from 'bun:test';
import { compileString } from 'sass';
import { corner } from '../utils/corner';

let css = '';

const rules = (selector: string): string[] => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Array.from(css.matchAll(new RegExp(`(^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, 'g')), (m) => m[2]);
};

const value = (selector: string, property: string): string | undefined =>
  rules(selector)
    .map((block) => block.match(new RegExp(`(?:^|;|\\n)\\s*${property}\\s*:\\s*([^;]+);`))?.[1].trim())
    .filter((v): v is string => v !== undefined)
    .pop();

/** A property of the first rule for a selector: the base rule, before any media query. */
const base = (selector: string, property: string): string | undefined =>
  rules(selector)
    .map((block) => block.match(new RegExp(`(?:^|;|\\n)\\s*${property}\\s*:\\s*([^;]+);`))?.[1].trim())
    .find((v): v is string => v !== undefined);

const reduced = (): string => css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));

beforeAll(() => {
  css = compileString(`@use 'components/fab-menu';`, { loadPaths: ['src/styles'], style: 'expanded' }).css.replace(/,\n\s*/g, ', ');
});

describe('fab menu stylesheet', () => {
  test('the close button: 56dp, round, the colour set role', () => {
    const open = '.mtrl-fab-menu--list.mtrl-fab-menu--open .mtrl-fab-menu__fab';
    expect(value(open, 'width')).toBe('56px');
    expect(value(open, 'height')).toBe('56px');
    // Half the close button: the corner lerps to 28dp (FLO-348). Towards the
    // full-shape 9999px it went round at once and, on closing, the spring's
    // undershoot took it below 0, a square corner.
    expect(value(open, 'border-radius')).toBe('28px');
    expect(value(open, 'background-color')).toBe('var(--mtrl-fab-menu-close)');
    expect(value(open, 'color')).toBe('var(--mtrl-fab-menu-on-close)');
    expect(value('.mtrl-fab-menu__close', 'width')).toBe('20px');
  });

  test('the close button keeps the FAB\'s top trailing corner', () => {
    // Doubled with .mtrl-fab, whose position: relative a single class lost to:
    // a medium FAB shrank towards its start edge
    expect(value('.mtrl-fab.mtrl-fab-menu__fab', 'position')).toBe('absolute');
    expect(value('.mtrl-fab.mtrl-fab-menu__fab', 'inset-block-start')).toBe('0');
    expect(value('.mtrl-fab.mtrl-fab-menu__fab', 'inset-inline-end')).toBe('0');
    expect(value('.mtrl-fab-menu--medium', 'width')).toBe('80px');
    expect(value('.mtrl-fab-menu--large', 'height')).toBe('96px');
  });

  test('the list: 8dp above the close button, items 4dp apart, end-aligned', () => {
    expect(value('.mtrl-fab-menu__list', 'bottom')).toBe('calc(100% + 8px)');
    expect(value('.mtrl-fab-menu__list', 'gap')).toBe('4px');
    expect(value('.mtrl-fab-menu__list', 'align-items')).toBe('flex-end');
    expect(value('.mtrl-fab-menu__list', 'overflow-y')).toBe('auto');
  });

  test('an item: a 56dp pill, 24dp at each end, 24dp icon 8dp from a title-medium label', () => {
    const item = '.mtrl-fab-menu__item';
    const content = '.mtrl-fab-menu__item-content';
    expect(value(item, 'height')).toBe('56px');
    expect(value(content, 'min-width')).toBe('56px');
    expect(value(content, 'padding')).toBe('0 24px');
    expect(value(content, 'gap')).toBe('8px');
    expect(value(item, 'border-radius')).toBe(corner(9999));
    expect(value(item, 'font-size')).toBe('16px');
    expect(value(item, 'font-weight')).toBe('500');
    expect(value('.mtrl-fab-menu__item-icon', 'width')).toBe('24px');
    expect(value(item, 'box-shadow')).toBeUndefined();
  });

  test('the colour sets: the close button on the role, the items on its container', () => {
    for (const role of ['primary', 'secondary', 'tertiary']) {
      const set = `.mtrl-fab-menu--${role}`;
      expect(value(set, '--mtrl-fab-menu-close')).toBe(`var(--mtrl-sys-color-${role})`);
      expect(value(set, '--mtrl-fab-menu-on-close')).toBe(`var(--mtrl-sys-color-on-${role})`);
      expect(value(set, '--mtrl-fab-menu-item')).toBe(`var(--mtrl-sys-color-${role}-container)`);
      expect(value(set, '--mtrl-fab-menu-on-item')).toBe(`var(--mtrl-sys-color-on-${role}-container)`);
    }
  });

  test('items reveal their width on FastSpatial and fade on FastEffects, after their delay', () => {
    const transition = base('.mtrl-fab-menu__item', 'transition') ?? '';
    expect(transition).toContain('opacity 175ms');
    expect(transition).toContain('width 425ms');
    expect(value('.mtrl-fab-menu__item', 'transition-delay')).toBe('var(--mtrl-fab-menu-delay, 0ms)');
    // A pill at every width, its content end-anchored and clipped at the start (FLO-348)
    expect(value('.mtrl-fab-menu__item', 'width')).toBe('0');
    expect(value('.mtrl-fab-menu__item', 'overflow')).toBe('hidden');
    expect(value('.mtrl-fab-menu__item', 'justify-content')).toBe('flex-end');
    expect(value('.mtrl-fab-menu__item-content', 'flex-shrink')).toBe('0');
    expect(value('.mtrl-fab-menu--open .mtrl-fab-menu__item', 'width')).toBe('var(--mtrl-fab-menu-item-width, auto)');
    expect(css).not.toContain('clip-path');
  });

  test('reduced motion: no stagger, no movement, a fade only', () => {
    const block = reduced();
    // The shorthand resets the delay: no stagger
    expect(block).toMatch(/\.mtrl-fab-menu__item\s*\{[^}]*transition: opacity 175ms[^;]*;/);
    expect(block).not.toMatch(/\.mtrl-fab-menu__item[^{]*\{[^}]*transition-delay/);
    expect(block).toMatch(/\.mtrl-fab\.mtrl-fab-menu__fab\s*\{[^}]*transition: background-color 175ms[^;]*, color 175ms[^;]*;/);
  });

  test('colours move on the clamped spring: never past their target', () => {
    const transition = base('.mtrl-fab.mtrl-fab-menu__fab', 'transition') ?? '';
    const easing = (property: string) => transition.split(/,\s*(?=[a-z-]+ \d)/).find((part) => part.startsWith(`${property} `)) ?? '';
    for (const property of ['background-color', 'color']) {
      const points = [...easing(property).matchAll(/linear\(([^)]*)\)/g)][0]?.[1].split(',').map(Number) ?? [];
      expect(points.length).toBe(25);
      expect(Math.max(...points)).toBeLessThanOrEqual(1);
    }
    // Size and corner keep the spring's overshoot, as Compose's Dp lerp does
    const width = [...easing('width').matchAll(/linear\(([^)]*)\)/g)][0]?.[1].split(',').map(Number) ?? [];
    expect(Math.max(...width)).toBeCloseTo(1.094, 3);
  });

  test('the menu presentation shows no list', () => {
    expect(value('.mtrl-fab-menu--menu .mtrl-fab-menu__list', 'display')).toBe('none');
  });
});
