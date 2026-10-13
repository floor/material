// The ripple is the press. Compose draws one pressed indication, the ripple at
// 0.10; mtrl drew the wave at the hover opacity on top of a static 0.10 :active layer,
// about 0.18 in all. The wave now draws at the pressed opacity, and a component with a
// ripple leaves its static pressed layer to it; one without a ripple keeps it.
import { describe, expect, test } from 'bun:test';
import { Logger, compileString } from 'sass';

const compile = (source: string) =>
  compileString(source, { loadPaths: ['src/styles'], logger: Logger.silent }).css.replace(/\/\*[\s\S]*?\*\//g, '');
const rules = (css: string) =>
  Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g)).map(([, selectors, declarations]) => ({ selectors: selectors.trim(), declarations }));
// Each selector of a rule, split on the commas outside :not()/:has()/:is().
const selectorsOf = (list: string) => {
  const out: string[] = []; let depth = 0, start = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i] === '(') depth++;
    else if (list[i] === ')') depth--;
    else if (list[i] === ',' && depth === 0) { out.push(list.slice(start, i).trim()); start = i + 1; }
  }
  return [...out, list.slice(start).trim()];
};
// A rule paints the press if it sets a 0.10 opacity or a colour mixed at 10%.
const paintsPress = (declarations: string) => /opacity:\s*0?\.1\s*(;|$)|background-color:[^;]*\b10%/.test(declarations);
const guarded = (selector: string) => /:not\(:has\(> [^)]*\.mtrl-ripple\)\)/.test(selector);

describe('the ripple is the press', () => {
  test('the wave draws at the pressed opacity, not the hover one', () => {
    const css = compile("@use 'utilities/ripple';");
    const wave = rules(css).find(rule => rule.selectors === '.mtrl-ripple-wave.active');
    expect(wave?.declarations).toMatch(/opacity:\s*0\.1\s*;/);
  });

  // Every component that mounts a ripple (button, icon button, FAB, extended FAB, card,
  // snackbar action, tab, drawer item, chip action).
  for (const component of ['button', 'icon-button', 'fab', 'extended-fab', 'card', 'snackbar', 'tabs', 'drawer', 'chips']) {
    test(`${component}: a rippled element paints no static pressed layer`, () => {
      const pressed = rules(compile(`@use 'components/${component}';`))
        .flatMap(rule => paintsPress(rule.declarations) ? selectorsOf(rule.selectors) : [])
        .filter(selector => selector.includes(':active'));
      expect(pressed.length).toBeGreaterThan(0);
      expect(pressed.filter(selector => !guarded(selector))).toEqual([]);
    });
  }

  test('a chip keeps the layer for a press on its remove or trailing button, which have no ripple', () => {
    const css = compile("@use 'components/chips';");
    expect(css).toMatch(/\.mtrl-chip:active:not\(\.mtrl-chip--disabled\):not\(:has\(> \.mtrl-chip__action:active > \.mtrl-ripple\)\)::after\s*\{\s*opacity:\s*0\.1/);
  });

  test('the state-layer mixin keeps the pressed layer without a ripple, and leaves hover and focus alone', () => {
    const css = compile(`@use 'abstract/mixins' as m;
      .probe-pressed { @include m.state-layer(red, 'pressed'); }
      .probe-hover { @include m.state-layer(red, 'hover'); }
      .probe-focus { @include m.state-layer(red, 'focus'); }`);
    expect(css).toMatch(/\.probe-pressed:not\(:has\(> \.mtrl-ripple\)\)::before\s*\{[^}]*opacity:\s*0\.1/);
    expect(css).toMatch(/\.probe-hover::before\s*\{[^}]*opacity:\s*0\.08/);
    expect(css).toMatch(/\.probe-focus::before\s*\{[^}]*opacity:\s*0\.1/);
  });

  test('the tab\'s programmatic pressed class still paints', () => {
    const selectors = rules(compile("@use 'components/tabs';"))
      .flatMap(rule => paintsPress(rule.declarations) ? selectorsOf(rule.selectors) : []);
    expect(selectors.some(selector => /--pressed$/.test(selector) && !guarded(selector))).toBe(true);
  });
});
