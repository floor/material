// test/styles/split-button.test.ts
//
// The split button stylesheet against the M3 tokens (Compose
// SplitButtonXSmallTokens through SplitButtonXLargeTokens and
// m3.material.io/components/split-button/specs).
import { describe, test, expect, beforeAll } from 'bun:test';
import { compileString } from 'sass';
import { corner as token } from '../utils/corner';

let css = '';
let armsCss = '';

const rules = (selector: string, sheet: string = css): string[] => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exact = Array.from(sheet.matchAll(new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`, 'g')), (m) => m[2]);
  if (exact.length) return exact;
  // A direction rule compiles to a selector list — the light-DOM attribute form
  // beside the shadow tree's host-class form — so the selector is one member of
  // the prelude, not the whole of it. Commas inside `:not(:where(...))` do not
  // separate members.
  const members = (prelude: string): string[] => {
    const out: string[] = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < prelude.length; i++) {
      const ch = prelude[i];
      if (ch === '(') depth++;
      else if (ch === ')') depth = Math.max(0, depth - 1);
      else if (ch === ',' && depth === 0) {
        out.push(prelude.slice(start, i));
        start = i + 1;
      }
    }
    out.push(prelude.slice(start));
    return out;
  };
  return Array.from(sheet.matchAll(/(?:^|\n)([^{}\n]+)\{([^}]*)\}/g))
    .filter((m) => members(m[1]!).map((member) => member.trim()).includes(selector))
    .map((m) => m[2]!);
};

const value = (selector: string, property: string, sheet: string = css): string | undefined =>
  rules(selector, sheet)
    .map((block) => block.match(new RegExp(`(?:^|;|\\n)\\s*${property}\\s*:\\s*([^;]+);`))?.[1].trim())
    .filter((v): v is string => v !== undefined)
    .pop();

beforeAll(() => {
  css = compileString(`@use 'components/split-button';`, { loadPaths: ['src/styles'], style: 'expanded' }).css.replace(/,\n/g, ', ');
  armsCss = compileString(
    `@use 'abstract/emit' as config with ($direction-arms: true);\n@use 'components/split-button';`,
    { loadPaths: ['src/styles'], style: 'expanded' },
  ).css.replace(/,\n/g, ', ');
});

describe('split button stylesheet', () => {
  test('the two halves sit 2dp apart in one inline row', () => {
    expect(value('.mtrl-split-button', 'display')).toBe('inline-flex');
    expect(value('.mtrl-split-button', 'gap')).toBe('2px');
    expect(value('.mtrl-split-button', 'align-items')).toBe('stretch');
  });

  test('heights follow the button scale', () => {
    const heights: Record<string, string> = { xs: '32px', s: '40px', m: '56px', l: '96px', xl: '136px' };
    for (const [size, height] of Object.entries(heights)) {
      expect(value(`.mtrl-split-button--${size} .mtrl-button`, 'height')).toBe(height);
    }
  });

  test('the outer corner is exactly half the height, so the inner one survives', () => {
    // CSS scales every corner of a box down together when the radii along a
    // side overflow it, so a 9999px pill beside a 4dp corner drags that
    // corner to a fiftieth of a pixel and the split reads as a square cut.
    // The pill is a custom property, so a state or a direction changes only
    // values and the physical pairs below keep choosing the sides.
    const outer: Record<string, string> = { xs: '16px', s: '20px', m: '28px', l: '48px', xl: '68px' };
    expect(value('.mtrl-split-button', '--mtrl-split-button-pill')).toBe('20px');
    for (const [size, corner] of Object.entries(outer)) {
      expect(value(`.mtrl-split-button--${size}`, '--mtrl-split-button-pill')).toBe(corner);
    }
    expect(value('.mtrl-split-button .mtrl-button', 'border-radius')).toBe('var(--mtrl-split-button-pill)');
    expect(css).not.toContain('9999px');
  });

  test('the inner corners grow with the size', () => {
    // The two small sizes keep the token value; the larger ones hold its
    // proportion instead of the token's 4, 8 and 12dp, which read as square
    // corners beside a full pill
    const inner: Record<string, string> = { xs: '4px', s: '4px', m: '8px', l: '12px', xl: '16px' };
    for (const [size, corner] of Object.entries(inner)) {
      // Read through the shape scale's token
      const fallback = `var(--mtrl-split-button-inner-shape, ${token(parseInt(corner, 10))})`;
      expect(value(`.mtrl-split-button--${size}`, '--mtrl-split-button-corner')).toBe(fallback);
    }
    // A root without a size class keeps the default size's values.
    expect(value('.mtrl-split-button', '--mtrl-split-button-corner'))
      .toBe(`var(--mtrl-split-button-inner-shape, ${token(4)})`);
  });

  test('every inner corner stays between a tenth and a seventh of the height', () => {
    const heights: Record<string, number> = { xs: 32, s: 40, m: 56, l: 96, xl: 136 };
    const inner: Record<string, number> = { xs: 4, s: 4, m: 8, l: 12, xl: 16 };
    for (const size of Object.keys(heights)) {
      const ratio = inner[size]! / heights[size]!;
      expect(ratio).toBeGreaterThanOrEqual(0.1);
      expect(ratio).toBeLessThanOrEqual(0.145);
    }
  });

  test('the inner corners grow further when the button is hovered, focused or pressed', () => {
    const active: Record<string, string> = { xs: '8px', s: '12px', m: '12px', l: '20px', xl: '20px' };
    const resting: Record<string, number> = { xs: 4, s: 4, m: 8, l: 12, xl: 16 };
    // One rule for both halves, and it changes only the value: the arms keep
    // choosing the physical pair while a half is hovered or pressed.
    for (const half of ['leading', 'trailing']) {
      expect(value(`.mtrl-split-button .mtrl-split-button__${half}:where(:hover, :focus-visible, :active)`, '--mtrl-split-button-corner'))
        .toBe('var(--mtrl-split-button-corner-active)');
    }
    for (const [size, corner] of Object.entries(active)) {
      expect(value(`.mtrl-split-button--${size}`, '--mtrl-split-button-corner-active'))
        .toBe(`var(--mtrl-split-button-inner-shape-active, ${token(parseInt(corner, 10))})`);
      // and it is always rounder than the resting corner
      expect(parseInt(corner, 10)).toBeGreaterThan(resting[size]!);
    }
  });

  test('the leading and trailing spaces come from the tokens', () => {
    const leading: Record<string, string> = { xs: '12px 10px', s: '16px 12px', m: '24px 24px', l: '48px 48px', xl: '64px 64px' };
    for (const [size, padding] of Object.entries(leading)) {
      expect(value(`.mtrl-split-button--${size} .mtrl-split-button__leading`, 'padding-inline')).toBe(padding);
    }
    const trailing: Record<string, string> = { xs: '13px', s: '13px', m: '15px', l: '29px', xl: '43px' };
    for (const [size, padding] of Object.entries(trailing)) {
      expect(value(`.mtrl-split-button--${size} .mtrl-split-button__trailing`, 'padding-inline')).toBe(padding);
    }
  });

  test('the chevron is sized per size and sits off centre until the menu opens', () => {
    const icons: Record<string, string> = { xs: '22px', s: '22px', m: '26px', l: '38px', xl: '50px' };
    for (const [size, icon] of Object.entries(icons)) {
      expect(value(`.mtrl-split-button--${size} .mtrl-split-button__trailing .mtrl-split-button__chevron`, 'width')).toBe(icon);
    }
    const offsets: Record<string, string> = { xs: '1px', s: '1px', m: '2px', l: '3px', xl: '6px' };
    for (const [size, offset] of Object.entries(offsets)) {
      expect(value(`.mtrl-split-button--${size} .mtrl-split-button__trailing .mtrl-split-button__chevron`, 'translate')).toBe(`calc(-1 * ${offset}) 0`);
      // and it mirrors in right-to-left, unless a nearer ltr subtree owns it
      expect(value(`[dir=rtl] .mtrl-split-button--${size} .mtrl-split-button__trailing:not(:where(.mtrl-ltr, .mtrl-ltr *)) .mtrl-split-button__chevron`, 'translate')).toBe(`${offset} 0`);
    }
  });

  test('open: the inner corner rounds off, the icon centres and the chevron turns over', () => {
    // The trailing half's inner corner takes the pill, which is the same on
    // either side, so one rule serves both directions.
    expect(value('.mtrl-split-button--expanded .mtrl-split-button__trailing', '--mtrl-split-button-corner'))
      .toBe('var(--mtrl-split-button-pill)');
    expect(value('.mtrl-split-button--expanded .mtrl-split-button__trailing .mtrl-split-button__chevron', 'rotate')).toBe('180deg');
    expect(value('.mtrl-split-button--expanded .mtrl-split-button__trailing .mtrl-split-button__chevron', 'translate')).toBe('0 0');
  });

  test('each half keeps its logical corners in the adopted sheets', () => {
    // The element sheets and the pre-upgrade rules are adopted by the runtime
    // as compiled: the logical radii mirror on the computed direction there,
    // and no arm rides along.
    const leading = [
      ['border-start-start-radius', 'var(--mtrl-split-button-pill)'],
      ['border-start-end-radius', 'var(--mtrl-split-button-corner)'],
      ['border-end-start-radius', 'var(--mtrl-split-button-pill)'],
      ['border-end-end-radius', 'var(--mtrl-split-button-corner)'],
    ] as const;
    const trailing = [
      ['border-start-start-radius', 'var(--mtrl-split-button-corner)'],
      ['border-start-end-radius', 'var(--mtrl-split-button-pill)'],
      ['border-end-start-radius', 'var(--mtrl-split-button-corner)'],
      ['border-end-end-radius', 'var(--mtrl-split-button-pill)'],
    ] as const;
    for (const [property, radius] of leading) {
      expect(value('.mtrl-split-button .mtrl-split-button__leading', property)).toBe(radius);
    }
    for (const [property, radius] of trailing) {
      expect(value('.mtrl-split-button .mtrl-split-button__trailing', property)).toBe(radius);
    }
    // The halves carry no physical shorthand; the button's own full pill stays
    // one, because it is the same on either side and nothing mirrors.
    for (const half of ['leading', 'trailing']) {
      expect(rules(`.mtrl-split-button .mtrl-split-button__${half}`).join('\n')).not.toMatch(/border-radius:/);
    }
    expect(css).not.toContain(':where(.mtrl-rtl) .mtrl-split-button .mtrl-split-button__leading');
    expect(css).not.toContain('.mtrl-split-button:where(.mtrl-rtl, [dir=rtl])');
  });

  test('the lowered artefacts write the physical pair, the mirrored pair an arm', () => {
    // In the artefacts a consumer bundler lowers (abstract/_emit.scss), the
    // same call sites compile to the physical pair with the right-to-left
    // pair as a direction arm.
    const leading = 'var(--mtrl-split-button-pill) var(--mtrl-split-button-corner) var(--mtrl-split-button-corner) var(--mtrl-split-button-pill)';
    const trailing = 'var(--mtrl-split-button-corner) var(--mtrl-split-button-pill) var(--mtrl-split-button-pill) var(--mtrl-split-button-corner)';
    expect(value('.mtrl-split-button .mtrl-split-button__leading', 'border-radius', armsCss)).toBe(leading);
    expect(value('.mtrl-split-button .mtrl-split-button__trailing', 'border-radius', armsCss)).toBe(trailing);
    // An ancestor direction reaches the parts through the class the runtime
    // reflects, the shadow tree's host class, and a cut attribute fallback.
    for (const member of [
      ':where(.mtrl-rtl) .mtrl-split-button .mtrl-split-button__leading',
      ':where(:host(.mtrl-rtl)) .mtrl-split-button .mtrl-split-button__leading',
      '[dir=rtl] .mtrl-split-button .mtrl-split-button__leading:not(:where(.mtrl-ltr, .mtrl-ltr *))',
    ]) {
      expect(value(member, 'border-radius', armsCss)).toBe(trailing);
    }
    for (const member of [
      ':where(.mtrl-rtl) .mtrl-split-button .mtrl-split-button__trailing',
      ':where(:host(.mtrl-rtl)) .mtrl-split-button .mtrl-split-button__trailing',
      '[dir=rtl] .mtrl-split-button .mtrl-split-button__trailing:not(:where(.mtrl-ltr, .mtrl-ltr *))',
    ]) {
      expect(value(member, 'border-radius', armsCss)).toBe(leading);
    }
    // The direction may sit on the root itself: the arms above need an
    // ancestor, and this is where the runtime writes the class.
    expect(value('.mtrl-split-button:where(.mtrl-rtl, [dir=rtl]) .mtrl-split-button__leading', 'border-radius', armsCss)).toBe(trailing);
    expect(value('.mtrl-split-button:where(.mtrl-rtl, [dir=rtl]) .mtrl-split-button__trailing', 'border-radius', armsCss)).toBe(leading);
  });

  test('no logical corner property is left to be lowered into :lang() arms', () => {
    // A consumer's bundler lowers border-*-*-radius into :lang() lists that
    // match a language, never dir="rtl": the bundled sheet lost the split
    // shape on an RTL page while the halves swapped. The artefacts a bundler
    // lowers compile with none left (abstract/_emit.scss); the adopted sheets
    // keep them, which mirrors natively and never meets a bundler
    // (scripts/check-rtl-direction.ts).
    expect(armsCss).not.toMatch(/border-(?:start|end)-(?:start|end)-radius/);
  });

  test('the short sizes still offer a 48dp target', () => {
    const selector = '.mtrl-split-button--xs .mtrl-button::after, .mtrl-split-button--s .mtrl-button::after';
    expect(value(selector, 'height')).toBe('48px');
    expect(value(selector, 'min-height')).toBe('100%');
    expect(value(selector, 'position')).toBe('absolute');
  });

  test('filled and tonal halves stay flat, so neither casts a shadow on the other', () => {
    const selector = '.mtrl-split-button--filled .mtrl-button, .mtrl-split-button--filled .mtrl-button:hover, .mtrl-split-button--filled .mtrl-button:focus-visible, .mtrl-split-button--filled .mtrl-button:active, .mtrl-split-button--tonal .mtrl-button, .mtrl-split-button--tonal .mtrl-button:hover, .mtrl-split-button--tonal .mtrl-button:focus-visible, .mtrl-split-button--tonal .mtrl-button:active';
    expect(value(selector, 'box-shadow')).toBe('none');
    // an elevated split button keeps its elevation: that is what the variant is
    expect(css).not.toContain('.mtrl-split-button--elevated');
  });

  test('nothing hard-codes a colour: both halves are the library button', () => {
    expect(css).not.toMatch(/#[0-9a-f]{6}/i);
    expect(css).not.toMatch(/background-color:\s*(?!inherit|transparent)/);
  });
});
