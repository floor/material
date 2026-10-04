// test/components/slider/slider.test.ts
//
// The real slider in a JSDOM document: its handles and their ARIA value
// attributes, setting and clamping values, keyboard stepping and the events it
// reports, range sliders, min/max/step, disabled state, appearance, label, icon
// and destroy. lifecycle.test.ts beside this file covers canvas and theme
// subscriptions.
//
// This replaces test/components/slider.test.ts, which asserted against a mock
// defined in its own file. Porting it found two defects: the second handle of a
// range slider kept its initial aria-valuenow however its value changed, and a
// valueFormatter shaped the value bubble but never reached assistive technology
// through aria-valuetext.
import { corner } from '../../utils/corner';
import { describe, test, expect, beforeEach } from 'bun:test';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.FocusEvent = dom.window.FocusEvent;
g.CustomEvent = dom.window.CustomEvent;
g.MutationObserver = dom.window.MutationObserver;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = () => {};
// Reports each observed box once, a task later, as a browser does when the
// slider is first laid out: the track and the handles measure and place then.
g.ResizeObserver = class {
  constructor(private callback: () => void) {}
  observe() { setTimeout(() => this.callback(), 0); }
  disconnect() {}
  unobserve() {}
};
dom.window.HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({}, { get: () => () => {} });
} as any;

import createSlider from '../../../src/components/slider';

const wait = (ms = 10) => new Promise((resolve) => setTimeout(resolve, ms));
const handles = (slider: { element: HTMLElement }) =>
  Array.from(slider.element.querySelectorAll<HTMLElement>('[role="slider"]'));
const key = (target: HTMLElement, name: string) =>
  target.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: name, bubbles: true }));

// The slider is live as soon as it is created (#236, tested below); the
// wait lets anything a test schedules run before it looks.
const mount = async (config: Parameters<typeof createSlider>[0] = {}) => {
  const slider = createSlider(config);
  document.body.appendChild(slider.element);
  await wait();
  return slider;
};

beforeEach(() => { document.body.innerHTML = ''; });

describe('slider handle', () => {
  test('is a labelled slider carrying its range and value', async () => {
    const slider = await mount({ min: 10, max: 50, value: 20, label: 'Volume' });
    const [handle] = handles(slider);
    expect(handles(slider)).toHaveLength(1);
    expect(handle.getAttribute('aria-valuemin')).toBe('10');
    expect(handle.getAttribute('aria-valuemax')).toBe('50');
    expect(handle.getAttribute('aria-valuenow')).toBe('20');
    expect(handle.getAttribute('aria-label')).toBe('Volume');
    expect(handle.getAttribute('tabindex')).toBe('0');
  });

  test('carries no aria-valuetext without a custom formatter', async () => {
    const slider = await mount({ value: 30 });
    expect(handles(slider)[0].hasAttribute('aria-valuetext')).toBe(false);
  });

  test('announces formatted values through aria-valuetext', async () => {
    const slider = await mount({ value: 42, valueFormatter: (v) => `${v}%` });
    const [handle] = handles(slider);
    expect(handle.getAttribute('aria-valuetext')).toBe('42%');
    expect(slider.element.querySelector('.mtrl-slider__value')?.textContent).toBe('42%');

    slider.setValue(60);
    expect(handle.getAttribute('aria-valuetext')).toBe('60%');
  });
});

describe('slider value', () => {
  test('setValue updates the value and the handle', async () => {
    const slider = await mount();
    slider.setValue(35);
    expect(slider.getValue()).toBe(35);
    expect(handles(slider)[0].getAttribute('aria-valuenow')).toBe('35');
  });

  test('setValue clamps to min and max', async () => {
    const slider = await mount({ min: 0, max: 100 });
    slider.setValue(150);
    expect(slider.getValue()).toBe(100);
    slider.setValue(-5);
    expect(slider.getValue()).toBe(0);
  });

  test('setValue is silent unless told to report change', async () => {
    const slider = await mount({ value: 10 });
    const seen: number[] = [];
    slider.on('change', (e) => seen.push(e.value));
    slider.setValue(40);
    expect(seen).toEqual([]);
    slider.setValue(50, true);
    expect(seen).toEqual([50]);
  });

  test('setMin and setMax move the bounds and clamp the value', async () => {
    const slider = await mount({ value: 50 });
    const [handle] = handles(slider);
    slider.setMin(60);
    expect(slider.getMin()).toBe(60);
    expect(slider.getValue()).toBe(60);
    expect(handle.getAttribute('aria-valuemin')).toBe('60');

    slider.setMax(80).setValue(80).setMax(70);
    expect(slider.getMax()).toBe(70);
    expect(slider.getValue()).toBe(70);
    expect(handle.getAttribute('aria-valuemax')).toBe('70');
  });

  test('setStep changes how far the keyboard moves the value', async () => {
    const slider = await mount({ value: 20, step: 1 });
    slider.setStep(10);
    expect(slider.getStep()).toBe(10);
    key(handles(slider)[0], 'ArrowRight');
    expect(slider.getValue()).toBe(30);
  });
});

