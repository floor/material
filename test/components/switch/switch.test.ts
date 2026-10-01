// test/components/switch/switch.test.ts
//
// The real switch in a JSDOM document: what it renders, how its checked,
// disabled and supporting-text state reach the DOM, and what its API reports.
//
// This replaces test/components/switch.test.ts, which asserted against a
// createMockSwitch defined in its own file. The mock had its own setLabel and
// its own supportingTextElement, so it could not notice that the real ones
// were broken: setLabel() and getLabel() read a `text` key the component never
// had, and supportingTextElement was a snapshot taken at creation.
//
// Deliberately not asserted here, because each is an open finding and a test
// would bless the current behaviour: the label is not associated with the
// input (F9), and a custom class gains the library prefix (F11).
import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.HTMLInputElement = dom.window.HTMLInputElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.CustomEvent = dom.window.CustomEvent;
g.MutationObserver = dom.window.MutationObserver;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);

import createSwitch from '../../../src/components/switch';
import { SWITCH_DEFAULTS } from '../../../src/components/switch/constants';

beforeEach(() => { document.body.innerHTML = ''; });

const mount = (config: Parameters<typeof createSwitch>[0] = {}) => {
  const s = createSwitch(config);
  document.body.append(s.element);
  return s;
};

describe('switch', () => {
  test('is a checkbox input with the switch role inside an mtrl-switch root', () => {
    const s = mount();
    expect(s.element.classList.contains('mtrl-switch')).toBe(true);
    expect(s.input.type).toBe('checkbox');
    expect(s.input.getAttribute('role')).toBe('switch');
    expect(s.element.querySelector('.mtrl-switch__track .mtrl-switch__thumb')).not.toBeNull();
  });

  test('form attributes reach the input', () => {
    const s = mount({ name: 'wifi', value: 'on', required: true });
    expect(s.input.name).toBe('wifi');
    expect(s.input.value).toBe('on');
    expect(s.input.required).toBe(true);
  });

  test('a label renders its text and names the input; no label renders no label element', () => {
    const labelled = mount({ label: 'Wi-Fi' });
    const label = labelled.element.querySelector('label')!;
    expect(label.textContent).toBe('Wi-Fi');
    expect(labelled.input.id).not.toBe('');
    expect(label.htmlFor).toBe(labelled.input.id);
    expect(Array.from(labelled.input.labels ?? [])).toEqual([label]);
    expect(mount().element.querySelector('label')).toBeNull();
  });

  // F9: the label was created before the input existed, so it linked to
  // nothing; a click on it did nothing and it named nothing
  test('clicking the label toggles the switch', () => {
    const s = mount({ label: 'Wi-Fi' });
    s.element.querySelector('label')!.click();
    expect(s.isChecked()).toBe(true);
    s.element.querySelector('label')!.click();
    expect(s.isChecked()).toBe(false);
  });

  test('the name follows setLabel: no aria-label repeating the old text outranks the label', () => {
    const s = mount({ label: 'Wi-Fi' });
    s.setLabel('Bluetooth');
    expect(s.input.hasAttribute('aria-label')).toBe(false);
    expect(s.input.labels?.[0]?.textContent).toBe('Bluetooth');
  });

  test('an ariaLabel that differs from the label is kept, and one alone still names the input', () => {
    expect(mount({ label: 'Wi-Fi', ariaLabel: 'Wireless network' }).input.getAttribute('aria-label')).toBe('Wireless network');
    expect(mount({ ariaLabel: 'Wireless network' }).input.getAttribute('aria-label')).toBe('Wireless network');
  });

  // The published default once said end while a switch rendered its label at
  // the start. The label leads, as in M3 settings rows, and the constant is
  // what the component reads, so the two are asserted together.
  test('with no position the label leads, and that default is the published one', () => {
    const s = mount({ label: 'Wi-Fi' });
    expect(SWITCH_DEFAULTS.LABEL_POSITION).toBe('start');
    expect(s.element.classList.contains(`mtrl-switch--label-${SWITCH_DEFAULTS.LABEL_POSITION}`)).toBe(true);
    expect(s.element.querySelector('label')?.classList.contains('mtrl-switch__label--start')).toBe(true);
  });

  test('an explicit label position is reflected in the root class', () => {
    expect(mount({ label: 'A', labelPosition: 'start' }).element.classList.contains('mtrl-switch--label-start')).toBe(true);
    expect(mount({ label: 'B', labelPosition: 'end' }).element.classList.contains('mtrl-switch--label-end')).toBe(true);
  });

  test('getLabel() reads the rendered label, and setLabel() changes it', () => {
    const s = mount({ label: 'Wi-Fi' });
    expect(s.getLabel()).toBe('Wi-Fi');
    s.setLabel('Bluetooth');
    expect(s.getLabel()).toBe('Bluetooth');
    expect(s.element.querySelector('label')?.textContent).toBe('Bluetooth');
  });

  test('checked state from config reaches the input, the class and the API', () => {
    const s = mount({ checked: true });
    expect(s.input.checked).toBe(true);
    expect(s.element.classList.contains('mtrl-switch--checked')).toBe(true);
    expect(s.isChecked()).toBe(true);
    expect(s.getValue()).toBe(true);
    expect(mount().isChecked()).toBe(false);
  });

  test('check, uncheck and toggle move the input and the class, silently (FLO-328)', () => {
    const s = mount();
    const changes = mock((_event: unknown) => {});
    s.on('change', changes);

    s.check();
    expect(s.input.checked).toBe(true);
    expect(s.element.classList.contains('mtrl-switch--checked')).toBe(true);

    s.uncheck();
    expect(s.input.checked).toBe(false);
    expect(s.element.classList.contains('mtrl-switch--checked')).toBe(false);

    s.toggle();
    expect(s.isChecked()).toBe(true);
    expect(changes).not.toHaveBeenCalled();
  });

  test('check() on a checked switch changes nothing and emits nothing', () => {
    const s = mount({ checked: true });
    const changes = mock((_event: unknown) => {});
    s.on('change', changes);
    s.check();
    expect(changes).not.toHaveBeenCalled();
  });

  test('a user click toggles it and reports the new state', () => {
    const s = mount();
    const changes = mock((_event: { checked: boolean }) => {});
    s.on('change', changes);
    s.input.click();
    expect(s.isChecked()).toBe(true);
    expect(changes).toHaveBeenCalledTimes(1);
    expect(changes.mock.calls[0][0].checked).toBe(true);
  });

  test('input changes carry the original change event, including keyboard activation', () => {
    const control = mount({ value: 'accepted' });
    const payloads: Array<{ checked: boolean; value: boolean; valueAttribute: string; nativeEvent?: Event }> = [];
    const nativeEvents: Event[] = [];
    control.on('change', payload => {
      expect(payload.value).toBe(control.getValue());
      payloads.push(payload);
    });
    control.input.addEventListener('change', event => nativeEvents.push(event));
    control.input.click();
    const keydown = new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    control.input.dispatchEvent(keydown);
    expect(payloads).toHaveLength(2);
    expect(payloads.map(payload => payload.checked)).toEqual([true, false]);
    payloads.forEach((payload, index) => {
      expect(payload.value).toBe(payload.checked);
      expect(payload.valueAttribute).toBe('accepted');
      expect(payload.nativeEvent).toBe(nativeEvents[index]);
      expect(payload.nativeEvent?.type).toBe('change');
      expect(payload.nativeEvent?.target).toBe(control.input);
    });
    expect(payloads[1].nativeEvent).not.toBe(keydown);
    control.destroy();
  });

  test('programmatic changes are silent, as setting a native checkbox (FLO-328)', () => {
    const control = mount({ value: 'accepted' });
    const payloads: Array<{ checked: boolean; value: boolean; valueAttribute: string; nativeEvent?: Event }> = [];
    control.on('change', payload => {
      expect(payload.value).toBe(control.getValue());
      payloads.push(payload);
    });
    const states: boolean[] = [];
    control.check();
    states.push(control.isChecked());
    control.uncheck();
    states.push(control.isChecked());
    control.toggle();
    states.push(control.isChecked());
    control.setValue(false);
    states.push(control.isChecked());
    expect(states).toEqual([true, false, true, false]);
    expect(payloads).toEqual([]);
    control.destroy();
  });

  test('subscriptions chain, unsubscribe, suppress disabled clicks and stop after destroy', () => {
    const control = mount({ disabled: true });
    let changes = 0;
    const handler = () => changes++;
    expect(control.on('change', handler)).toBe(control);
    control.input.click();
    expect(changes).toBe(0);
    control.enable();
    control.input.click();
    expect(changes).toBe(1);
    expect(control.off('change', handler)).toBe(control);
    control.toggle();
    expect(changes).toBe(1);
    control.on('change', handler);
    control.destroy();
    control.on('change', handler);
    control.toggle();
    expect(changes).toBe(1);
  });

  test('setValue accepts booleans and the strings "true" and "1"', () => {
    const s = mount();
    s.setValue(true); expect(s.getValue()).toBe(true);
    s.setValue(false); expect(s.getValue()).toBe(false);
    s.setValue('true'); expect(s.getValue()).toBe(true);
    s.setValue('0'); expect(s.getValue()).toBe(false);
    s.setValue('1'); expect(s.getValue()).toBe(true);
  });

  test('the value attribute is separate from the checked state', () => {
    const s = mount({ value: 'on' });
    expect(s.getValueAttribute()).toBe('on');
    s.setValueAttribute('dark-mode');
    expect(s.input.value).toBe('dark-mode');
    expect(s.isChecked()).toBe(false);
  });

  test('disable and enable reach the input and the class', () => {
    const s = mount();
    s.disable();
    expect(s.input.disabled).toBe(true);
    expect(s.element.classList.contains('mtrl-switch--disabled')).toBe(true);
    s.enable();
    expect(s.input.disabled).toBe(false);
    expect(s.element.classList.contains('mtrl-switch--disabled')).toBe(false);
  });

  test('supporting text can be set as an error, and removed, and the API tracks the element', () => {
    const s = mount({ label: 'Wi-Fi' });
    expect(s.supportingTextElement).toBeNull();

    // The flag colours the text; the switch's error state is setError's (FLO-318)
    s.setSupportingText('Required', true);
    const helper = s.element.querySelector('.mtrl-switch__helper');
    expect(helper?.textContent).toBe('Required');
    expect(helper?.classList.contains('mtrl-switch__helper--error')).toBe(true);
    expect(s.element.classList.contains('mtrl-switch--error')).toBe(false);
    expect(s.supportingTextElement).toBe(helper as HTMLElement);

    s.setSupportingText('Fine', false);
    expect(helper?.classList.contains('mtrl-switch__helper--error')).toBe(false);

    s.removeSupportingText();
    expect(s.element.querySelector('.mtrl-switch__helper')).toBeNull();
    expect(s.supportingTextElement).toBeNull();
  });

  test('supporting text from config is rendered and exposed', () => {
    const s = mount({ label: 'Wi-Fi', supportingText: 'Uses more battery' });
    expect(s.supportingTextElement?.textContent).toBe('Uses more battery');
  });

  test('destroy removes the element', () => {
    const s = mount();
    s.destroy();
    expect(document.body.contains(s.element)).toBe(false);
  });
});

