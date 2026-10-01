// scripts/check-theme-contrast-browser.ts
// FLO-406: exercise the actual cascade, including both system preferences.
import assert from 'node:assert/strict';
import type { Page } from 'playwright';
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
  await page.evaluate(() => {
    const root = document.documentElement;
    delete root.dataset.theme; delete root.dataset.themeMode; delete root.dataset.themeContrast;
  });
  await page.emulateMedia({ contrast: 'no-preference', colorScheme: 'light' });
  console.log('Theme contrast: explicit standard/medium/high and system preference pass in light and dark');
}