describe('slider keyboard', () => {
  test('arrows step the value and report input then change', async () => {
    const slider = await mount({ value: 50, step: 5 });
    const [handle] = handles(slider);
    const seen: [string, number][] = [];
    slider.on('input', (e) => seen.push(['input', e.value]));
    slider.on('change', (e) => seen.push(['change', e.value]));

    key(handle, 'ArrowRight');
    expect(slider.getValue()).toBe(55);
    key(handle, 'ArrowLeft');
    key(handle, 'ArrowLeft');
    expect(slider.getValue()).toBe(45);
    expect(seen.slice(0, 2)).toEqual([['input', 55], ['change', 55]]);
    expect(handle.getAttribute('aria-valuenow')).toBe('45');
  });

  test('Home and End jump to the bounds', async () => {
    const slider = await mount({ min: 5, max: 95, value: 50 });
    const [handle] = handles(slider);
    key(handle, 'End');
    expect(slider.getValue()).toBe(95);
    key(handle, 'Home');
    expect(slider.getValue()).toBe(5);
  });
});

describe('range slider', () => {
  test('has two labelled handles with their own values', async () => {
    const slider = await mount({ range: true, value: 20, secondValue: 80, label: 'Price' });
    const [first, second] = handles(slider);
    expect(handles(slider)).toHaveLength(2);
    expect(slider.element.classList.contains('mtrl-slider--range')).toBe(true);
    expect(first.getAttribute('aria-label')).toBe('Price minimum');
    expect(second.getAttribute('aria-label')).toBe('Price maximum');
    expect(first.getAttribute('aria-valuenow')).toBe('20');
    expect(second.getAttribute('aria-valuenow')).toBe('80');
  });

  test('setSecondValue updates the second handle silently, and reports both values when asked', async () => {
    const slider = await mount({ range: true, value: 20, secondValue: 80, valueFormatter: (v) => `$${v}` });
    const [, second] = handles(slider);
    const seen: [number, number | null][] = [];
    slider.on('change', (e) => seen.push([e.value, e.secondValue]));

    slider.setSecondValue(70);
    expect(slider.getSecondValue()).toBe(70);
    expect(second.getAttribute('aria-valuenow')).toBe('70');
    expect(second.getAttribute('aria-valuetext')).toBe('$70');
    expect(seen).toEqual([]);
    slider.setSecondValue(60, true);
    expect(seen).toEqual([[20, 60]]);
  });

  test('the keyboard moves the second handle and its ARIA value', async () => {
    const slider = await mount({ range: true, value: 20, secondValue: 80 });
    const [, second] = handles(slider);
    key(second, 'ArrowLeft');
    expect(slider.getSecondValue()).toBe(79);
    expect(second.getAttribute('aria-valuenow')).toBe('79');
  });

  test('a single slider has no second value', async () => {
    const slider = await mount({ value: 20 });
    slider.setSecondValue(70);
    expect(slider.getSecondValue()).toBeNull();
  });
});

// #236. The controller used to wire its listeners a task after creation, so
// input in the same task as createSlider() went nowhere.
describe('slider wiring in the task that creates it', () => {
  const create = (config: Parameters<typeof createSlider>[0] = {}) => {
    const slider = createSlider(config);
    document.body.appendChild(slider.element);
    return slider;
  };

  test('a key steps the value', () => {
    const slider = create({ value: 30 });
    const [handle] = handles(slider);
    key(handle, 'ArrowRight');
    expect(slider.getValue()).toBe(31);
    expect(handle.getAttribute('aria-valuenow')).toBe('31');
  });

  test('a press, move and release on the track drag the value', () => {
    const slider = create({ value: 10 });
    const container = slider.element.querySelector<HTMLElement>('.mtrl-slider__container')!;
    container.getBoundingClientRect = () => ({ width: 300, height: 48, top: 0, left: 0, right: 300, bottom: 48, x: 0, y: 0, toJSON() {} }) as DOMRect;
    container.dispatchEvent(new dom.window.MouseEvent('mousedown', { clientX: 150, bubbles: true }));
    document.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: 210, bubbles: true }));
    document.dispatchEvent(new dom.window.MouseEvent('mouseup', { clientX: 210, bubbles: true }));
    expect(slider.getValue()).toBe(70);
  });

  test('a slider disabled from config ignores keys', () => {
    const slider = create({ value: 50, disabled: true });
    const [handle] = handles(slider);
    expect(handle.getAttribute('tabindex')).toBe('-1');
    key(handle, 'ArrowRight');
    expect(slider.getValue()).toBe(50);
  });
});

describe('slider disabled', () => {
  test('starts disabled from config and cannot be focused or stepped', async () => {
    const slider = await mount({ disabled: true, value: 50 });
    const [handle] = handles(slider);
    expect(slider.isDisabled()).toBe(true);
    expect(handle.getAttribute('aria-disabled')).toBe('true');
    expect(handle.getAttribute('tabindex')).toBe('-1');
    key(handle, 'ArrowRight');
    expect(slider.getValue()).toBe(50);
  });

  test('disable and enable toggle the state', async () => {
    const slider = await mount({ value: 50 });
    const [handle] = handles(slider);
    slider.disable();
    expect(slider.isDisabled()).toBe(true);
    expect(slider.element.classList.contains('mtrl-slider--disabled')).toBe(true);
    expect(handle.getAttribute('aria-disabled')).toBe('true');

    slider.enable();
    expect(slider.isDisabled()).toBe(false);
    expect(handle.getAttribute('aria-disabled')).toBe('false');
    expect(handle.getAttribute('tabindex')).toBe('0');
    key(handle, 'ArrowRight');
    expect(slider.getValue()).toBe(51);
  });
});