// FLO-267: the switch conformance audit.
describe('switch error, description, icons and events', () => {
  test('error alone marks the switch and its input invalid', () => {
    const s = mount({ label: 'Sync', error: true });
    expect(s.element.classList.contains('mtrl-switch--error')).toBe(true);
    expect(s.input.getAttribute('aria-invalid')).toBe('true');
  });

  test('supporting text describes the input, and follows set and remove', () => {
    const s = mount({ label: 'Sync', supportingText: 'Uses mobile data' });
    const helper = s.element.querySelector('.mtrl-switch__helper')!;
    expect(s.input.getAttribute('aria-describedby')).toBe(helper.id);
    s.setError(true).setSupportingText('Offline', true);
    expect(s.input.getAttribute('aria-invalid')).toBe('true');
    s.removeSupportingText();
    expect(s.input.hasAttribute('aria-describedby')).toBe(false);
    // Removing the text leaves the error to setError (FLO-318)
    expect(s.input.getAttribute('aria-invalid')).toBe('true');
    s.setError(false);
    expect(s.input.hasAttribute('aria-invalid')).toBe(false);
  });

  test('an unselected icon adds a second icon and the icons modifier', () => {
    const s = mount({ label: 'Dark', unselectedIcon: '<svg></svg>' });
    expect(s.element.classList.contains('mtrl-switch--icons')).toBe(true);
    expect(s.element.querySelectorAll('.mtrl-switch__thumb-icon').length).toBe(2);
    expect(s.element.querySelector('.mtrl-switch__thumb-icon--unselected')).not.toBeNull();
  });

  test('focus and blur reach handlers registered with on', () => {
    const s = mount({ label: 'Sync' });
    const seen: string[] = [];
    s.on('focus', () => seen.push('focus'));
    s.on('blur', () => seen.push('blur'));
    s.input.focus();
    s.input.blur();
    expect(seen).toEqual(['focus', 'blur']);
  });
});

