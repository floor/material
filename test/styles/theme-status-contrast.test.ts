// FLO-407. Success, warning and info are one fixed pair per mode, shared by every
// theme (status-roles-light / status-roles-dark). on-warning on warning was 3.35:1
// in every light theme. Each pair has to reach 4.5:1 in light and dark. These are
// the standard-contrast values: the high-contrast theme uses them too, and a 7:1
// status pair is a later change.
import { describe, expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import { compileString } from 'sass';

const themes = readdirSync('src/styles/themes')
  .filter(file => /^_[a-z0-9-]+\.scss$/.test(file) && !['_index.scss', '_base-theme.scss'].includes(file))
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

const PAIRS = ['success', 'warning', 'info'] as const;

describe('theme status contrast', () => {
  test('the themes were found', () => {
    expect(themes).toContain('baseline');
    expect(themes).toContain('fruit-salad');
    expect(themes).toContain('highcontrast');
    expect(themes.length).toBeGreaterThan(10);
  });

  for (const theme of themes) {
    test(`${theme}: status text reaches 4.5:1 in light and dark`, () => {
      const css = compileString(`@use 'themes/${theme}';`, { loadPaths: ['src/styles'] }).css;
      const blocks = Array.from(css.matchAll(/\{([^{}]*)\}/g)).map(([, body]) => body!)
        .filter(body => body.includes('--mtrl-sys-color-primary:'));
      expect(blocks.length).toBeGreaterThan(1);
      for (const body of blocks) {
        // The last declaration wins, which is the value the cascade computes.
        const role = (name: string) => [...body.matchAll(new RegExp(`--mtrl-sys-color-${name}:\\s*(#[0-9a-fA-F]{3,8})`, 'g'))].at(-1)?.[1];
        for (const pair of PAIRS) {
          const background = role(pair);
          const foreground = role(`on-${pair}`);
          expect(background).toBeTruthy();
          expect(foreground).toBeTruthy();
          const ratio = contrast(full(foreground!), full(background!));
          expect({ theme, pair: `on-${pair}/${pair}`, passes: ratio >= 4.5, ratio }).toEqual({
            theme, pair: `on-${pair}/${pair}`, passes: true, ratio,
          });
        }
      }
    });
  }
});
