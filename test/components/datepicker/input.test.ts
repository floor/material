// test/components/datepicker/input.test.ts
//
// The real datepicker in a JSDOM document. The datepicker suite builds a mock
// picker, so the input the component creates is pinned here.
import { describe, test, expect, beforeEach } from 'bun:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.CustomEvent = dom.window.CustomEvent;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);

import createDatePicker from '../../../src/components/datepicker';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('datepicker input', () => {
  test('the input is the INPUT element inside the picker', () => {
    const picker = createDatePicker();
    document.body.appendChild(picker.element);
    expect(picker.input.tagName).toBe('INPUT');
    expect(picker.element.querySelector('input')).toBe(picker.input);
    picker.destroy();
  });

  test('setting a date writes it into the input', () => {
    const picker = createDatePicker();
    document.body.appendChild(picker.element);
    picker.setValue(new Date(2026, 8, 15));
    expect(picker.input.value).toBe('09/15/2026');
    picker.destroy();
  });
});

// The field's read-only, required and supporting-text states.
describe('datepicker field states', () => {
  const mount = (config: Parameters<typeof createDatePicker>[0] = {}) => {
    const picker = createDatePicker(config);
    document.body.appendChild(picker.element);
    return picker;
  };
  const help = (picker: ReturnType<typeof createDatePicker>) => picker.element.querySelector('.mtrl-datepicker__help')!.textContent;
  const error = (picker: ReturnType<typeof createDatePicker>) => picker.element.querySelector('.mtrl-datepicker__error')!.textContent;
  const trigger = (picker: ReturnType<typeof createDatePicker>) => picker.element.querySelector<HTMLButtonElement>('[data-action="open"]')!;

  test('read-only keeps the value and the calendar closed', () => {
    const picker = mount({ readOnly: true, value: new Date(2026, 8, 15) });
    let opened = 0;
    picker.on('open', () => opened++);
    expect(picker.isReadOnly()).toBe(true);
    expect(picker.input.readOnly).toBe(true);
    expect(trigger(picker).disabled).toBe(true);
    expect(picker.element.classList.contains('mtrl-datepicker--readonly')).toBe(true);
    picker.open();
    expect(opened).toBe(0);
    expect(picker.input.value).toBe('09/15/2026');
    picker.setReadOnly(false).open();
    expect(opened).toBe(1);
    expect(picker.input.readOnly).toBe(false);
    expect(trigger(picker).disabled).toBe(false);
    picker.destroy();
  });

  test('read-only closes an open calendar', () => {
    const picker = mount();
    let closed = 0;
    picker.on('close', () => closed++);
    picker.open().setReadOnly(true);
    expect(closed).toBe(1);
    picker.destroy();
  });

  test('required: checkValidity says whether a date is missing, reportValidity shows it', () => {
    const picker = mount({ required: true, selectionMode: 'range' });
    expect(picker.input.required).toBe(true);
    expect(picker.checkValidity()).toBe(false);
    // checkValidity is pure: nothing is shown.
    expect(picker.input.hasAttribute('aria-invalid')).toBe(false);
    expect(picker.reportValidity()).toBe(false);
    expect(picker.input.getAttribute('aria-invalid')).toBe('true');
    expect(error(picker)).toBe('Select a date range.');
    picker.setValue(new Date(2026, 8, 15));
    expect(picker.checkValidity()).toBe(true);
    expect(picker.input.hasAttribute('aria-invalid')).toBe(false);
    picker.clear().setRequired(false);
    expect(picker.checkValidity()).toBe(true);
    expect(picker.reportValidity()).toBe(true);
    picker.destroy();
  });

  test('supporting text replaces the format hint, which returns without it', () => {
    const picker = mount({ supportingText: 'Departure' });
    expect(help(picker)).toBe('Departure');
    picker.setSupportingText('Return');
    expect(help(picker)).toBe('Return');
    picker.setSupportingText(null);
    expect(help(picker)).toBe('MM/DD/YYYY');
    expect(help(mount())).toBe('MM/DD/YYYY');
  });
});
