// test/styles/progress.test.ts
//
// The progress stylesheet: the indicator itself is drawn on a canvas, so this
// covers the layout, the 4dp inset the guidelines ask for, and the states.
import { describe, test, expect, beforeAll } from 'bun:test';
import { compileString } from 'sass';

let css = '';

const rules = (selector: string): string[] => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const exact = Array.from(css.matchAll(new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`, 'g')), (m) => m[2]);
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
  return Array.from(css.matchAll(/(?:^|\n)([^{}\n]+)\{([^}]*)\}/g))
    .filter((m) => members(m[1]!).map((member) => member.trim()).includes(selector))
    .map((m) => m[2]!);
};

const value = (selector: string, property: string): string | undefined =>
  rules(selector)
    .map((block) => block.match(new RegExp(`(?:^|;|\\n)\\s*${property}\\s*:\\s*([^;]+);`))?.[1].trim())
    .filter((v): v is string => v !== undefined)
    .pop();

beforeAll(() => {
  css = compileString(`@use 'components/progress';`, { loadPaths: ['src/styles'], style: 'expanded' }).css.replace(/,\n/g, ', ');
});

describe('progress stylesheet', () => {
  test('the linear indicator spans its container, inset 4dp from each edge', () => {
    expect(value('.mtrl-progress--linear', 'width')).toBe('100%');
    expect(value('.mtrl-progress--linear', 'padding')).toBe('0 4px');
    expect(value('.mtrl-progress--linear', 'box-sizing')).toBe('border-box');
  });

  test('the circular indicator is sized by its canvas and sits on the text baseline', () => {
    expect(value('.mtrl-progress--circular', 'display')).toBe('inline-flex');
    expect(value('.mtrl-progress--circular', 'vertical-align')).toBe('middle');
  });

  test('the canvas is a block that never overflows its container', () => {
    expect(value('.mtrl-progress__canvas', 'display')).toBe('block');
    expect(value('.mtrl-progress__canvas', 'max-width')).toBe('100%');
    // no line box under the canvas
    expect(value('.mtrl-progress', 'line-height')).toBe('0');
  });

  test('nothing hard-codes a colour: the canvas reads the theme', () => {
    expect(css).not.toMatch(/#[0-9a-f]{6}/i);
    expect(css).not.toMatch(/rgba?\(\d/);
    expect(value('.mtrl-progress__label', 'color')).toBe('var(--mtrl-sys-color-on-surface-variant)');
  });

  test('a label sits outside the canvas on a physical edge, and the mirrored edge is a direction arm; it only then reserves room', () => {
    expect(value('.mtrl-progress--linear .mtrl-progress__label', 'top')).toBe('100%');
    expect(value('.mtrl-progress--linear .mtrl-progress__label', 'right')).toBe('0');
    // A consumer's bundler lowers inset-inline-end into :lang() lists that
    // match a language, never dir="rtl": the bundled sheet kept the label at
    // the right edge of a right-to-left page. The mirrored edge is a direction
    // arm — the class on an ancestor, the shadow tree's host class, and a cut
    // attribute fallback — plus the root-carried form for the direction on the
    // indicator itself, where the runtime writes the class.
    for (const member of [
      ':where(.mtrl-rtl) .mtrl-progress--linear .mtrl-progress__label',
      ':where(:host(.mtrl-rtl)) .mtrl-progress--linear .mtrl-progress__label',
      '[dir=rtl] .mtrl-progress--linear .mtrl-progress__label:not(:where(.mtrl-ltr, .mtrl-ltr *))',
      '.mtrl-progress--linear:where(.mtrl-rtl, [dir=rtl]) .mtrl-progress__label',
    ]) {
      expect(value(member, 'left')).toBe('0');
      expect(value(member, 'right')).toBe('auto');
    }
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
