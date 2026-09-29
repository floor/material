// test/core/dom/layer.test.ts
//
// The top-layer helper. JSDOM has neither popovers nor showModal, so the
// browser's side is stubbed here: showPopover/hidePopover and a dialog's
// showModal/close flip a flag and queue the event the browser would fire.
// Without the stubs, JSDOM is the unsupported browser the fallback is for.
import { describe, test, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';
import {
  supportsTopLayer,
  showInTopLayer,
  hideFromTopLayer,
  onTopLayerClose,
} from '../../../src/core/dom/layer';

const g = globalThis as unknown as Record<string, unknown>;
const names = ['document', 'HTMLElement', 'HTMLDialogElement'] as const;
let previous: Record<string, unknown>;
let window: JSDOM['window'];
let document: Document;

beforeAll(() => {
  window = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/' }).window;
  document = window.document;
  previous = Object.fromEntries(names.map((name) => [name, g[name]]));
  for (const name of names) g[name] = name === 'document' ? document : window[name];
});

afterAll(() => {
  for (const name of names) g[name] = previous[name];
});

afterEach(() => {
  document.body.replaceChildren();
});

/** Lets the queued toggle and close events fire. */
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** The browser's events, queued as the browser queues them. */
const queue = (element: Element, type: string, newState?: string): void => {
  setTimeout(() => {
    const event = new window.Event(type);
    if (newState) Object.assign(event, { newState });
    element.dispatchEvent(event);
  }, 0);
};

type Stubbed = HTMLElement & { calls: string[]; shown: boolean };

/** An element with the popover API: a flag, the calls made, the toggle events. */
const popover = (): Stubbed => {
  const element = document.createElement('div') as unknown as Stubbed;
  element.calls = [];
  element.shown = false;
  const matches = element.matches.bind(element);
  Object.assign(element, {
    showPopover: () => {
      element.calls.push('show');
      element.shown = true;
      queue(element, 'toggle', 'open');
    },
    hidePopover: () => {
      element.calls.push('hide');
      element.shown = false;
      queue(element, 'toggle', 'closed');
    },
    matches: (selector: string) => (selector === ':popover-open' ? element.shown : matches(selector)),
  });
  document.body.append(element);
  return element;
};

/** A dialog with showModal: it fires close, and toggle as current browsers do. */
const dialog = (): HTMLDialogElement & { calls: string[] } => {
  const element = document.createElement('dialog') as HTMLDialogElement & { calls: string[] };
  element.calls = [];
  Object.assign(element, {
    showModal: () => {
      element.calls.push('showModal');
      element.setAttribute('open', '');
    },
    close: () => {
      element.calls.push('close');
      element.removeAttribute('open');
      queue(element, 'toggle', 'closed');
      queue(element, 'close');
    },
  });
  document.body.append(element);
  return element;
};

describe('supportsTopLayer', () => {
  test('is false where the browser has neither popovers nor showModal', () => {
    expect(supportsTopLayer('popover-auto')).toBe(false);
    expect(supportsTopLayer('popover-manual')).toBe(false);
    expect(supportsTopLayer('modal')).toBe(false);
  });

  test('reads showPopover and HTMLDialogElement.prototype.showModal', () => {
    const popoverProto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
    const dialogProto = window.HTMLDialogElement.prototype as unknown as Record<string, unknown>;
    popoverProto.showPopover = () => {};
    dialogProto.showModal = () => {};
    try {
      expect(supportsTopLayer('popover-manual')).toBe(true);
      expect(supportsTopLayer('modal')).toBe(true);
    } finally {
      delete popoverProto.showPopover;
      delete dialogProto.showModal;
    }
  });
});

describe('showInTopLayer', () => {
  test('leaves the element as it is and returns false without support', () => {
    const element = document.createElement('div');
    const modal = document.createElement('dialog');
    document.body.append(element, modal);
    expect(showInTopLayer(element, { kind: 'popover-manual' })).toBe(false);
    expect(showInTopLayer(modal, { kind: 'modal' })).toBe(false);
    expect(element.hasAttribute('popover')).toBe(false);
    expect(modal.open).toBe(false);
    // Hiding what was never shown is harmless
    hideFromTopLayer(element);
    hideFromTopLayer(modal);
  });

  test('sets the popover type and shows the element once', () => {
    const manual = popover();
    const auto = popover();
    expect(showInTopLayer(manual, { kind: 'popover-manual' })).toBe(true);
    expect(showInTopLayer(manual, { kind: 'popover-manual' })).toBe(true);
    showInTopLayer(auto, { kind: 'popover-auto' });
    expect(manual.getAttribute('popover')).toBe('manual');
    expect(auto.getAttribute('popover')).toBe('auto');
    expect(manual.calls).toEqual(['show']);
  });

  test('shows a dialog as a modal once', () => {
    const modal = dialog();
    expect(showInTopLayer(modal, { kind: 'modal' })).toBe(true);
    showInTopLayer(modal, { kind: 'modal' });
    expect(modal.calls).toEqual(['showModal']);
    expect(modal.hasAttribute('popover')).toBe(false);
  });
});

describe('hideFromTopLayer', () => {
  test('hides a shown popover, and nothing that is not shown', () => {
    const element = popover();
    hideFromTopLayer(element);
    showInTopLayer(element, { kind: 'popover-auto' });
    hideFromTopLayer(element);
    hideFromTopLayer(element);
    expect(element.calls).toEqual(['show', 'hide']);
  });

  test('closes a modal dialog', () => {
    const modal = dialog();
    showInTopLayer(modal, { kind: 'modal' });
    hideFromTopLayer(modal);
    expect(modal.calls).toEqual(['showModal', 'close']);
  });
});

describe('onTopLayerClose', () => {
  test('reports a close the browser makes, once', async () => {
    const element = popover();
    let closes = 0;
    onTopLayerClose(element, () => closes++);
    showInTopLayer(element, { kind: 'popover-auto' });
    await flush();
    // A light dismiss: the browser hides the popover itself
    element.hidePopover();
    await flush();
    expect(closes).toBe(1);
  });

  test('does not report the closes made with hideFromTopLayer', async () => {
    const element = popover();
    let closes = 0;
    onTopLayerClose(element, () => closes++);
    showInTopLayer(element, { kind: 'popover-manual' });
    hideFromTopLayer(element);
    await flush();
    expect(closes).toBe(0);
    // The next close the browser makes is reported again
    showInTopLayer(element, { kind: 'popover-manual' });
    element.hidePopover();
    await flush();
    expect(closes).toBe(1);
  });

  test('does not report a close the element was shown again after', async () => {
    const element = popover();
    let closes = 0;
    onTopLayerClose(element, () => closes++);
    showInTopLayer(element, { kind: 'popover-auto' });
    element.hidePopover();
    showInTopLayer(element, { kind: 'popover-auto' });
    await flush();
    expect(closes).toBe(0);
  });

  test('reports a modal dialog closed by the browser once, on close and not toggle', async () => {
    const modal = dialog();
    let closes = 0;
    onTopLayerClose(modal, () => closes++);
    showInTopLayer(modal, { kind: 'modal' });
    // Escape: cancel, then close, which the stub's close() stands in for
    modal.close();
    await flush();
    expect(closes).toBe(1);
    showInTopLayer(modal, { kind: 'modal' });
    hideFromTopLayer(modal);
    await flush();
    expect(closes).toBe(1);
  });

  test('stops reporting once unsubscribed', async () => {
    const element = popover();
    let closes = 0;
    const stop = onTopLayerClose(element, () => closes++);
    showInTopLayer(element, { kind: 'popover-auto' });
    stop();
    element.hidePopover();
    await flush();
    expect(closes).toBe(0);
  });
});
