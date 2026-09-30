// test/styles/shape-tokens.test.ts
//
// FLO-331: the corners of these components read the shape scale's tokens
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
  search: {},
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
  'segmented-button': {
    '16px': 'outer corners, half the height, beside square inner ones',
    '18px': 'outer corners, half the height',
    '20px': 'outer corners, half the height',
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

describe('corner radii read the shape tokens (FLO-331)', () => {
  for (const [component, allowed] of Object.entries(LITERAL)) {
    test(`${component}: every literal radius is listed with its reason`, () => {
      expect(literals(component)).toEqual(Object.keys(allowed).sort());
    });
  }
});