describe('slider appearance', () => {
  test('color defaults to primary and setColor swaps the modifier', async () => {
    const slider = await mount();
    expect(slider.getColor()).toBe('primary');
    slider.setColor('secondary');
    expect(slider.getColor()).toBe('secondary');
    expect(slider.element.classList.contains('mtrl-slider--secondary')).toBe(true);
    slider.setColor('error');
    expect(slider.element.classList.contains('mtrl-slider--secondary')).toBe(false);
    expect(slider.element.classList.contains('mtrl-slider--error')).toBe(true);
  });

  test('size comes from config and setSize resizes the track and handle', async () => {
    const slider = await mount({ size: 'L' });
    const track = slider.element.querySelector<HTMLElement>('.mtrl-slider__track')!;
    const [handle] = handles(slider);
    expect(slider.getSize()).toBe('L');
    expect(track.style.height).toBe('56px');
    expect(handle.style.height).toBe('68px');

    slider.setSize('M');
    expect(slider.getSize()).toBe('M');
    expect(track.style.height).toBe('40px');
    expect(handle.style.height).toBe('52px');
  });

  test('ticks show only on a discrete slider', async () => {
    const slider = await mount({ step: 10 });
    const ticks = () => Array.from(slider.element.querySelectorAll<HTMLElement>('.mtrl-slider__ticks'));
    expect(ticks().length).toBeGreaterThan(0);
    expect(ticks().every((t) => t.hidden)).toBe(true);
    slider.showTicks(true);
    await wait();
    expect(ticks().every((t) => !t.hidden)).toBe(true);
    slider.showTicks(false);
    await wait();
    expect(ticks().every((t) => t.hidden)).toBe(true);
  });

  test('centered adds its modifier', async () => {
    const slider = await mount({ centered: true, min: -50, max: 50, value: 0 });
    expect(slider.element.classList.contains('mtrl-slider--centered')).toBe(true);
  });
});

describe('slider label and icon', () => {
  test('an icon added later follows the existing BEM label', async () => {
    const slider = await mount({ label: 'Volume' });
    slider.setIcon('<svg></svg>');
    const label = slider.element.querySelector('.mtrl-slider__label');
    expect(label?.nextElementSibling?.classList.contains('mtrl-slider__icon')).toBe(true);
    slider.destroy();
  });

  test('setLabel replaces the label text', async () => {
    const slider = await mount({ label: 'Volume' });
    expect(slider.getLabel()).toBe('Volume');
    slider.setLabel('Brightness');
    expect(slider.getLabel()).toBe('Brightness');
  });

  test('setIcon renders the icon', async () => {
    const slider = await mount({ icon: '<svg id="first"></svg>' });
    expect(slider.element.classList.contains('mtrl-slider--icon')).toBe(true);
    slider.setIcon('<svg id="second"></svg>');
    expect(slider.getIcon()).toContain('second');
    expect(slider.element.querySelector('#second')).not.toBeNull();
  });
});

describe('slider events and destroy', () => {
  test('config.on registers handlers and off removes them', async () => {
    const seen: number[] = [];
    const slider = await mount({ on: { change: (e) => seen.push(e.value) } });
    const handler = (e: { value: number }) => seen.push(-e.value);
    slider.on('change', handler);
    slider.setValue(10, true);
    slider.off('change', handler);
    slider.setValue(20, true);
    expect(seen).toEqual([10, -10, 20]);
  });

  test('destroy removes the element and stops keyboard handling', async () => {
    const slider = await mount({ value: 50 });
    const [handle] = handles(slider);
    const seen: number[] = [];
    slider.on('change', (e) => seen.push(e.value));
    slider.destroy();
    expect(document.body.contains(slider.element)).toBe(false);
    key(handle, 'ArrowRight');
    expect(seen).toEqual([]);
  });
});

// `range: true` without a `secondValue` builds two handles and leaves the
// second value null. Every range test above supplies one, so this shape had no
// coverage -- and it is the shape where the keyboard handler had a null to do
// arithmetic on. A guard was added; these say what the guard preserves.
describe('a range slider given no second value', () => {
  // withDom always rendered the second handle at max; the controller's state
  // said null. So the picture and the screen reader said 20 to 100 while
  // getSecondValue() said there was no second value, and the keyboard computed
  // `null + step` and sent the handle to 1. The state follows the DOM now.
  test('defaults the second value to max, which is where the handle already was', async () => {
    const slider = await mount({ range: true, value: 20 });

    expect(handles(slider)).toHaveLength(2);
    expect(slider.getSecondValue()).toBe(100);
  });

  test('the handle it renders agrees with the value it reports', async () => {
    const slider = await mount({ range: true, value: 20, max: 50 });
    const [, second] = handles(slider);

    expect(slider.getSecondValue()).toBe(50);
    expect(second.getAttribute('aria-valuenow')).toBe('50');
  });

  test('the keyboard moves it from max rather than inventing a value', async () => {
    const slider = await mount({ range: true, value: 20 });
    const [, second] = handles(slider);

    key(second, 'ArrowLeft');

    expect(slider.getSecondValue()).toBe(99);
    expect(second.getAttribute('aria-valuenow')).toBe('99');
  });

  test('the first handle still moves', async () => {
    const slider = await mount({ range: true, value: 20 });
    const [first] = handles(slider);

    key(first, 'ArrowRight');

    expect(slider.getValue()).toBe(21);
  });

  test('an explicit second value is untouched by the default', async () => {
    const slider = await mount({ range: true, value: 20, secondValue: 80 });

    expect(slider.getSecondValue()).toBe(80);
  });

  // The default is for range sliders only: a single slider has no second
  // handle, so there is nothing for a second value to describe.
  test('a slider that is not a range still reports no second value', async () => {
    const slider = await mount({ value: 20 });

    expect(handles(slider)).toHaveLength(1);
    expect(slider.getSecondValue()).toBeNull();
  });
});

