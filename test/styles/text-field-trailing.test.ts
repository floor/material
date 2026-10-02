// test/styles/textfield-trailing.test.ts
//
// FLO-301 (1.0): a decorative trailing icon no longer looks clickable. Only the
// button a trailingIconLabel makes keeps the pointer.
import { expect, test } from 'bun:test';
import { compileString } from 'sass';

const css = compileString(`@use 'components/textfield';`, { loadPaths: ['src/styles'], style: 'expanded' }).css;

/** The declarations of every rule whose selector is exactly this */
const rules = (selector: string): string[] =>
  Array.from(css.matchAll(/(?:^|\n)([^{}\n]+)\{([^}]*)\}/g))
    .filter((m) => m[1]!.split(',').map((part) => part.trim()).includes(selector))
    .map((m) => m[2]!);

test('the decorative trailing icon has no pointer cursor', () => {
  const decorative = rules('.mtrl-textfield__trailing-icon');
  expect(decorative.length).toBeGreaterThan(0);
  for (const body of decorative) expect(body).not.toContain('cursor: pointer');
});

test('the trailing icon button keeps it', () => {
  expect(rules('.mtrl-textfield__trailing-icon.mtrl-textfield__trailing-icon--button').join('')).toContain('cursor: pointer');
});
