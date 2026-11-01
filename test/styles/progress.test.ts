// test/styles/progress.test.ts
//
// The progress stylesheet: the indicator is drawn in SVG and its motion runs
// on CSS animations (m3.material.io, progress indicators — indeterminate
// motion on the compositor, reduced motion resting on the empty frame). This
// covers the layout, the 4dp inset the guidelines ask for, the states, and
// the drawing rules the SVG parts rely on.
import { describe, test, expect, beforeAll } from 'bun:test';
import { compileString } from 'sass';

let css = '';

const rules = (selector: string): string[] => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // \s* after the newline: rules inside @media are indented
  return Array.from(css.matchAll(new RegExp(`(^|\\n)\\s*${escaped}\\s*\\{([^}]*)\\}`, 'g')), (m) => m[2]);
};

// every rule whose selector list carries the selector as a whole segment —
// the sheet writes geometry once for all five bars
const segments = (list: string): string[] => {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of list) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};

const rulesAny = (selector: string): string[] => {
  const out: string[] = [];
  for (const match of css.matchAll(/(^|\n)([^{}@][^{]*?)\s*\{([^}]*)\}/g)) {
    if (segments(match[2]).includes(selector)) out.push(match[3]);
  }
  return out;
};

// rules whose selector carries the text anywhere — the shared lists the
// sheet folds into one :is() rule do not stand as their own segments
const rulesContaining = (text: string): string[] => {
  const out: string[] = [];
  for (const match of css.matchAll(/(^|\n)([^{}@][^{]*?)\s*\{([^}]*)\}/g)) {
    if (match[2].includes(text)) out.push(match[3]);
  }
  return out;
};

const value = (selector: string, property: string): string | undefined =>
  rules(selector)
    .map((block) => block.match(new RegExp(`(?:^|;|\\n)\\s*${property}\\s*:\\s*([^;]+);`))?.[1].trim())
    .filter((v): v is string => v !== undefined)
    .pop();

// the body of a block opened by an exact header line (@keyframes, @media)
const block = (header: string): [number, number] => {
  const start = css.indexOf(header);
  if (start === -1) return [-1, -1];
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let j = open; j < css.length; j++) {
    if (css[j] === '{') depth++;
    else if (css[j] === '}') {
      depth--;
      if (depth === 0) return [open + 1, j];
    }
  }
  return [open + 1, css.length];
};

const keyframes = (name: string): string => {
  const [from, to] = block(`@keyframes ${name} {`);
  return from === -1 ? '' : css.slice(from, to);
};

// the whole motion section lives under no-preference; reduce rests on the base
const motionMedia = (): [number, number] => block('@media (prefers-reduced-motion: no-preference)');

beforeAll(() => {
  css = compileString(`@use 'components/progress';`, { loadPaths: ['src/styles'], style: 'expanded' }).css.replace(/,\n/g, ', ');
});