// FLO-316: the switch shares the checkbox's key handler, which now activates
// the input as a click does: input then change, once, and nothing when disabled.
describe('switch keyboard activation', () => {
  const press = (control: ReturnType<typeof mount>, key: string) => {
    const events: string[] = [];
    for (const type of ['input', 'change']) control.input.addEventListener(type, () => events.push(type));
    control.input.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    return events;
  };

  test('Space and Enter toggle it, firing input then change once each', () => {
    const control = mount();
    expect(press(control, ' ')).toEqual(['input', 'change']);
    expect(control.isChecked()).toBe(true);
    expect(press(control, 'Enter')).toEqual(['input', 'change']);
    expect(control.isChecked()).toBe(false);
    control.destroy();
  });

  test('a disabled switch does not toggle', () => {
    const control = mount({ disabled: true });
    expect(press(control, ' ')).toEqual([]);
    expect(control.isChecked()).toBe(false);
    control.destroy();
  });
});

// FLO-318: the error state has one owner. It updated from config only, and
// replacing or removing the supporting text ended it.
describe('switch error state', () => {
  const invalid = (s: ReturnType<typeof mount>) => [
    s.isError(), s.element.classList.contains('mtrl-switch--error'), s.input.getAttribute('aria-invalid'),
  ];

  test('setError puts it in and out of error, and returns the switch', () => {
    const s = mount({ label: 'Sync' });
    expect(invalid(s)).toEqual([false, false, null]);
    expect(s.setError(true)).toBe(s);
    expect(invalid(s)).toEqual([true, true, 'true']);
    s.setError(false);
    expect(invalid(s)).toEqual([false, false, null]);
  });

  test('changing or removing the supporting text keeps the error', () => {
    const s = mount({ label: 'Sync', error: true, supportingText: 'Offline' });
    s.setSupportingText('Still offline', true);
    expect(invalid(s)).toEqual([true, true, 'true']);
    s.setSupportingText('Other text');
    expect(invalid(s)).toEqual([true, true, 'true']);
    s.removeSupportingText();
    expect(invalid(s)).toEqual([true, true, 'true']);
  });

  test('a helper on screen takes the error colour with the switch', () => {
    const s = mount({ label: 'Sync', supportingText: 'Uses mobile data' });
    const helper = () => s.element.querySelector('.mtrl-switch__helper')!;
    s.setError(true);
    expect(helper().classList.contains('mtrl-switch__helper--error')).toBe(true);
    s.setError(false);
    expect(helper().classList.contains('mtrl-switch__helper--error')).toBe(false);
  });
});
