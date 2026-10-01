// scripts/check-theme-contrast-browser.ts
// FLO-406: exercise the actual cascade, including both system preferences.
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
import { readFileSync } from 'node:fs';
import { themeStyles, standaloneThemes } from './style-manifest';
import { THEME_ROLES } from '../src/core/theme';
import { BASELINE_SEED, THEMES, rolesOf, schemeFor } from './generate-themes';

export async function checkThemeContrast(page: Page): Promise<void> {
  const desert = THEMES.find(theme => theme.name === 'desert')!;
  for (const mode of ['light', 'dark'] as const) {
    const dark = mode === 'dark';
    const expected = (contrast: number) => rolesOf(schemeFor({ ...desert, contrast }, dark)).primary;
    for (const preference of ['no-preference', 'more'] as const) {
      await page.emulateMedia({ contrast: preference, colorScheme: mode });
      for (const level of ['high', 'medium', 'standard', null] as const) {
        const actual = await page.evaluate(({ mode, level }) => {
          const root = document.documentElement;
          root.dataset.theme = 'desert'; root.dataset.themeMode = mode;
          if (level === null) delete root.dataset.themeContrast;
          else root.dataset.themeContrast = level;
          return getComputedStyle(root).getPropertyValue('--mtrl-sys-color-primary').trim();
        }, { mode, level });
        const contrast = level === 'high' || (level === null && preference === 'more') ? 1 : level === 'medium' ? 0.5 : 0;
        assert.equal(actual, expected(contrast), `desert ${mode}, ${level}, prefers-contrast ${preference}`);
      }
    }
    await page.emulateMedia({ contrast: 'more', colorScheme: mode });
    const actual = await page.evaluate(() => {
      const root = document.documentElement;
      delete root.dataset.theme; delete root.dataset.themeMode; delete root.dataset.themeContrast;
      return getComputedStyle(root).getPropertyValue('--mtrl-sys-color-primary').trim();
    });
    assert.equal(actual, rolesOf(schemeFor({ name: 'baseline', description: '', seed: BASELINE_SEED, variant: 'tonal-spot', contrast: 1 }, dark)).primary,
      `default baseline follows ${mode} and prefers-contrast more`);
  }
  // Exercise every role: sparse light deltas must never bleed into dark, and
  // custom-property preference switches must reset across theme boundaries.
  const extras = await page.addStyleTag({ content: standaloneThemes.map(name =>
    readFileSync(`dist/themes/${name}.css`, 'utf8')).join('\n') });
  for (const name of [...themeStyles, ...standaloneThemes]) {
    const spec = THEMES.find(theme => theme.name === name) ?? {
      name, description: '', variant: 'tonal-spot' as const,
      seed: readFileSync(`src/styles/themes/_${name}.scss`, 'utf8')
        .match(/light primary seed (#[a-f\d]{6})/i)![1],
    };
    for (const mode of ['light', 'dark'] as const) {
      const snapshot = async (level: string | null, nested = false) => page.evaluate(({ name, mode, level, nested }) => {
        const root = document.documentElement;
        const target = nested ? document.createElement('section') : root;
        if (nested) { root.dataset.theme = 'desert'; root.dataset.themeContrast = 'high'; document.body.append(target); }
        target.dataset.theme = name; target.dataset.themeMode = mode;
        if (level === null) delete target.dataset.themeContrast;
        else target.dataset.themeContrast = level;
        const style = getComputedStyle(target);
        const values = Object.fromEntries([...style].filter(key => key.startsWith('--mtrl-sys-color-'))
          .map(key => [key.slice('--mtrl-sys-color-'.length), style.getPropertyValue(key).trim()]));
        if (nested) target.remove();
        return values;
      }, { name, mode, level, nested });
      await page.emulateMedia({ contrast: 'no-preference', colorScheme: mode });
      const standard = await snapshot('standard');
      const nestedStandard = await snapshot('standard', true);
      for (const preference of ['no-preference', 'more'] as const) {
        await page.emulateMedia({ contrast: preference, colorScheme: mode });
        for (const level of ['standard', 'medium', 'high', null] as const) {
          const contrast = level === 'high' || (level === null && preference === 'more') ? 1 : level === 'medium' ? 0.5 : null;
          const expected = contrast === null ? standard : { ...standard, ...rolesOf(schemeFor({ ...spec, contrast }, mode === 'dark')) };
          for (const nested of [false, true]) {
            const actual = await snapshot(level, nested);
            for (const role of [...THEME_ROLES, 'success', 'on-success', 'warning', 'on-warning', 'info', 'on-info']) {
              const value = nested && expected[role]?.toLowerCase() === standard[role]?.toLowerCase()
                ? nestedStandard[role] : expected[role];
              assert.equal(actual[role]?.toLowerCase(), value?.toLowerCase(),
                `${name} ${mode} ${level} prefers ${preference}, nested ${nested}: ${role}`);
            }
          }
        }
      }
    }
  }
  await extras.evaluate(element => element.parentNode?.removeChild(element));
  await page.evaluate(() => {
    const root = document.documentElement;
    delete root.dataset.theme; delete root.dataset.themeMode; delete root.dataset.themeContrast;
  });
  await page.emulateMedia({ contrast: 'no-preference', colorScheme: 'light' });
  console.log('Theme contrast: explicit standard/medium/high and system preference pass in light and dark');
}
