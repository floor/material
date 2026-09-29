// test/components/snackbar/layer.test.ts
//
// `layer: "top"`: the snackbar is a popover="manual" element, shown where its
// owner put it or on the body, and inside the modal dialog the page is
// blocked by, if any. JSDOM has no popovers and no modal dialogs: both are
// stubbed on this window's prototypes. The browser half, stacking, styles and
// the element, is in scripts/check-elements.ts.

import { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';
import createSnackbar, { clearSnackbars } from '../../../src/components/snackbar';
import type { SnackbarComponent } from '../../../src/components/snackbar';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});
const g = globalThis as unknown as Record<string, unknown>;
const globals: Record<string, unknown> = {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element,
  Node: dom.window.Node,
  Event: dom.window.Event,
  KeyboardEvent: dom.window.KeyboardEvent,
  FocusEvent: dom.window.FocusEvent,
  CustomEvent: dom.window.CustomEvent,
  requestAnimationFrame: (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0),
};
const previous: Record<string, unknown> = {};

type Proto = Record<string, unknown>;
const proto = dom.window.HTMLElement.prototype as unknown as Proto;
const shown = new WeakSet<Element>();
const modal = new WeakSet<Element>();
const nativeMatches = dom.window.Element.prototype.matches;
const popoverCalls: string[] = [];

const installPopover = (): void => {
  proto.showPopover = function (this: HTMLElement) {
    if (!this.isConnected) throw new Error('InvalidStateError: not connected');
    popoverCalls.push('show');
    shown.add(this);
  };
  proto.hidePopover = function (this: HTMLElement) {
    popoverCalls.push('hide');
    shown.delete(this);
  };
  (dom.window.Element.prototype as unknown as Proto).matches = function (this: Element, selector: string) {
    if (selector === ':popover-open') return shown.has(this) && this.isConnected;
    if (selector === ':modal') return modal.has(this);
    return nativeMatches.call(this, selector);
  };
};
const removePopover = (): void => {
  delete proto.showPopover;
  delete proto.hidePopover;
  dom.window.Element.prototype.matches = nativeMatches;
};

const after = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let snackbars: SnackbarComponent[];

beforeAll(() => {
  for (const [name, value] of Object.entries(globals)) {
    previous[name] = g[name];
    g[name] = value;
  }
});
afterAll(() => {
  for (const name of Object.keys(globals)) g[name] = previous[name];
});
beforeEach(() => {
  clearSnackbars();
  snackbars = [];
  popoverCalls.length = 0;
  installPopover();
});
afterEach(() => {
  clearSnackbars();
  snackbars.forEach((snackbar) => snackbar.destroy());
  removePopover();
  document.body.replaceChildren();
});

const make = (config: Record<string, unknown> = {}): SnackbarComponent => {
  const snackbar = createSnackbar({ message: 'Archived', duration: 0, ...config });
  snackbars.push(snackbar);
  return snackbar;
};

/** A modal dialog with a focused button, as showModal() leaves it. */
const openModal = (root: ParentNode = document.body) => {
  const dialog = document.createElement('dialog');
  const button = document.createElement('button');
  dialog.append(button);
  root.append(dialog);
  modal.add(dialog);
  button.focus();
  return dialog;
};

