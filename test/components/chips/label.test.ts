// test/components/chips/label.test.ts
//
// The set's label API: setLabel, getLabel, setLabelPosition and
// getLabelPosition reached an enhancer nothing applied, so they did nothing.
// They now drive the <label> the set creates, and keep the grid named by it.
// Two sets are live at once so a change on one cannot pass by matching the other.
import { describe, test, expect, beforeEach } from 'bun:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost/',
  pretendToBeVisual: true,
});

const win = dom.window;
const g = globalThis as unknown as {
  window: typeof win;
  document: Document;
  navigator: Navigator;
  HTMLElement: typeof HTMLElement;
  HTMLLabelElement: typeof HTMLLabelElement;
  Element: typeof Element;
  Node: typeof Node;
  Event: typeof Event;
  CustomEvent: typeof CustomEvent;
  MutationObserver: typeof MutationObserver;
  getComputedStyle: typeof getComputedStyle;
};
g.window = win;
g.document = win.document;
g.navigator = win.navigator;
g.HTMLElement = win.HTMLElement;
g.HTMLLabelElement = win.HTMLLabelElement;
g.Element = win.Element;
g.Node = win.Node;
g.Event = win.Event;
g.CustomEvent = win.CustomEvent;
g.MutationObserver = win.MutationObserver;
g.getComputedStyle = win.getComputedStyle.bind(win);

import { createChips } from '../../../src/components/chips';

const labelOf = (chips: ReturnType<typeof createChips>) => chips.element.querySelector(':scope > .mtrl-chips__label');
const named = (chips: ReturnType<typeof createChips>) => {
  const id = chips.element.getAttribute('aria-labelledby');
  return id ? document.getElementById(id)?.textContent ?? null : null;
};
const has = (chips: ReturnType<typeof createChips>, modifier: string) => chips.element.classList.contains(`mtrl-chips--${modifier}`);
const make = (config: Parameters<typeof createChips>[0] = {}) => {
  const chips = createChips({ chips: [{ label: 'One' }], ...config });
  document.body.append(chips.element);
  return chips;
};

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('chip set label', () => {
  test('reads the configured text and position', () => {
    const start = make({ label: 'Filters' });
    const end = make({ label: 'Tags', labelPosition: 'end' });
    expect([start.getLabel(), start.getLabelPosition()]).toEqual(['Filters', 'start']);
    expect([end.getLabel(), end.getLabelPosition()]).toEqual(['Tags', 'end']);
    expect(has(end, 'label-end')).toBe(true);
  });

  test('setLabel renames the label, and the grid keeps its name from it', () => {
    const chips = make({ label: 'Filters' });
    const other = make({ label: 'Other' });
    const label = labelOf(chips);
    expect(chips.setLabel('Categories')).toBe(chips);
    expect(labelOf(chips)).toBe(label);
    expect(chips.getLabel()).toBe('Categories');
    expect(named(chips)).toBe('Categories');
    expect(other.getLabel()).toBe('Other');
  });

  test('setLabel on a set without one adds the label first, naming the grid', () => {
    const chips = make();
    expect(chips.element.hasAttribute('aria-labelledby')).toBe(false);
    chips.setLabel('Filters');
    expect(chips.element.firstElementChild).toBe(labelOf(chips));
    expect(named(chips)).toBe('Filters');
    expect(has(chips, 'with-label')).toBe(true);
  });

  test('an empty label removes it, and the grid is no longer named by it', () => {
    const chips = make({ label: 'Filters', labelPosition: 'end' });
    chips.setLabel('');
    expect(labelOf(chips)).toBeNull();
    expect(chips.getLabel()).toBe('');
    expect(chips.element.hasAttribute('aria-labelledby')).toBe(false);
    expect(has(chips, 'with-label')).toBe(false);
    expect(has(chips, 'label-end')).toBe(false);
  });

  test('setLabelPosition moves the label with --label-end, leaving it first in reading order', () => {
    const chips = make({ label: 'Filters' });
    const other = make({ label: 'Other' });
    expect(chips.setLabelPosition('end')).toBe(chips);
    expect(chips.getLabelPosition()).toBe('end');
    expect(has(chips, 'label-end')).toBe(true);
    expect(chips.element.firstElementChild).toBe(labelOf(chips));
    expect(has(other, 'label-end')).toBe(false);
    chips.setLabelPosition('start');
    expect(has(chips, 'label-end')).toBe(false);
  });

  test('a position set before any label applies once a label is added', () => {
    const chips = make();
    chips.setLabelPosition('end');
    expect(has(chips, 'label-end')).toBe(false);
    chips.setLabel('Late');
    expect(has(chips, 'label-end')).toBe(true);
  });
});
