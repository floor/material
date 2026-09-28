// FLO-254. The inverse roles (the snackbar, the tooltip, the slider's value
// indicator) were defined for baseline only, so every other theme showed baseline's
// purple-grey there. Every colour block of every theme now defines them, and they
// hold the contrast they carry text at: inverse-on-surface on inverse-surface for
// text (4.5:1), inverse-primary on it for the snackbar's action (3:1).
import { describe, expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import { compileString } from 'sass';

const themes = readdirSync('src/styles/themes')
  .filter(file => /^_[a-z]+\.scss$/.test(file) && !['_index.scss', '_base-theme.scss'].includes(file))
  .map(file => file.slice(1, -5));

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
// Sass may shorten a hex (#fff); expand it for the arithmetic.
const full = (hex: string) => (hex.length === 4 ? `#${[...hex.slice(1)].map(c => c + c).join('')}` : hex);

describe('theme inverse roles', () => {
  for (const theme of themes) {
    test(`${theme}: every colour block defines the inverse roles, at text contrast`, () => {
      const css = compileString(`@use 'themes/${theme}';`, { loadPaths: ['src/styles'] }).css;
      const blocks = Array.from(css.matchAll(/\{([^{}]*)\}/g)).map(([, body]) => body!)
        .filter(body => body.includes('--mtrl-sys-color-primary:'));
      expect(blocks.length).toBeGreaterThan(1);
      for (const body of blocks) {
        const role = (name: string) => body.match(new RegExp(`--mtrl-sys-color-${name}:\\s*(#[0-9a-fA-F]{3,6})\\b`))?.[1];
        const surface = role('inverse-surface'), onSurface = role('inverse-on-surface'), primary = role('inverse-primary');
        expect([surface, onSurface, primary].every(Boolean)).toBe(true);
        expect(contrast(full(surface!), full(onSurface!))).toBeGreaterThanOrEqual(4.5);
        expect(contrast(full(surface!), full(primary!))).toBeGreaterThanOrEqual(3);
      }
    });
  }
});
