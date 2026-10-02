// test/styles/text-field-autofill.test.ts
//
// FLO-335: the text field learns of an autofill from the stylesheet, not by
// reading computed styles: :autofill (and WebKit's prefixed state) run the
// onAutoFillStart keyframes, and the input listens for their animationstart.
import { expect, test } from 'bun:test';
import { compileString } from 'sass';

const css = compileString(`@use 'components/text-field';`, { loadPaths: ['src/styles'], style: 'expanded' }).css;

const block = (selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\:-]/g, '\\$&');
  return css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
};

test('the keyframes the input listens for are in the text field stylesheet', () => {
  expect(css).toContain('@keyframes onAutoFillStart');
});

test(':autofill and :-webkit-autofill both run them', () => {
  for (const state of [':autofill', ':-webkit-autofill']) {
    const rule = block(`.mtrl-text-field__input${state}`);
    expect(rule).toContain('animation-name: onAutoFillStart');
    expect(rule).toContain('animation-duration: 10ms');
  }
});