// The track is drawn the way Compose's Slider.kt drawTrack draws it: values
// span the whole track (a discrete slider insets its interior steps by the corner
// radius), the gap between the handle's edge and the track is 6dp, so 8px from the
// centre of a 4px handle and 7px from a 2px one, and a stop indicator ends every
// inactive track longer than a corner radius. The container is given a 300px width.
describe('slider track geometry', () => {
  const WIDTH = 300;
  const sized = async (config: Parameters<typeof createSlider>[0]) => {
    const slider = createSlider(config);
    const container = slider.element.querySelector<HTMLElement>('.mtrl-slider__container')!;
    container.getBoundingClientRect = () => ({ width: WIDTH, height: 48, top: 0, left: 0, right: WIDTH, bottom: 48, x: 0, y: 0, toJSON() {} }) as DOMRect;
    document.body.appendChild(slider.element);
    await wait();
    return slider;
  };
  const segments = (slider: { element: HTMLElement }) =>
    Array.from(slider.element.querySelectorAll<HTMLElement>('.mtrl-slider__segment')).map(segment => ({
      left: segment.style.left,
      width: segment.style.width,
      active: segment.classList.contains('mtrl-slider__segment--active'),
    }));
  const dots = (slider: { element: HTMLElement }) =>
    Array.from(slider.element.querySelectorAll<HTMLElement>('.mtrl-slider__dot')).map(dot => dot.hidden ? null : dot.style.left);

  test('the track is placed from the value before the slider has a width', () => {
    const slider = createSlider({ value: 40 });
    const [, active, inactive] = Array.from(slider.element.querySelectorAll<HTMLElement>('.mtrl-slider__segment'));
    expect(active!.style.left).toBe('0px');
    expect(active!.style.width).toBe('calc(40% - 8px)');
    expect(inactive!.style.left).toBe('calc(40% + 8px)');
    expect(inactive!.style.width).toBe('calc(60% - 8px)');
    const end = slider.element.querySelectorAll<HTMLElement>('.mtrl-slider__dot')[1]!;
    expect(end.hidden).toBe(false);
    expect(end.style.left).toBe('calc(100% - 10px)');
  });

  test('a standard slider: active from the start, 8px gaps, an end stop only', async () => {
    const slider = await sized({ value: 50 });
    expect(segments(slider).slice(1)).toEqual([
      { left: '0px', width: 'calc(50% - 8px)', active: true },
      { left: 'calc(50% + 8px)', width: 'calc(50% - 8px)', active: false },
    ]);
    // Centred one corner radius (8px on XS) from the end: its 4px box starts 2px before.
    expect(dots(slider)).toEqual([null, 'calc(100% - 10px)']);
    expect(handles(slider)[0]!.style.left).toBe('50%');
  });

  test('a focused handle narrows to 2px and the gap follows its edge', async () => {
    const slider = await sized({ value: 50 });
    handles(slider)[0]!.dispatchEvent(new dom.window.FocusEvent('focus'));
    expect(segments(slider)[1]).toEqual({ left: '0px', width: 'calc(50% - 7px)', active: true });
    handles(slider)[0]!.dispatchEvent(new dom.window.FocusEvent('blur'));
    expect(segments(slider)[1]).toEqual({ left: '0px', width: 'calc(50% - 8px)', active: true });
  });

  test('a piece of track at an end shorter than the corner radius is not drawn', async () => {
    // value 3: the handle at 9px, the active track would run 0 to 1px.
    const low = await sized({ value: 3 });
    expect(segments(low)[1]!.width).toBe('0px');
    // value 96: the inactive track would run 296 to 300.
    const high = await sized({ value: 96 });
    expect(segments(high)[2]!.width).toBe('0px');
    expect(dots(high)).toEqual([null, null]);
    // a range whose low handle sits near the start drops its start piece and stop.
    const range = await sized({ range: true, value: 2, secondValue: 80 });
    expect(segments(range)[0]!.width).toBe('0px');
    expect(dots(range)).toEqual([null, 'calc(100% - 10px)']);
  });

  test('at the maximum the inactive track and its stop are gone', async () => {
    const slider = await sized({ value: 100 });
    expect(segments(slider)[2]!.width).toBe('0px');
    expect(dots(slider)).toEqual([null, null]);
  });

  test('a range slider: active between the handles, a stop at each end', async () => {
    const slider = await sized({ range: true, value: 20, secondValue: 80 });
    expect(segments(slider)).toEqual([
      { left: '0px', width: 'calc(20% - 8px)', active: false },
      { left: 'calc(20% + 8px)', width: 'calc(60% - 16px)', active: true },
      { left: 'calc(80% + 8px)', width: 'calc(20% - 8px)', active: false },
    ]);
    expect(dots(slider)).toEqual(['6px', 'calc(100% - 10px)']);
  });

  test('a centred slider: active from the centre, the gap on the handle side only', async () => {
    const above = await sized({ centered: true, min: -50, max: 50, value: 25 });
    expect(segments(above)).toEqual([
      { left: '0px', width: 'calc(50% - 8px)', active: false },
      { left: '50%', width: 'calc(25% - 8px)', active: true },
      { left: 'calc(75% + 8px)', width: 'calc(25% - 8px)', active: false },
    ]);
    expect(dots(above)).toEqual(['6px', 'calc(100% - 10px)']);
    const below = await sized({ centered: true, min: -50, max: 50, value: -25 });
    expect(segments(below)).toEqual([
      { left: '0px', width: 'calc(25% - 8px)', active: false },
      { left: 'calc(25% + 8px)', width: 'calc(25% - 8px)', active: true },
      { left: 'calc(50% + 8px)', width: 'calc(50% - 8px)', active: false },
    ]);
  });

  test('a discrete slider insets its interior steps by the corner radius', async () => {
    const slider = await sized({ value: 20, step: 10, ticks: true });
    // 8 + 0.2 * (300 - 16), minus the 8px gap: calc(20% - 3.2px)
    const active = segments(slider)[1]!;
    expect(active.left).toBe('0px');
    expect(active.width).toBe('calc(20% - 3.2px)');
    expect(active.active).toBe(true);
    expect(handles(slider)[0]!.style.left).toBe('calc(20% + 4.8px)');
    // The first and last steps still reach the edges.
    slider.setValue(100);
    expect(handles(slider)[0]!.style.left).toBe('100%');
  });

  test('the corner radius and the handle height follow the size', async () => {
    const radii = { XS: 8, S: 8, M: 12, L: 16, XL: 28 } as const;
    const heights = { XS: 44, S: 44, M: 52, L: 68, XL: 108 } as const;
    for (const size of ['XS', 'S', 'M', 'L', 'XL'] as const) {
      const slider = await sized({ value: 50, size });
      expect(slider.element.querySelector<HTMLElement>('.mtrl-slider__track')!.style.borderRadius).toBe(corner(radii[size]));
      expect(slider.element.style.getPropertyValue('--mtrl-slider-handle-height')).toBe(`${heights[size]}px`);
    }
  });
});

