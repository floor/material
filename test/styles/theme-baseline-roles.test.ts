// Baseline, the default theme, declared no success, warning or info roles
// (nor their on- pairs), though every generated theme has them from
// status-colors-light() and status-colors-dark(). The badge reads them, so
// createBadge({ color: 'success' }) had no background under the default theme.
// The test also found surface-variant, read by the filled card and declared by
// no theme; it is a theme role now.
// Every colour role a shipped stylesheet reads must be declared by baseline, in
// each block that sets its colours: the :root default, the prefers-color-scheme
// dark block, .dark-theme, and the selectable [data-theme=baseline] light and dark.
import { describe, expect, test } from 'bun:test';
import { compileString } from 'sass';
import { colorBlocks, resolvedColorBody } from './theme-css';
import { baseStyles, componentStyles, utilityStyles } from '../../scripts/style-manifest';

const options = { loadPaths: ['src/styles'] };

/** Every --mtrl-sys-color-* role read with var() by the component, base and utility stylesheets */
const readers = [
  ...Object.values(componentStyles).map(entry => entry.source),
  ...baseStyles.filter(source => source !== 'themes/baseline'),
  ...utilityStyles,
];
const reads = new Map<string, Set<string>>();
for (const source of readers) {
  const css = compileString(`@use "${source}";`, options).css;
  for (const [, role] of css.matchAll(/var\(\s*--mtrl-sys-color-([a-z0-9-]+)/g)) {
    if (!reads.has(role!)) reads.set(role!, new Set());
    reads.get(role!)!.add(source);
  }
}

/** Baseline's colour blocks, by selector, from the compiled base stylesheet (dist/styles/base.css) */
const blocks = (css: string): Map<string, string> => {
  const found = new Map<string, string>();
  // The dark :root sits inside @media: keep the at-rule in the key
  const media = /@media[^{]*\{\s*([^{}]*)\{([^{}]*)\}\s*\}/g;
  for (const [whole, selector, body] of css.matchAll(media)) {
    if (body!.includes('--mtrl-sys-color-primary:')) found.set(`${whole.slice(0, whole.indexOf('{')).trim()} ${selector!.trim()}`, body!);
  }
  const rest = css.replace(media, '');
  for (const [, selector, body] of rest.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    if (body!.includes('--mtrl-sys-color-primary:')) found.set(selector!.trim(), body!);
  }
  return found;
};

describe('baseline declares every colour role the stylesheets read', () => {
  test('the stylesheets were read, the status roles among them', () => {
    expect(reads.size).toBeGreaterThan(30);
    // surface-variant: the filled card's disabled container (Compose's FilledCardTokens)
    for (const role of ['success', 'on-success', 'warning', 'on-warning', 'info', 'on-info', 'surface-variant']) expect(reads.has(role)).toBe(true);
  });


  for (const [name, css] of [
    ['base.css', compileString(baseStyles.map((source, i) => `@use "${source}" as entry${i};`).join('\n'), options).css],
    ['themes/baseline.css', compileString('@use "themes/baseline";', options).css],
  ] as const) {
    const found = blocks(css);

    test(`${name}: light and dark blocks were found`, () => {
      const selectors = [...found.keys()];
      expect(selectors).toContain(':root');
      expect(selectors).toContain('.dark-theme');
      expect(selectors.some(selector => /prefers-color-scheme:\s*dark/.test(selector))).toBe(true);
      expect(selectors.some(selector => selector.includes('[data-theme=baseline]') && !selector.includes('dark'))).toBe(true);
      expect(selectors.some(selector => selector.includes('[data-theme=baseline]') && selector.includes('[data-theme-mode=dark]'))).toBe(true);
    });

    for (const [selector, body] of found) {
      test(`${name} ${selector}: declares every role read`, () => {
        const missing = [...reads].filter(([role]) => !resolvedColorBody(css, 'baseline', selector, colorBlocks(css).find(block => block.selector === selector)?.body ?? body).includes(`--mtrl-sys-color-${role}:`))
          .map(([role, sources]) => `${role} (${[...sources].join(', ')})`);
        expect(missing).toEqual([]);
      });
    }
  }
});
