// test/components/extended-fab/undefined-defaults.test.ts
//
// A spread options object passes variant and width as keys whose values are
// undefined. The merge copied that undefined over "primary-container" and
// "fixed", and both classes are added only for a truthy value, so the button
// lost its default colour class and its width class. Undefined keys are
// dropped before the merge, so the documented defaults and the spread agree.
import { afterAll, expect, test } from 'bun:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLButtonElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent']) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: name === 'window' ? dom.window : Reflect.get(dom.window, name) });
}
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
afterAll(() => dom.window.close());

const { default: createExtendedFab } = await import('../../../src/components/extended-fab');

test('a spread that leaves variant and width undefined keeps the default class and width', () => {
  const options: { variant?: string; width?: string } = {};
  const fab = createExtendedFab({ text: 'Create', variant: options.variant, width: options.width });
  expect(fab.element.classList.contains('mtrl-extended-fab--primary-container')).toBe(true);
  expect(fab.element.classList.contains('mtrl-extended-fab--fixed')).toBe(true);
  fab.destroy();
});

test('an explicit variant and width still replace the defaults', () => {
  const fab = createExtendedFab({ text: 'Create', variant: 'tertiary', width: 'fluid' });
  expect(fab.element.classList.contains('mtrl-extended-fab--tertiary')).toBe(true);
  expect(fab.element.classList.contains('mtrl-extended-fab--fluid')).toBe(true);
  expect(fab.element.classList.contains('mtrl-extended-fab--primary-container')).toBe(false);
  expect(fab.element.classList.contains('mtrl-extended-fab--fixed')).toBe(false);
  fab.destroy();
});
