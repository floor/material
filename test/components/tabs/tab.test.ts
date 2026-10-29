// test/components/tabs/tab.test.ts
//
// The real tab in a JSDOM document. The tabs suite builds mock tabs, so the
// event methods on the object createTab returns are pinned here.
import { describe, test, expect, beforeEach } from 'bun:test';
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

import { TAB_CLASSES } from '../../../src/components/tabs/constants';
import { createTab } from '../../../src/components/tabs/tab';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('tab', () => {
  test('on and off return the tab they are called on', () => {
    const tab = createTab({ text: 'One', value: 'one' });
    const handler = () => {};
    expect(tab.on('click', handler)).toBe(tab);
    expect(tab.off('click', handler)).toBe(tab);
    tab.destroy();
  });

  // TAB_EVENTS declares focus and blur, and nothing emitted them.
  test('focus and blur reach handlers registered through on', () => {
    const tab = createTab({ text: 'One', value: 'one' });
    document.body.appendChild(tab.element);
    const seen: string[] = [];
    tab.on('focus', () => seen.push('focus'));
    tab.on('blur', () => seen.push('blur'));
    tab.element.focus();
    tab.element.blur();
    expect(seen).toEqual(['focus', 'blur']);
    tab.destroy();
  });

  test('a click handler registered through on fires, and stops after off', () => {
    const tab = createTab({ text: 'One', value: 'one' });
    document.body.appendChild(tab.element);
    let clicks = 0;
    const handler = () => clicks++;
    tab.on('click', handler);
    tab.element.click();
    expect(clicks).toBe(1);
    tab.off('click', handler);
    tab.element.click();
    expect(clicks).toBe(1);
    tab.destroy();
  });

  // The badge component's own rule (creation and setLabel both): a large
  // badge exists to carry a label, so an empty or zero one is not shown.
  test('setBadge of an empty or zero label clears the badge, and a value after it shows again', () => {
    const tab = createTab({ text: 'Inbox', value: 'inbox', badge: '3' });
    const badge = tab.badge!;
    const invisible = () => badge.element.classList.contains('mtrl-badge--invisible');
    expect(invisible()).toBe(false);

    tab.setBadge('');
    expect(invisible()).toBe(true);
    expect(tab.element.getAttribute('data-has-badge')).toBe('false');
    expect(tab.getBadge()).toBe('');

    tab.setBadge(0);
    expect(invisible()).toBe(true);

    tab.setBadge('12');
    expect(invisible()).toBe(false);
    expect(badge.getContent()).toBe('12');
    expect(tab.element.getAttribute('data-has-badge')).toBe('true');
    tab.destroy();
  });

  test('showBadge does not show what an empty label cleared', () => {
    const tab = createTab({ text: 'Inbox', value: 'inbox' });
    tab.setBadge('9');
    tab.setBadge('');
    tab.showBadge();
    expect(tab.badge!.element.classList.contains('mtrl-badge--invisible')).toBe(true);
    expect(tab.getBadgeComponent()!.isVisible()).toBe(false);
    tab.destroy();
  });

  test('a tab created with an empty or zero badge label shows no badge', () => {
    for (const empty of ['', 0] as const) {
      const tab = createTab({ text: 'Inbox', value: 'inbox', badge: empty });
      expect(tab.badge!.element.classList.contains('mtrl-badge--invisible')).toBe(true);
      expect(tab.element.getAttribute('data-has-badge')).toBe('false');
      tab.destroy();
    }
  });

  test('a small badge keeps its dot through an empty setBadge', () => {
    const tab = createTab({ text: 'Starred', value: 'starred', badge: '1', badgeConfig: { variant: 'small' } });
    const invisible = () => tab.badge!.element.classList.contains('mtrl-badge--invisible');
    expect(invisible()).toBe(false);
    tab.setBadge('');
    expect(invisible()).toBe(false);
    tab.destroy();
  });
});

test('exported tab hooks address the composed button and its shared ripple', () => {
  const tab = createTab({ text: 'Inbox', icon: '<svg></svg>', badge: '3', value: 'inbox' });
  try {
    for (const key of ['TEXT', 'ICON', 'RIPPLE'] as const) {
      expect(tab.element.querySelector(`.${tab.getClass(TAB_CLASSES[key])}`)).not.toBeNull();
    }
    expect(tab.badge?.element.classList.contains(tab.getClass(TAB_CLASSES.BADGE))).toBe(true);
  } finally { tab.destroy(); }
});
