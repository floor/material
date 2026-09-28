// test/components/tabs/indicator.test.ts
//
// FLO-262. The indicator's height follows its variant: the site's 3dp primary and
// 2dp secondary (both were 3). Its motion belongs to the stylesheet's default
// spatial spring unless an app passes a duration or an easing.
import { describe, test, expect } from 'bun:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
(globalThis as unknown as { document: Document }).document = dom.window.document;

import { createTabIndicator } from '../../../src/components/tabs/indicator';

describe('tab indicator', () => {
  test('3dp on primary tabs and 2dp on secondary ones', () => {
    expect(createTabIndicator({ variant: 'primary' }).element.style.height).toBe('3px');
    expect(createTabIndicator({ variant: 'secondary' }).element.style.height).toBe('2px');
  });

  test('an explicit height still wins', () => {
    expect(createTabIndicator({ variant: 'secondary', height: 4 }).element.style.height).toBe('4px');
  });

  test('no inline transition by default, so the stylesheet spring moves it', () => {
    expect(createTabIndicator({}).element.style.transition).toBe('');
  });

  test('a duration or an easing from the app moves it instead', () => {
    const { transition } = createTabIndicator({ animationDuration: 300 }).element.style;
    expect(transition).toContain('transform 300ms');
    expect(transition).toContain('width 300ms');
  });
});
