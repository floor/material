// test/styles/text-field-placeholder.test.ts
//
// FLO-354: under a resting label the placeholder is hidden. The disabled input
// sets -webkit-text-fill-color, which its placeholder inherits and which paints
// over color, so a disabled, empty field showed its placeholder over the label
// in both variants. The rule clears the fill too.
import { expect, test } from 'bun:test';
import { compileString } from 'sass';

const css = compileString(`@use 'components/text-field';`, { loadPaths: ['src/styles'], style: 'expanded' }).css;

/** The declarations of every rule whose selector hides the placeholder under a label. */
const hiding = Array.from(
  css.matchAll(/(?:^|\n)([^{}\n]*:has\(> \.mtrl-text-field__field > \.mtrl-text-field__label\)[^{}\n]*::placeholder)\s*\{([^}]*)\}/g),
  (m) => ({ selector: m[1]!, body: m[2]! }),
);

test('the hiding rule reaches both variants: it keys on the label, not the variant', () => {
  expect(hiding.length).toBe(1);
  expect(hiding[0]!.selector).not.toMatch(/--filled|--outlined/);
  expect(hiding[0]!.selector).toContain(':not(.mtrl-text-field--focused)');
});

test('it clears the fill as well as the colour, so a disabled field\'s inherited fill cannot paint it', () => {
  expect(hiding[0]!.body).toContain('color: transparent');
  expect(hiding[0]!.body).toContain('-webkit-text-fill-color: transparent');
});

test('the disabled input still sets the fill the placeholder would inherit', () => {
  // If this stops being true the second test is moot, not wrong: keep the pair honest.
  expect(css).toMatch(/\.mtrl-text-field--disabled \.mtrl-text-field__input\s*\{[^}]*-webkit-text-fill-color/);
});

// FLO-355: the prefix and suffix rest with the label too, and fade in as it floats.
const restingAffixes = Array.from(
  css.matchAll(/(?:^|\n)([^{}\n]*:is\(\.mtrl-text-field__prefix, \.mtrl-text-field__suffix\))\s*\{\s*opacity: 0;/g),
  (m) => m[1]!,
).filter((selector) => selector.startsWith('.mtrl-text-field--empty:has(> .mtrl-text-field__field > .mtrl-text-field__label)'));

test('a resting label hides the prefix and the suffix, in both variants', () => {
  expect(restingAffixes.length).toBe(1);
  for (const selector of restingAffixes) {
    expect(selector).not.toMatch(/--filled|--outlined/);
    expect(selector).toContain(':not(.mtrl-text-field--focused)');
    // The float rules' complement: a value or an autofill floats the label
    expect(selector).toContain(':not(:has(.mtrl-text-field__input:is(:not(:placeholder-shown), :autofill, :-webkit-autofill)))');
  }
});

test('the affixes fade on the label\'s float timing', () => {
  for (const part of ['prefix', 'suffix']) {
    const rule = css.match(new RegExp(`(?:^|\\n)\\.mtrl-text-field__${part}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
    expect(rule).toMatch(/transition:[^;]*opacity/);
  }
});
