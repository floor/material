// FLO-248. The indicator is absolutely positioned and moved with translateX from
// the scroll container's left edge, so it has to start at that edge. With no
// `left` it sat at its static position: 0 in the fixed row, but past the 52px
// padding-inline of the scrollable row, which offset it under every tab.
import { beforeAll, expect, test } from 'bun:test';
import { compileString } from 'sass';

let css: string;
const value = (selector: string, property: string) =>
  Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter(([, selectors]) => selectors.split(',').some(s => s.trim() === selector))
    .flatMap(([, , declarations]) => Array.from(declarations.matchAll(/([\w-]+):\s*([^;]+);/g)))
    .filter(([, name]) => name === property)
    .map(([, , result]) => result.trim()).pop();

beforeAll(() => {
  css = compileString("@use 'components/tabs';", { loadPaths: ['src/styles'] }).css.replace(/\/\*[\s\S]*?\*\//g, '');
});

test('the indicator starts at the left edge the script measures from', () => {
  expect(value('.mtrl-tabs__indicator', 'position')).toBe('absolute');
  expect(value('.mtrl-tabs__indicator', 'left')).toBe('0');
});

test('the scrollable row keeps its edge padding, which the indicator must not inherit', () => {
  expect(value('.mtrl-tabs--scrollable .mtrl-tabs__scroll', 'padding-inline')).toBe('52px');
});

// FLO-262: the conformance audit against m3.material.io tabs specs.
test('the primary indicator has the shape 3, 3, 0, 0 and sits on the bottom edge', () => {
  expect(value('.mtrl-tabs--primary .mtrl-tabs__indicator', 'border-radius')).toBe('3px 3px 0 0');
  expect(value('.mtrl-tabs__indicator', 'bottom')).toBe('0');
});

test('the indicator moves on the default spatial spring', () => {
  expect(value('.mtrl-tabs__indicator', 'transition')).toMatch(/^transform \d+ms linear\(.+\), width \d+ms linear\(/);
});

test('the label is Title Small', () => {
  const titleSmall = compileString("@use 'abstract/mixins' as m; .t { @include m.typography('title-small'); }", { loadPaths: ['src/styles'] }).css;
  const size = titleSmall.match(/font-size:\s*([^;]+);/)![1];
  expect(value('.mtrl-button.mtrl-tab', 'font-size')).toBe(size);
});

test('the focus ring is md.comp.focus-ring, 3dp in secondary, drawn inward', () => {
  expect(value('.mtrl-button.mtrl-tab:focus-visible', 'outline')).toBe('3px solid var(--mtrl-sys-color-secondary)');
  expect(value('.mtrl-button.mtrl-tab:focus-visible', 'outline-offset')).toBe('-3px');
  expect(css).not.toMatch(/\.mtrl-tab[^{]*\{[^}]*outline-color/);
});

test('a tab with an icon keeps 16dp on both sides', () => {
  expect(value('.mtrl-button.mtrl-tab.mtrl-button--icon', 'padding')).toBe('0 16px');
});

test('an inactive tab turns on-surface in every state, over the M3 layer colours', () => {
  const inactive = '.mtrl-tabs--primary .mtrl-button.mtrl-tab:not(.mtrl-button.mtrl-tab--active):not(.mtrl-button.mtrl-tab--disabled):not(:disabled)';
  expect(value(`${inactive}:hover`, 'color')).toBe('var(--mtrl-sys-color-on-surface)');
  expect(value(`${inactive}:hover`, 'background-color')).toContain('var(--mtrl-sys-color-on-surface) 8%');
  expect(value(`${inactive}:focus-visible`, 'background-color')).toContain('var(--mtrl-sys-color-on-surface) 10%');
  expect(value(`${inactive} .mtrl-ripple-wave`, 'background-color')).toBe('var(--mtrl-sys-color-primary)');
  expect(css).not.toContain('5px 5px 0 0');
});
