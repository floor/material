// test/styles/side-sheet.test.ts
//
// The stylesheet against the M3 side sheet specs and the Android
// implementation, since Compose has no side sheet tokens.
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
  css = compileString(`@use 'components/side-sheet';`, { loadPaths: ['src/styles'], style: 'expanded' }).css.replace(/,\n/g, ', ');
});

describe('side sheet stylesheet', () => {
  test('the two variants differ in colour, not only behaviour', () => {
    // standard sits on surface, modal on surface-container-low
    expect(value('.mtrl-side-sheet--standard .mtrl-side-sheet__container', 'background-color')).toBe('var(--mtrl-sys-color-surface)');
    expect(value('.mtrl-side-sheet--modal .mtrl-side-sheet__container', 'background-color')).toBe('var(--mtrl-sys-color-surface-container-low)');
    // only the modal one floats
    expect(value('.mtrl-side-sheet--modal .mtrl-side-sheet__container', 'box-shadow')).toBe('0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15)');
    expect(value('.mtrl-side-sheet--standard .mtrl-side-sheet__container', 'box-shadow')).toBeUndefined();
  });

  // Only the modal sheet rounds, on the edge facing the page; the
  // standard one is square (MDC Sheet.Side.Docked.Container.Shape = Corner.None)
  test('a modal sheet rounds only the corners facing the page, at CornerLarge; a standard one none', () => {
    // docked to the trailing edge: the leading corners round
    expect(value('.mtrl-side-sheet--modal.mtrl-side-sheet--end .mtrl-side-sheet__container', 'border-start-start-radius')).toBe('var(--mtrl-sys-shape-corner-large, 16px)');
    expect(value('.mtrl-side-sheet--modal.mtrl-side-sheet--end .mtrl-side-sheet__container', 'border-end-start-radius')).toBe('var(--mtrl-sys-shape-corner-large, 16px)');
    // and the mirror image when docked to the leading edge
    expect(value('.mtrl-side-sheet--modal.mtrl-side-sheet--start .mtrl-side-sheet__container', 'border-start-end-radius')).toBe('var(--mtrl-sys-shape-corner-large, 16px)');
    expect(value('.mtrl-side-sheet--modal.mtrl-side-sheet--start .mtrl-side-sheet__container', 'border-end-end-radius')).toBe('var(--mtrl-sys-shape-corner-large, 16px)');
    // no rule gives the standard sheet, or any sheet by its edge alone, a radius
    for (const selector of ['.mtrl-side-sheet--end .mtrl-side-sheet__container', '.mtrl-side-sheet--start .mtrl-side-sheet__container']) {
      for (const corner of ['start-start', 'end-start', 'start-end', 'end-end']) expect(value(selector, `border-${corner}-radius`)).toBeUndefined();
    }
  });

  test('positions are logical, so they follow the writing direction', () => {
    // no physical left/right anywhere: the radii and the slide are logical
    expect(css).not.toContain('border-top-left-radius');
    expect(css).not.toContain('border-bottom-right-radius');
    expect(value('.mtrl-side-sheet--end', 'justify-content')).toBe('flex-end');
    expect(value('.mtrl-side-sheet--start', 'justify-content')).toBe('flex-start');
  });

  test('it stops at 400dp', () => {
    // side sheet specs, container maximum width
    expect(value('.mtrl-side-sheet__container', 'max-width')).toBe('400px');
  });

  test('the header is 72dp with 24dp either side and 12dp between elements', () => {
    expect(value('.mtrl-side-sheet__header', 'min-height')).toBe('72px');
    expect(value('.mtrl-side-sheet__header', 'padding')).toBe('16px 24px');
    expect(value('.mtrl-side-sheet__header', 'gap')).toBe('12px');
    expect(value('.mtrl-side-sheet__content', 'padding')).toBe('0 24px 24px');
  });

  test('the scrim is 32% of the scrim role and hidden until it opens', () => {
    expect(value('.mtrl-side-sheet__scrim', 'background-color')).toBe('color-mix(in srgb, var(--mtrl-sys-color-scrim) 32%, transparent)');
    expect(value('.mtrl-side-sheet__scrim', 'opacity')).toBe('0');
    expect(value('.mtrl-side-sheet--open .mtrl-side-sheet__scrim', 'opacity')).toBe('1');
  });

  test('a closed sheet lets clicks through to the page behind it', () => {
    expect(value('.mtrl-side-sheet', 'pointer-events')).toBe('none');
    expect(value('.mtrl-side-sheet--open', 'pointer-events')).toBe('auto');
    // a standard sheet never blocks the page, open or not
    expect(value('.mtrl-side-sheet--standard', 'pointer-events')).toBe('none');
  });

  test('it slides in from its own edge, and stops for reduced motion', () => {
    expect(value('.mtrl-side-sheet--end .mtrl-side-sheet__container', 'transform')).toBe('translateX(calc(100% * var(--mtrl-side-sheet-direction)))');
    expect(value('.mtrl-side-sheet--start .mtrl-side-sheet__container', 'transform')).toBe('translateX(calc(-100% * var(--mtrl-side-sheet-direction)))');
    expect(value('.mtrl-side-sheet--open .mtrl-side-sheet__container', 'transform')).toBe('translateX(0)');
    expect(css).toMatch(/prefers-reduced-motion: reduce\)\s*\{[\s\S]{0,300}?transition: none;/);
  });

  test('the close button is a 40dp target with a focus ring', () => {
    expect(value('.mtrl-side-sheet__close', 'width')).toBe('40px');
    expect(value('.mtrl-side-sheet__close', 'height')).toBe('40px');
    expect(value('.mtrl-side-sheet__close:focus-visible', 'outline')).toBe('3px solid var(--mtrl-sys-color-secondary)');
  });

  test('no corner is written as an unanimatable pill', () => {
    expect(css).not.toContain('9999px');
    expect(css).not.toContain('!important');
  });

  test('the modal corners mirror in every artefact: logical pair, physical pair plus a self arm', () => {
    // Only the modal sheet rounds, on its inner edge. The adopted sheets keep
    // the logical pair; the lowered artefacts write the physical pair with the
    // mirrored pair in one arm per placement whose prelude covers a mark on
    // the sheet root itself (abstract/_direction.scss).
    const radius = 'var(--mtrl-sys-shape-corner-large, 16px)';
    const endModal = '.mtrl-side-sheet--modal.mtrl-side-sheet--end .mtrl-side-sheet__container';
    expect(value(endModal, 'border-start-start-radius')).toBe(radius);
    expect(value(endModal, 'border-end-start-radius')).toBe(radius);
    const arms = compileString(
      `@use 'abstract/emit' as config with ($direction-arms: true);\n@use 'components/side-sheet';`,
      { loadPaths: ['src/styles'], style: 'expanded' },
    ).css.replace(/,\n/g, ', ');
    expect(arms).toContain(`border-top-left-radius: ${radius};`);
    // The arm resets the base side to auto's pair — 0, the docked edge — and
    // writes the mirrored inner edge, under every marker form.
    expect(arms).toContain(
      '.mtrl-side-sheet--modal.mtrl-side-sheet--end:where(.mtrl-rtl, [dir=rtl]) .mtrl-side-sheet__container, ' +
        ':where(.mtrl-rtl) .mtrl-side-sheet--modal.mtrl-side-sheet--end .mtrl-side-sheet__container, ' +
        ':where(:host(.mtrl-rtl)) .mtrl-side-sheet--modal.mtrl-side-sheet--end .mtrl-side-sheet__container, ' +
        '[dir=rtl] .mtrl-side-sheet--modal.mtrl-side-sheet--end:not(:where(.mtrl-ltr, .mtrl-ltr *)) .mtrl-side-sheet__container {' +
        '\n  border-top-left-radius: 0;\n  border-bottom-left-radius: 0;' +
        `\n  border-top-right-radius: ${radius};\n  border-bottom-right-radius: ${radius};\n}`,
    );
    expect(arms).toContain(
      '.mtrl-side-sheet--modal.mtrl-side-sheet--start:where(.mtrl-rtl, [dir=rtl]) .mtrl-side-sheet__container, ' +
        ':where(.mtrl-rtl) .mtrl-side-sheet--modal.mtrl-side-sheet--start .mtrl-side-sheet__container, ' +
        ':where(:host(.mtrl-rtl)) .mtrl-side-sheet--modal.mtrl-side-sheet--start .mtrl-side-sheet__container, ' +
        '[dir=rtl] .mtrl-side-sheet--modal.mtrl-side-sheet--start:not(:where(.mtrl-ltr, .mtrl-ltr *)) .mtrl-side-sheet__container {' +
        '\n  border-top-right-radius: 0;\n  border-bottom-right-radius: 0;' +
        `\n  border-top-left-radius: ${radius};\n  border-bottom-left-radius: ${radius};\n}`,
    );
    // No logical corner property is left for a bundler to lower into :lang().
    expect(arms).not.toMatch(/border-(start|end)-(start|end)-radius/);
  });
});