// A change of value that does not follow a pointer settles on a
// spring (the stylesheet animates under `--settling`); the first render, a resize
// and a drag set nothing, so the slider appears at its value and follows the finger.
describe('slider settling', () => {
  const SETTLING = 'mtrl-slider--settling';

  test('the first render does not settle', async () => {
    const slider = await mount({ value: 60 });
    expect(slider.element.classList.contains(SETTLING)).toBe(false);
  });

  test('a key or setValue settles, and the class goes once the spring has', async () => {
    const slider = await mount({ value: 60 });
    key(handles(slider)[0]!, 'ArrowRight');
    expect(slider.element.classList.contains(SETTLING)).toBe(true);
    await wait(475);
    expect(slider.element.classList.contains(SETTLING)).toBe(false);
    slider.setValue(20);
    expect(slider.element.classList.contains(SETTLING)).toBe(true);
  });

  test('a render that does not change the value does not settle', async () => {
    const slider = await mount({ value: 60 });
    slider.setValue(60);
    handles(slider)[0]!.dispatchEvent(new dom.window.FocusEvent('focus'));
    expect(slider.element.classList.contains(SETTLING)).toBe(false);
  });

  test('a tap on the track settles; dragging from it stops settling at once', async () => {
    const slider = await mount({ value: 10 });
    const container = slider.element.querySelector<HTMLElement>('.mtrl-slider__container')!;
    container.getBoundingClientRect = () => ({ width: 300, height: 48, top: 0, left: 0, right: 300, bottom: 48, x: 0, y: 0, toJSON() {} }) as DOMRect;
    container.dispatchEvent(new dom.window.MouseEvent('mousedown', { clientX: 240, bubbles: true }));
    expect(slider.getValue()).toBe(80);
    expect(slider.element.classList.contains(SETTLING)).toBe(true);
    document.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: 200, bubbles: true }));
    expect(slider.element.classList.contains(SETTLING)).toBe(false);
    document.dispatchEvent(new dom.window.MouseEvent('mouseup', { clientX: 200, bubbles: true }));
  });
});

