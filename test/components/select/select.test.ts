// test/components/select/select.test.ts
//
// The real select in a JSDOM document: choosing through its menu, and menu
// items whose data is not a select option.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.HTMLInputElement = dom.window.HTMLInputElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.CustomEvent = dom.window.CustomEvent;
g.MutationObserver = dom.window.MutationObserver;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };

import createSelect from '../../../src/components/select';
import { setIcons } from '../../../src/core/icons/registry';

const after = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const options = [
  { id: 'apple', text: 'Apple' },
  { id: 'banana', text: 'Banana' },
];

const menuItems = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('.mtrl-menu__item'));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('select', () => {
  test('choosing an option through the menu selects it and emits change with the option', async () => {
    const select = createSelect({ label: 'Fruit', options });
    document.body.appendChild(select.element);
    const chosen: unknown[] = [];
    select.on('change', (event) => chosen.push(event.option));

    select.open();
    await after(200);
    menuItems(document.body)[1]!.click();

    expect(select.getValue()).toBe('banana');
    expect(chosen).toHaveLength(1);
    expect(chosen[0]).toBe(options[1]);
    select.destroy();
  });

  test('menu items with string data warn once on selection instead of throwing', async () => {
    const warnings: unknown[][] = [];
    const errors: unknown[] = [];
    const warn = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(args); };
    const onError = (event: ErrorEvent) => { errors.push(event.error); };
    dom.window.addEventListener('error', onError);
    try {
      // the caller's own items replace the select's, so the data is theirs
      const menu = { maxHeight: '200px', items: [{ id: 'apple', text: 'Apple', data: 'apple' }] };
      const select = createSelect({ label: 'Fruit', options, menu });
      document.body.appendChild(select.element);

      select.open();
      await after(200);
      menuItems(document.body)[0]!.click();

      expect(errors).toEqual([]);
      expect(warnings.filter((args) => String(args[0]).includes('Invalid menu selection'))).toHaveLength(1);
      expect(select.getValue()).toBeNull();
      select.destroy();
    } finally {
      console.warn = warn;
      dom.window.removeEventListener('error', onError);
    }
  });
});

test('select.textField is the text field; 3.0.0 keeps no textfield alias, which reads undefined', () => {
  const select = createSelect({ label: 'Fruit', options });
  expect(select.textField).toBeDefined();
  expect((select as unknown as Record<string, unknown>).textfield).toBeUndefined();
  expect('textfield' in select).toBe(false);
  select.destroy();
});

// The field triangle, as the DOM serializes it. Select has no glyph option.
// Opening the menu does not read the registry again.
const DROPDOWN_GLYPH = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"></path><path d="M7 10l5 5 5-5H7z"></path></svg>';
const dropdownGlyph = (select: ReturnType<typeof createSelect>) =>
  select.element.querySelector('.mtrl-text-field__trailing-icon')!.innerHTML;

describe('select: the icon registry', () => {
  afterEach(() => setIcons({ 'expand-more': null }));

  test('the field draws the exact built-in triangle while the registry is empty', () => {
    const select = createSelect({ label: 'Fruit', options });
    expect(dropdownGlyph(select)).toBe(DROPDOWN_GLYPH);
    select.destroy();
  });

  test('setIcons replaces the triangle and clearing restores the built-in', () => {
    setIcons({ 'expand-more': '<i>more</i>' });
    const replaced = createSelect({ label: 'Fruit', options });
    expect(dropdownGlyph(replaced)).toBe('<i>more</i>');
    replaced.destroy();
    setIcons({ 'expand-more': null });
    const restored = createSelect({ label: 'Fruit', options });
    expect(dropdownGlyph(restored)).toBe(DROPDOWN_GLYPH);
    restored.destroy();
  });

  test('a select reads the registry when it is created, not when it opens', async () => {
    const created = createSelect({ label: 'Fruit', options });
    document.body.appendChild(created.element);
    setIcons({ 'expand-more': '<i>later</i>' });
    created.open();
    await after(200);
    expect(dropdownGlyph(created)).toBe(DROPDOWN_GLYPH);
    const next = createSelect({ label: 'Fruit', options });
    expect(dropdownGlyph(next)).toBe('<i>later</i>');
    created.destroy();
    next.destroy();
  });
});