describe('progress stylesheet', () => {
  test('the linear indicator spans its container, inset 4dp from each edge', () => {
    expect(value('.mtrl-progress--linear', 'width')).toBe('100%');
    expect(value('.mtrl-progress--linear', 'padding')).toBe('0 4px');
    expect(value('.mtrl-progress--linear', 'box-sizing')).toBe('border-box');
  });

  test('the circular indicator is sized by its svg and sits on the text baseline', () => {
    expect(value('.mtrl-progress--circular', 'display')).toBe('inline-flex');
    expect(value('.mtrl-progress--circular', 'vertical-align')).toBe('middle');
  });

  test('the svg view is a block that never overflows its container', () => {
    expect(value('.mtrl-progress__view', 'display')).toBe('block');
    expect(value('.mtrl-progress__view', 'max-width')).toBe('100%');
    expect(value('.mtrl-progress__view', 'overflow')).toBe('hidden');
    // no line box under the svg
    expect(value('.mtrl-progress', 'line-height')).toBe('0');
  });

  test('nothing hard-codes a colour: the drawing reads the theme', () => {
    expect(css).not.toMatch(/#[0-9a-f]{6}/i);
    expect(css).not.toMatch(/rgba?\(\d/);
    expect(value('.mtrl-progress__label', 'color')).toBe('var(--mtrl-sys-color-on-surface-variant)');
    expect(rulesAny('.mtrl-progress rect.mtrl-progress__track').join('')).toContain(
      'fill: var(--mtrl-sys-color-secondary-container)'
    );
    expect(value('.mtrl-progress--circular .mtrl-progress__indicator', 'stroke')).toBe('var(--mtrl-sys-color-primary)');
  });

  test('a label sits outside the view and only then reserves room', () => {
    expect(value('.mtrl-progress--linear .mtrl-progress__label', 'top')).toBe('100%');
    expect(value('.mtrl-progress--linear .mtrl-progress__label', 'inset-inline-end')).toBe('0');
    expect(value('.mtrl-progress--linear:has(.mtrl-progress__label)', 'margin-bottom')).toBe('20px');
    // the old stylesheet padded every linear indicator for a label it might not have
    expect(value('.mtrl-progress--linear', 'padding-bottom')).toBeUndefined();
    expect(value('.mtrl-progress--linear', 'min-height')).toBeUndefined();
  });

  test('hidden and disabled are attributes and classes, not inline-style hacks', () => {
    expect(value('.mtrl-progress[hidden]', 'display')).toBe('none');
    expect(value('.mtrl-progress--disabled, .mtrl-progress[aria-disabled=true]', 'opacity')).toBe('0.38');
    expect(css).not.toContain('!important');
    expect(css).not.toContain('style*=');
  });
});

describe('progress stylesheet: the drawing', () => {
  test('the bars share one geometry: centred by stroke, rounded by the cap', () => {
    // one rule for every part, the eight selectors folded into one :is()
    const shared = rulesContaining(':is(rect.mtrl-progress__track, rect.mtrl-progress__buffer');
    expect(shared).toHaveLength(1);
    const body = shared[0] ?? '';
    expect(body).toContain('y: calc((100% - var(--mtrl-progress-stroke)) / 2)');
    expect(body).toContain('height: var(--mtrl-progress-stroke)');
    expect(body).toContain('rx: var(--mtrl-progress-cap)');
  });

  test('the bar heads and tails are registered percentages, not keyframed geometry', () => {
    expect(value('@property --mtrl-progress-l', 'syntax')).toBe('"<percentage>"');
    expect(value('@property --mtrl-progress-l', 'inherits')).toBe('true');
    expect(value('@property --mtrl-progress-l', 'initial-value')).toBe('0%');
    expect(value('@property --mtrl-progress-r', 'initial-value')).toBe('0%');
    expect(value('@property --mtrl-progress-sweep', 'syntax')).toBe('"<number>"');
    expect(value('@property --mtrl-progress-sweep', 'initial-value')).toBe('10');
  });

  test('the indeterminate bars keep the canvas geometry: a clamped x, a width that dies when the bar ends', () => {
    // one derivation rule for the five parts and the wave windows
    const body = rulesContaining('.mtrl-progress--indeterminate :is(').find((b) => b.includes('x:')) ?? '';
    expect(body).toContain('x: clamp(0px, min(var(--mtrl-progress-l), var(--mtrl-progress-r)) - var(--mtrl-progress-cap), 100% - 2 * var(--mtrl-progress-cap))');
    expect(body).toContain('var(--mtrl-progress-span, calc((var(--mtrl-progress-r) - var(--mtrl-progress-l)) * 100))');
    // No static rest pose: the registered initial 0% on both edges is the
    // pose, under reduced motion and before each keyframe's first offset
    // alike, so the parts declare no --l/--r of their own. The one base
    // value is the ahead track's moving edge, and the between track takes
    // the span override — zero to its tail, in place of the head-to-tail
    // fallback.
    expect(rulesAny('.mtrl-progress--indeterminate .mtrl-progress__bar-first').filter((b) => b.includes('--mtrl-progress-l:'))).toHaveLength(0);
    expect(rulesAny('.mtrl-progress--indeterminate .mtrl-progress__between').join('\n')).toContain(
      '--mtrl-progress-span: calc(var(--mtrl-progress-r) * 100)'
    );
    expect(body).not.toContain('--mtrl-progress-l: 0%');
  });

  test('reduced motion rests on the empty frame: only the ahead bar spans the track', () => {
    const ahead = rulesAny('.mtrl-progress--indeterminate .mtrl-progress__ahead').join('\n');
    expect(ahead).toContain('--mtrl-progress-r: 100%');
    // and that base value sits before the motion media query, so reduce still draws it
    const [from, to] = motionMedia();
    const at = css.indexOf('--mtrl-progress-r: 100%');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(from);
    expect(to).toBeGreaterThan(from);
  });

  test('indeterminate motion is CSS, on the canvas schedule, inside no-preference', () => {
    expect(value('.mtrl-progress--indeterminate .mtrl-progress__ahead', 'animation')).toBe(
      'mtrl-progress-ahead-head 1750ms infinite'
    );
    // the wavy windows run their bar's keyframes themselves — the clipPath
    // subtree does not inherit the animated edges — so each bar and its
    // window share one rule
    const animationOf = (selector: string): string | undefined =>
      rulesAny(selector).map((b) => b.match(/animation: ([^;]+);/)?.[1]).filter(Boolean).pop();
    expect(animationOf('.mtrl-progress--indeterminate .mtrl-progress__bar-first')).toBe(
      'mtrl-progress-first-tail 1750ms infinite, mtrl-progress-first-head 1750ms infinite'
    );
    expect(animationOf('.mtrl-progress--indeterminate .mtrl-progress__bar-first rect.mtrl-progress__wave-window')).toBe(
      'mtrl-progress-first-tail 1750ms infinite, mtrl-progress-first-head 1750ms infinite'
    );
    expect(animationOf('.mtrl-progress--indeterminate .mtrl-progress__bar-second')).toBe(
      'mtrl-progress-second-tail 1750ms infinite, mtrl-progress-second-head 1750ms infinite'
    );
    expect(animationOf('.mtrl-progress--indeterminate .mtrl-progress__bar-second rect.mtrl-progress__wave-window')).toBe(
      'mtrl-progress-second-tail 1750ms infinite, mtrl-progress-second-head 1750ms infinite'
    );
    const [from, to] = motionMedia();
    for (const name of [
      'mtrl-progress-ahead-head',
      'mtrl-progress-first-head',
      'mtrl-progress-first-tail',
      'mtrl-progress-second-head',
      'mtrl-progress-second-tail',
      'mtrl-progress-between-head',
      'mtrl-progress-between-tail',
      'mtrl-progress-behind-tail',
      'mtrl-progress-kick',
      'mtrl-progress-spin',
      'mtrl-progress-sweep',
      'mtrl-progress-travel',
      'mtrl-progress-travel-ring',
      'mtrl-progress-dash-ring',
    ]) {
      const at = css.indexOf(`@keyframes ${name} `);
      expect(at).toBeGreaterThan(from - 1);
      expect(at).toBeLessThan(to);
    }
  });

  test('the first bar eases with the canvas curve and holds where the canvas held', () => {
    const head = keyframes('mtrl-progress-first-head');
    expect(head).toContain('57.142857%');
    expect(head).toContain('--mtrl-progress-r: 100%');
    expect(head).toContain('cubic-bezier(0.3, 0, 0.8, 0.15)');
    const tail = keyframes('mtrl-progress-first-tail');
    expect(tail).toContain('14.285714%');
    expect(tail).toContain('71.428571%');
    // the step to full — the canvas's branch boundary — belongs to the between bar
    expect(keyframes('mtrl-progress-between-tail')).toContain('71.43%');
    const between = keyframes('mtrl-progress-between-head');
    expect(between).toContain('37.142857%');
    expect(between).toContain('calc(var(--mtrl-progress-gapp) * 1%)');
  });

  test('the circular spin and kick keep their 6s table, the sweep its range', () => {
    expect(value('.mtrl-progress--indeterminate .mtrl-progress__spin', 'animation')).toBe(
      'mtrl-progress-spin 6000ms infinite linear'
    );
    expect(value('.mtrl-progress--indeterminate .mtrl-progress__kick', 'animation')).toBe(
      'mtrl-progress-kick 6000ms infinite, mtrl-progress-sweep 6000ms infinite'
    );
    const kick = keyframes('mtrl-progress-kick');
    expect(kick).toContain('rotate: 90deg');
    expect(kick).toContain('rotate: 270deg');
    expect(kick).toContain('cubic-bezier(0.05, 0.7, 0.1, 1)');
    const sweep = keyframes('mtrl-progress-sweep');
    expect(sweep).toContain('--mtrl-progress-sweep: 10');
    expect(sweep).toContain('--mtrl-progress-sweep: 87');
    expect(sweep).toContain('cubic-bezier(0.2, 0, 0, 1)');
  });

  test('the circular indeterminate head is a dash on the sweep, the track a negative offset', () => {
    // the gap is the ring's complement, not an open 100: the dash pattern
    // repeats once per turn, so the travel's lockstep dashoffset can slide the
    // window across the path's seam without the painted arc riding the rotation
    expect(value('.mtrl-progress--circular.mtrl-progress--indeterminate .mtrl-progress__indicator', 'stroke-dasharray')).toBe(
      'var(--mtrl-progress-sweep) calc(100 - var(--mtrl-progress-sweep))'
    );
    expect(
      value('.mtrl-progress--circular.mtrl-progress--indeterminate .mtrl-progress__track', 'stroke-dasharray')
    ).toContain('max(0, 100 - var(--mtrl-progress-sweep)');
    expect(
      value('.mtrl-progress--circular.mtrl-progress--indeterminate .mtrl-progress__track', 'stroke-dashoffset')
    ).toContain('calc(-1 * (var(--mtrl-progress-sweep)');
  });

  test('the wave travels one wavelength per second, as a ring when circular', () => {
    expect(value('.mtrl-progress__wave-travel', 'animation')).toBe('mtrl-progress-travel 1000ms infinite linear');
    expect(value('.mtrl-progress--circular .mtrl-progress__wave-travel', 'animation-name')).toBe(
      'mtrl-progress-travel-ring'
    );
    expect(keyframes('mtrl-progress-travel')).toContain('translate: var(--mtrl-progress-wavelength) 0');
    expect(keyframes('mtrl-progress-travel-ring')).toContain('rotate: var(--mtrl-progress-wave-rot)');
    // the dash slides back along the ring in lockstep with that rotation, one
    // wavelength per loop, so the painted arc and its caps hold still in screen
    // space while the sine travels under them
    expect(value('.mtrl-progress--circular path.mtrl-progress__indicator', 'animation')).toBe(
      'mtrl-progress-dash-ring 1000ms infinite linear'
    );
    expect(keyframes('mtrl-progress-dash-ring')).toContain('stroke-dashoffset: var(--mtrl-progress-wave-dash)');
  });

  test('rtl mirrors the linear view and reverses only the travel', () => {
    const mirror = rulesAny('[dir=rtl] .mtrl-progress--linear .mtrl-progress__view:not(:where(.mtrl-ltr, .mtrl-ltr *))');
    expect(mirror.join('\n')).toContain('transform: scaleX(-1)');
    const reverse = rulesAny(
      '[dir=rtl] .mtrl-progress--linear .mtrl-progress__wave-travel:not(:where(.mtrl-ltr, .mtrl-ltr *))'
    );
    expect(reverse.join('\n')).toContain('animation-direction: reverse');
  });
});
