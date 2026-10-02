// test/components/dialog/open-contract.test.ts
//
// FLO-548, the overlays' open / close contract, for the dialog: when open() or
// close() returns, isOpen() has changed and the event has been emitted (the
// cancellable before* first). Classes, painting and the focus trap follow.
// Open on an open dialog and close on a closed one do nothing and emit nothing.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.MouseEvent = dom.window.MouseEvent;
g.CustomEvent = dom.window.CustomEvent;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);

// JSDOM lays nothing out, so every element would look invisible to the
// focusable filter
Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetWidth', { get: () => 40, configurable: true });
Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetHeight', { get: () => 40, configurable: true });

import createDialog from '../../../src/components/dialog';
import type { DialogConfig, DialogComponent } from '../../../src/components/dialog/types';

const after = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const EVENTS = ['beforeopen', 'open', 'afteropen', 'beforeclose', 'close', 'afterclose'] as const;
const VISIBLE = 'mtrl-dialog--visible';
/** Both waits, short: afteropen 20ms after the surface shows, afterclose 20ms after close() */
const FAST = 20;
/** Past the 10ms the surface waits for, and past both `after*` waits */
const SETTLED = 80;

let trigger: HTMLButtonElement;
let dialogs: DialogComponent[];

/** A dialog and the names of the events it has emitted, in order */
const make = (config: DialogConfig = {}) => {
  const dialog = createDialog({ title: 'Delete file?', buttons: [{ text: 'Cancel' }, { text: 'Delete' }], animationDuration: FAST, ...config });
  dialogs.push(dialog);
  const seen: string[] = [];
  for (const name of EVENTS) dialog.on(name, () => { seen.push(name); });
  return { dialog, seen };
};

beforeEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  dialogs = [];
  trigger = document.createElement('button');
  trigger.textContent = 'Open';
  document.body.appendChild(trigger);
  trigger.focus();
});

afterEach(async () => {
  for (const dialog of dialogs) dialog.destroy();
  await after(SETTLED);
  document.body.innerHTML = '';
  document.body.style.overflow = '';
});

describe('dialog open(): the state and the event are there when it returns', () => {
  test('isOpen() is true and open has been emitted, beforeopen first', () => {
    const { dialog, seen } = make();
    expect(dialog.isOpen()).toBe(false);
    dialog.open();
    expect(dialog.isOpen()).toBe(true);
    expect(seen).toEqual(['beforeopen', 'open']);
  });

  test('the surface follows: in the document at once, visible and focused a moment later', async () => {
    const { dialog } = make();
    dialog.open();
    expect(dialog.overlay.isConnected).toBe(true);
    expect(dialog.element.classList.contains(VISIBLE)).toBe(false);
    expect(document.activeElement).toBe(trigger);
    await after(30);
    expect(dialog.element.classList.contains(VISIBLE)).toBe(true);
    expect(dialog.element.contains(document.activeElement)).toBe(true);
    expect(dialog.isOpen()).toBe(true);
  });

  test('a cancelled beforeopen leaves it closed and emits no open', async () => {
    const { dialog, seen } = make();
    dialog.on('beforeopen', (event) => event.preventDefault());
    expect(dialog.open()).toBe(dialog);
    expect(dialog.isOpen()).toBe(false);
    expect(seen).toEqual(['beforeopen']);
    await after(SETTLED);
    expect(dialog.isOpen()).toBe(false);
    expect(dialog.element.classList.contains(VISIBLE)).toBe(false);
    expect(seen).toEqual(['beforeopen']);
  });

  test('an open listener added after open() no longer hears it; afteropen still does', async () => {
    const dialog = createDialog({ title: 'Add user', animationDuration: FAST });
    dialogs.push(dialog);
    const heard: string[] = [];
    dialog.open();
    dialog.on('open', () => { heard.push('open'); });
    dialog.on('afteropen', () => { heard.push('afteropen'); });
    await after(SETTLED);
    expect(heard).toEqual(['afteropen']);
  });

  test('isOpen() is the dialog\'s own state, not the visible class', () => {
    const { dialog } = make();
    dialog.element.classList.add(VISIBLE);
    expect(dialog.isOpen()).toBe(false);
    dialog.element.classList.remove(VISIBLE);
    dialog.open();
    expect(dialog.element.classList.contains(VISIBLE)).toBe(false);
    expect(dialog.isOpen()).toBe(true);
  });

  test('a dialog created with open: true is open', () => {
    const { dialog } = make({ open: true });
    expect(dialog.isOpen()).toBe(true);
  });
});

describe('dialog close(): symmetric', () => {
  test('isOpen() is false and close has been emitted, beforeclose first', async () => {
    const { dialog, seen } = make();
    dialog.open();
    await after(SETTLED);
    seen.length = 0;
    dialog.close();
    expect(dialog.isOpen()).toBe(false);
    expect(seen).toEqual(['beforeclose', 'close']);
  });

  test('a cancelled beforeclose leaves it open and emits no close', async () => {
    const { dialog, seen } = make();
    dialog.open();
    await after(SETTLED);
    seen.length = 0;
    const refuse = (event: { preventDefault: () => void }) => event.preventDefault();
    dialog.on('beforeclose', refuse);
    dialog.close();
    expect(dialog.isOpen()).toBe(true);
    expect(seen).toEqual(['beforeclose']);
    dialog.off('beforeclose', refuse);
  });
});

