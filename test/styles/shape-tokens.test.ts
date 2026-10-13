// test/styles/shape-tokens.test.ts
//
// The corners of these components read the shape scale's tokens
// (`var(--mtrl-sys-shape-corner-<step>, <px>)`). A radius left literal is
// listed here with its reason; any other literal fails, and so does a listed
// one that is gone.
import { describe, expect, test } from 'bun:test';
import { compileString } from 'sass';

const LITERAL: Record<string, Record<string, string>> = {
  badge: {},
  tooltip: {},
  switch: {},
  list: {},
  'navigation-rail': {},
  drawer: {},
  carousel: {},
  dialog: { '4px': 'the scrollable content\'s scrollbar thumb, not a component shape' },
  search: { '56px': 'the bar\'s CornerFull as half its 56px height, under min() with the full token' },
  checkbox: { '2px': 'CheckboxTokens.ContainerShape, 2dp: outside the shape scale' },
  slider: {
    '2px': 'TrackInsideCornerSize, the track segments\' inside corners: 2dp, not a scale step',
    '16px': 'the handle\'s invisible hit area',
  },
  'icon-button': {
    '16px': 'round xs: half the height, so the press morph animates (a 9999px pill does not)',
    '20px': 'round s: half the height',
    '28px': 'round m: half the height',
    '48px': 'round l: half the height',
    '68px': 'round xl: half the height',
  },
  // The outer radius, half the height, is a custom property (see the stylesheet)
  'button-group': {},
  'split-button': {
    '16px': 'outer corners, half the height, beside the small inner ones',
    '20px': 'outer corners, half the height',
    '28px': 'outer corners, half the height',
    '48px': 'outer corners, half the height',
    '68px': 'outer corners, half the height',
  },
  tabs: { '3px': 'the indicator\'s top corners: 3dp in PrimaryNavigationTabTokens, not a scale step' },
  menu: {
    '24px': 'SegmentedMenuTokens.ActiveContainerShape, 24dp: not a scale step',
    '4px': 'the scrollbar thumb, not a component shape',
  },
  chips: {
    '4px': 'the scroll row\'s scrollbar, not a component shape',
    '5px': 'the focus ring\'s offset added to the chip\'s corner token',
  },
};

/** The literal px values in the component's radii, token fallbacks left out. */
const literals = (component: string): string[] => {
  const css = compileString(`@use 'components/${component}';`, { loadPaths: ['src/styles'], style: 'expanded' }).css;
  const values = Array.from(css.matchAll(/border(?:-[a-z]+)*-radius\s*:\s*([^;]+);/g), (m) => m[1]!);
  const found = new Set<string>();
  for (const value of values) {
    const bare = value.replace(/var\(--mtrl-sys-shape-corner-[a-z-]+,\s*[\d.]+px\)/g, '');
    for (const px of bare.match(/\b\d+(?:\.\d+)?px\b/g) ?? []) found.add(px);
  }
  return [...found].sort();
};

describe('the shape scale', () => {
  const tokens = compileString(`@use 'base/tokens';`, { loadPaths: ['src/styles'], style: 'expanded' }).css;

  test('the root emits M3\'s scale and nothing else: no extra-tiny, tiny or pill', () => {
    const steps = Array.from(tokens.matchAll(/--mtrl-sys-shape-corner-([a-z-]+):\s*([^;]+);/g), (m) => `${m[1]} ${m[2]}`);
    expect(steps).toEqual([
      'none 0', 'extra-small 4px', 'small 8px', 'medium 12px', 'large 16px', 'large-increased 20px',
      'extra-large 28px', 'extra-large-increased 32px', 'extra-extra-large 48px', 'full 9999px',
    ]);
  });

  test('a removed step fails to compile, naming the migration', () => {
    for (const step of ['extra-tiny', 'tiny', 'pill']) {
      const read = () => compileString(`@use 'abstract/variables' as v; a { b: v.shape('${step}'); }`, { loadPaths: ['src/styles'] });
      expect(read).toThrow(/No shape step '.+'.*removed in material 3\.0\.0/s);
    }
  });

  test('abstract/theme no longer exports the unused $mtrl-sys-shape map', () => {
    const read = () => compileString(`@use 'abstract/theme' as t; a { b: inspect(t.$mtrl-sys-shape); }`, { loadPaths: ['src/styles'] });
    expect(read).toThrow(/Undefined variable/);
  });

  test('the search bar is round at half its height, a theme\'s full corner still in charge', () => {
    const css = compileString(`@use 'components/search';`, { loadPaths: ['src/styles'], style: 'expanded' }).css;
    const bar = 'min(var(--mtrl-sys-shape-corner-full, 9999px), 56px / 2)';
    const full = Array.from(css.matchAll(/border-radius:\s*([^;]*corner-full[^;]*);/g), (m) => m[1]);
    expect(full.length).toBeGreaterThan(0);
    for (const radius of full) expect(radius).toBe(bar);
    expect(css).not.toContain('sys-shape-corner-pill');
  });

  test('the checkbox reads no removed step', () => {
    const css = compileString(`@use 'components/checkbox';`, { loadPaths: ['src/styles'], style: 'expanded' }).css;
    expect(css).not.toContain('sys-shape-corner-tiny');
  });
});

describe('corner radii read the shape tokens', () => {
  for (const [component, allowed] of Object.entries(LITERAL)) {
    test(`${component}: every literal radius is listed with its reason`, () => {
      expect(literals(component)).toEqual(Object.keys(allowed).sort());
    });
  }
});
