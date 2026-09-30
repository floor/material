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

const reduced = (): string => css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));

beforeAll(() => {
  css = compileString(`@use 'components/fab-menu';`, { loadPaths: ['src/styles'], style: 'expanded' }).css.replace(/,\n\s*/g, ', ');
});

describe('fab menu stylesheet', () => {
  test('the close button: 56dp, round, the colour set role', () => {
    const open = '.mtrl-fab-menu--list.mtrl-fab-menu--open .mtrl-fab-menu__fab';
    expect(value(open, 'width')).toBe('56px');
    expect(value(open, 'height')).toBe('56px');
    expect(value(open, 'border-radius')).toBe(corner(9999));
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
    expect(value(item, 'height')).toBe('56px');
    expect(value(item, 'min-width')).toBe('56px');
    expect(value(item, 'padding')).toBe('0 24px');
    expect(value(item, 'gap')).toBe('8px');
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
    const transition = value('.mtrl-fab-menu__item', 'transition') ?? '';
    expect(transition).toContain('opacity 175ms');
    expect(transition).toContain('clip-path 425ms');
    expect(value('.mtrl-fab-menu__item', 'transition-delay')).toBe('var(--mtrl-fab-menu-delay, 0ms)');
    expect(value('.mtrl-fab-menu__item', 'clip-path')).toBe('inset(0 0 0 100%)');
    expect(value('.mtrl-fab-menu--open .mtrl-fab-menu__item', 'clip-path')).toBe('inset(0)');
  });

  test('reduced motion: no stagger, no movement, a fade only', () => {
    const block = reduced();
    // The shorthand resets the delay: no stagger
    expect(block).toMatch(/\.mtrl-fab-menu__item[^{]*\{[^}]*clip-path: none;[^}]*transition: opacity 175ms[^;]*;/);
    expect(block).not.toMatch(/\.mtrl-fab-menu__item[^{]*\{[^}]*transition-delay/);
    expect(block).toMatch(/\.mtrl-fab\.mtrl-fab-menu__fab\s*\{[^}]*transition: background-color 175ms[^;]*, color 175ms[^;]*;/);
  });

  test('the menu presentation shows no list', () => {
    expect(value('.mtrl-fab-menu--menu .mtrl-fab-menu__list', 'display')).toBe('none');
  });
});
