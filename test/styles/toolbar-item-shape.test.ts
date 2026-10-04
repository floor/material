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
//
// The pin reaches only the bar's direct items: a round icon button that is a
// child of the bar in the same tree, and a host assigned to the bar's
// default slot (matched by ::slotted() where it is assigned, per [size=…]
// for the sizes). The slotted selectors match the marker attribute every
// icon-button host of this library carries whatever its tag prefix
// (src/elements/icon-button.ts), not the tag: the page chooses the prefix
// and the sheet cannot spell it. Content deeper than that — the overflow
// slot's, a dialog opened from the bar, a composite child — matches nothing
// and keeps the standalone morphs; nothing is declared on the toolbar root
// to inherit.
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

/** The bar's direct items of one size, both channels in one rule. */
const items = (size: keyof typeof round): string => {
  const suffix = size === 's' ? '' : `.mtrl-icon-button--${size}`;
  const attr = size === 's' ? '' : `[size=${size}]`;
  return `.mtrl-toolbar .mtrl-toolbar__bar > .mtrl-icon-button--round${suffix}, slot:not([name])::slotted([data-mtrl-icon-button]${attr})`;
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
  test('the bar\'s direct items pin selected and pressed to their own resting radius per size', () => {
    // The radii mirror the icon button's round radii, half the container
    // height per size (styles/components/_icon-button.scss, which owns
    // them), for both channels: the same-tree child of the bar and the host
    // assigned to the bar's default slot.
    for (const size of Object.keys(round) as Array<keyof typeof round>) {
      const pins = [value(toolbar, items(size), '--mtrl-icon-button-shape-selected'),
        value(toolbar, items(size), '--mtrl-icon-button-shape-pressed')];
      expect(pins).toEqual([round[size], round[size]]);
    }
  });

  test('the pin is not inherited from the toolbar root', () => {
    // Nothing is declared on .mtrl-toolbar itself: an inherited pin would
    // follow the flat tree past the direct items, into the overflow slot's
    // content and everything opened from the bar.
    expect(value(toolbar, '.mtrl-toolbar', '--mtrl-icon-button-shape-selected')).toBeUndefined();
    expect(value(toolbar, '.mtrl-toolbar', '--mtrl-icon-button-shape-pressed')).toBeUndefined();
    expect(toolbar).not.toContain('.mtrl-toolbar .mtrl-icon-button');
  });

  test('the slotted pin matches the marker, never a tag', () => {
    // The sheet is built once and cannot know the prefix a page chose; a tag
    // selector would leave a custom-prefix host unpinned.
    expect(toolbar).not.toContain('::slotted(m-icon-button');
    expect(toolbar).toContain('::slotted([data-mtrl-icon-button])');
  });

  test('square items keep their morphs inside a toolbar', () => {
    expect(toolbar).not.toContain('.mtrl-toolbar .mtrl-icon-button--square');
    // The pins live in the toolbar's sheet, so an icon button root that
    // never loads it stays at its standalone size.
    expect(buttons).not.toContain('.mtrl-toolbar');
  });
});
