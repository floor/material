// test/components/tooltip/undefined-variant.test.ts
//
// A spread options object passes variant as a key whose value is undefined.
// The merge copies that undefined over "default", and the class is
// interpolated, so the element is `mtrl-tooltip--undefined` and misses the
// default variant's 40px min-width. keepDefaults restores that key after the
// same merge as before. The user config is not rebuilt, so a prototype
// getter, a non-enumerable class, and a symbol still arrive, and null and
// false stay as given.
import { afterAll, expect, test } from 'bun:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLButtonElement', 'Element', 'Node', 'Event', 'MouseEvent', 'FocusEvent', 'KeyboardEvent', 'CustomEvent', 'MutationObserver']) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: name === 'window' ? dom.window : Reflect.get(dom.window, name) });
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
globalThis.cancelAnimationFrame = () => {};
afterAll(() => dom.window.close());

const { default: createTooltip } = await import('../../../src/components/tooltip');
const { createBaseConfig } = await import('../../../src/components/tooltip/config');

const target = document.createElement('button');
target.textContent = 'Save';
document.body.append(target);

test('a spread that leaves variant undefined keeps the default class', () => {
  const options: { variant?: string } = {};
  const tooltip = createTooltip({ text: 'Save', target, variant: options.variant });
  expect(tooltip.element.classList.contains('mtrl-tooltip--default')).toBe(true);
  expect(tooltip.element.className.includes('undefined')).toBe(false);
  tooltip.destroy();
});

test('an explicit variant still replaces the default', () => {
  const tooltip = createTooltip({ text: 'Save', target, variant: 'rich' });
  expect(tooltip.element.classList.contains('mtrl-tooltip--rich')).toBe(true);
  expect(tooltip.element.classList.contains('mtrl-tooltip--default')).toBe(false);
  tooltip.destroy();
});

test('a className given by a prototype getter still renders', () => {
  const proto = {};
  Object.defineProperty(proto, 'className', { get: () => 'from-proto' });
  const given = Object.assign(Object.create(proto), { text: 'Save', target });
  const tooltip = createTooltip(given);
  expect(tooltip.element.classList.contains('from-proto')).toBe(true);
  tooltip.destroy();
});

test('an own non-enumerable class still renders', () => {
  const given = { text: 'Save', target };
  Object.defineProperty(given, 'class', { value: 'from-own', enumerable: false });
  const tooltip = createTooltip(given);
  expect(tooltip.element.classList.contains('from-own')).toBe(true);
  tooltip.destroy();
});

test('an enumerable symbol key is kept, and null and false stay as given', () => {
  const mark = Symbol('mark');
  const merged = createBaseConfig({ text: 'Save', target, variant: null as unknown as string, showOnHover: false, [mark]: 'kept' });
  expect(Reflect.get(merged, mark)).toBe('kept');
  expect(merged.variant).toBe(null);
  expect(merged.showOnHover).toBe(false);
});
