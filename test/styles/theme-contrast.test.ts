// test/styles/theme-contrast.test.ts
// FLO-406: audit the shipped CSS, including inherited baseline and status roles.
import { describe, expect, test } from 'bun:test';
import { compileString } from 'sass';
import { themeStyles, standaloneThemes } from '../../scripts/style-manifest';
import { renderThemes } from '../../scripts/generate-themes';
import { readFileSync } from 'node:fs';

const names = [...themeStyles, ...standaloneThemes];
const levels = ['standard', 'medium', 'high'] as const;
const modes = ['light', 'dark'] as const;
const read = (body: string): Record<string, string> => Object.fromEntries(
  [...body.matchAll(/--mtrl-sys-color-([a-z-]+):\s*(#[a-f\d]{3,6})\b/gi)]
    .map(([, role, hex]) => [role!, hex!.length === 4 ? '#' + [...hex!.slice(1)].map(c => c + c).join('') : hex!]),
);
const css = (name: string) => compileString(`@use 'themes/${name}';`, { loadPaths: ['src/styles'] }).css;
const blocks = (source: string) => [...source.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .map(([, selector, body]) => ({ selector: selector!.trim(), roles: read(body!) }));
const baseline = blocks(css('baseline'));
const standard = (source: ReturnType<typeof blocks>, mode: typeof modes[number], name: string) => {
  const light = source.find(b => b.selector === `[data-theme=${name}]` || (name === 'baseline' && b.selector === ':root'))!;
  const dark = source.find(b => b.selector === `[data-theme=${name}][data-theme-mode=dark]` || (name === 'baseline' && b.selector === '.dark-theme'))!;
  return { ...light.roles, ...(mode === 'dark' ? dark.roles : {}) };
};
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((a, b) => b - a);
  return (hi! + 0.05) / (lo! + 0.05);
};
const pairs = [
  ...['primary', 'secondary', 'tertiary', 'error', 'success', 'warning', 'info'].flatMap(role =>
    [[`on-${role}`, role], ...(['success', 'warning', 'info'].includes(role) ? [] : [[`on-${role}-container`, `${role}-container`]])]),
  ...['primary', 'secondary', 'tertiary'].flatMap(role =>
    [`on-${role}-fixed`, `on-${role}-fixed-variant`].flatMap(fg => [`${role}-fixed`, `${role}-fixed-dim`].map(bg => [fg, bg]))),
  ...['surface', 'surface-dim', 'surface-bright', 'surface-container-lowest', 'surface-container-low', 'surface-container', 'surface-container-high', 'surface-container-highest'].flatMap(bg => [['on-surface', bg], ['on-surface-variant', bg]]),
  ['on-surface-variant', 'surface-variant'], ['inverse-on-surface', 'inverse-surface'], ['inverse-primary', 'inverse-surface'],
];

describe('every theme contrast level', () => {
  test('regeneration covers all shipped themes and their contrast blocks', () => {
    const generated = renderThemes();
    expect(Object.keys(generated)).toHaveLength(names.length);
    for (const name of names) {
      const path = `src/styles/themes/_${name}.scss`;
      expect(generated[path]).toBe(readFileSync(path, 'utf8'));
      for (const level of ['medium', 'high']) expect(generated[path]).toContain(`create-theme-contrast("${name}", "${level}")`);
    }
  });
  for (const name of names) {
    const source = blocks(css(name));
    for (const level of levels) for (const mode of modes) {
      const base = { ...standard(baseline, mode, 'baseline'), ...standard(source, mode, name) };
      const contrastBlocks = source.filter(b => b.selector.includes(`[data-theme-contrast=${level}]`));
      const selected = contrastBlocks.find(b => b.selector.includes('[data-theme-mode=dark]') === (mode === 'dark'));
      const roles = { ...base, ...(level === 'standard' ? {} : selected?.roles) };
      const minimum = level === 'high' ? 7 : 4.5;
      // The brief preserves standard and status colors. Keep the strict bound
      // visible as an expected failure for precisely these existing exceptions;
      // a fix makes test.failing fail too, requiring this list to be revisited.
      const preservedFailure = (fg: string) =>
        (mode === 'light' && (fg === 'on-warning' || (level === 'high' && ['on-success', 'on-info'].includes(fg)))) ||
        (name === 'legacy' && level === 'standard' && (fg === 'on-tertiary' || (mode === 'light' && fg === 'on-secondary')));
      test(`${name} ${level} ${mode}: generated block and text pairs reach ${minimum}:1`, () => {
        if (level !== 'standard') expect(contrastBlocks.length).toBeGreaterThanOrEqual(2);
        const failures = pairs.flatMap(([fg, bg]) => {
          expect(roles[fg!]).toBeDefined(); expect(roles[bg!]).toBeDefined();
          const value = ratio(roles[fg!]!, roles[bg!]!);
          return !preservedFailure(fg!) && value < minimum ? [`${fg}/${bg}: ${value.toFixed(4)}`] : [];
        });
        expect(failures).toEqual([]);
      });
      for (const [fg, bg] of pairs.filter(([fg]) => preservedFailure(fg!))) {
        test.failing(`${name} ${level} ${mode}: preserved ${fg}/${bg} below ${minimum}:1`, () => {
          expect(ratio(roles[fg!]!, roles[bg!]!)).toBeGreaterThanOrEqual(minimum);
        });
      }
    }
  }
});