describe('dialog afteropen and afterclose stay deferred', () => {
  test('neither is emitted inside the call, even with no animation', async () => {
    const { dialog, seen } = make({ animationDuration: 0 });
    dialog.open();
    expect(seen).toEqual(['beforeopen', 'open']);
    await after(SETTLED);
    expect(seen).toEqual(['beforeopen', 'open', 'afteropen']);
    seen.length = 0;
    dialog.close();
    expect(seen).toEqual(['beforeclose', 'close']);
    await after(SETTLED);
    expect(seen).toEqual(['beforeclose', 'close', 'afterclose']);
  });

  test('afteropen: the surface is visible and focus is in; afterclose: the dialog is out of the document', async () => {
    const { dialog } = make();
    const at: Record<string, unknown> = {};
    dialog.on('afteropen', () => {
      at.afteropen = { visible: dialog.element.classList.contains(VISIBLE), focusIn: dialog.element.contains(document.activeElement) };
    });
    dialog.on('afterclose', () => { at.afterclose = { inDocument: dialog.overlay.isConnected }; });
    dialog.open();
    await after(SETTLED);
    dialog.close();
    await after(SETTLED);
    expect(at).toEqual({ afteropen: { visible: true, focusIn: true }, afterclose: { inDocument: false } });
  });
});

describe('dialog repeat calls do nothing and emit nothing', () => {
  test('open() on an open dialog, in the same task and later', async () => {
    const { dialog, seen } = make();
    dialog.open();
    dialog.open();
    expect(seen).toEqual(['beforeopen', 'open']);
    await after(SETTLED);
    dialog.open();
    await after(SETTLED);
    expect(seen).toEqual(['beforeopen', 'open', 'afteropen']);
  });

  test('close() on a dialog that was never opened', async () => {
    const { dialog, seen } = make();
    expect(dialog.close()).toBe(dialog);
    await after(SETTLED);
    expect(seen).toEqual([]);
    expect(dialog.isOpen()).toBe(false);
  });

  test('close() twice on an open dialog closes once', async () => {
    const { dialog, seen } = make();
    dialog.open();
    await after(SETTLED);
    seen.length = 0;
    dialog.close();
    dialog.close();
    await after(SETTLED);
    dialog.close();
    await after(SETTLED);
    expect(seen).toEqual(['beforeclose', 'close', 'afterclose']);
  });

  test('toggle() follows the state at once', () => {
    const { dialog, seen } = make();
    dialog.toggle();
    expect(dialog.isOpen()).toBe(true);
    dialog.toggle();
    expect(dialog.isOpen()).toBe(false);
    dialog.toggle(false);
    expect(seen).toEqual(['beforeopen', 'open', 'beforeclose', 'close']);
  });

  test('in the top layer too: close() on a closed dialog emits nothing', async () => {
    const { dialog, seen } = make({ layer: 'top' });
    dialog.close();
    await after(SETTLED);
    expect(seen).toEqual([]);
    dialog.open();
    dialog.open();
    expect(dialog.isOpen()).toBe(true);
    expect(seen).toEqual(['beforeopen', 'open']);
    dialog.close();
    dialog.close();
    expect(dialog.isOpen()).toBe(false);
    expect(seen).toEqual(['beforeopen', 'open', 'beforeclose', 'close']);
  });
});

describe('dialog open and close in one task: the last call wins, pending timers are cancelled', () => {
  test('open() then close() ends closed: one event of each kind, never shown, no afteropen', async () => {
    const { dialog, seen } = make();
    dialog.open();
    dialog.close();
    expect(dialog.isOpen()).toBe(false);
    expect(seen).toEqual(['beforeopen', 'open', 'beforeclose', 'close']);
    expect(document.activeElement).toBe(trigger);
    await after(SETTLED);
    expect(dialog.isOpen()).toBe(false);
    expect(dialog.element.classList.contains(VISIBLE)).toBe(false);
    expect(dialog.overlay.isConnected).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe('');
    expect(seen).toEqual(['beforeopen', 'open', 'beforeclose', 'close', 'afterclose']);
  });

  test('close() then open() ends open: one close and one open, still in the document, no afterclose', async () => {
    const { dialog, seen } = make();
    dialog.open();
    await after(SETTLED);
    seen.length = 0;
    dialog.close();
    dialog.open();
    expect(dialog.isOpen()).toBe(true);
    expect(seen).toEqual(['beforeclose', 'close', 'beforeopen', 'open']);
    await after(SETTLED);
    expect(dialog.isOpen()).toBe(true);
    expect(dialog.overlay.isConnected).toBe(true);
    expect(dialog.element.classList.contains(VISIBLE)).toBe(true);
    expect(dialog.element.contains(document.activeElement)).toBe(true);
    expect(seen).toEqual(['beforeclose', 'close', 'beforeopen', 'open', 'afteropen']);
  });

  test('destroy() right after open() leaves nothing behind: no scroll lock, no inert page', async () => {
    const { dialog, seen } = make();
    dialog.open();
    dialog.destroy();
    await after(SETTLED);
    expect(document.body.style.overflow).toBe('');
    expect(trigger.hasAttribute('inert')).toBe(false);
    expect(dialog.overlay.isConnected).toBe(false);
    expect(seen).toEqual(['beforeopen', 'open']);
  });
});
