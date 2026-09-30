// test/components/side-sheet/side-sheet.test.ts
//
// The real component in a JSDOM document, not a mock.
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.HTMLButtonElement = dom.window.HTMLButtonElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.CustomEvent = dom.window.CustomEvent;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);

import createSideSheet from '../../../src/components/side-sheet';

let sheets: Array<{ destroy: () => void }> = [];
const make = (config = {}) => {
  const sheet = createSideSheet(config);
  sheets.push(sheet);
  return sheet;
};

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  for (const sheet of sheets) sheet.destroy();
  sheets = [];
});

describe('side sheet', () => {
  test('it mounts itself, closed', () => {
    const sheet = make({ title: 'Filters' });
    expect(sheet.element.isConnected).toBe(true);
    expect(sheet.isOpen()).toBe(false);
    expect(sheet.element.getAttribute('aria-hidden')).toBe('true');
  });

  test('open, close and toggle, without throwing', () => {
    const sheet = make();
    expect(() => sheet.open()).not.toThrow();
    expect(sheet.isOpen()).toBe(true);
    expect(sheet.element.getAttribute('aria-hidden')).toBe('false');

    sheet.close();
    expect(sheet.isOpen()).toBe(false);

    sheet.toggle();
    expect(sheet.isOpen()).toBe(true);
    sheet.toggle();
    expect(sheet.isOpen()).toBe(false);
  });

  test('its events fire, including handlers given at creation', () => {
    const seen: string[] = [];
    const sheet = make({ on: { open: () => seen.push('open'), close: () => seen.push('close') } });
    sheet.open();
    sheet.close();
    expect(seen).toEqual(['open', 'close']);
  });

  test('a modal sheet has a scrim and is a dialog; a standard one is complementary', () => {
    const modal = make({ variant: 'modal' });
    expect(modal.element.querySelector('.mtrl-side-sheet__scrim')?.isConnected).toBe(true);
    const container = modal.element.querySelector('.mtrl-side-sheet__container')!;
    expect(container.getAttribute('role')).toBe('dialog');
    expect(container.getAttribute('aria-modal')).toBe('true');

    const standard = make({ variant: 'standard' });
    expect(standard.element.querySelector('.mtrl-side-sheet__scrim')).toBeNull();
    expect(
      standard.element.querySelector('.mtrl-side-sheet__container')!.getAttribute('role')
    ).toBe('complementary');
  });

  test('it docks to the trailing edge by default, and can dock to the leading one', () => {
    expect(make().element.classList.contains('mtrl-side-sheet--end')).toBe(true);
    expect(make({ position: 'start' }).element.classList.contains('mtrl-side-sheet--start')).toBe(true);
  });

  test('the close button closes it and carries a name', () => {
    const sheet = make({ title: 'Filters' });
    sheet.open();
    const close = sheet.element.querySelector('.mtrl-side-sheet__close') as HTMLButtonElement;
    expect(close.getAttribute('aria-label')).toBe('Close');
    expect(close.type).toBe('button');

    close.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(sheet.isOpen()).toBe(false);
  });

  test('the close button can be left out', () => {
    expect(make({ closeButton: false }).element.querySelector('.mtrl-side-sheet__close')).toBeNull();
  });

  test('the scrim and Escape close it, unless told not to', () => {
    const sheet = make();
    sheet.open();
    (sheet.element.querySelector('.mtrl-side-sheet__scrim') as HTMLElement)
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(sheet.isOpen()).toBe(false);

    const escapable = make();
    escapable.open();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(escapable.isOpen()).toBe(false);

    const sticky = make({ closeOnScrimClick: false, closeOnEscape: false });
    sticky.open();
    (sticky.element.querySelector('.mtrl-side-sheet__scrim') as HTMLElement)
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(sticky.isOpen()).toBe(true);
  });

  test('a title names the sheet, before and after creation', () => {
    const sheet = make({ title: 'Filters' });
    const container = sheet.element.querySelector('.mtrl-side-sheet__container')!;
    const title = sheet.element.querySelector('.mtrl-side-sheet__title')!;
    expect(title.textContent).toBe('Filters');
    expect(container.getAttribute('aria-labelledby')).toBe(title.id);

    const later = make({ closeButton: false });
    later.setTitle('Added later');
    const laterContainer = later.element.querySelector('.mtrl-side-sheet__container')!;
    const laterTitle = later.element.querySelector('.mtrl-side-sheet__title')!;
    expect(laterTitle.textContent).toBe('Added later');
    expect(laterContainer.getAttribute('aria-labelledby')).toBe(laterTitle.id);
  });

  test('width is applied and capped', () => {
    const container = make().element.querySelector('.mtrl-side-sheet__container') as HTMLElement;
    expect(container.style.width).toBe('256px');
    expect(container.style.maxWidth).toBe('400px');

    const wide = make({ width: 320, maxWidth: 360 }).element.querySelector('.mtrl-side-sheet__container') as HTMLElement;
    expect(wide.style.width).toBe('320px');
    expect(wide.style.maxWidth).toBe('360px');
  });

  test('content can be markup or an element, and can be replaced', () => {
    const sheet = make({ content: '<p>First</p>' });
    const content = sheet.element.querySelector('.mtrl-side-sheet__content')!;
    expect(content.textContent).toBe('First');

    const replacement = document.createElement('span');
    replacement.textContent = 'Second';
    sheet.setContent(replacement);
    expect(content.textContent).toBe('Second');
  });

  test('it can start open', () => {
    expect(make({ open: true }).isOpen()).toBe(true);
  });

  test('destroy removes it and stops listening', () => {
    const sheet = createSideSheet();
    sheet.open();
    const element = sheet.element;
    sheet.destroy();

    expect(element.isConnected).toBe(false);
    expect(() =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    ).not.toThrow();
  });
});

