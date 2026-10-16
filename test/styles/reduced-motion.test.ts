// test/styles/reduced-motion.test.ts
//
// With reduced motion on, movement stops and fades stay (N43). The reset
// used to set every transition to 0.01ms with !important, so dialogs, sheets
// and menus cut in and out with no fade at all, and no component's own
// reduced-motion rule could say otherwise.
import { describe, test, expect, beforeAll } from 'bun:test';
import { compileString } from 'sass';
import { BASE_HOST_STYLES } from '../../src/elements/define';

let block = '';

beforeAll(() => {
  const css = compileString(`@use 'base/reset';`, { loadPaths: ['src/styles'], style: 'expanded' }).css;
  block = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
});

describe('reduced motion', () => {
  test('transitions are limited to the properties that fade', () => {
    expect(block).toContain('transition-property: opacity, color, background-color, border-color, outline-color, box-shadow, visibility !important;');
    expect(block).not.toContain('transition-duration');
  });

  test('smooth scrolling still stops', () => {
    expect(block).toContain('scroll-behavior: auto !important;');
  });
});

// The reset above is a document rule, and a document rule does not
// match inside a shadow tree: an element's shadow root adopts its host sheet,
// the ripple's and its component entries, none of which carried it. The host
// sheet holds a copy, and this keeps the two from drifting.
describe('reduced motion inside the elements\' shadow roots', () => {
  const normal = (css: string): string => css.replace(/\s+/g, '');

  test('the host sheet every shadow root adopts carries the reset\'s rule, declaration for declaration', () => {
    const compressed = compileString(`@use 'base/reset';`, { loadPaths: ['src/styles'], style: 'compressed' }).css;
    const rule = compressed.match(/@media\(prefers-reduced-motion: reduce\)\{.*?(\*,\*::before,\*::after\{[^}]*\})\}/)?.[1] ?? '';
    expect(rule).toContain('transition-property:opacity,color,background-color,border-color,outline-color,box-shadow,visibility');
    const host = BASE_HOST_STYLES.match(/@media \(prefers-reduced-motion:reduce\)\{(.*)\}$/)?.[1] ?? '';
    expect(normal(host)).toBe(normal(rule));
  });
});
