// test/styles/theme-contrast.test.ts
// FLO-406: audit the shipped CSS, including inherited baseline and status roles.
import { describe, expect, test } from 'bun:test';
import { compileString } from 'sass';
import { themeStyles, standaloneThemes } from '../../scripts/style-manifest';
import { renderThemes } from '../../scripts/generate-themes';
import { colorBlocks, isDark, standardRoles } from './theme-css';
import { readFileSync } from 'node:fs';

const names = [...themeStyles, ...standaloneThemes];
const levels = ['standard', 'medium', 'high'] as const;
const modes = ['light', 'dark'] as const;
const css = (name: string) => compileString(`@use 'themes/${name}';`, { loadPaths: ['src/styles'] }).css;
const baseline = css('baseline');
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
      expect(generated[path]).toContain(`create-theme-contrast("${name}", (`);
      for (const level of ['medium', 'high']) expect(generated[path]).toContain(`${level}: (`);
    }
  });
  for (const name of names) {
    const compiled = css(name);
    const source = colorBlocks(compiled);
    test(`${name}: contrast emits only differing roles and direct high values`, () => {
      const contrast = source.filter(block => block.selector.includes('data-theme-contrast'));
      expect(new Set(contrast.map(block => block.selector)).size).toBe(contrast.length);
      for (const mode of modes) {
        const base = { ...standardRoles(baseline, 'baseline', mode === 'dark'), ...standardRoles(compiled, name, mode === 'dark') };
        for (const block of contrast.filter(block => isDark(block.selector) === (mode === 'dark'))) {
          for (const [role, value] of Object.entries(block.roles)) {
            expect(['success', 'on-success', 'warning', 'on-warning', 'info', 'on-info']).not.toContain(role);
            expect(value).not.toBe(base[role]);
          }
        }
        for (const level of ['medium', 'high']) {
          const selected = contrast.filter(block => !block.selector.includes('@media') &&
            block.selector.includes(`[data-theme-contrast=${level}]`) && isDark(block.selector) === (mode === 'dark'));
          const roles = selected.flatMap(block => Object.keys(block.roles));
          expect(new Set(roles).size).toBe(roles.length);
        }
        const explicit = Object.assign({}, ...contrast.filter(block => !block.selector.includes('@media') &&
          block.selector.includes('[data-theme-contrast=high]') && isDark(block.selector) === (mode === 'dark')).map(block => block.roles));
        const automatic = Object.assign({}, ...contrast.filter(block => block.selector.includes('(prefers-contrast: more)') &&
          block.selector.includes(':not([data-theme-contrast])') && isDark(block.selector) === (mode === 'dark')).map(block => block.roles));
        expect(automatic).toEqual(explicit);
      }
      expect(compiled).not.toMatch(/--mtrl-contrast-[a-z\d-]+/i);
      for (const block of contrast) expect(block.body).not.toMatch(/var\(/);
    });
    for (const level of levels) for (const mode of modes) {
      const base = { ...standardRoles(baseline, 'baseline', mode === 'dark'), ...standardRoles(compiled, name, mode === 'dark') };
      const contrastBlocks = source.filter(b => b.selector.includes(`[data-theme-contrast=${level}]`));
      const selected = Object.assign({}, ...contrastBlocks.filter(b => isDark(b.selector) === (mode === 'dark')).map(b => b.roles));
      const roles = { ...base, ...(level === 'standard' ? {} : selected) };
      const minimum = level === 'high' ? 7 : 4.5;
      // The brief preserves standard and status colors. Keep the strict bound
      // visible as an expected failure for precisely these existing exceptions;
      // a fix makes test.failing fail too, requiring this list to be revisited.
      const preservedFailure = (fg: string) =>
        (mode === 'light' && (fg === 'on-warning' || (level === 'high' && ['on-success', 'on-info'].includes(fg)))) ||
        (name === 'legacy' && level === 'standard' && (fg === 'on-tertiary' || (mode === 'light' && fg === 'on-secondary')));
      test(`${name} ${level} ${mode}: generated block and text pairs reach ${minimum}:1`, () => {
        if (level !== 'standard' && !(name === 'highcontrast' && level === 'high')) expect(contrastBlocks.length).toBeGreaterThanOrEqual(2);
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
