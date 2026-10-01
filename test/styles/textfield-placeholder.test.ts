// test/styles/textfield-placeholder.test.ts
//
// FLO-354: under a resting label the placeholder is hidden. The disabled input
// sets -webkit-text-fill-color, which its placeholder inherits and which paints
// over color, so a disabled, empty field showed its placeholder over the label
// in both variants. The rule clears the fill too.
import { expect, test } from 'bun:test';
import { compileString } from 'sass';

const css = compileString(`@use 'components/textfield';`, { loadPaths: ['src/styles'], style: 'expanded' }).css;

/** The declarations of every rule whose selector hides the placeholder under a label. */
const hiding = Array.from(
  css.matchAll(/(?:^|\n)([^{}\n]*:has\(> \.mtrl-textfield__field > \.mtrl-textfield__label\)[^{}\n]*::placeholder)\s*\{([^}]*)\}/g),
  (m) => ({ selector: m[1]!, body: m[2]! }),
);

test('the hiding rule reaches both variants: it keys on the label, not the variant', () => {
  expect(hiding.length).toBe(1);
  expect(hiding[0]!.selector).not.toMatch(/--filled|--outlined/);
  expect(hiding[0]!.selector).toContain(':not(.mtrl-textfield--focused)');
});

test('it clears the fill as well as the colour, so a disabled field\'s inherited fill cannot paint it', () => {
  expect(hiding[0]!.body).toContain('color: transparent');
  expect(hiding[0]!.body).toContain('-webkit-text-fill-color: transparent');
});

test('the disabled input still sets the fill the placeholder would inherit', () => {
  // If this stops being true the second test is moot, not wrong: keep the pair honest.
  expect(css).toMatch(/\.mtrl-textfield--disabled \.mtrl-textfield__input\s*\{[^}]*-webkit-text-fill-color/);
});
