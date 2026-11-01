// The chip's 48dp targets, keyboard-only focus layer, remove icon geometry,
// disabled avatar and selection motion, in the compiled stylesheet.
import { beforeAll, describe, expect, test } from 'bun:test';
import { compileString } from 'sass';

const root = '.mtrl-chip';
let css: string;
const value = (selector: string, property: string) =>
  Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter(([, selectors]) => selectors.split(',').some(s => s.trim() === selector))
    .flatMap(([, , declarations]) => Array.from(declarations.matchAll(/([\w-]+):\s*([^;]+);/g)))
    .filter(([, name]) => name === property)
    .map(([, , result]) => result.trim()).pop();

beforeAll(() => {
  css = compileString("@use 'components/chips';", { loadPaths: ['src/styles'] }).css.replace(/\/\*[\s\S]*?\*\//g, '');
});

describe('chip targets and geometry', () => {
  test('48px targets on every pointer, not only a coarse one', () => {
    expect(css).not.toContain('pointer: coarse');
    expect(value(`${root}__action::before`, 'inset-block')).toBe('-8px');
    expect(value(`${root}__remove::before`, 'width')).toBe('48px');
    expect(value(`${root}__remove::before`, 'height')).toBe('48px');
  });

  test('the remove icon sits 8px from the label and 8px from the edge', () => {
    expect(value(`${root}__remove`, 'width')).toBe('calc(18px + 8px)');
    expect(value(`${root}__remove`, 'padding-inline-end')).toBe('8px');
    expect(value(`${root}__remove`, 'justify-content')).toBe('flex-start');
  });

  test('the 1px outline takes no room, so the paddings measure from the edge as in M3', () => {
    expect(value(root, 'border')).toBe('0');
    expect(value(root, 'outline')).toBe('1px solid var(--mtrl-sys-color-outline-variant)');
    expect(value(root, 'outline-offset')).toBe('-1px');
    expect(css).not.toMatch(/border-color/);
  });

  test('a disabled avatar is dimmed to 38%', () => {
    expect(value(`${root}--disabled${root}--avatar ${root}__leading-icon`, 'opacity')).toBe('0.38');
  });
});

describe('chip focus and motion', () => {
  test('focus layers follow keyboard focus only', () => {
    expect(css).not.toContain(':focus-within');
    // The selector holds a comma inside :is(), which value() would split, so match it whole.
    // --pointer-focus: a cell focused by a click draws none of it, in any browser.
    expect(css).toMatch(/\.mtrl-chip:is\(:has\(:focus-visible\), :focus-visible\):not\(\.mtrl-chip--disabled\):not\(\.mtrl-chip--pointer-focus\)::after \{\s*opacity: 0\.1;/);
  });

  test('the focus ring is md.comp.focus-ring: 3px at a 2px offset, on buttons and on a focused cell', () => {
    expect(value(`${root}__action:focus-visible`, 'outline')).toBe('3px solid var(--mtrl-sys-color-secondary)');
    expect(value(`${root}__action:focus-visible`, 'outline-offset')).toBe('2px');
    expect(value(`${root}:focus-visible:not(${root}--pointer-focus)::before`, 'border')).toBe('3px solid var(--mtrl-sys-color-secondary)');
    expect(value(`${root}:focus-visible:not(${root}--pointer-focus)::before`, 'inset')).toBe('-5px');
  });

  test('a leading icon or checkmark opens on the fast spatial spring and fades, once the chip has changed', () => {
    const transition = value(`${root}--motion ${root}__leading-icon`, 'transition') ?? '';
    expect(transition).toMatch(/^width 425ms linear\(/);
    expect(transition).toContain('allow-discrete');
    expect(css).toMatch(/@starting-style\s*\{\s*\.mtrl-chip--motion \.mtrl-chip__leading-icon, \.mtrl-chip--motion \.mtrl-chip__checkmark\s*\{\s*width: 0;/);
  });

  test('nothing animates the first render: no transition or starting style outside --motion', () => {
    expect(value(`${root}__leading-icon`, 'transition')).toBeUndefined();
    expect(value(`${root}__action`, 'transition')).toBeUndefined();
    expect(css).not.toMatch(/@starting-style\s*\{\s*\.mtrl-chip__/);
  });
});

describe('trailing action and dragged state', () => {
  test('a filter chip\'s trailing button takes the remove button\'s place and target', () => {
    expect(value(`${root}__trailing-action`, 'width')).toBe('calc(18px + 8px)');
    expect(value(`${root}__trailing-action::before`, 'width')).toBe('48px');
  });

  test('dragged: elevation level 4 and a 0.16 layer', () => {
    expect(value(`${root}--dragged`, 'box-shadow')).toBeDefined();
    expect(value(`${root}--dragged:not(${root}--disabled)::after`, 'opacity')).toBe('0.16');
  });
});

describe('the secondary action mirrors in every artefact', () => {
  // The remove button's two start corners and the 48px target behind it: the
  // adopted sheets keep the logical pair and the target's auto inline-start
  // margin, which mirror natively; the lowered artefacts write the physical
  // pair with both mirrored forms in one aggregated arm at the root
  // (abstract/_direction.scss, scripts/build-styles.ts).
  const compileArms = (): string =>
    compileString(
      `@use 'abstract/emit' as config with ($direction-arms: true);\n@use 'components/chips';`,
      { loadPaths: ['src/styles'] },
    ).css.replace(/\/\*[\s\S]*?\*\//g, '');

  test('the adopted sheets keep the logical corners and no arm', () => {
    expect(value(`${root}__remove`, 'border-start-start-radius')).toBe('0');
    expect(value(`${root}__remove`, 'border-end-start-radius')).toBe('0');
    expect(css).not.toContain('.mtrl-rtl');
    expect(css).not.toContain('[dir=rtl]');
  });

  test('the lowered artefacts write the physical pair, both mirrored forms one arm', () => {
    const arms = compileArms();
    expect(arms).toContain('.mtrl-chip__remove, .mtrl-chip__trailing-action {');
    expect(arms).toContain('border-top-left-radius: 0;');
    expect(arms).toContain('border-bottom-left-radius: 0;');
    // One prelude, both subjects: the marker forms the runtime reflects plus
    // the attribute, the subject list bare so a mark on the chip root reaches
    // its parts. `inherit` restates the chip's radius before the end corners
    // are zeroed.
    expect(arms).toContain(
      ":where(.mtrl-rtl, :host(.mtrl-rtl), [dir=rtl]) :is(.mtrl-chip__remove, .mtrl-chip__trailing-action):not(.mtrl-ltr *) {" +
        '\n  border-radius: inherit;\n  border-top-right-radius: 0;\n  border-bottom-right-radius: 0;\n}',
    );
    // No logical corner property is left for a bundler to lower into :lang().
    expect(arms).not.toMatch(/border-(start|end)-(start|end)-radius/);
  });

  test("the target runs its 48px back from the chip's end without an arm", () => {
    // The over-constrained inset (both physical sides 0) with an auto
    // inline-start margin pushes the box to the inline end and mirrors
    // natively; a bundler lowers neither the physical inset shorthand nor a
    // margin, so the same rule serves both forms.
    for (const sheet of [css, compileArms()]) {
      expect(sheet).toContain('inset: 50% 0 auto;');
      expect(sheet).toContain('margin-inline-start: auto;');
    }
  });
});