describe('snackbar layer: top', () => {
  test('without a layer the snackbar goes on the body with no popover, and off it when closed', async () => {
    const snackbar = make();
    snackbar.show();
    expect(snackbar.element.parentNode).toBe(document.body);
    expect(snackbar.element.hasAttribute('popover')).toBe(false);
    snackbar.hide();
    await after(500);
    expect(snackbar.element.isConnected).toBe(false);
    expect(popoverCalls).toEqual([]);
  });

  test('is a manual popover, shown on the body and taken off it when closed', async () => {
    const snackbar = make({ layer: 'top' });
    expect(snackbar.element.getAttribute('popover')).toBe('manual');
    snackbar.show();
    expect(snackbar.element.parentNode).toBe(document.body);
    expect(snackbar.element.matches(':popover-open')).toBe(true);
    snackbar.hide();
    await after(500);
    expect(snackbar.element.isConnected).toBe(false);
    expect(popoverCalls).toEqual(['show', 'hide']);
  });

  test('opens where its owner put it, a shadow root, and stays there', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const snackbar = make({ layer: 'top' });
    root.append(snackbar.element);
    snackbar.show();
    expect(snackbar.element.getRootNode()).toBe(root);
    expect(snackbar.element.matches(':popover-open')).toBe(true);
    snackbar.hide();
    await after(500);
    expect(snackbar.element.getRootNode()).toBe(root);
    expect(snackbar.element.matches(':popover-open')).toBe(false);
  });

  test('opens inside the modal dialog the page is blocked by, and comes back', async () => {
    const owner = document.createElement('section');
    document.body.append(owner);
    const snackbar = make({ layer: 'top' });
    owner.append(snackbar.element);
    const dialog = openModal();
    snackbar.show();
    expect(snackbar.element.parentNode).toBe(dialog);
    expect(snackbar.element.matches(':popover-open')).toBe(true);
    snackbar.hide();
    await after(500);
    expect(snackbar.element.parentNode).toBe(owner);
  });

  test('from a shadow root into a dialog of another tree, carried in a root with the same stylesheets', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const sheets = [{} as CSSStyleSheet];
    Object.defineProperty(root, 'adoptedStyleSheets', { value: sheets, writable: true });
    const snackbar = make({ layer: 'top' });
    root.append(snackbar.element);
    const dialog = openModal();
    snackbar.show();
    const carried = snackbar.element.getRootNode() as ShadowRoot;
    expect(carried).not.toBe(root);
    expect(carried.host.parentNode).toBe(dialog);
    expect(carried.adoptedStyleSheets).toBe(sheets);
    snackbar.hide();
    await after(500);
    expect(snackbar.element.getRootNode()).toBe(root);
    expect(dialog.children.length).toBe(1);
  });

  test('finds the modal dialog from focus, inside another shadow root', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const dialog = openModal(root);
    const snackbar = make({ layer: 'top' });
    snackbar.show();
    expect(snackbar.element.parentNode).toBe(dialog);
  });

  test('a modal in another element\'s shadow root is found with focus on the body', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const dialog = document.createElement('dialog');
    root.append(dialog);
    modal.add(dialog);
    (document.activeElement as HTMLElement | null)?.blur();
    const snackbar = make({ layer: 'top' });
    snackbar.show();
    expect(snackbar.element.parentNode).toBe(dialog);
  });

  test('the modal closing sends it home, still open and shown, closing once later', async () => {
    const owner = document.createElement('section');
    const outside = document.createElement('button');
    document.body.append(owner, outside);
    const snackbar = make({ layer: 'top' });
    const closes: unknown[] = [];
    snackbar.on('close', (event) => closes.push(event.reason));
    owner.append(snackbar.element);
    const dialog = openModal();
    snackbar.show();
    expect(snackbar.element.parentNode).toBe(dialog);
    modal.delete(dialog);
    outside.focus();
    dialog.dispatchEvent(new dom.window.Event('close'));
    expect(snackbar.element.parentNode).toBe(owner);
    expect(snackbar.state).toBe('visible');
    expect(snackbar.element.matches(':popover-open')).toBe(true);
    expect(closes).toEqual([]);
    snackbar.hide();
    await after(500);
    expect(closes).toEqual(['api']);
  });

  test('a modal opening while it shows takes it in; the topmost of nested modals wins', () => {
    const snackbar = make({ layer: 'top' });
    snackbar.show();
    expect(snackbar.element.parentNode).toBe(document.body);
    const outer = openModal();
    expect(snackbar.element.parentNode).toBe(outer);
    const inner = openModal(outer);
    expect(snackbar.element.parentNode).toBe(inner);
    expect(snackbar.element.matches(':popover-open')).toBe(true);
    // The inner closes: focus goes back into the outer
    modal.delete(inner);
    (outer.querySelector('button') as HTMLElement).focus();
    inner.dispatchEvent(new dom.window.Event('close'));
    expect(snackbar.element.parentNode).toBe(outer);
  });

  test('without popover support it is the snackbar without a layer', async () => {
    removePopover();
    const snackbar = make({ layer: 'top' });
    expect(snackbar.element.hasAttribute('popover')).toBe(false);
    snackbar.show();
    expect(snackbar.element.parentNode).toBe(document.body);
    snackbar.hide();
    await after(500);
    expect(snackbar.element.isConnected).toBe(false);
  });
});
