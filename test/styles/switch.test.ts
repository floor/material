// test/styles/switch.test.ts
//
// The switch handle's start edge through the direction switch
// (abstract/_direction.scss): the handle and its state layer sit on an
// inline-start inset that every state re-places, so the base names a custom
// property as the value's fallback (`start-value`) and the states override
// the property (`start-value-set`). The adopted sheets keep the plain
// logical inset; the artefacts a consumer bundler lowers write the physical
// side with one arm per subject, every state's move riding the property — a
// bundler lowers no custom property, and the transition names both physical
// sides so the spring animates whichever side the direction placed it on
// (scripts/build-styles.ts).
import { beforeAll, describe, expect, test } from 'bun:test';
import { compileString } from 'sass';

const compile = (arms: boolean): string =>
  compileString(
    (arms ? `@use 'abstract/emit' as config with ($direction-arms: true);\n` : '') + `@use 'components/switch';`,
    { loadPaths: ['src/styles'], style: 'expanded' },
  ).css.replace(/,\n/g, ', ');

let css = '';
let arms = '';

beforeAll(() => {
  css = compile(false);
  arms = compile(true);
});

describe('the switch handle moves on the start edge in every artefact', () => {
  test('the adopted sheets keep the plain logical inset and no arm', () => {
    expect(css).toContain('.mtrl-switch__thumb {\n  position: absolute;\n  top: 6px;\n  inset-inline-start: 6px;');
    expect(css).toContain('.mtrl-switch--checked .mtrl-switch__thumb {\n  background-color: var(--mtrl-sys-color-on-primary);\n  width: 24px;\n  height: 24px;\n  top: 2px;\n  inset-inline-start: 22px;\n}');
    expect(css).toContain('transition: inset-inline-start 425ms linear(');
    expect(css).not.toContain('.mtrl-rtl');
    expect(css).not.toContain('[dir=rtl]');
  });

  test('the lowered artefacts name the property, every state rides it', () => {
    expect(arms).toContain('left: var(--mtrl-switch-thumb-start, 6px);');
    expect(arms).toContain('left: var(--mtrl-switch-layer-start, -6px);');
    // The states move the handle by overriding the property, not the side.
    expect(arms).toContain('--mtrl-switch-thumb-start: 22px;');
    expect(arms).toContain('--mtrl-switch-thumb-start: 2px;');
    expect(arms).toContain('--mtrl-switch-thumb-start: 0;');
    expect(arms).toContain('--mtrl-switch-thumb-start: 20px;');
    expect(arms).toContain('--mtrl-switch-layer-start: 14px;');
    // No logical side inset is left for a bundler to lower into a :lang() arm.
    expect(arms).not.toMatch(/inset-inline-(start|end)/);
  });

  test('one arm per subject mirrors both, the base side reset to auto', () => {
    // The marker may sit on the switch's own root or an ancestor; the
    // attribute form is cut by a nearer ltr subtree.
    for (const subject of ['__track::after', '__thumb']) {
      const selector =
        `.mtrl-switch:where(.mtrl-rtl, [dir=rtl]) .mtrl-switch${subject}, ` +
        `:where(.mtrl-rtl) .mtrl-switch .mtrl-switch${subject}, ` +
        `:where(:host(.mtrl-rtl)) .mtrl-switch .mtrl-switch${subject}, ` +
        `[dir=rtl] .mtrl-switch:not(:where(.mtrl-ltr, .mtrl-ltr *)) .mtrl-switch${subject}`;
      const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(arms).toMatch(new RegExp(`${escaped} \\{[^}]*left: auto;[^}]*right: var\\(--mtrl-switch-(thumb|layer)-start`));
    }
  });

  test("the spring names both physical sides, so the move animates on the side the direction placed it", () => {
    const thumb = arms.match(/\.mtrl-switch__thumb \{[^}]*\}/)?.[0] ?? '';
    expect(thumb).toMatch(/transition: left 425ms linear\(/);
    expect(thumb).toMatch(/, right 425ms linear\(/);
    expect(thumb).not.toContain('inset-inline-start');
  });
});
