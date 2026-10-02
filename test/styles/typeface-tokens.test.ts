// FLO-330. The typeface was compiled into every component, so a theme could change
// only colours. m.typography now reads the role's face, M3's reference token
// (display, headline and title the brand face, body and label the plain one), with
// the compiled family as the fallback; base.css declares both faces.
import { describe, expect, test } from 'bun:test';
import { compileString } from 'sass';

const compile = (source: string): string =>
  compileString(source, { loadPaths: ['src/styles'] }).css.replace(/\/\*[\s\S]*?\*\//g, '');
const families = (css: string): string[] =>
  [...new Set(Array.from(css.matchAll(/font-family:\s*([^;]+);/g)).map(([, value]) => value!.trim()))];

describe('components read the typeface tokens', () => {
  test('a role reads its face, the compiled family as the fallback', () => {
    const css = compile(`@use 'abstract/mixins' as m;
      .label { @include m.typography('label-large'); }
      .body { @include m.typography('body-medium'); }
      .title { @include m.typography('title-medium'); }
      .headline { @include m.typography('headline-small'); }
      .display { @include m.typography('display-large'); }`);
    const family = (selector: string) => css.match(new RegExp(`\\.${selector}\\s*\\{[^}]*font-family:\\s*([^;]+);`))?.[1];
    for (const role of ['label', 'body']) expect(family(role)).toBe('var(--mtrl-ref-typeface-plain, Roboto, sans-serif)');
    for (const role of ['title', 'headline', 'display']) expect(family(role)).toBe('var(--mtrl-ref-typeface-brand, Roboto, sans-serif)');
  });

  test('no component compiles a bare family', () => {
    for (const component of ['button', 'text-field', 'menu', 'dialog', 'chips', 'list', 'tabs', 'snackbar']) {
      const bare = families(compile(`@use 'components/${component}';`)).filter(value => !value.startsWith('var(--mtrl-'));
      expect({ component, bare }).toEqual({ component, bare: [] });
    }
  });

  test('base declares both faces', () => {
    const css = compile(`@use 'base/tokens';`);
    expect(css).toContain('--mtrl-ref-typeface-brand: Roboto, sans-serif');
    expect(css).toContain('--mtrl-ref-typeface-plain: Roboto, sans-serif');
  });
});
