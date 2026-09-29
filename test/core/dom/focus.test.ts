// test/core/dom/focus.test.ts
//
// #244: `document.activeElement` is the shadow host when focus is inside a
// shadow root, so a component rendered in one never found its focused item.
// activeElementOf reads the node's own root; deepActiveElement follows focus
// through open shadow roots, for focus saved around an overlay.
import { describe, test, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';
import { activeElementOf, deepActiveElement, tabStops, wrapTab } from '../../../src/core/dom/focus';

const g = globalThis as unknown as Record<string, unknown>;
let previousDocument: unknown;
let document: Document;
let dom: JSDOM;

beforeAll(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' });
  previousDocument = g.document;
  document = dom.window.document;
  g.document = document;
  // JSDOM lays nothing out: every element has a box, so each counts as rendered
  dom.window.Element.prototype.getClientRects = function () {
    return [{}] as unknown as DOMRectList;
  };
});

afterAll(() => {
  g.document = previousDocument;
});

afterEach(() => {
  document.body.replaceChildren();
});

/** A button inside an open shadow root, focused. */
const focusedInShadow = (): { host: HTMLElement; root: ShadowRoot; button: HTMLButtonElement } => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = host.attachShadow({ mode: 'open' });
  const button = document.createElement('button');
  root.append(button);
  button.focus();
  return { host, root, button };
};

describe('activeElementOf', () => {
  test('returns the focused element of the document for a node in it', () => {
    const button = document.createElement('button');
    const other = document.createElement('span');
    document.body.append(button, other);
    button.focus();
    expect(activeElementOf(other)).toBe(button);
  });

  test('returns the focused element of the shadow root for a node in it, not the host', () => {
    const { host, root, button } = focusedInShadow();
    const sibling = document.createElement('span');
    root.append(sibling);
    expect(document.activeElement).toBe(host);
    expect(activeElementOf(sibling)).toBe(button);
    expect(activeElementOf(button)).toBe(button);
  });

  test('returns null for a shadow root without focus inside it', () => {
    const { root } = focusedInShadow();
    const outside = document.createElement('input');
    document.body.append(outside);
    outside.focus();
    expect(activeElementOf(root)).toBeNull();
    expect(activeElementOf(outside)).toBe(outside);
  });

  test("falls back to the document's focused element for a detached node", () => {
    const button = document.createElement('button');
    document.body.append(button);
    button.focus();
    const detached = document.createElement('div');
    detached.append(document.createElement('span'));
    expect(activeElementOf(detached)).toBe(button);
    expect(activeElementOf(detached.firstChild as Node)).toBe(button);
  });
});

describe('deepActiveElement', () => {
  test('follows focus into a shadow root', () => {
    const { button } = focusedInShadow();
    expect(deepActiveElement()).toBe(button);
  });

  test('returns the focused element of the document outside any shadow root', () => {
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    expect(deepActiveElement()).toBe(input);
  });
});

describe('tabStops and wrapTab', () => {
  /**
   * A modal in a shadow root: a first button in the shadow, then a slot the
   * host's children go to (a disabled button and one in a nested shadow
   * root), then a last button.
   */
  const modal = (): { container: HTMLElement; ids: () => string[] } => {
    const host = document.createElement('div');
    host.innerHTML = '<button id="disabled" disabled></button><span id="nested"></span>';
    const nested = (host.querySelector('#nested') as HTMLElement).attachShadow({ mode: 'open' });
    nested.innerHTML = '<button id="inner"></button>';
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = '<div id="modal"><button id="first"></button><slot></slot><button id="last"></button></div>';
    const container = root.getElementById('modal') as HTMLElement;
    return { container, ids: () => tabStops(container).map((element) => element.id) };
  };
  const press = (container: HTMLElement, shiftKey = false): KeyboardEvent => {
    const event = new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey, cancelable: true, bubbles: true });
    wrapTab(container, event);
    return event;
  };

  test('finds the tab stops through slots and shadow roots, in order, skipping the disabled', () => {
    expect(modal().ids()).toEqual(['first', 'inner', 'last']);
  });

  test('Tab from the last stop goes to the first, Shift+Tab from the first to the last', () => {
    const { container } = modal();
    const [first, , last] = tabStops(container);
    last.focus();
    expect(press(container).defaultPrevented).toBe(true);
    expect(deepActiveElement()).toBe(first);
    expect(press(container, true).defaultPrevented).toBe(true);
    expect(deepActiveElement()).toBe(last);
  });

  test('between the ends the browser moves focus: nothing is prevented', () => {
    const { container } = modal();
    const [first] = tabStops(container);
    first.focus();
    expect(press(container).defaultPrevented).toBe(false);
    expect(deepActiveElement()).toBe(first);
  });

  test('Shift+Tab from the modal itself goes to the last stop', () => {
    const { container } = modal();
    container.tabIndex = -1;
    container.focus();
    expect(press(container, true).defaultPrevented).toBe(true);
    expect(deepActiveElement()?.id).toBe('last');
  });
});
