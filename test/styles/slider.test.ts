// The slider's stylesheet against Compose SliderTokens / SliderDefaults.colors() and
// the m3.material.io slider specs. FLO-250.
import { beforeAll, describe, expect, test } from 'bun:test';
import { compileString } from 'sass';

const root = '.mtrl-slider';
let css: string;
const value = (selector: string, property: string) =>
  Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter(([, selectors]) => selectors.split(',').some(s => s.trim() === selector))
    .flatMap(([, , declarations]) => Array.from(declarations.matchAll(/([\w-]+):\s*([^;]+);/g)))
    .filter(([, name]) => name === property)
    .map(([, , result]) => result.trim()).pop();

beforeAll(() => {
  css = compileString("@use 'components/slider';", { loadPaths: ['src/styles'] }).css.replace(/\/\*[\s\S]*?\*\//g, '');
});

describe('slider colours', () => {
  test('the active track takes the colour, the inactive track its container', () => {
    expect(value(root, '--mtrl-slider-track-color')).toBe('var(--mtrl-slider-color, var(--mtrl-sys-color-primary))');
    expect(value(root, '--mtrl-slider-inactive-track-color')).toBe('var(--mtrl-slider-container-color, var(--mtrl-sys-color-secondary-container))');
    expect(value(root, '--mtrl-slider-inactive-opacity')).toBe('1');
    expect(value(`${root}__segment`, 'background')).toBe('var(--mtrl-slider-inactive-track-color)');
    expect(value(`${root}__segment--active`, 'background')).toBe('var(--mtrl-slider-track-color)');
  });

  test('ticks on the inactive track take the colour, ticks on the active track the container', () => {
    expect(value(`${root}__ticks`, 'color')).toBe('var(--mtrl-slider-track-color)');
    expect(value(root, '--mtrl-slider-tick-color')).toBe('var(--mtrl-slider-on-color, var(--mtrl-slider-inactive-track-color))');
    expect(value(`${root}__ticks--active`, 'color')).toBe('var(--mtrl-slider-tick-color)');
  });

  test('the other colours pair with their own container', () => {
    for (const color of ['secondary', 'tertiary', 'error']) {
      expect(value(`${root}--${color}`, '--mtrl-slider-inactive-track-color')).toBe(`var(--mtrl-slider-container-color, var(--mtrl-sys-color-${color}-container))`);
    }
  });

  test('disabled: active track and inactive-track ticks at 0.38, the rest at 0.12', () => {
    const disabled = `${root}--disabled`;
    expect(value(disabled, '--mtrl-slider-active-opacity')).toBe('0.38');
    expect(value(disabled, '--mtrl-slider-tick-opacity')).toBe('0.38');
    expect(value(disabled, '--mtrl-slider-inactive-opacity')).toBe('0.12');
    expect(value(disabled, '--mtrl-slider-active-tick-opacity')).toBe('0.12');
  });
});

describe('slider handle', () => {
  test('is painted at the full handle height, 4px wide', () => {
    expect(value(`${root}__handle`, 'padding')).toBeUndefined();
    expect(value(`${root}__handle::before`, 'height')).toBe('100%');
    expect(value(`${root}__handle::before`, 'width')).toBe('4px');
  });

  test('narrows to 2px when pressed, dragged or focused, with no outline ring', () => {
    for (const selector of [`${root}--dragging ${root}__handle::before`, `${root}__handle:active::before`, `${root}__handle:focus-visible::before`, `${root}__handle--focused::before`]) {
      expect(value(selector, 'width')).toBe('2px');
    }
    expect(value(`${root}__handle:focus`, 'outline')).toBe('none');
  });
});

describe('slider value indicator', () => {
  test('inverse surface, 48 x 44, 12px above the handle', () => {
    const indicator = `${root}__value`;
    expect(value(indicator, 'background-color')).toBe('var(--mtrl-sys-color-inverse-surface)');
    expect(value(indicator, 'color')).toBe('var(--mtrl-sys-color-inverse-on-surface)');
    expect(value(indicator, 'min-width')).toBe('48px');
    expect(value(indicator, 'height')).toBe('44px');
    expect(value(indicator, 'bottom')).toBe('calc(50% + var(--mtrl-slider-handle-height, 44px) / 2 + 12px)');
  });
});

describe('slider motion', () => {
  // A change of value settles on the default spatial spring, but only under
  // `--settling`, which the controller sets for changes that do not follow a pointer;
  // a drag and a layout render move nothing (FLO-249, FLO-250).
  const spring = /^left 450ms linear\(/;
  test('outside --settling nothing transitions position or size', () => {
    const rules = Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g)).filter(([selectors]) => !selectors.includes('--settling'));
    for (const [, , declarations] of rules) {
      const transition = declarations.match(/transition:\s*([^;]+);/)?.[1] ?? '';
      expect(transition).not.toMatch(/\b(left|width|all)\b/);
    }
  });

  test('under --settling the handle, the track and the indicator move on the default spatial spring', () => {
    expect(value(`${root}--settling ${root}__handle`, 'transition')).toMatch(spring);
    expect(value(`${root}--settling ${root}__segment`, 'transition')).toMatch(/^left 450ms linear\(.*\), width 450ms linear\(/);
    expect(value(`${root}--settling ${root}__value`, 'transition')).toMatch(spring);
    expect(value(`${root}--settling ${root}__value--visible`, 'transition')).toMatch(spring);
  });

  test('the value indicator grows from the handle: in 400ms decelerate, out 150ms accelerate', () => {
    expect(value(`${root}__value`, 'scale')).toBe('0');
    expect(value(`${root}__value`, 'transform-origin')).toBe('50% 100%');
    expect(value(`${root}__value`, 'transition')).toMatch(/^scale 150ms cubic-bezier\(0\.3, 0, 0\.8, 0\.15\)/);
    expect(value(`${root}__value--visible`, 'scale')).toBe('1');
    expect(value(`${root}__value--visible`, 'transition')).toMatch(/^scale 400ms cubic-bezier\(0\.05, 0\.7, 0\.1, 1\)/);
  });
});
