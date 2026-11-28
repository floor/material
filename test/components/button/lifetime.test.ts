// test/components/button/lifetime.test.ts
//
// What a button does after it is destroyed, and when two calls overlap. Each
// case issues the second operation before the first has settled: the progress
// indicator is loaded on demand, so everything that waits for it can be
// overtaken by a later call or by destroy().
import { describe, test, expect, beforeEach } from 'bun:test';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = dom.window.HTMLElement;
g.HTMLButtonElement = dom.window.HTMLButtonElement;
g.HTMLCanvasElement = dom.window.HTMLCanvasElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.PointerEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.CustomEvent = dom.window.CustomEvent;
g.MutationObserver = dom.window.MutationObserver;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = () => {};
g.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
// JSDOM has no canvas. The progress indicator draws on one; nothing here
// asserts what it draws, so any call on the context is a no-op.
dom.window.HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({}, { get: () => () => {} }) as unknown as CanvasRenderingContext2D;
} as any;

import createButton from '../../../src/components/button';

beforeEach(() => { document.body.innerHTML = ''; });

const mount = (config: Parameters<typeof createButton>[0] = {}) => {
  const button = createButton(config);
  document.body.append(button.element);
  return button;
};

/** Long enough for the on-demand progress module to load and its callbacks to run. */
const loaded = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

const spinner = (button: { element: HTMLElement }): HTMLElement | null =>
  button.element.querySelector<HTMLElement>('.mtrl-button__progress');
const shown = (button: { element: HTMLElement }): boolean => {
  const element = spinner(button);
  return !!element && element.style.display !== 'none';
};
const text = (button: { element: HTMLElement }): string =>
  button.element.querySelector('.mtrl-button__text')?.textContent ?? '';

describe('a destroyed toggle button', () => {
  test('no longer toggles when its retained element is clicked', () => {
    const button = mount({ text: 'Bold', toggle: true });
    const element = button.element;
    const changes: unknown[] = [];
    button.on('change', (payload: unknown) => changes.push(payload));

    element.click();
    expect(element.getAttribute('aria-pressed')).toBe('true');
    expect(changes.length).toBe(1);

    button.destroy();
    document.body.append(element);
    element.click();
    expect(element.getAttribute('aria-pressed')).toBe('true');
    expect(element.classList.contains('mtrl-button--selected')).toBe(true);
    element.click();
    expect(element.getAttribute('aria-pressed')).toBe('true');
    expect(changes.length).toBe(1);
  });
});

describe('loading that is overtaken before the indicator has loaded', () => {
  test('setLoading(true, text) then setLoading(false): enabled, no indicator, the original text', async () => {
    const button = mount({ text: 'Save', progress: true });
    const first = button.setLoading(true, 'Wait');
    const second = button.setLoading(false);
    await Promise.all([first, second]);
    await loaded();

    expect(button.element.disabled).toBe(false);
    expect(button.element.hasAttribute('aria-busy')).toBe(false);
    expect(shown(button)).toBe(false);
    expect(button.element.classList.contains('mtrl-button--progress')).toBe(false);
    expect(text(button)).toBe('Save');
  });

  test('true, false, true again: loading, the indicator, the last text, and the original kept for the end', async () => {
    const button = mount({ text: 'Save', progress: true });
    const calls = [button.setLoading(true, 'Wait'), button.setLoading(false), button.setLoading(true, 'Again')];
    await Promise.all(calls);
    await loaded();

    expect(button.element.disabled).toBe(true);
    expect(button.element.getAttribute('aria-busy')).toBe('true');
    expect(shown(button)).toBe(true);
    expect(text(button)).toBe('Again');

    await button.setLoading(false);
    expect(button.element.disabled).toBe(false);
    expect(shown(button)).toBe(false);
    expect(text(button)).toBe('Save');
  });

  test('showProgress() then hideProgress(): no indicator once it has loaded', async () => {
    const button = mount({ text: 'Save', progress: true });
    const first = button.showProgress();
    const second = button.hideProgress();
    await Promise.all([first, second]);
    await loaded();

    expect(shown(button)).toBe(false);
    expect(button.element.classList.contains('mtrl-button--progress')).toBe(false);
  });

  test('a loading that is not overtaken still shows its indicator and its text', async () => {
    const button = mount({ text: 'Save', progress: true });
    await button.setLoading(true, 'Wait');
    expect(button.element.disabled).toBe(true);
    expect(shown(button)).toBe(true);
    expect(text(button)).toBe('Wait');

    await button.setLoading(false);
    expect(button.element.disabled).toBe(false);
    expect(shown(button)).toBe(false);
    expect(text(button)).toBe('Save');
  });
});

describe('progress that arrives after the button was destroyed', () => {
  test('showProgress() then destroy(): nothing attaches to the destroyed button', async () => {
    const button = mount({ text: 'Save', progress: true });
    const element = button.element;
    const pending = button.showProgress();
    button.destroy();
    await pending;
    await loaded();

    expect(element.querySelector('.mtrl-button__progress')).toBeNull();
    expect(element.classList.contains('mtrl-button--progress')).toBe(false);
  });

  test('setLoading(true) then destroy(): no indicator, and no text written afterwards', async () => {
    const button = mount({ text: 'Save', progress: true });
    const element = button.element;
    const pending = button.setLoading(true, 'Wait');
    button.destroy();
    const left = element.innerHTML;
    await pending;
    await loaded();

    // What destroy() left is what is still there.
    expect(element.querySelector('.mtrl-button__progress')).toBeNull();
    expect(element.innerHTML).toBe(left);
  });

  test('destroy() after the indicator has loaded removes it', async () => {
    const button = mount({ text: 'Save', progress: true });
    const element = button.element;
    await button.showProgress();
    expect(shown(button)).toBe(true);
    button.destroy();
    expect(element.querySelector('.mtrl-button__progress')).toBeNull();
  });
});
