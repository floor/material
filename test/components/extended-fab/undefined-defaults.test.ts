// test/components/extended-fab/undefined-defaults.test.ts
//
// A spread options object passes variant and width as keys whose values are
// undefined. The merge copies that undefined over "primary-container" and
// "fixed", and both classes are added only for a truthy value, so the button
// loses its default colour class and its width class. keepDefaults restores
// those keys after the same merge as before. The user config is not rebuilt,
// so a prototype getter, a non-enumerable class, and a symbol still arrive,
// and null and false stay as given.
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
const { createBaseConfig } = await import('../../../src/components/extended-fab/config');

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

test('a className given by a prototype getter still renders', () => {
  const proto = {};
  Object.defineProperty(proto, 'className', { get: () => 'from-proto' });
  const given = Object.assign(Object.create(proto), { text: 'Create' });
  const fab = createExtendedFab(given);
  expect(fab.element.classList.contains('from-proto')).toBe(true);
  fab.destroy();
});

test('an own non-enumerable class still renders', () => {
  const given = { text: 'Create' };
  Object.defineProperty(given, 'class', { value: 'from-own', enumerable: false });
  const fab = createExtendedFab(given);
  expect(fab.element.classList.contains('from-own')).toBe(true);
  fab.destroy();
});

test('an enumerable symbol key is kept, and null and false stay as given', () => {
  const mark = Symbol('mark');
  const merged = createBaseConfig({ text: 'Create', variant: null as unknown as string, ripple: false, [mark]: 'kept' });
  expect(Reflect.get(merged, mark)).toBe('kept');
  expect(merged.variant).toBe(null);
  expect(merged.ripple).toBe(false);
});
