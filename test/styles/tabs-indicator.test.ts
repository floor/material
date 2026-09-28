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
