import { afterEach, beforeEach, expect, test } from 'bun:test';
import { JSDOM } from 'jsdom';
import createExtendedFab from '../../../src/components/extended-fab';
import type { ExtendedFabComponent, ExtendedFabConfig } from '../../../src/components/extended-fab/types';

// #232. config.ts read `config.ariaLabel || config.text || (config.icon ? "action" : undefined)`.
// The visible text already names the button, so copying it was redundant; a
// Node as text (<m-extended-fab> passes its <slot>) became
// "[object HTMLSlotElement]"; and no text at all became "action", the name
// FLO-110 removed from the FAB. Only an explicit ariaLabel sets the attribute.

let dom: JSDOM;
let fabs: ExtendedFabComponent[];
const icon = '<svg data-icon="add" viewBox="0 0 24 24"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/></svg>';

beforeEach(() => {
  dom = new JSDOM('<!doctype html><body></body>', { pretendToBeVisual: true });
  for (const name of ['window', 'document', 'HTMLElement', 'HTMLButtonElement', 'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent']) {
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: name === 'window' ? dom.window : Reflect.get(dom.window, name) });
  }
  globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  fabs = [];
});
afterEach(() => { fabs.forEach(fab => fab.destroy()); dom.window.close(); });
const make = (config: ExtendedFabConfig): ExtendedFabComponent => {
  const fab = createExtendedFab(config);
  document.body.append(fab.element); fabs.push(fab); return fab;
};

test('text alone sets no aria-label: the visible text is the name', () => {
  const fab = make({ icon, text: 'Compose' });
  expect(fab.element.hasAttribute('aria-label')).toBe(false);
  expect(fab.element.textContent?.trim()).toBe('Compose');
});

test('an explicit ariaLabel is set', () => {
  const fab = make({ icon, text: 'Compose', ariaLabel: 'Compose a new message' });
  expect(fab.element.getAttribute('aria-label')).toBe('Compose a new message');
});

test('no "action" fallback when there is neither text nor a label', () => {
  const fab = make({ icon });
  expect(fab.element.getAttribute('aria-label')).not.toBe('action');
  expect(fab.element.hasAttribute('aria-label')).toBe(false);
});

test('a Node as text does not become an aria-label', () => {
  const slot = document.createElement('slot');
  const fab = make({ icon, text: slot as never });
  expect(fab.element.hasAttribute('aria-label')).toBe(false);
  expect(fab.element.getAttribute('aria-label')).not.toBe('[object HTMLSlotElement]');
});
