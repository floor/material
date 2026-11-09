import { beforeAll, describe, expect, test } from 'bun:test';
import { compileString } from 'sass';
import { corner } from '../utils/corner';
import {
  ICON_BUTTON_CONTAINER_SIZES, ICON_BUTTON_ICON_SIZES,
  ICON_BUTTON_WIDTH_VALUES, ICON_BUTTON_CORNER_RADIUS,
} from '../../src/components/icon-button/constants';

// Compose XSmall/Small/Medium/Large/XLargeIconButtonTokens.kt.
const sizes = [
  { size: 'xs', container: 32, icon: 20, widths: [28, 32, 40], outline: 1, square: 12, pressed: 8 },
  { size: 's', container: 40, icon: 24, widths: [32, 40, 52], outline: 1, square: 12, pressed: 8 },
  { size: 'm', container: 56, icon: 24, widths: [48, 56, 72], outline: 1, square: 16, pressed: 12 },
  { size: 'l', container: 96, icon: 32, widths: [64, 96, 128], outline: 2, square: 28, pressed: 16 },
  { size: 'xl', container: 136, icon: 40, widths: [104, 136, 184], outline: 3, square: 28, pressed: 16 },
] as const;
const root = '.mtrl-icon-button';
let css: string;
const value = (selector: string, property: string) =>
  Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter(([, selectors]) => selectors.split(',').some(s => s.trim() === selector))
    .flatMap(([, , declarations]) => Array.from(declarations.matchAll(/([\w-]+):\s*([^;]+);/g)))
    .filter(([, name]) => name === property)
    .map(([, , result]) => result.replace(/\s+/g, ' ').trim()).pop();

beforeAll(() => {
  css = compileString("@use 'components/icon-button';", { loadPaths: ['src/styles'] }).css.replace(/\/\*[\s\S]*?\*\//g, '');
});

describe('icon button geometry tokens', () => {
  for (const row of sizes) {
    const sizeSelector = row.size === 's' ? root : `${root}--${row.size}`;
    const suffix = row.size === 's' ? '' : `${root}--${row.size}`;
    const key = row.size.toUpperCase() as keyof typeof ICON_BUTTON_CONTAINER_SIZES;
    for (const shape of ['round', 'square']) {
      for (const [index, width] of ['narrow', 'default', 'wide'].entries()) {
        test(`${row.size} ${shape} ${width}: container, icon and outline dimensions`, () => {
          const widthSelector = width === 'default' ? sizeSelector : `${root}--${width}${suffix}`;
          // The default width is the container's, floored at the 32dp target;
          // a narrow or wide width never goes under the target either, and is
          // never widened by it.
          expect(value(widthSelector, 'width')).toBe(width === 'default'
            ? `max(32px, ${row.widths[index]}px + 4px * var(--mtrl-density, 0))`
            : `max(min(${row.widths[index]}px, 32px), ${row.widths[index]}px + 4px * var(--mtrl-density, 0))`);
          expect(value(sizeSelector, 'height')).toBe(`max(32px, ${row.container}px + 4px * var(--mtrl-density, 0))`);
          for (const iconSelector of ['.mtrl-icon', `${root}__icon`]) {
            expect(value(`${sizeSelector} ${iconSelector}`, 'width')).toBe(`${row.icon}px`);
            expect(value(`${sizeSelector} ${iconSelector}`, 'height')).toBe(`${row.icon}px`);
          }
          expect(value(`${root}--outlined${root}--${row.size}`, 'border-width')).toBe(`${row.outline}px`);
          // Shapes change only radii, preserving the shared size and width rules.
          // Round is half the container height, a real radius so the press morph animates;
          // it steps half as far as the height (2dp), so it stays half of it.
          const shapeSelector = `${root}--${shape}${suffix}`;
          expect(value(shapeSelector, 'border-radius')).toBe(`var(--mtrl-button-shape, ${shape === 'round' ? `max(16px, ${row.container / 2}px + 2px * var(--mtrl-density, 0))` : corner(row.square)})`);
          expect(value(shapeSelector, 'width')).toBeUndefined();
          expect(value(shapeSelector, 'height')).toBeUndefined();
        });
      }
      test(`${row.size} ${shape}: pressed and selected shape tokens remain unchanged`, () => {
        // A round button reads the icon button's own override between the
        // explicit --mtrl-button-shape-* and the radius: a toolbar pins it to
        // keep the item round, so only the outer two stand alone.
        const middle = (name: string, radius: string) =>
          shape === 'round' ? `var(--mtrl-icon-button-shape-${name}, ${radius})` : radius;
        expect(value(`${root}:active${root}--${shape}${suffix}`, 'border-radius')).toBe(`var(--mtrl-button-shape-pressed, ${middle('pressed', corner(row.pressed))})`);
        const selectedSelector = `${root}--selected${root}--${shape}:not(:active)${suffix}`;
        expect(value(selectedSelector, 'border-radius')).toBe(`var(--mtrl-button-shape-selected, ${middle('selected', shape === 'round' ? corner(row.square) : `max(16px, ${row.container / 2}px + 2px * var(--mtrl-density, 0))`)})`);
      });
    }
    test(`${row.size}: public constants match the token dimensions`, () => {
      expect(ICON_BUTTON_CONTAINER_SIZES[key]).toBe(row.container);
      expect(ICON_BUTTON_ICON_SIZES[key]).toBe(row.icon);
      expect(ICON_BUTTON_WIDTH_VALUES[key] as Record<string, number>).toEqual({ narrow: row.widths[0], default: row.widths[1], wide: row.widths[2] });
      expect(ICON_BUTTON_CORNER_RADIUS[key] as Record<string, number>).toEqual({ square: row.square, pressed: row.pressed });
    });
  }

  test('every size keeps a centered 48dp pseudo-element target', () => {
    // One rule on the base covers every size: the overlay reaches outside a
    // container the scale has taken under 48dp.
    const selector = `${root}::after`;
    expect(value(selector, 'content')).toBe('""');
    expect(value(selector, 'position')).toBe('absolute');
    expect(value(selector, 'width')).toBe('48px');
    expect(value(selector, 'height')).toBe('48px');
    expect(value(selector, 'top')).toBe('50%');
    expect(value(selector, 'left')).toBe('50%');
    expect(value(selector, 'transform')).toBe('translate(-50%, -50%)');
  });
});
