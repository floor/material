// test/styles/list.test.ts
//
// The list stylesheet's two variants. Standard is M3's baseline list: no
// container, square rows in every state. Segmented is the expressive list
// (Compose ListItemDefaults.segmentedShapes, ListTokens.SegmentedGap): rows
// paint their own colour and shape, 2px apart.
import { describe, test, expect, beforeAll } from 'bun:test';
import { compileString } from 'sass';

let css = '';
let blocks: Array<{ selectors: string[]; body: string }> = [];

const SEG = '.mtrl-list--segmented > .mtrl-list__content';
const ITEM = '.mtrl-list__item';

const declared = (selector: string, property: string): string | undefined =>
  blocks
    .filter((block) => block.selectors.includes(selector))
    .map((block) => block.body.match(new RegExp(`(?:^|;|\\n)\\s*${property}\\s*:\\s*([^;]+);`))?.[1].trim())
    .filter((v): v is string => v !== undefined)
    .pop();

beforeAll(() => {
  css = compileString(`@use 'components/list';`, { loadPaths: ['src/styles'], style: 'expanded' }).css;
  blocks = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g), (m) => ({
    selectors: m[1].split(',').map((s) => s.trim().replace(/\s+/g, ' ')),
    body: m[2],
  }));
});

describe('list stylesheet: the container, both variants', () => {
  test('the list paints no background and has no radius', () => {
    expect(declared('.mtrl-list', 'background')).toBeUndefined();
    expect(declared('.mtrl-list', 'background-color')).toBeUndefined();
    expect(declared('.mtrl-list', 'border-radius')).toBeUndefined();
  });
});

describe('list stylesheet: standard', () => {
  test('no rule outside the segmented variant rounds a row, its action or its state layer', () => {
    const rounding = blocks.filter((block) =>
      /border(-[a-z]+)*-radius\s*:/.test(block.body) &&
      block.selectors.some((selector) =>
        /\.mtrl-list__(item|action)(?![\w-]*(leading|trailing))/.test(selector) &&
        !selector.includes('.mtrl-list--segmented') &&
        !/__(leading|trailing)/.test(selector)));
    const values = rounding.flatMap((block) => Array.from(block.body.matchAll(/border(?:-[a-z]+)*-radius\s*:\s*([^;]+);/g), (m) => m[1].trim()));
    // The action and its ::before follow the row: `inherit`, which is 0 on a square row.
    expect(values.filter((value) => value !== 'inherit')).toEqual([]);
  });
  test('a row paints surface, or --mtrl-list-item-container-color', () => {
    expect(declared('.mtrl-list__item', 'background'))
      .toBe('var(--mtrl-list-item-container-color, var(--mtrl-sys-color-surface))');
  });
  test('no gap between rows', () => {
    expect(declared('.mtrl-list__content', 'gap')).toBeUndefined();
  });
});

describe('list stylesheet: segmented', () => {
  test('rows are 2px apart: --mtrl-list-segmented-gap', () => {
    expect(declared(SEG, 'gap')).toBe('var(--mtrl-list-segmented-gap, 2px)');
  });
  test('a row paints its own container colour: --mtrl-list-item-container-color', () => {
    expect(declared(`${SEG} > ${ITEM}:not(.mtrl-list__item--selected)`, 'background'))
      .toBe('var(--mtrl-list-item-container-color, var(--mtrl-sys-color-surface-container))');
    expect(declared('.mtrl-list__item--selected', 'background')).toBe('var(--mtrl-sys-color-secondary-container)');
  });
  test('rest 4px, outer 16px, hovered 12px, focused, pressed and selected 16px', () => {
    const large = 'var(--mtrl-sys-shape-corner-large, 16px)';
    expect(declared(`${SEG} > ${ITEM}`, 'border-radius')).toBe('var(--mtrl-list-item-shape, var(--mtrl-sys-shape-corner-extra-small, 4px))');
    expect(declared(`${SEG} > ${ITEM}:first-child`, 'border-start-start-radius')).toBe(`var(--mtrl-list-item-shape-outer, ${large})`);
    expect(declared(`${SEG} > ${ITEM}:first-child`, 'border-start-end-radius')).toBe(`var(--mtrl-list-item-shape-outer, ${large})`);
    expect(declared(`${SEG} > ${ITEM}:last-child`, 'border-end-start-radius')).toBe(`var(--mtrl-list-item-shape-outer, ${large})`);
    expect(declared(`${SEG} > ${ITEM}:last-child`, 'border-end-end-radius')).toBe(`var(--mtrl-list-item-shape-outer, ${large})`);
    expect(declared(`${SEG} > ${ITEM}:hover:not(.mtrl-list__item--disabled):not(.mtrl-list__item--selected)`, 'border-radius'))
      .toBe('var(--mtrl-list-item-shape-hover, var(--mtrl-sys-shape-corner-medium, 12px))');
    expect(declared(`${SEG} > ${ITEM}:active:not(.mtrl-list__item--disabled):not(.mtrl-list__item--selected)`, 'border-radius'))
      .toBe(`var(--mtrl-list-item-shape-active, ${large})`);
    expect(declared(`${SEG} > ${ITEM}:has(.mtrl-list__action:focus-visible):not(.mtrl-list__item--disabled):not(.mtrl-list__item--selected)`, 'border-radius'))
      .toBe(`var(--mtrl-list-item-shape-active, ${large})`);
    expect(declared(`${SEG} > ${ITEM}.mtrl-list__item--selected`, 'border-radius')).toBe(`var(--mtrl-list-item-shape-active, ${large})`);
  });
  test('a divider or a subheader ends a group: the rows beside it take their outer corners', () => {
    expect(declared(`${SEG} > :not(${ITEM}) + ${ITEM}`, 'border-start-start-radius')).toBeDefined();
    expect(declared(`${SEG} > ${ITEM}:has(+ :not(${ITEM}))`, 'border-end-end-radius')).toBeDefined();
  });
  test('the six custom properties are read with fallbacks and declared nowhere', () => {
    for (const name of ['item-shape', 'item-shape-outer', 'item-shape-hover', 'item-shape-active', 'segmented-gap', 'item-container-color']) {
      expect([name, css.includes(`var(--mtrl-list-${name},`)]).toEqual([name, true]);
      expect([name, new RegExp(`--mtrl-list-${name}\\s*:`).test(css)]).toEqual([name, false]);
    }
  });
});
