// test/styles/toolbar-placement.test.ts
//
// A docked toolbar's inline edge: the placement class sits on the toolbar's
// own root, which the runtime may also mark with the direction it resolved,
// so the lowered artefacts write the physical side with a self arm while the
// adopted sheets keep the logical inset (abstract/_direction.scss,
// scripts/build-styles.ts).
import { beforeAll, describe, expect, test } from 'bun:test';
import { compileString } from 'sass';

const compile = (arms: boolean): string =>
  compileString(
    (arms ? `@use 'abstract/emit' as config with ($direction-arms: true);\n` : '') + `@use 'components/toolbar';`,
    { loadPaths: ['src/styles'], style: 'expanded' },
  ).css.replace(/,\n/g, ', ');

let css = '';
let arms = '';

beforeAll(() => {
  css = compile(false);
  arms = compile(true);
});

describe('a placed toolbar docks on its inline edge', () => {
  test('the adopted sheets keep the logical inset', () => {
    expect(css).toContain('.mtrl-toolbar--start {\n  inset-inline-start: var(--mtrl-toolbar-margin);\n}');
    expect(css).toContain('.mtrl-toolbar--end {\n  inset-inline-end: var(--mtrl-toolbar-margin);\n}');
  });

  test('the lowered artefacts write the physical side, the mirrored side a self arm', () => {
    expect(arms).toContain('.mtrl-toolbar--start {\n  left: var(--mtrl-toolbar-margin);\n}');
    expect(arms).toContain('.mtrl-toolbar--end {\n  right: var(--mtrl-toolbar-margin);\n}');
    // One prelude, every marker form: the toolbar's own root, an ancestor's
    // class, the shadow host's class, and the attribute cut by a nearer ltr.
    expect(arms).toContain(
      '.mtrl-toolbar--start:where(.mtrl-rtl, [dir=rtl]), :where(.mtrl-rtl) .mtrl-toolbar--start, ' +
        ':where(:host(.mtrl-rtl)) .mtrl-toolbar--start, ' +
        "[dir=rtl] .mtrl-toolbar--start:not(:where(.mtrl-ltr, .mtrl-ltr *)) {\n  left: auto;\n  right: var(--mtrl-toolbar-margin);\n}",
    );
    expect(arms).toContain(
      '.mtrl-toolbar--end:where(.mtrl-rtl, [dir=rtl]), :where(.mtrl-rtl) .mtrl-toolbar--end, ' +
        ':where(:host(.mtrl-rtl)) .mtrl-toolbar--end, ' +
        "[dir=rtl] .mtrl-toolbar--end:not(:where(.mtrl-ltr, .mtrl-ltr *)) {\n  right: auto;\n  left: var(--mtrl-toolbar-margin);\n}",
    );
    // No logical side inset is left for a bundler to lower into a :lang() arm.
    expect(arms).not.toMatch(/inset-inline-(start|end)/);
  });

  test("off screen, the slide's sign rides the direction flag both forms keep", () => {
    // The hidden slide flips through --mtrl-toolbar-dir, set under the same
    // marker forms by the rtl mixin: a custom property no bundler lowers, so
    // the arms never have to reach the transform, only the docked edge.
    expect(css).toContain('--mtrl-toolbar-dir: -1');
    expect(arms).toContain('--mtrl-toolbar-dir: -1');
    expect(arms).toContain(
      '.mtrl-toolbar--hidden.mtrl-toolbar--start {\n  transform: translateX(calc(-1 * var(--mtrl-toolbar-dir) * (100% + var(--mtrl-toolbar-margin))));\n}',
    );
  });
});
