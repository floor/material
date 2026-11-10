// test/components/button/button.test.ts
//
// The real button in a JSDOM document: what it renders, how variant, size,
// shape, text, icon, value and type reach the DOM, how disabled and toggle
// state behave, and what the loading state does.
//
// This replaces test/components/button.test.ts, which asserted against a mock
// defined in its own file and covered eight behaviours. Porting it found no
// defect in what the button does, but two gaps recorded as findings: a button
// in its loading state never set aria-busy (N14, now asserted below), and the
// stylesheet's --icon-only rules were unreachable because nothing added that
// class (N15, now asserted below: the rules are gone, and createButton does
// not invent an --icon-only modifier).
//
// Deliberately not asserted, because each is open and a test would bless it:
// an icon-only button gets no accessible name unless ariaLabel is given (F10);
// a custom class gains the library prefix (F11); and an unrecognised variant,
// size or shape is passed straight into a class name.
import { describe, test, expect, beforeEach, mock } from 'bun:test';
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
// JSDOM has no canvas. The loading indicator draws on one; nothing here
// asserts what it draws, so any call on the context is a no-op.
dom.window.HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({}, { get: () => () => {} }) as unknown as CanvasRenderingContext2D;
} as any;

import createButton from '../../../src/components/button';
import { BUTTON_VARIANTS, BUTTON_SIZES } from '../../../src/components/button/constants';

const ICON = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';

beforeEach(() => { document.body.innerHTML = ''; });

const mount = (config: Parameters<typeof createButton>[0] = {}) => {
  const button = createButton(config);
  document.body.append(button.element);
  return button;
};

const has = (button: { element: HTMLElement }, modifier: string) =>
  button.element.classList.contains(`mtrl-button--${modifier}`);

// What a forwarded event hands a listener. Nothing asserted this, which is
// how four call sites in the repository came to read the payload as though it
// were the DOM event -- see the button-group, split-button and
// dialog suites. The typed event map makes that a compile error now; this
// pins the runtime shape the map describes.
describe('what a forwarded event hands a listener', () => {
  test('click receives a payload, not the event', () => {
    const button = mount({ text: 'Save' });
    let payload: any;
    button.on('click', (p) => { payload = p; });

    button.element.click();

    expect(payload).toBeDefined();
    expect(payload instanceof Event).toBe(false);
    expect(Object.keys(payload).sort()).toEqual(['element', 'event', 'originalEvent']);
  });

  test('and originalEvent on it is the real DOM event', () => {
    const button = mount({ text: 'Save' });
    let payload: any;
    button.on('click', (p) => { payload = p; });

    button.element.click();

    expect(payload.originalEvent instanceof Event).toBe(true);
    expect(payload.originalEvent.type).toBe('click');
    expect(payload.element).toBe(button.element);
  });

  test('focus and blur carry the same shape', () => {
    const button = mount({ text: 'Save' });
    const seen: string[] = [];
    button.on('focus', ({ originalEvent }) => seen.push(originalEvent.type));
    button.on('blur', ({ originalEvent }) => seen.push(originalEvent.type));

    button.element.dispatchEvent(new dom.window.FocusEvent('focus'));
    button.element.dispatchEvent(new dom.window.FocusEvent('blur'));

    expect(seen).toEqual(['focus', 'blur']);
  });

  test('a disabled button forwards no click', () => {
    const button = mount({ text: 'Save', disabled: true });
    let called = false;
    button.on('click', () => { called = true; });

    button.element.click();

    expect(called).toBe(false);
  });
});

