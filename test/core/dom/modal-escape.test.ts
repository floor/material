// test/core/dom/modal-escape.test.ts
//
// onModalEscape (FLO-548 family 6, FLO-556): Escape for the modals, handled as
// a key press. One bubble listener on the window serves a stack of modals:
// it prevents the key (so the browser sends a modal <dialog> no `cancel`, and
// its allowance of two refused cancels is never spent) and tells the topmost
// one, unless the key press is the one that opened it: an event already on
// its way when the modal opened never dismisses it. Which events those are is
// not inferred from time or from the task: one capture listener on the window
// numbers every event as its dispatch begins, and a modal answers only those
// numbered after it opened.
import { describe, test, expect, beforeAll, afterAll, afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';
import { eventsFrom, onModalEscape } from '../../../src/core/dom/layer';

let window: JSDOM['window'];
let document: Document;
const stops: Array<() => void> = [];

beforeAll(() => {
  window = new JSDOM('<!DOCTYPE html><html><body><button id="inside">x</button></body></html>', { url: 'http://localhost/' }).window;
  document = window.document;
});
afterAll(() => window.close());
afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
});

const task = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const surface = (): HTMLElement => document.body.appendChild(document.createElement('div'));
const press = (target: EventTarget, init: KeyboardEventInit = {}): KeyboardEvent => {
  const event = new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
};
/** A registered modal, and how often it was told. */
const modal = () => {
  const told: number[] = [];
  const entry = onModalEscape(surface(), () => { told.push(told.length + 1); });
  stops.push(entry.stop);
  return { entry, told };
};

describe('onModalEscape', () => {
  test('Escape on a child or on the body is prevented and tells the modal', async () => {
    const { told } = modal();
    await task();
    expect(press(document.getElementById('inside')!).defaultPrevented).toBe(true);
    expect(press(document.body).defaultPrevented).toBe(true);
    expect(told).toEqual([1, 2]);
  });

  test('the key press that opens it is prevented and the modal is not told; one in the same task is', () => {
    const inside = document.getElementById('inside')!;
    let opened: ReturnType<typeof modal> | undefined;
    const open = (): void => { opened = modal(); };
    inside.addEventListener('keydown', open, { once: true });
    const opening = press(inside);
    expect(opening.defaultPrevented).toBe(true);
    expect(opened!.told).toEqual([]);
    // No task has passed, no timer has run
    expect(press(document.body).defaultPrevented).toBe(true);
    expect(opened!.told).toEqual([1]);
  });

  test('`opening` is true for the task it opened in: for the browser\'s cancel, which is a new event', async () => {
    const { entry } = modal();
    expect(entry.opening).toBe(true);
    await task();
    expect(entry.opening).toBe(false);
  });

  test('a modal opened from a key press while another is open: neither is told for that key', async () => {
    const under = modal();
    await task();
    const inside = document.getElementById('inside')!;
    let over: ReturnType<typeof modal> | undefined;
    inside.addEventListener('keydown', () => { over = modal(); }, { once: true });
    expect(press(inside).defaultPrevented).toBe(true);
    expect([under.told.length, over!.told.length]).toEqual([0, 0]);
    press(document.body);
    expect([under.told.length, over!.told.length]).toEqual([0, 1]);
  });

  test('opened from the page\'s own window listener, in the capture phase and in the bubble phase', () => {
    for (const capture of [true, false]) {
      let opened: ReturnType<typeof modal> | undefined;
      const open = (): void => { opened = modal(); };
      window.addEventListener('keydown', open, { once: true, capture });
      press(document.body);
      expect(opened!.told).toEqual([]);
      press(document.body);
      expect(opened!.told).toEqual([1]);
      opened!.entry.stop();
    }
  });

  test('opened from inside a shadow root', () => {
    const host = surface();
    const root = host.attachShadow({ mode: 'open' });
    const button = root.appendChild(document.createElement('button'));
    let opened: ReturnType<typeof modal> | undefined;
    button.addEventListener('keydown', () => { opened = modal(); }, { once: true });
    press(button, { composed: true });
    expect(opened!.told).toEqual([]);
    press(button, { composed: true });
    expect(opened!.told).toEqual([1]);
  });

  test('opened late, after a promise: the first key is the modal\'s', async () => {
    const inside = document.getElementById('inside')!;
    let opened: ReturnType<typeof modal> | undefined;
    inside.addEventListener('keydown', () => { void Promise.resolve().then(() => { opened = modal(); }); }, { once: true });
    press(inside);
    await task();
    press(document.body);
    expect(opened!.told).toEqual([1]);
  });

  test('only the topmost modal is told; the one under it when that one has stopped', async () => {
    const under = modal();
    const over = modal();
    await task();
    press(document.body);
    expect([under.told.length, over.told.length]).toEqual([0, 1]);
    over.entry.stop();
    press(document.body);
    expect([under.told.length, over.told.length]).toEqual([1, 1]);
  });

  test('a key something inside has used, a composition being cancelled and other keys are left alone', async () => {
    const { told } = modal();
    await task();
    const inside = document.getElementById('inside')!;
    const use = (event: Event): void => event.preventDefault();
    inside.addEventListener('keydown', use);
    press(inside);
    inside.removeEventListener('keydown', use);
    expect(press(document.body, { isComposing: true }).defaultPrevented).toBe(false);
    expect(press(document.body, { key: 'Enter' }).defaultPrevented).toBe(false);
    expect(told).toEqual([]);
  });

  // A modal that is not on the stack, shown above one that is: another
  // component's (a picker in a dialog, until it joins the stack) or the
  // page's own <dialog>. The browser makes everything else inert, so focus is
  // inside it, and Escape is its to handle: through the browser's `cancel`.
  test('a key from inside another open <dialog> is left to that dialog', async () => {
    const { told } = modal();
    await task();
    const other = document.body.appendChild(document.createElement('dialog'));
    other.setAttribute('open', '');
    const field = other.appendChild(document.createElement('button'));
    expect(press(field).defaultPrevented).toBe(false);
    expect(told).toEqual([]);
    other.removeAttribute('open');
    expect(press(field).defaultPrevented).toBe(true);
    expect(told).toEqual([1]);
    other.remove();
  });

  test('a key from inside the modal\'s own <dialog> is the modal\'s', async () => {
    const own = document.body.appendChild(document.createElement('dialog'));
    own.setAttribute('open', '');
    const field = own.appendChild(document.createElement('button'));
    const told: number[] = [];
    const entry = onModalEscape(own, () => { told.push(1); });
    stops.push(entry.stop);
    await task();
    expect(press(field).defaultPrevented).toBe(true);
    expect(told).toEqual([1]);
    own.remove();
  });

  test('once stopped, Escape is the page\'s again; stopping twice is harmless', async () => {
    const { entry, told } = modal();
    await task();
    entry.stop();
    entry.stop();
    expect(press(document.body).defaultPrevented).toBe(false);
    expect(told).toEqual([]);
  });
});

