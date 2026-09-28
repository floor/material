// Every block of a theme that sets its colours sets the whole error family. Baseline,
// the default theme, wrote error and on-error by hand and never error-container or
// on-error-container, so anything on those roles fell back: an error slider lost its
// inactive track and drew its ticks and inset icon in the inherited text colour.
import { describe, expect, test } from 'bun:test';
import { readdirSync } from 'node:fs';
import { compileString } from 'sass';

const themes = readdirSync('src/styles/themes')
  .filter(file => /^_[a-z]+\.scss$/.test(file) && !['_index.scss', '_base-theme.scss'].includes(file))
  .map(file => file.slice(1, -5));
const roles = ['error', 'on-error', 'error-container', 'on-error-container'];

describe('theme error roles', () => {
  test('the themes were found', () => {
    expect(themes).toContain('baseline');
    expect(themes.length).toBeGreaterThan(10);
  });

  for (const theme of themes) {
    test(`${theme}: every colour block defines the error roles`, () => {
      const css = compileString(`@use 'themes/${theme}';`, { loadPaths: ['src/styles'] }).css;
      const blocks = Array.from(css.matchAll(/\{([^{}]*)\}/g)).map(([, body]) => body!)
        .filter(body => body.includes('--mtrl-sys-color-primary:'));
      expect(blocks.length).toBeGreaterThan(1); // light and dark at least
      for (const body of blocks) {
        for (const role of roles) expect(body).toContain(`--mtrl-sys-color-${role}:`);
      }
    });
  }
});