describe('button', () => {
  test('is a type="button" element with its text, filled, small and round by default', () => {
    const button = mount({ text: 'Save' });
    expect(button.element.tagName).toBe('BUTTON');
    expect(button.element.getAttribute('type')).toBe('button');
    expect(button.element.querySelector('.mtrl-button__text')?.textContent).toBe('Save');
    expect([button.getVariant(), button.getSize(), button.getShape()]).toEqual(['filled', 's', 'round']);
    expect(has(button, 'filled') && has(button, 's') && has(button, 'round')).toBe(true);
  });

  test('every M3 variant and size maps to its modifier class', () => {
    for (const variant of Object.values(BUTTON_VARIANTS)) {
      expect(has(mount({ text: 'x', variant }), variant)).toBe(true);
    }
    for (const size of Object.values(BUTTON_SIZES)) {
      expect(has(mount({ text: 'x', size }), size)).toBe(true);
    }
    expect(has(mount({ text: 'x', shape: 'square' }), 'square')).toBe(true);
  });

  test('setVariant, setSize and setShape replace the previous modifier', () => {
    const button = mount({ text: 'x' });
    button.setVariant('outlined');
    button.setSize('l');
    button.setShape('square');
    expect([button.getVariant(), button.getSize(), button.getShape()]).toEqual(['outlined', 'l', 'square']);
    expect(has(button, 'outlined') && has(button, 'l') && has(button, 'square')).toBe(true);
    expect(has(button, 'filled') || has(button, 's') || has(button, 'round')).toBe(false);
  });

  test('an unrecognised modifier removes the whole known family and reads back as the fallback', () => {
    // The written class itself stays unasserted: what an unknown value turns
    // into is open (see the file header), but the setter must still replace
    // every known token and the getter must fall back, as before.
    const button = mount({ text: 'x' });
    button.setVariant('bogus').setSize('huge').setShape('pill');
    expect([button.getVariant(), button.getSize(), button.getShape()]).toEqual(['filled', 's', 'round']);
    expect(has(button, 'filled') || has(button, 's') || has(button, 'round')).toBe(false);
  });

  test('an untyped non-string still writes its class, as the code before the shared engine did', () => {
    // Not a contract for typed callers: this pins parity for a JavaScript
    // caller who passes null, undefined or a number anyway. The template
    // literal turned each into a class, so the shared engine must not read
    // null as the omit token and silently drop the write.
    const button = mount({ text: 'x' });
    button.setVariant(null as never).setSize(undefined as never).setShape(0 as never);
    expect(button.element.className).toBe('mtrl-button mtrl-button--null mtrl-button--undefined mtrl-button--0');
    expect([button.getVariant(), button.getSize(), button.getShape()]).toEqual(['filled', 's', 'round']);
  });

  test('a same-value call keeps one token of each family and the same component', () => {
    const button = mount({ text: 'x' });
    expect(button.setVariant('filled').setSize('s').setShape('round')).toBe(button);
    expect([button.getVariant(), button.getSize(), button.getShape()]).toEqual(['filled', 's', 'round']);
    const tokens = button.element.className.split(' ');
    expect(['filled', 's', 'round'].map((name) => tokens.filter((token) => token === `mtrl-button--${name}`).length)).toEqual([1, 1, 1]);
  });

  test('setText replaces the label', () => {
    const button = mount({ text: 'Save' });
    button.setText('Saved');
    expect(button.getText()).toBe('Saved');
    expect(button.element.textContent).toBe('Saved');
  });

  test('an icon with text is marked for icon layout, and setIcon replaces it', () => {
    const button = mount({ text: 'Add', icon: ICON });
    expect(button.hasIcon()).toBe(true);
    expect(has(button, 'icon')).toBe(true);
    button.setIcon('<svg id="replacement"></svg>');
    expect(button.getIcon()).toContain('id="replacement"');
    expect(has(mount({ text: 'Plain' }), 'icon')).toBe(false);
  });

  test('ariaLabel from config and from setAriaLabel names the button', () => {
    const button = mount({ icon: ICON, ariaLabel: 'Close' });
    expect(button.element.getAttribute('aria-label')).toBe('Close');
    button.setAriaLabel('Dismiss');
    expect(button.element.getAttribute('aria-label')).toBe('Dismiss');
  });

  // N15: --icon-only was styled but never applied. An icon-only action is an
  // icon button; createButton does not grow that modifier to match the CSS.
  test('an icon without text is not an icon-only button', () => {
    expect(has(mount({ icon: ICON, ariaLabel: 'Close' }), 'icon-only')).toBe(false);
    expect(has(mount({ text: 'Add', icon: ICON }), 'icon-only')).toBe(false);
  });

  test('type and value reach the element', () => {
    expect(mount({ text: 'Send', type: 'submit' }).element.getAttribute('type')).toBe('submit');
    const button = mount({ text: 'x', value: 'draft' });
    expect(button.getValue()).toBe('draft');
    button.setValue('final');
    expect(button.element.getAttribute('value')).toBe('final');
    expect(button.getValue()).toBe('final');
  });

  test('disabled from config, enable and disable, and a disabled button emits no click', () => {
    const button = mount({ text: 'x', disabled: true });
    expect(button.element.disabled).toBe(true);
    expect(has(button, 'disabled')).toBe(true);

    const clicks = mock(() => {});
    button.on('click', clicks);
    button.element.click();
    expect(clicks).not.toHaveBeenCalled();

    button.enable();
    expect(button.element.disabled).toBe(false);
    expect(has(button, 'disabled')).toBe(false);
    button.element.click();
    expect(clicks).toHaveBeenCalledTimes(1);
  });

  test('a toggle button reports its state through aria-pressed and flips on click', () => {
    const button = mount({ text: 'Bold', toggle: true });
    expect(button.element.getAttribute('aria-pressed')).toBe('false');
    button.element.click();
    expect(button.element.getAttribute('aria-pressed')).toBe('true');
    expect(has(button, 'selected')).toBe(true);
    button.setSelected(false);
    expect(button.element.getAttribute('aria-pressed')).toBe('false');
    expect(has(button, 'selected')).toBe(false);
    expect(mount({ text: 'x', toggle: true, selected: true }).element.getAttribute('aria-pressed')).toBe('true');
  });

  test('a plain button is not a toggle: no aria-pressed, and setSelected does not add one', () => {
    const button = mount({ text: 'x' });
    button.setSelected(true);
    expect(button.element.hasAttribute('aria-pressed')).toBe(false);
  });

  test('setLoading disables the button and swaps its label, and undoing it restores both', async () => {
    const button = mount({ text: 'Save', progress: true });
    const pending = button.setLoading(true, 'Saving');
    expect(button.element.disabled).toBe(true);
    expect(button.element.getAttribute('aria-busy')).toBe('true');
    await pending;
    expect(button.element.disabled).toBe(true);
    expect(has(button, 'progress')).toBe(true);
    expect(button.getText()).toBe('Saving');

    const cleared = button.setLoading(false);
    expect(button.element.hasAttribute('aria-busy')).toBe(false);
    await cleared;
    expect(button.element.disabled).toBe(false);
    expect(button.getText()).toBe('Save');
  });

  // N14: loading only disabled the button, which says nothing about why
  test('a loading button is busy, and stops being busy when loading ends', async () => {
    const button = mount({ text: 'Save', progress: true });
    expect(button.element.hasAttribute('aria-busy')).toBe(false);
    await button.setLoading(true);
    expect(button.element.getAttribute('aria-busy')).toBe('true');
    await button.setLoading(false);
    expect(button.element.hasAttribute('aria-busy')).toBe(false);
  });

  test('initial loading is busy and disabled before the indicator arrives', async () => {
    for (const progress of [undefined,true,{ variant: 'circular' as const, size: 18 }]) {
      const button = mount({ text: 'Save', loading: true, progress });
      expect(button.element.getAttribute('aria-busy')).toBe('true');
      expect(button.element.disabled).toBe(true);
      expect(button.element.querySelector('.mtrl-button__progress')).toBeNull();
      let clicks = 0;
      button.on('click',()=>clicks++);
      button.element.click();
      expect(clicks).toBe(0);
      await button.showProgress();
      expect(has(button,'progress')).toBe(true);
      await button.setLoading(false);
      expect(button.element.hasAttribute('aria-busy')).toBe(false);
      expect(button.element.disabled).toBe(false);
      expect(has(button,'progress')).toBe(false);
      expect(button.getText()).toBe('Save');
      button.destroy();
    }
  });

  test('clearing initial loading leaves subsequently prepared progress hidden', async () => {
    const button = mount({ text: 'Save', loading: true });
    await button.setLoading(false);
    await button.setProgress(25);
    await Promise.resolve();
    expect(button.element.hasAttribute('aria-busy')).toBe(false);
    expect(button.element.disabled).toBe(false);
    expect(has(button,'progress')).toBe(false);
    expect(button.getText()).toBe('Save');
    button.destroy();
  });

  test('custom progress values and event handlers survive lazy initialization', async () => {
    let changes = 0;
    const progress = { size: 18, value: 30, indeterminate: false, on: { change: () => changes++ } };
    const button = mount({ text: 'Save', progress });
    await button.showProgress();
    const indicator = button.element.querySelector('[role="progressbar"]')!;
    expect(indicator.getAttribute('aria-valuenow')).toBe('30');
    await button.setProgress(60);
    expect(indicator.getAttribute('aria-valuenow')).toBe('60');
    expect(changes).toBe(1);
    button.destroy();
  });

  test('omitting loading or setting it false leaves the default button unchanged', () => {
    const plain = mount({ text: 'Save' });
    const explicit = mount({ text: 'Save', loading: false });
    expect(explicit.element.outerHTML).toBe(plain.element.outerHTML);
    expect(plain.setLoading).toBeUndefined();
    expect(explicit.setLoading).toBeUndefined();
    expect(explicit.element.disabled).toBe(false);
    expect(explicit.element.hasAttribute('aria-busy')).toBe(false);
  });

  test('destroy removes the element', () => {
    const button = mount({ text: 'x' });
    button.destroy();
    expect(document.body.contains(button.element)).toBe(false);
  });
});
