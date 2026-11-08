// Success, warning and info are harmonised toward each theme's primary colour
// (Blend.harmonize, capped at 15° HCT hue shift) and resolved at standard,
// medium and high contrast. Every pair must reach 4.5:1 at standard and medium
// contrast, and 7:1 at high contrast ([data-theme="highcontrast"],
// [data-theme="<name>"][data-theme-contrast="high"], and
// @media (prefers-contrast: more)), while warning stays inside the 36.5–66.4°
// orange HCT hue band across all 20 themes and contrast levels.
import { describe, expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import { compileString } from 'sass';
import { Hct, argbFromHex } from '@material/material-color-utilities';
import { colorBlocks, isDark, standardRoles } from './theme-css';

const themes = readdirSync('src/styles/themes')
  .filter(file => /^_[a-z0-9-]+\.scss$/.test(file) && !['_index.scss', '_base-theme.scss'].includes(file))
  .map(file => file.slice(1, -5));

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
// Sass may shorten a hex (#fff); expand it for the arithmetic.
const full = (hex: string) => (hex.length === 4 ? `#${[...hex.slice(1)].map(c => c + c).join('')}` : hex);

const PAIRS = ['success', 'warning', 'info'] as const;
const LEVELS = ['standard', 'medium', 'high'] as const;
const MODES = ['light', 'dark'] as const;

// [data-theme=<name>] and its dark form. Baseline also paints :root (light and
// the OS dark scheme) and .dark-theme. Contrast rules add data-theme-contrast
// or prefers-contrast, so they are not these selectors.
const standardSelectors = (theme: string) => [
  `[data-theme=${theme}]`,
  `[data-theme=${theme}][data-theme-mode=dark]`,
  ...(theme === 'baseline' ? [':where(:root)', '@media (prefers-color-scheme: dark) :where(:root)', ':where(.dark-theme)'] : []),
];

const compileTheme = (name: string) => compileString(`@use 'themes/${name}';`, { loadPaths: ['src/styles'] }).css;
const baselineCss = compileTheme('baseline');

describe('theme status contrast', () => {
  test('the themes were found', () => {
    expect(themes).toContain('baseline');
    expect(themes).toContain('fruit-salad');
    expect(themes).toContain('highcontrast');
    expect(themes).toHaveLength(20);
  });

  for (const theme of themes) {
    const css = compileTheme(theme);
    const blocks = colorBlocks(css);

    test(`${theme}: standard selectors reach ${theme === 'highcontrast' ? 7 : 4.5}:1 in light and dark`, () => {
      const minimum = theme === 'highcontrast' ? 7 : 4.5;
      for (const selector of standardSelectors(theme)) {
        const found = blocks.find(block => block.selector === selector);
        expect({ theme, selector, found: Boolean(found) }).toEqual({ theme, selector, found: true });
        const body = found?.body ?? '';
        const role = (name: string) => [...body.matchAll(new RegExp(`--mtrl-sys-color-${name}:\\s*(#[0-9a-fA-F]{3,8})`, 'g'))].at(-1)?.[1];
        for (const pair of PAIRS) {
          const background = role(pair);
          const foreground = role(`on-${pair}`);
          expect(background).toBeTruthy();
          expect(foreground).toBeTruthy();
          const ratio = contrast(full(foreground!), full(background!));
          expect({ theme, selector, pair: `on-${pair}/${pair}`, passes: ratio >= minimum }).toEqual({
            theme, selector, pair: `on-${pair}/${pair}`, passes: true,
          });
        }
      }
    });

    for (const level of LEVELS) {
      for (const mode of MODES) {
        const dark = mode === 'dark';
        const minimum = level === 'high' || (theme === 'highcontrast' && level === 'standard') ? 7 : 4.5;
        const base = { ...standardRoles(baselineCss, 'baseline', dark), ...standardRoles(css, theme, dark) };
        const selected = Object.assign(
          {},
          ...blocks
            .filter(b => !b.selector.includes('@media') && b.selector.includes(`[data-theme-contrast=${level}]`) && isDark(b.selector) === dark)
            .map(b => b.roles),
        );
        const roles = { ...base, ...(level === 'standard' ? {} : selected) };

        test(`${theme} ${level} ${mode}: status pairs reach ${minimum}:1`, () => {
          const failures = PAIRS.flatMap(pair => {
            const bg = roles[pair];
            const fg = roles[`on-${pair}`];
            expect(bg).toBeDefined();
            expect(fg).toBeDefined();
            const ratio = contrast(full(fg!), full(bg!));
            return ratio < minimum ? [`on-${pair}/${pair}: ${ratio.toFixed(4)}`] : [];
          });
          expect(failures).toEqual([]);
        });

        if (!dark || (level === 'standard' && theme !== 'highcontrast')) {
          test(`${theme} ${level} ${mode}: warning hue stays inside 36.5–66.4°`, () => {
            const warningHex = full(roles.warning!);
            const hue = Hct.fromInt(argbFromHex(warningHex)).hue;
            expect(hue).toBeGreaterThanOrEqual(36.5);
            expect(hue).toBeLessThanOrEqual(66.4);
          });
        }
      }
    }

    for (const mode of MODES) {
      const dark = mode === 'dark';
      const base = { ...standardRoles(baselineCss, 'baseline', dark), ...standardRoles(css, theme, dark) };
      const automatic = Object.assign(
        {},
        ...blocks
          .filter(b => b.selector.includes('(prefers-contrast: more)') && b.selector.includes(':not([data-theme-contrast])') && isDark(b.selector) === dark)
          .map(b => b.roles),
      );
      const roles = { ...base, ...automatic };

      test(`${theme} prefers-contrast: more ${mode}: status pairs reach 7:1`, () => {
        const failures = PAIRS.flatMap(pair => {
          const bg = roles[pair];
          const fg = roles[`on-${pair}`];
          expect(bg).toBeDefined();
          expect(fg).toBeDefined();
          const ratio = contrast(full(fg!), full(bg!));
          return ratio < 7 ? [`on-${pair}/${pair}: ${ratio.toFixed(4)}`] : [];
        });
        expect(failures).toEqual([]);
      });
    }
  }
});
