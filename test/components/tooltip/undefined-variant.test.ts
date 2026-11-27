// test/components/tooltip/undefined-variant.test.ts
//
// A spread options object passes variant as a key whose value is undefined.
// The merge copied that undefined over "default", and the class is
// interpolated, so the element was `mtrl-tooltip--undefined` and missed the
// default variant's 40px min-width. Undefined keys are dropped before the
// merge, so the documented default and the spread agree.
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
