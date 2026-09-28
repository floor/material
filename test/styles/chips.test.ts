// FLO-256: the chip's 48dp targets, keyboard-only focus layer, remove icon geometry,
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
    expect(css).toMatch(/\.mtrl-chip:is\(:has\(:focus-visible\), :focus-visible\):not\(\.mtrl-chip--disabled\)::after \{\s*opacity: 0\.1;/);
  });

  test('the focus ring is md.comp.focus-ring: 3px at a 2px offset, on buttons and on a focused cell (FLO-261)', () => {
    expect(value(`${root}__action:focus-visible`, 'outline')).toBe('3px solid var(--mtrl-sys-color-secondary)');
    expect(value(`${root}__action:focus-visible`, 'outline-offset')).toBe('2px');
    expect(value(`${root}:focus-visible::before`, 'border')).toBe('3px solid var(--mtrl-sys-color-secondary)');
    expect(value(`${root}:focus-visible::before`, 'inset')).toBe('-5px');
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

describe('trailing action and dragged state (FLO-259)', () => {
  test('a filter chip\'s trailing button takes the remove button\'s place and target', () => {
    expect(value(`${root}__trailing-action`, 'width')).toBe('calc(18px + 8px)');
    expect(value(`${root}__trailing-action::before`, 'width')).toBe('48px');
  });

  test('dragged: elevation level 4 and a 0.16 layer', () => {
    expect(value(`${root}--dragged`, 'box-shadow')).toBeDefined();
    expect(value(`${root}--dragged:not(${root}--disabled)::after`, 'opacity')).toBe('0.16');
  });
});