// The inset icon: standard sliders at M, L and XL, 10px from the start of
// the active track, or of the inactive track when the active one cannot hold it and
// its padding (m3.material.io slider guidelines, MDC BaseSlider).
describe('slider inset icon', () => {
  const VOLUME = '<svg viewBox="0 0 24 24"><path d="M1 1h2"/></svg>';
  const MUTE = '<svg viewBox="0 0 24 24"><path d="M2 2h3"/></svg>';
  const sized = async (config: Parameters<typeof createSlider>[0]) => {
    const slider = createSlider(config);
    const container = slider.element.querySelector<HTMLElement>('.mtrl-slider__container')!;
    container.getBoundingClientRect = () => ({ width: 300, height: 52, top: 0, left: 0, right: 300, bottom: 52, x: 0, y: 0, toJSON() {} }) as DOMRect;
    document.body.appendChild(slider.element);
    await wait();
    return slider;
  };
  const icon = (slider: { element: HTMLElement }) => slider.element.querySelector<HTMLElement>('.mtrl-slider__inset-icon')!;
  const drawn = (slider: { element: HTMLElement }) => icon(slider).querySelector('path')?.getAttribute('d');

  test('sits 10px into the active track, 24px on M', async () => {
    const slider = await sized({ size: 'M', value: 50, insetIcon: VOLUME });
    expect(icon(slider).hidden).toBe(false);
    expect(drawn(slider)).toBe('M1 1h2');
    expect(icon(slider).style.left).toBe('10px');
    expect(icon(slider).style.width).toBe('24px');
    expect(icon(slider).classList.contains('mtrl-slider__inset-icon--inactive')).toBe(false);
  });

  test('moves to the inactive track when the active one is too short', async () => {
    // value 5: the handle at 15px, the inactive track from 23px.
    const slider = await sized({ size: 'M', value: 5, insetIcon: VOLUME });
    expect(icon(slider).style.left).toBe('calc(5% + 18px)');
    expect(icon(slider).classList.contains('mtrl-slider__inset-icon--inactive')).toBe(true);
  });

  test('swaps to the minimum icon at the minimum, and back', async () => {
    const slider = await sized({ size: 'L', value: 0, insetIcon: VOLUME, insetIconAtMin: MUTE });
    expect(drawn(slider)).toBe('M2 2h3');
    slider.setValue(60);
    expect(drawn(slider)).toBe('M1 1h2');
  });

  test('is 32px on XL', async () => {
    const slider = await sized({ size: 'XL', value: 50, insetIcon: VOLUME });
    expect(icon(slider).style.width).toBe('32px');
  });

  test('is not shown on XS or S, on a range or a centred slider', async () => {
    for (const config of [{ size: 'XS' }, { size: 'S' }, { size: 'M', range: true }, { size: 'M', centered: true, min: -50, max: 50 }] as const) {
      const slider = await sized({ value: 20, insetIcon: VOLUME, ...config });
      expect(icon(slider).hidden).toBe(true);
    }
  });

  test('setInsetIcon replaces it and an empty string removes it', async () => {
    const slider = await sized({ size: 'M', value: 50 });
    expect(icon(slider).hidden).toBe(true);
    slider.setInsetIcon(VOLUME);
    expect(icon(slider).hidden).toBe(false);
    slider.setInsetIcon('');
    expect(icon(slider).hidden).toBe(true);
  });
});

// A vertical slider runs bottom to top ("zero is at the bottom",
// m3.material.io guidelines), or top to bottom with `topToBottom` (Compose
// VerticalSlider's flag). Positions go to bottom/top and lengths to height; sizes
// are thicknesses, across. The container is given a 300px height.
describe('vertical slider', () => {
  const sized = async (config: Parameters<typeof createSlider>[0]) => {
    const slider = createSlider({ orientation: 'vertical', ...config });
    const container = slider.element.querySelector<HTMLElement>('.mtrl-slider__container')!;
    container.getBoundingClientRect = () => ({ width: 48, height: 300, top: 0, left: 0, right: 48, bottom: 300, x: 0, y: 0, toJSON() {} }) as DOMRect;
    document.body.appendChild(slider.element);
    await wait();
    return slider;
  };
  const segments = (slider: { element: HTMLElement }, start: 'bottom' | 'top') =>
    Array.from(slider.element.querySelectorAll<HTMLElement>('.mtrl-slider__segment')).slice(1).map(segment => ({
      start: segment.style[start], length: segment.style.height,
    }));

  test('says so to assistive technology and to the stylesheet', async () => {
    const slider = await sized({ range: true, value: 20, secondValue: 80 });
    expect(slider.element.classList.contains('mtrl-slider--vertical')).toBe(true);
    for (const handle of handles(slider)) expect(handle.getAttribute('aria-orientation')).toBe('vertical');
  });

  test('runs bottom to top by default', async () => {
    const slider = await sized({ value: 50 });
    expect(segments(slider, 'bottom')).toEqual([{ start: '0px', length: 'calc(50% - 8px)' }, { start: 'calc(50% + 8px)', length: 'calc(50% - 8px)' }]);
    const handle = handles(slider)[0]!;
    expect(handle.style.bottom).toBe('50%');
    expect(handle.style.left).toBe('');
    expect(handle.style.transform).toBe('translate(-50%, 50%)');
  });

  test('runs top to bottom with topToBottom', async () => {
    const slider = await sized({ value: 25, topToBottom: true });
    expect(segments(slider, 'top')).toEqual([{ start: '0px', length: 'calc(25% - 8px)' }, { start: 'calc(25% + 8px)', length: 'calc(75% - 8px)' }]);
    expect(handles(slider)[0]!.style.top).toBe('25%');
  });

  test('a tap maps its y coordinate onto the value, from the bottom', async () => {
    const slider = await sized({ value: 10 });
    const container = slider.element.querySelector<HTMLElement>('.mtrl-slider__container')!;
    container.dispatchEvent(new dom.window.MouseEvent('mousedown', { clientX: 24, clientY: 60, bubbles: true }));
    expect(slider.getValue()).toBe(80);
    document.dispatchEvent(new dom.window.MouseEvent('mouseup', { clientX: 24, clientY: 60, bubbles: true }));
  });

  test('its size is a thickness: the container, track and handles are sized across', async () => {
    const slider = await sized({ value: 50, size: 'M' });
    const container = slider.element.querySelector<HTMLElement>('.mtrl-slider__container')!;
    expect(container.style.width).toBe('52px');
    expect(container.style.height).toBe('');
    expect(slider.element.querySelector<HTMLElement>('.mtrl-slider__track')!.style.width).toBe('40px');
    expect(handles(slider)[0]!.style.width).toBe('52px');
  });
});

