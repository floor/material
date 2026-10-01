// test/styles/handmade-theme-contrast.test.ts
// FLO-406: contrast must retain the hand-picked palette identities.
import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { compileString, Logger } from 'sass';
import { Hct, SchemeTonalSpot, TonalPalette, argbFromHex, hexFromArgb } from '@material/material-color-utilities';
import { HAND_THEMES, renderHandContrast, schemeFor } from '../../scripts/generate-themes';
import { colorBlocks, isDark, standardRoles } from './theme-css';

const compile = (source: string) => compileString(source, {
  loadPaths: ['src/styles/themes'], logger: Logger.silent,
}).css;
const themes = HAND_THEMES.map(name => {
  const source = readFileSync(`src/styles/themes/_${name}.scss`, 'utf8');
  const rendered = renderHandContrast(name, source);
  const css = compile(rendered);
  return { name, source, rendered, css, light: standardRoles(css, name, false) };
});
const selected = (css: string, dark: boolean, level: string) => Object.assign({},
  ...colorBlocks(css).filter(block => !block.selector.includes('@media') &&
    block.selector.includes(`[data-theme-contrast=${level}]`) && isDark(block.selector) === dark)
    .map(block => block.roles)) as Record<string, string>;

test('hand-made contrast retains secondary and tertiary hues within 15 degrees in both modes', () => {
  const failures: string[] = [];
  for (const { name, css, light } of themes) {
    for (const dark of [false, true]) for (const level of ['medium', 'high']) {
      const roles = { ...standardRoles(css, name, dark), ...selected(css, dark, level) };
      for (const role of ['secondary', 'tertiary']) {
        const before = Hct.fromInt(argbFromHex(light[role]!)).hue;
        const after = Hct.fromInt(argbFromHex(roles[role]!)).hue;
        const distance = Math.abs(before - after);
        const delta = Math.min(distance, 360 - distance);
        if (delta > 15) failures.push(`${name} ${dark ? 'dark' : 'light'} ${level} ${role}: ${delta.toFixed(2)} degrees`);
      }
    }
  }
  expect(failures).toEqual([]);
});

test('hand-made headers name their documented seed (or light primary) and both custom palette keys', () => {
  for (const { name, source, rendered, light } of themes) {
    const seed = source.match(/seed color (#[a-f\d]{6})/i)?.[1] ?? light.primary!;
    expect({ name, header: rendered.split('\n')[1]?.toLowerCase() }).toEqual({ name,
      header: `// Medium/high contrast: Tonal Spot from seed ${seed}, secondary from ${light.secondary}, tertiary from ${light.tertiary}.`.toLowerCase(),
    });
  }
});

test('documented seeds drive the actual primary and neutral contrast roles', () => {
  for (const { name, source, css, light } of themes) {
    const seed = source.match(/seed color (#[a-f\d]{6})/i)?.[1];
    if (!seed) continue;
    for (const dark of [false, true]) for (const [level, contrast] of [['medium', 0.5], ['high', 1]] as const) {
      const expected = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seed)), dark, contrast);
      const actual = { ...light, ...standardRoles(css, name, dark), ...selected(css, dark, level) };
      for (const role of ['primary', 'surface', 'surfaceVariant'] as const) {
        const token = role.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
        expect({ name, dark, level, role, value: actual[token] }).toEqual({ name, dark, level, role, value: hexFromArgb(expected[role]) });
      }
    }
  }
});

test('a custom tertiary palette works without a secondary override and leaves seed palettes alone', () => {
  const spec = { name: 'custom', description: '', seed: '#006C9C', variant: 'tonal-spot' as const, tertiary: '#ff3400', contrast: 1 };
  const custom = TonalPalette.fromInt(argbFromHex(spec.tertiary));
  for (const dark of [false, true]) {
    const actual = schemeFor(spec, dark);
    const base = new SchemeTonalSpot(Hct.fromInt(argbFromHex(spec.seed)), dark, 1);
    expect([actual.tertiaryPalette.hue, actual.tertiaryPalette.chroma]).toEqual([custom.hue, custom.chroma]);
    for (const key of ['primaryPalette', 'secondaryPalette', 'neutralPalette', 'neutralVariantPalette', 'errorPalette'] as const) {
      expect([actual[key].hue, actual[key].chroma]).toEqual([base[key].hue, base[key].chroma]);
    }
  }
});
