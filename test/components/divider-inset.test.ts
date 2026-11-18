// test/components/divider-inset.test.ts
//
// withOrientation sizes a horizontal divider at width: 100%, and withInset then added
// left/right margins to that same element. 100% plus margins overflows the parent, so an
// inset divider ran past the edge of whatever contained it. The fix lets the box shrink
// to what the insets leave. Real DOM, no mock: the previous divider test mocked the
// component and so could not have caught this.
import { describe, test, expect } from 'bun:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
global.document = dom.window.document as any;
global.window = dom.window as any;
global.Element = dom.window.Element as any;
global.HTMLElement = dom.window.HTMLElement as any;
global.Event = dom.window.Event as any;
global.CustomEvent = dom.window.CustomEvent as any;

import { createDivider } from '../../src/components/divider';

describe('divider insets', () => {
  test('a full-width divider still spans its container', () => {
    const divider = createDivider();
    expect(divider.element.style.width).toBe('100%');
    expect(divider.element.style.marginInlineStart).toBe('');
  });

  test('an inset divider does not also claim the full width', () => {
    const divider = createDivider({ variant: 'inset' });
    expect(divider.element.style.marginInlineStart).toBe('16px');
    // The bug: width stayed 100% alongside a 16px margin, overflowing the parent.
    expect(divider.element.style.width).not.toBe('100%');
    expect(divider.element.style.width).toBe('auto');
  });

  test('a middle-inset divider is inset on both sides and still fits', () => {
    const divider = createDivider({ variant: 'middle-inset' });
    expect(divider.element.style.marginInlineStart).toBe('16px');
    expect(divider.element.style.marginInlineEnd).toBe('16px');
    expect(divider.element.style.width).toBe('auto');
  });

  test('explicit insets are honoured, and still fit', () => {
    const divider = createDivider({ variant: 'inset', insetStart: 24, insetEnd: 8 });
    expect(divider.element.style.marginInlineStart).toBe('24px');
    expect(divider.element.style.marginInlineEnd).toBe('8px');
    expect(divider.element.style.width).toBe('auto');
  });

  test('a vertical inset divider does not also claim the full height', () => {
    const divider = createDivider({ orientation: 'vertical', variant: 'inset' });
    expect(divider.element.style.marginBlockStart).toBe('16px');
    expect(divider.element.style.height).not.toBe('100%');
    expect(divider.element.style.height).toBe('calc(100% - 16px)');
  });

  test('a vertical full-width divider still spans its container', () => {
    const divider = createDivider({ orientation: 'vertical' });
    expect(divider.element.style.height).toBe('100%');
  });

  test('a full-width divider keeps an explicit inset and still fits', () => {
    const constructed = createDivider({ insetStart: 24, insetEnd: 12 });
    expect(constructed.element.style.marginInlineStart).toBe('24px');
    expect(constructed.element.style.marginInlineEnd).toBe('12px');
    expect(constructed.element.style.width).toBe('auto');

    const updated = createDivider();
    updated.setInset(32, 20);
    expect(updated.element.style.marginInlineStart).toBe('32px');
    expect(updated.element.style.marginInlineEnd).toBe('20px');
    expect(updated.element.style.width).toBe('auto');
  });

  test('one explicit side of a full-width divider leaves the other at 0', () => {
    const start = createDivider({ insetStart: 24 });
    expect(start.element.style.marginInlineStart).toBe('24px');
    expect(start.element.style.marginInlineEnd).toBe('0px');
    expect(start.element.style.width).toBe('auto');

    const end = createDivider({ orientation: 'vertical', insetEnd: 12 });
    expect(end.element.style.marginBlockStart).toBe('0px');
    expect(end.element.style.marginBlockEnd).toBe('12px');
    expect(end.element.style.height).toBe('calc(100% - 12px)');
  });

  test('a vertical full-width divider keeps an explicit inset and its length', () => {
    const constructed = createDivider({ orientation: 'vertical', insetStart: 24, insetEnd: 12 });
    expect(constructed.element.style.marginBlockStart).toBe('24px');
    expect(constructed.element.style.marginBlockEnd).toBe('12px');
    expect(constructed.element.style.width).toBe('1px');
    expect(constructed.element.style.height).toBe('calc(100% - 36px)');

    const updated = createDivider({ orientation: 'vertical' });
    updated.setInset(24, 12);
    expect(updated.element.style.height).toBe('calc(100% - 36px)');

    const zero = createDivider({ orientation: 'vertical', insetStart: 0, insetEnd: 0 });
    expect(zero.element.style.marginBlockStart).toBe('0px');
    expect(zero.element.style.marginBlockEnd).toBe('0px');
    expect(zero.element.style.height).toBe('calc(100% - 0px)');
  });
});