// After Compose's Slider.kt keyboard handling and RangeSlider coercion:
// PageUp/PageDown move a tenth of the steps (one to ten), range handles stop at each
// other instead of crossing, the arrows along the track follow it as drawn (reversed
// in RTL and top to bottom), and an RTL slider lays out and reads taps from the right.
describe('slider keys, range limits and RTL', () => {
  const WIDTH = 300;
  const within = async (config: Parameters<typeof createSlider>[0], dir?: 'rtl') => {
    const host = document.createElement('div');
    if (dir) host.setAttribute('dir', dir);
    document.body.appendChild(host);
    const slider = createSlider(config);
    const container = slider.element.querySelector<HTMLElement>('.mtrl-slider__container')!;
    container.getBoundingClientRect = () => ({ width: WIDTH, height: 48, top: 0, left: 0, right: WIDTH, bottom: 48, x: 0, y: 0, toJSON() {} }) as DOMRect;
    host.appendChild(slider.element);
    await wait();
    return slider;
  };

  test('PageUp and PageDown move a tenth of the steps, one to ten of them', async () => {
    const fine = await within({ value: 50, step: 1 });
    key(handles(fine)[0]!, 'PageUp');
    expect(fine.getValue()).toBe(60);
    // Four steps: a tenth rounds down to none, so one step, not ten to the end.
    const coarse = await within({ value: 25, step: 25 });
    key(handles(coarse)[0]!, 'PageUp');
    expect(coarse.getValue()).toBe(50);
    key(handles(coarse)[0]!, 'PageDown');
    key(handles(coarse)[0]!, 'PageDown');
    expect(coarse.getValue()).toBe(0);
  });

  test('range handles stop at each other from the keyboard', async () => {
    const slider = await within({ range: true, value: 40, secondValue: 60, step: 10 });
    const [first, second] = handles(slider);
    key(first!, 'End');
    expect(slider.getValue()).toBe(60);
    key(first!, 'ArrowRight');
    expect(slider.getValue()).toBe(60);
    key(second!, 'Home');
    expect(slider.getSecondValue()).toBe(60);
  });

  test('a dragged range handle stops at the other one instead of swapping', async () => {
    const slider = await within({ range: true, value: 20, secondValue: 60 });
    const [first] = handles(slider);
    first!.dispatchEvent(new dom.window.MouseEvent('mousedown', { clientX: 60, bubbles: true }));
    document.dispatchEvent(new dom.window.MouseEvent('mousemove', { clientX: 280, bubbles: true }));
    document.dispatchEvent(new dom.window.MouseEvent('mouseup', { clientX: 280, bubbles: true }));
    expect(slider.getValue()).toBe(60);
    expect(slider.getSecondValue()).toBe(60);
  });

  test('the setters stop at the other handle too', async () => {
    const slider = await within({ range: true, value: 20, secondValue: 80 });
    slider.setValue(90);
    expect(slider.getValue()).toBe(80);
    slider.setValue(20);
    slider.setSecondValue(10);
    expect(slider.getSecondValue()).toBe(20);
  });

  test('each range handle announces the other as its limit', async () => {
    const slider = await within({ range: true, value: 20, secondValue: 80 });
    const [first, second] = handles(slider);
    expect(first!.getAttribute('aria-valuemin')).toBe('0');
    expect(first!.getAttribute('aria-valuemax')).toBe('80');
    expect(second!.getAttribute('aria-valuemin')).toBe('20');
    expect(second!.getAttribute('aria-valuemax')).toBe('100');
    key(first!, 'ArrowRight');
    expect(second!.getAttribute('aria-valuemin')).toBe('21');
  });

  test('in RTL the track runs from the right', async () => {
    const slider = await within({ value: 25 }, 'rtl');
    const handle = handles(slider)[0]!;
    expect(handle.style.right).toBe('25%');
    expect(handle.style.left).toBe('auto');
    const [, active, inactive] = Array.from(slider.element.querySelectorAll<HTMLElement>('.mtrl-slider__segment'));
    expect([active!.style.right, active!.style.width, active!.style.left]).toEqual(['0px', 'calc(25% - 8px)', '']);
    expect([inactive!.style.right, inactive!.style.width]).toEqual(['calc(25% + 8px)', 'calc(75% - 8px)']);
  });

  test('in RTL ArrowRight lowers and ArrowLeft raises; ArrowUp still raises', async () => {
    const slider = await within({ value: 50 }, 'rtl');
    const handle = handles(slider)[0]!;
    key(handle, 'ArrowRight');
    expect(slider.getValue()).toBe(49);
    key(handle, 'ArrowLeft');
    key(handle, 'ArrowLeft');
    expect(slider.getValue()).toBe(51);
    key(handle, 'ArrowUp');
    expect(slider.getValue()).toBe(52);
  });

  test('in RTL a tap reads from the right edge', async () => {
    const slider = await within({ value: 10 }, 'rtl');
    const container = slider.element.querySelector<HTMLElement>('.mtrl-slider__container')!;
    container.dispatchEvent(new dom.window.MouseEvent('mousedown', { clientX: 60, bubbles: true }));
    document.dispatchEvent(new dom.window.MouseEvent('mouseup', { clientX: 60, bubbles: true }));
    expect(slider.getValue()).toBe(80);
  });

  test('top to bottom, ArrowUp and PageUp move toward the top, which is the minimum', async () => {
    const slider = await within({ orientation: 'vertical', topToBottom: true, value: 50 });
    const handle = handles(slider)[0]!;
    key(handle, 'ArrowUp');
    expect(slider.getValue()).toBe(49);
    key(handle, 'ArrowDown');
    key(handle, 'ArrowDown');
    expect(slider.getValue()).toBe(51);
    key(handle, 'PageUp');
    expect(slider.getValue()).toBe(41);
  });
});

