// test/styles/progress.test.ts
//
// The progress stylesheet: the indicator itself is drawn on a canvas, so this
// covers the layout, the 4dp inset the guidelines ask for, and the states.
import { describe, test, expect, beforeAll } from 'bun:test';
import { compileString } from 'sass';

let css = '';

const rules = (selector: string): string[] => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return Array.from(css.matchAll(new RegExp(`(^|\\n)${escaped}\\s*\\{([^}]*)\\}`, 'g')), (m) => m[2]);
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

  test('a label sits outside the canvas and only then reserves room', () => {
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

  test('the label docks on the physical end in the lowered artefacts, mirrored by one arm', () => {
    // The linear label sits under the indicator's end edge. The adopted
    // sheets keep the logical inset (asserted above); the artefacts a
    // consumer bundler lowers write the physical side, with the mirrored side
    // in one arm that also covers a marker on this root — --linear and the
    // runtime's direction mark are the same element, and the plain arm
    // members need the marker on an ancestor (abstract/_direction.scss).
    const arms = compileString(
      `@use 'abstract/emit' as config with ($direction-arms: true);\n@use 'components/progress';`,
      { loadPaths: ['src/styles'], style: 'expanded' },
    ).css.replace(/,\n/g, ', ');
    expect(arms).toContain('.mtrl-progress--linear .mtrl-progress__label {\n  right: 0;\n');
    expect(arms).toContain(
      '.mtrl-progress--linear:where(.mtrl-rtl, [dir=rtl]) .mtrl-progress__label, ' +
        ':where(.mtrl-rtl) .mtrl-progress--linear .mtrl-progress__label, ' +
        ':where(:host(.mtrl-rtl)) .mtrl-progress--linear .mtrl-progress__label, ' +
        "[dir=rtl] .mtrl-progress--linear:not(:where(.mtrl-ltr, .mtrl-ltr *)) .mtrl-progress__label {\n  right: auto;\n  left: 0;\n}",
    );
    // No logical side inset is left for a bundler to lower into a :lang() arm.
    expect(arms).not.toMatch(/inset-inline-(start|end)/);
  });
});
