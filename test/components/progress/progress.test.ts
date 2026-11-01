// test/components/progress/progress.test.ts
//
// The real component in a JSDOM document: what it renders, how it is
// labelled, and the geometry it writes for a given value. The drawing is an
// SVG view: a determinate indicator's extents and dash are element
// attributes, and the indeterminate motion is the stylesheet's, on the same
// elements — so here the determinate geometry is asserted from the
// attributes, the indeterminate structure from the elements, and the motion
// timelines are pinned in test/styles/progress.test.ts (the keyframes) and
// sampled in a browser (scripts/check-elements.ts).
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { url: 'http://localhost/', pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.HTMLElement = dom.window.HTMLElement;
g.HTMLCanvasElement = dom.window.HTMLCanvasElement;
g.SVGElement = dom.window.SVGElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.CustomEvent = dom.window.CustomEvent;
g.MutationObserver = dom.window.MutationObserver;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.ResizeObserver = class { observe() {} disconnect() {} };

let frames: FrameRequestCallback[] = [];
g.requestAnimationFrame = (cb: FrameRequestCallback) => { frames.push(cb); return frames.length; };
g.cancelAnimationFrame = () => {};
const flush = (time = performance.now()) => {
  const pending = frames;
  frames = [];
  for (const cb of pending) cb(time);
};

import create from '../../../src/components/progress';
import type { ProgressComponent, ProgressConfig, ProgressInternals } from '../../../src/components/progress/types';

// The view is off the public type (3.0.0, a contract reservation) and still
// on the object: these tests read what is drawn, so they read it through the
// internal type.
const createProgress = (config?: ProgressConfig): ProgressComponent & ProgressInternals =>
  create(config) as ProgressComponent & ProgressInternals;

// JSDOM lays nothing out: give every element the width a browser would (the
// canvas measured its own box; the view measures its own, so the mock has to
// reach SVG elements too — hence Element.prototype)
let elementWidth = 200;
dom.window.Element.prototype.getBoundingClientRect = function () {
  return { width: elementWidth, height: 4, top: 0, left: 0, right: elementWidth, bottom: 4, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
};
const sized = (_p: unknown, width: number) => { elementWidth = width; };

/** The drawing element a class names, in this view */
const part = (p: ProgressInternals, name: string): SVGElement | null =>
  p.view.querySelector(`.mtrl-progress__${name}`);

/** An attribute of a drawing element, as the component wrote it */
const attr = (p: ProgressInternals, name: string, attribute: string): string | null =>
  part(p, name)?.getAttribute(attribute) ?? null;

beforeEach(() => { frames = []; document.body.innerHTML = ''; });
afterEach(() => { frames = []; });

describe('progress', () => {
  test('is a labelled progressbar with an SVG view and the value in its aria attributes', () => {
    const progress = createProgress({ value: 42, ariaLabel: 'Loading news article' });
    const el = progress.element;
    expect(el.classList.contains('mtrl-progress')).toBe(true);
    expect(el.classList.contains('mtrl-progress--linear')).toBe(true);
    expect(el.getAttribute('role')).toBe('progressbar');
    expect(el.getAttribute('aria-label')).toBe('Loading news article');
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
    expect(el.getAttribute('aria-valuenow')).toBe('42');
    const view = el.querySelector('svg')!;
    expect(view.classList.contains('mtrl-progress__view')).toBe(true);
    expect(view.getAttribute('aria-hidden')).toBe('true');
    expect(view.getAttribute('focusable')).toBe('false');
    expect(createProgress({}).element.getAttribute('aria-label')).toBe('Loading');
  });

  test('an indeterminate indicator carries no value', () => {
    const progress = createProgress({ indeterminate: true });
    expect(progress.element.hasAttribute('aria-valuenow')).toBe(false);
    expect(progress.element.classList.contains('mtrl-progress--indeterminate')).toBe(true);
    expect(progress.isIndeterminate()).toBe(true);
    progress.setIndeterminate(false);
    expect(progress.element.hasAttribute('aria-valuenow')).toBe(true);
    expect(progress.element.classList.contains('mtrl-progress--indeterminate')).toBe(false);
  });

  // The root is a div, which carries no `disabled` property, so withDisabled
  // could only record the state as a class and an attribute — while
  // isDisabled() read the property alone and answered false forever. progress
  // publishes that manager directly (api.ts: `isDisabled: options.disabled.isDisabled`),
  // so a disabled indicator reported itself enabled, and toggling never came back.
  test('disable() is visible to isDisabled(), and toggles back', () => {
    const progress = createProgress({});
    expect(progress.element.tagName).toBe('DIV');
    expect(progress.isDisabled()).toBe(false);

    progress.disable();
    expect(progress.isDisabled()).toBe(true);
    expect(progress.element.classList.contains('mtrl-progress--disabled')).toBe(true);

    progress.enable();
    expect(progress.isDisabled()).toBe(false);
    expect(progress.element.classList.contains('mtrl-progress--disabled')).toBe(false);
  });

  test('linear: the view is as tall as the track, 10px when it waves', () => {
    sized(null, 240);
    const flat = createProgress({});
    expect(flat.view.style.height).toBe('4px');
    // The layout width is the container's; the geometry is fractions of the
    // viewBox, so the markup does not wait for a measurement.
    expect(flat.view.style.width).toBe('100%');
    expect(flat.view.getAttribute('viewBox')).toBe('0 0 240 4');

    const thick = createProgress({ thickness: 'thick' });
    expect(thick.view.style.height).toBe('8px');
    expect(thick.view.getAttribute('viewBox')).toBe('0 0 240 8');

    // 3dp of wave above and below a 4dp track is the 10dp the tokens describe
    const wavy = createProgress({ shape: 'wavy' });
    expect(wavy.view.style.height).toBe('10px');
    expect(wavy.view.getAttribute('viewBox')).toBe('0 0 240 10');
  });

  test('the view is sized from the tokens before it has a box', () => {
    sized(null, 0);
    const linear = createProgress({ value: 40 });
    expect(linear.view.style.width).toBe('100%');
    expect(linear.view.style.height).toBe('4px');
    // No box yet: the viewBox keeps the drawing's stand-in width, as the
    // canvas's fixed bitmap did
    expect(linear.view.getAttribute('viewBox')).toBe('0 0 2048 4');

    const circular = createProgress({ variant: 'circular', indeterminate: true });
    expect(circular.view.style.width).toBe('40px');
    expect(circular.view.style.height).toBe('40px');
    expect(circular.view.getAttribute('viewBox')).toBe('0 0 40 40');

    const wavy = createProgress({ variant: 'circular', shape: 'wavy' });
    expect(wavy.view.style.width).toBe('48px');
    expect(wavy.view.getAttribute('viewBox')).toBe('0 0 48 48');

    const thick = createProgress({ thickness: 'thick', shape: 'wavy' });
    expect(thick.view.style.height).toBe('20px');
    expect(thick.view.getAttribute('viewBox')).toBe('0 0 2048 20');
  });

  test('circular: 40px flat, 48px wavy, and anywhere from 24 to 240 on request', () => {
    expect(createProgress({ variant: 'circular' }).view.style.width).toBe('40px');
    expect(createProgress({ variant: 'circular', shape: 'wavy' }).view.style.width).toBe('48px');
    const sizable = createProgress({ variant: 'circular', size: 96 });
    expect(sizable.view.style.width).toBe('96px');
    expect(sizable.getSize()).toBe(96);
    sizable.setSize(500);
    expect(sizable.getSize()).toBe(240);
    sizable.setSize(2);
    expect(sizable.getSize()).toBe(24);
  });

  // The same windows the canvas drew, written as x and width: the round
  // caps' overshoot is inside them (value 50 of a 200px track puts the
  // indicator's window at 0…102 and the track's at 106…200, a 4dp gap plus
  // the stroke between)
  test('linear determinate: an indicator, a gap, the track, and the stop dot', () => {
    sized(null, 200);
    const progress = createProgress({ value: 50 });
    expect(attr(progress, 'indicator', 'x')).toBe('0.00');
    expect(attr(progress, 'indicator', 'width')).toBe('102.00');
    expect(attr(progress, 'track', 'x')).toBe('106.00');
    expect(attr(progress, 'track', 'width')).toBe('94.00');
    expect(attr(progress, 'stop', 'cx')).toBe('198.00');
    expect(attr(progress, 'stop', 'r')).toBe('2.00');
  });

  test('the buffer sits between the indicator and the end of the track', () => {
    sized(null, 200);
    const progress = createProgress({ value: 30, buffer: 60 });
    expect(attr(progress, 'buffer', 'x')).toBe('66.00');
    expect(attr(progress, 'buffer', 'width')).toBe('56.00');
    expect(attr(progress, 'indicator', 'width')).toBe('62.00');
    expect(attr(progress, 'track', 'x')).toBe('66.00');
  });

  test('at the ends of the range, the part that says nothing is not drawn', () => {
    sized(null, 200);
    const empty = createProgress({ value: 0 });
    expect(attr(empty, 'indicator', 'width')).toBe('0');
    expect(attr(empty, 'track', 'width')).toBe('200.00');

    const full = createProgress({ value: 100 });
    expect(attr(full, 'indicator', 'width')).toBe('200.00');
    expect(attr(full, 'track', 'width')).toBe('0');
  });

  test('the stop indicator can be turned off, and never shows while indeterminate', () => {
    sized(null, 200);
    const without = createProgress({ value: 50, showStopIndicator: false });
    expect(attr(without, 'stop', 'r')).toBe('0');

    const indeterminate = createProgress({ indeterminate: true });
    expect(part(indeterminate, 'stop')).toBeNull();
  });

  // The arc starts at 12 o'clock and the track clears both its ends: the
  // same dash and offset arithmetic, written as attributes (pathLength 100)
  test('circular determinate: the arc starts at 12 o\'clock and the track clears both its ends', () => {
    const progress = createProgress({ variant: 'circular', value: 25 });
    expect(attr(progress, 'indicator', 'stroke-dasharray')).toBe('25.000 100');
    expect(attr(progress, 'track', 'stroke-dasharray')).toBe('62.268 100');
    expect(attr(progress, 'track', 'stroke-dashoffset')).toBe('-31.366');

    const empty = createProgress({ variant: 'circular', value: 0 });
    expect(attr(empty, 'indicator', 'stroke-dasharray')).toBe('0 100');
    expect(attr(empty, 'track', 'stroke-dasharray')).toBe('100.000 100');

    const full = createProgress({ variant: 'circular', value: 100 });
    expect(attr(full, 'indicator', 'stroke-dasharray')).toBe('100.000 100');
    expect(attr(full, 'track', 'stroke-dasharray')).toBe('0 100');
  });

  test('circular indeterminate: the rotors and the parts are in the view, and nothing is written', () => {
    const progress = createProgress({ variant: 'circular', indeterminate: true });
    const view = progress.view;
    const dial = view.querySelector('.mtrl-progress__dial')!;
    expect(dial.getAttribute('transform')).toBe('rotate(-90 20 20)');
    const spin = dial.querySelector(':scope > .mtrl-progress__spin')!;
    const kick = spin.querySelector(':scope > .mtrl-progress__kick')!;
    // the geometry is the stylesheet's now: no dash attributes, the parts'
    // pathLength is what its percentages are of
    const track = kick.querySelector(':scope > .mtrl-progress__track')!;
    const indicator = kick.querySelector(':scope > .mtrl-progress__indicator')!;
    expect(track.getAttribute('pathLength')).toBe('100');
    expect(indicator.getAttribute('pathLength')).toBe('100');
    expect(track.getAttribute('stroke-dasharray')).toBeNull();
    expect(indicator.getAttribute('stroke-dasharray')).toBeNull();
  });

  test('linear indeterminate: the five parts of the two-bar motion', () => {
    const progress = createProgress({ indeterminate: true });
    const view = progress.view;
    // the track ahead of the first head, the two bars, the track between
    // them and the track behind the second tail
    expect(view.querySelectorAll('rect')).toHaveLength(5);
    expect(part(progress, 'ahead')).not.toBeNull();
    expect(part(progress, 'between')).not.toBeNull();
    expect(part(progress, 'behind')).not.toBeNull();
    expect(part(progress, 'bar-first')!.tagName).toBe('rect');
    expect(part(progress, 'bar-second')!.tagName).toBe('rect');
  });

  test('a wavy indeterminate draws one pattern, carried by two clipped windows', () => {
    const progress = createProgress({ indeterminate: true, shape: 'wavy' });
    const view = progress.view;
    const pattern = view.querySelector('.mtrl-progress__wave-def')!;
    expect(pattern.getAttribute('d')).toMatch(/^M -?\d/);
    const id = pattern.getAttribute('id')!;
    for (const bar of ['bar-first', 'bar-second']) {
      const group = part(progress, bar)!;
      expect(group.tagName.toLowerCase()).toBe('g');
      const clip = group.querySelector('clipPath rect.mtrl-progress__wave-window');
      expect(clip).not.toBeNull();
      const use = group.querySelector('.mtrl-progress__wave-travel use');
      expect(use?.getAttribute('href')).toBe(`#${id}`);
    }
  });

  test('a wavy determinate indicator is a moving path clipped to its window', () => {
    sized(null, 200);
    const progress = createProgress({ value: 50, shape: 'wavy' });
    const path = part(progress, 'indicator')!;
    expect(path.tagName.toLowerCase()).toBe('path');
    // two wavelengths of travel either side of the box (λ = 40 determinate);
    // flat at first — the amplitude fades in over 500ms, as the canvas's did
    expect(path.getAttribute('d')).toMatch(/^M -80/);
    expect(path.getAttribute('clip-path')).toMatch(/^url\(#/);
    const window = progress.view.querySelector('rect.mtrl-progress__wave-window')!;
    // the window is the indicator's extent: value 50's [0, 102]
    expect(window.getAttribute('x')).toBe('0.00');
    expect(window.getAttribute('width')).toBe('102.00');
  });

  // The component reads the window's clock; the frames are flushed on it too
  const now = (): number => dom.window.performance.now();

  test('a value change tweens through the same frames the canvas drew', () => {
    sized(null, 200);
    const progress = createProgress({ value: 50 });
    const t0 = now();
    progress.setValue(60);
    // the canvas tween: linear, half way at half the 500ms (the tween's own
    // start is a fraction of a ms after t0, so allow the hair of skew)
    flush(t0 + 250);
    expect(parseFloat(attr(progress, 'indicator', 'width'))).toBeCloseTo(112, 1); // (50 + 60) / 2 → 55%
    flush(t0 + 500);
    expect(parseFloat(attr(progress, 'indicator', 'width'))).toBeCloseTo(122, 1); // 60%
  });

  test('a retarget while the tween runs picks the new target up from where it is', () => {
    sized(null, 200);
    const progress = createProgress({ value: 50 });
    const t0 = now();
    progress.setValue(60);
    progress.setValue(80); // the running tween takes it, from the same start
    flush(t0 + 250);
    expect(parseFloat(attr(progress, 'indicator', 'width'))).toBeCloseTo(132, 1); // 50 + 30/2 → 65%
    flush(t0 + 500);
    expect(parseFloat(attr(progress, 'indicator', 'width'))).toBeCloseTo(162, 1); // 80%
  });

  test('values are clamped, reported and announced', () => {
    const progress = createProgress({ value: 10 });
    const changes: number[] = [];
    // The emitter's payload, `{ value, max }`, not a DOM event.
    progress.on('change', ({ value }) => changes.push(value));
    progress.setValue(60, false);
    expect(progress.getValue()).toBe(60);
    expect(progress.element.getAttribute('aria-valuenow')).toBe('60');
    expect(changes).toEqual([60]);
    progress.setValue(500, false);
    expect(progress.getValue()).toBe(100);
    progress.setValue(-5, false);
    expect(progress.getValue()).toBe(0);
  });

  test('reaching the maximum fires complete once the value is there', () => {
    const progress = createProgress({ value: 0 });
    let completed = 0;
    progress.on('complete', ({ value, max }) => { if (value === max) completed++; });
    progress.setValue(100, false);
    expect(completed).toBe(1);
  });

  // The emitter, as every component's; not DOM CustomEvents.
  test('events carry { value, max } through the emitter, and off() stops them', () => {
    const progress = createProgress({ value: 0, max: 50 });
    const seen: unknown[] = [];
    let dom = 0;
    progress.element.addEventListener('change', () => dom++);
    const handler = (payload: { value: number; max: number }) => seen.push(payload);
    progress.on('change', handler);
    progress.setValue(20, false);
    progress.off('change', handler);
    progress.setValue(30, false);
    expect(seen).toEqual([{ value: 20, max: 50 }]);
    expect(dom).toBe(0);
  });

  test('thickness and shape can change after creation', () => {
    const progress = createProgress({ value: 50 });
    progress.setThickness('thick');
    expect(progress.getThickness()).toBe(8);
    expect(progress.view.style.height).toBe('8px');
    progress.setShape('wavy');
    expect(progress.getShape()).toBe('wavy');
    expect(progress.view.style.height).toBe('20px'); // 8 + 2 * 6
    progress.setShape('flat');
    expect(progress.view.style.height).toBe('8px');
  });

  test('the label is optional and sits outside the view', () => {
    const progress = createProgress({ value: 42, showLabel: true });
    const label = progress.element.querySelector('.mtrl-progress__label');
    expect(label?.textContent).toBe('42%');
    progress.setLabelFormatter((v: number, m: number) => `${v} of ${m}`);
    expect(progress.element.querySelector('.mtrl-progress__label')!.textContent).toBe('42 of 100');
    progress.hideLabel();
    expect(progress.element.querySelector('.mtrl-progress__label')).toBeNull();
    expect(createProgress({ value: 1 }).element.querySelector('.mtrl-progress__label')).toBeNull();
  });

  // The indeterminate motion is the stylesheet's now: hiding it takes the
  // element out of the layout (which pauses the animations) and cancels the
  // script tweens; no frames are asked for again until a value changes
  test('hiding stops the script tweens, marks the element hidden, and shows again', () => {
    const progress = createProgress({ value: 10 });
    document.body.appendChild(progress.element);
    expect(progress.isVisible()).toBe(true);
    progress.setValue(50); // a running tween
    progress.hide();
    expect(progress.element.hasAttribute('hidden')).toBe(true);
    expect(progress.isVisible()).toBe(false);
    frames = [];
    flush();
    expect(frames.length).toBe(0);
    progress.show();
    expect(progress.isVisible()).toBe(true);
    // and an indeterminate one asks for no frames at all: the motion is CSS
    const indeterminate = createProgress({ indeterminate: true });
    document.body.appendChild(indeterminate.element);
    frames = [];
    flush();
    expect(frames.length).toBe(0);
  });

  test('destroy stops everything and removes the element', () => {
    const progress = createProgress({ indeterminate: true });
    document.body.appendChild(progress.element);
    progress.destroy();
    expect(document.body.contains(progress.element)).toBe(false);
    frames = [];
    flush();
    expect(frames.length).toBe(0);
  });
});

// The colours are the stylesheet's now — the parts carry no colour of their
// own, and the sheet maps the theme roles onto them (test/styles/progress.ts
// pins that mapping; scripts/check-elements.ts samples the computed colours
// in a browser, where the roles inherit from the section or shadow host, and
// checks a theme switch repaints through them).
describe('the colours come from the theme where the view sits', () => {
  test('no part carries a colour: no fill or stroke attribute, no inline colour', () => {
    sized(null, 200);
    for (const config of [
      { value: 50 },
      { indeterminate: true },
      { variant: 'circular' as const, value: 50 },
      { variant: 'circular' as const, indeterminate: true },
      { value: 50, shape: 'wavy' as const },
    ]) {
      const progress = createProgress(config);
      for (const node of progress.view.querySelectorAll('*')) {
        expect(node.hasAttribute('fill')).toBe(false);
        expect(node.hasAttribute('stroke')).toBe(false);
      }
      expect(progress.view.style.color).toBe('');
      expect(progress.view.style.fill).toBe('');
      expect(progress.view.style.stroke).toBe('');
    }
  });
});

// The API reads the state withState built from the config. getApiConfig used to
// carry a fallback that built a state of its own when `comp.state` was missing
// -- unreachable, since withState assigns it unconditionally and runs first,
// and wrong if it had ever run, because it ignored the config: max would have
// become 100, thickness thin and shape flat whatever was asked for. The host
// type requires `state` now, so the fallback is gone and this is what says the
// configured values are the ones in play.
describe('the configured state is the state the API reports', () => {
  test('a max other than 100 is the one values are clamped and reported against', () => {
    const progress = createProgress({ value: 30, max: 200 });

    expect(progress.getValue()).toBe(30);
    expect(progress.element.getAttribute('aria-valuemax')).toBe('200');

    // 150 is over the default max and inside this one.
    progress.setValue(150, false);
    expect(progress.getValue()).toBe(150);

    progress.setValue(500, false);
    expect(progress.getValue()).toBe(200);
  });

  test('a configured thickness and shape survive creation', () => {
    const progress = createProgress({ value: 50, thickness: 'thick', shape: 'wavy' });

    expect(progress.getThickness()).toBe(8);
    expect(progress.getShape()).toBe('wavy');
  });

  test('a configured formatter is the one the label uses', () => {
    const progress = createProgress({
      value: 3,
      max: 9,
      showLabel: true,
      labelFormatter: (v: number, m: number) => `${v}/${m}`,
    });

    expect(progress.element.querySelector('.mtrl-progress__label')?.textContent).toBe('3/9');
  });
});

// Created disabled, the bar had aria-disabled; disabled later it got
// only the class, and enable() left a creation-time aria-disabled behind.
describe('progress disabled state', () => {
  test('disable() and enable() set and clear aria-disabled with the state', () => {
    const progress = createProgress({ value: 20 });
    progress.disable();
    expect([progress.isDisabled(), progress.element.getAttribute('aria-disabled')]).toEqual([true, 'true']);
    progress.enable();
    expect([progress.isDisabled(), progress.element.hasAttribute('aria-disabled')]).toEqual([false, false]);
  });

  test('created disabled, enable() clears it all', () => {
    const progress = createProgress({ value: 20, disabled: true });
    expect([progress.isDisabled(), progress.element.getAttribute('aria-disabled')]).toEqual([true, 'true']);
    progress.enable();
    expect([progress.isDisabled(), progress.element.hasAttribute('aria-disabled')]).toEqual([false, false]);
  });
});

// SetValue(150) drew 100 but reported 150 in aria-valuenow, the
// label and change. One clamped value is used everywhere, at creation too.
describe('progress values past the range', () => {
  test('setValue clamps once, and aria, the label, getValue and change all say the drawn value', () => {
    const progress = createProgress({ value: 10, showLabel: true });
    const changes: Array<{ value: number; max: number }> = [];
    progress.on('change', (payload) => changes.push(payload));
    progress.setValue(150);
    expect(progress.getValue()).toBe(100);
    expect(progress.element.getAttribute('aria-valuenow')).toBe('100');
    expect(progress.element.querySelector('.mtrl-progress__label')?.textContent).toBe('100%');
    expect(changes).toEqual([{ value: 100, max: 100 }]);
    progress.setValue(-5);
    expect(progress.getValue()).toBe(0);
    expect(progress.element.getAttribute('aria-valuenow')).toBe('0');
    expect(changes.at(-1)).toEqual({ value: 0, max: 100 });
  });

  test('setting the same clamped value again emits nothing', () => {
    const progress = createProgress({ value: 100 });
    const changes: unknown[] = [];
    progress.on('change', (payload) => changes.push(payload));
    progress.setValue(150);
    expect(changes).toEqual([]);
  });

  test('a value past the range at creation is clamped', () => {
    const progress = createProgress({ value: 150 });
    expect(progress.getValue()).toBe(100);
    expect(progress.element.getAttribute('aria-valuenow')).toBe('100');
  });
});
