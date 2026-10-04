// test/styles/toolbar-item-shape.test.ts
//
// Inside a toolbar, a round icon button keeps its round radius in every
// state: m3.material.io toolbars show a selected item through colour alone
// (the toolbar token set has no item shape tokens) and warn that a square
// shape "conflicts with the fully-rounded shape of the floating toolbar
// container", while a standalone toggle icon button morphs round to square
// when selected and to a smaller radius when pressed (icon buttons specs).
// The morph rules read --mtrl-icon-button-shape-selected/-pressed between
// the explicit --mtrl-button-shape-* override and their own fallback, so a
// standalone button is unchanged and a toolbar pins the resting radius.
import { beforeAll, describe, expect, test } from 'bun:test';
import { compileString } from 'sass';

const round = { xs: '16px', s: '20px', m: '28px', l: '48px', xl: '68px' } as const;

const compile = (source: string): string =>
  compileString(`@use 'components/${source}';`, { loadPaths: ['src/styles'], style: 'expanded' }).css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\n/g, ', ');

const value = (css: string, selector: string, property: string): string | undefined => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Array.from(css.matchAll(new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`, 'g')))
    .flatMap(([, , block]) => Array.from(block.matchAll(/([\w-]+)\s*:\s*([^;]+);/g)))
    .filter(([, name]) => name === property)
    .map(([, , result]) => result.trim())
    .pop();
};

let buttons = '';
let toolbar = '';

beforeAll(() => {
  buttons = compile('icon-button');
  toolbar = compile('toolbar');
});

describe('icon button morphs read the toolbar context', () => {
  test('a round button morphs to the square radius unless a container pins its shape', () => {
    const selected = '.mtrl-icon-button--selected.mtrl-icon-button--round:not(:active)';
    expect(value(buttons, selected, 'border-radius'))
      .toBe(`var(--mtrl-button-shape-selected, var(--mtrl-icon-button-shape-selected, var(--mtrl-sys-shape-corner-medium, 12px)))`);
    const pressed = '.mtrl-icon-button:active.mtrl-icon-button--round';
    expect(value(buttons, pressed, 'border-radius'))
      .toBe(`var(--mtrl-button-shape-pressed, var(--mtrl-icon-button-shape-pressed, var(--mtrl-sys-shape-corner-small, 8px)))`);
  });

  test('a square button and a plain radius override are unchanged', () => {
    const selected = '.mtrl-icon-button--selected.mtrl-icon-button--square:not(:active)';
    expect(value(buttons, selected, 'border-radius')).toBe(`var(--mtrl-button-shape-selected, ${round.s})`);
    const pressed = '.mtrl-icon-button:active.mtrl-icon-button--square';
    expect(value(buttons, pressed, 'border-radius')).toBe(`var(--mtrl-button-shape-pressed, var(--mtrl-sys-shape-corner-small, 8px))`);
  });
});

describe('a toolbar keeps its round items round', () => {
  test('inside a toolbar the selected and pressed radii equal the resting radius per size', () => {
    // The resting radius per size is `round` above; the toolbar stylesheet
    // (which an m-toolbar root loads with the icon button's) pins the morph
    // targets to it, so selected and pressed resolve to the radius the
    // unselected button already has.
    const at = (size: keyof typeof round, selector: string) => {
      const pins = [value(toolbar, selector, '--mtrl-icon-button-shape-selected'),
        value(toolbar, selector, '--mtrl-icon-button-shape-pressed')];
      expect(pins).toEqual([round[size], round[size]]);
    };
    at('s', '.mtrl-toolbar .mtrl-icon-button--round');
    at('xs', '.mtrl-toolbar .mtrl-icon-button--round.mtrl-icon-button--xs');
    at('m', '.mtrl-toolbar .mtrl-icon-button--round.mtrl-icon-button--m');
    at('l', '.mtrl-toolbar .mtrl-icon-button--round.mtrl-icon-button--l');
    at('xl', '.mtrl-toolbar .mtrl-icon-button--round.mtrl-icon-button--xl');
  });

  test('the toolbar root declares the default its slotted hosts inherit', () => {
    // <m-icon-button> slotted into <m-toolbar> lives behind its own shadow
    // root, which no descendant selector reaches: it inherits the toolbar
    // root's pin, the radius of the toolbar's 40dp items.
    expect(value(toolbar, '.mtrl-toolbar', '--mtrl-icon-button-shape-selected')).toBe(round.s);
    expect(value(toolbar, '.mtrl-toolbar', '--mtrl-icon-button-shape-pressed')).toBe(round.s);
  });

  test('square items keep their morphs inside a toolbar', () => {
    expect(toolbar).not.toContain('.mtrl-toolbar .mtrl-icon-button--square');
    // The pins live in the toolbar's sheet, so an icon button root that
    // never loads it stays at its standalone size.
    expect(buttons).not.toContain('.mtrl-toolbar');
  });
});