// The handles' listeners were added and removed as separate inline
// functions, so destroy removed none of them: a key still moved a destroyed
// slider's value and focus still marked the handle. The existing destroy test
// watched for a change event, which the cleared emitter never delivers.
describe('slider destroy removes the handle listeners', () => {
  test('keys and focus on a destroyed slider do nothing, on both handles', async () => {
    const slider = await mount({ range: true, value: 20, secondValue: 80 });
    const [first, second] = handles(slider);
    slider.destroy();
    for (const [handle, value] of [[first!, 20], [second!, 80]] as const) {
      key(handle, 'ArrowRight');
      key(handle, 'End');
      expect(handle.getAttribute('aria-valuenow')).toBe(String(value));
      handle.dispatchEvent(new dom.window.FocusEvent('focus'));
      expect(handle.classList.contains('mtrl-slider__handle--focused')).toBe(false);
    }
    expect(slider.getValue()).toBe(20);
    expect(slider.getSecondValue()).toBe(80);
  });

  test('a live slider still answers keys and focus', async () => {
    const slider = await mount({ value: 50 });
    const [handle] = handles(slider);
    key(handle!, 'ArrowRight');
    expect(slider.getValue()).toBe(51);
    handle!.dispatchEvent(new dom.window.FocusEvent('focus'));
    expect(handle!.classList.contains('mtrl-slider__handle--focused')).toBe(true);
  });
});

// Options and setters that did nothing or disagreed with the other paths:
// the setters now snap to the step as keys and the pointer do (and as Compose's
// SliderState snaps a value it is given), setSize swaps the size modifier instead
// of adding a second one, getSize returns what was set under a type that says so,
// and iconPosition / labelPosition place the icon and label.
describe('slider options and setters agree', () => {
  test('setValue and setSecondValue snap to the step', async () => {
    const slider = await mount({ range: true, value: 20, secondValue: 80, step: 10 });
    slider.setValue(43);
    expect(slider.getValue()).toBe(40);
    slider.setSecondValue(67);
    expect(slider.getSecondValue()).toBe(70);
    expect(handles(slider)[1]!.getAttribute('aria-valuenow')).toBe('70');
  });

  test('setSize swaps the size modifier', async () => {
    const slider = await mount({ value: 50, size: 'M' });
    const classes = () => Array.from(slider.element.classList).filter(c => /^mtrl-slider--(xs|s|m|l|xl|\d+)$/.test(c));
    expect(classes()).toEqual(['mtrl-slider--m']);
    slider.setSize('XL');
    expect(classes()).toEqual(['mtrl-slider--xl']);
    slider.setSize('XS');
    expect(classes()).toEqual([]);
    slider.setSize(32);
    expect(classes()).toEqual(['mtrl-slider--32']);
  });

  test('getSize returns the size as it was set', async () => {
    const slider = await mount({ value: 50, size: 'L' });
    expect(slider.getSize()).toBe('L');
    slider.setSize(32);
    expect(slider.getSize()).toBe(32);
  });

  test('iconPosition and labelPosition place the icon and the label', async () => {
    const icon = '<svg viewBox="0 0 24 24"><path d="M1 1h2"/></svg>';
    const start = await mount({ value: 50, icon, label: 'Volume' });
    expect(start.element.classList.contains('mtrl-slider--icon')).toBe(true);
    expect(start.element.classList.contains('mtrl-slider--icon-end')).toBe(false);
    expect(start.element.classList.contains('mtrl-slider--label-end')).toBe(false);
    const end = await mount({ value: 50, icon, iconPosition: 'end', label: 'Volume', labelPosition: 'end' });
    expect(end.element.classList.contains('mtrl-slider--icon-end')).toBe(true);
    expect(end.element.classList.contains('mtrl-slider--label-end')).toBe(true);
    expect(end.element.querySelector('.mtrl-slider__label--end')).not.toBeNull();
    expect(end.element.querySelector('.mtrl-slider__icon--end')).not.toBeNull();
  });
});