// FLO-324: a modal sheet outside the top layer made neither the page inert nor
// kept Tab inside, as showModal() does for one in it.
describe('side sheet: modal outside the top layer', () => {
  const page = () => {
    const before = document.createElement('button');
    before.textContent = 'Before';
    const main = document.createElement('main');
    main.append(document.createElement('input'));
    document.body.append(before, main);
    return { before, main };
  };

  test('opening makes the rest of the page inert, closing restores exactly what it changed', () => {
    const { before, main } = page();
    const already = document.createElement('aside');
    already.setAttribute('inert', '');
    document.body.append(already);
    const sheet = make({ variant: 'modal', content: '<button>Inside</button>' });
    document.body.append(sheet.element);
    sheet.open();
    expect([before.hasAttribute('inert'), main.hasAttribute('inert'), sheet.element.hasAttribute('inert')]).toEqual([true, true, false]);
    sheet.close();
    expect([before.hasAttribute('inert'), main.hasAttribute('inert')]).toEqual([false, false]);
    // an element that was inert before the sheet stays so
    expect(already.hasAttribute('inert')).toBe(true);
  });

  test('Tab stays in the sheet while it is open', () => {
    page();
    const sheet = make({ variant: 'modal', content: '<button id="first">First</button><button id="last">Last</button>' });
    document.body.append(sheet.element);
    sheet.open();
    const last = sheet.element.querySelector<HTMLButtonElement>('#last')!;
    last.focus();
    const tab = new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    last.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(true);
    sheet.close();
    const after = new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    last.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  test('a standard sheet leaves the page alone', () => {
    const { before } = page();
    const sheet = make({ variant: 'standard' });
    document.body.append(sheet.element);
    sheet.open();
    expect(before.hasAttribute('inert')).toBe(false);
  });

  test('destroy while open restores the page', () => {
    const { before } = page();
    const sheet = createSideSheet({ variant: 'modal' });
    document.body.append(sheet.element);
    sheet.open();
    expect(before.hasAttribute('inert')).toBe(true);
    sheet.destroy();
    expect(before.hasAttribute('inert')).toBe(false);
  });
});