describe('eventsFrom: the one marker', () => {
  /** The capture listeners on the window, by type. */
  const watch = () => {
    const held = new Map<string, number>();
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    window.addEventListener = ((type: string, listener: EventListener, options?: boolean | AddEventListenerOptions) => {
      if (options === true) held.set(type, (held.get(type) ?? 0) + 1);
      add(type, listener, options);
    }) as typeof window.addEventListener;
    window.removeEventListener = ((type: string, listener: EventListener, options?: boolean | EventListenerOptions) => {
      if (options === true) held.set(type, (held.get(type) ?? 0) - 1);
      remove(type, listener, options);
    }) as typeof window.removeEventListener;
    return { count: (type: string): number => held.get(type) ?? 0, stop: () => { window.addEventListener = add; window.removeEventListener = remove; } };
  };

  test('one capture listener serves every overlay, and goes when the last one has stopped', () => {
    const watched = watch();
    try {
      const first = eventsFrom(surface());
      const second = eventsFrom(surface());
      expect([watched.count('keydown'), watched.count('click')]).toEqual([1, 1]);
      first.stop();
      first.stop();
      expect([watched.count('keydown'), watched.count('click')]).toEqual([1, 1]);
      second.stop();
      expect([watched.count('keydown'), watched.count('click')]).toEqual([0, 0]);
    } finally {
      watched.stop();
    }
  });

  test('a click or a key created after the call is after it; the one in flight is not', () => {
    const inside = document.getElementById('inside')!;
    let from: ReturnType<typeof eventsFrom> | undefined;
    const answers: boolean[] = [];
    const ask = (event: Event): void => { if (from) answers.push(from.after(event)); };
    document.addEventListener('click', ask);
    inside.addEventListener('click', () => { from = eventsFrom(inside); }, { once: true });
    inside.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    inside.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    document.removeEventListener('click', ask);
    from!.stop();
    expect(answers).toEqual([false, true]);
  });
});
