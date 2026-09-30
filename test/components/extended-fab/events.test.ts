// test/components/extended-fab/events.test.ts
//
// FLO-319: collapse and expand were dispatched only as DOM events on the
// FAB's element, without `composed`, so inside <m-extended-fab>'s shadow root
// they never reached the host, and the emitter never saw them. They now reach
// the emitter too, which the element and the adapters listen to.
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

test('collapse and expand reach the emitter, once each, and the DOM element as before', () => {
  const fab = createExtendedFab({ text: 'Create' });
  document.body.append(fab.element);
  const emitted: string[] = [];
  const dispatched: string[] = [];
  fab.on('collapse', () => emitted.push('collapse')).on('expand', () => emitted.push('expand'));
  fab.element.addEventListener('collapse', () => dispatched.push('collapse'));
  fab.element.addEventListener('expand', () => dispatched.push('expand'));
  fab.collapse();
  fab.expand();
  expect(emitted).toEqual(['collapse', 'expand']);
  expect(dispatched).toEqual(['collapse', 'expand']);
  fab.destroy();
});

test('off removes a collapse handler', () => {
  const fab = createExtendedFab({ text: 'Create' });
  let calls = 0;
  const handler = () => { calls++; };
  fab.on('collapse', handler).off('collapse', handler);
  fab.collapse();
  expect(calls).toBe(0);
  fab.destroy();
});
