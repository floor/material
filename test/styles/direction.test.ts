// test/styles/direction.test.ts
//
// The direction switch (src/styles/abstract/_emit.scss,
// src/styles/abstract/_direction.scss): the same call site compiles to the
// logical properties the runtime-adopted sheets ship, and to the physical
// side plus a direction arm in the two artefacts a consumer's bundler lowers
// (scripts/build-styles.ts). A spring on an inline inset names both physical
// sides in the arms form, so the move animates whichever side the direction
// placed it on.
import { describe, test, expect } from 'bun:test';
import { compileString } from 'sass';

const SOURCES = {
  start: `@use 'abstract/direction' as d;\n.a { @include d.start(16px, $self: true); }`,
  end: `@use 'abstract/direction' as d;\n.a { @include d.end(4px); }`,
  sides: `@use 'abstract/direction' as d;\n.a { @include d.sides(0, auto); }`,
  cornersFull: `@use 'abstract/direction' as d;\n.a { @include d.corners($start-start: 4px, $start-end: 8px, $end-start: 8px, $end-end: 4px); }`,
  cornersPart: `@use 'abstract/direction' as d;\n.a { @include d.corners($start-start: 0, $end-start: 0); }`,
  arms: `@use 'abstract/direction' as d;\n.a { left: 1px; @include d.arms { left: auto; right: 1px; } }`,
  selfArms: `@use 'abstract/direction' as d;\n.a { left: 1px; @include d.arms-self-only { .b { left: auto; } } }`,
  deferred: `@use 'abstract/direction' as d;\n.a { @include d.start(16px, $arm: false); @include d.sides(0, auto, $arm: false); }\n` +
    `.a { @include d.arms-selector('.b') { right: 16px; left: auto; } }`,
  transition: `@use 'abstract/direction' as d;\n.a { transition: opacity 100ms linear, d.transition(inset-inline-start, 200ms ease); }`,
};

const compile = (source: string, arms: boolean): string =>
  compileString(
    (arms ? `@use 'abstract/emit' as config with ($direction-arms: true);\n` : '') + source,
    { loadPaths: ['src/styles'], style: 'compressed' },
  ).css;

describe('the direction switch', () => {
  test('the logical form keeps the native properties and no arm', () => {
    expect(compile(SOURCES.start, false)).toBe('.a{inset-inline-start:16px}');
    expect(compile(SOURCES.end, false)).toBe('.a{inset-inline-end:4px}');
    expect(compile(SOURCES.sides, false)).toBe('.a{inset-inline-start:0;inset-inline-end:auto}');
    expect(compile(SOURCES.cornersFull, false)).toBe(
      '.a{border-start-start-radius:4px;border-start-end-radius:8px;border-end-start-radius:8px;border-end-end-radius:4px}',
    );
    expect(compile(SOURCES.cornersPart, false)).toBe('.a{border-start-start-radius:0;border-end-start-radius:0}');
    // The aggregated arms and the root-carried form emit nothing: the logical
    // properties mirror on the computed direction without them.
    expect(compile(SOURCES.arms, false)).toBe('.a{left:1px}');
    expect(compile(SOURCES.selfArms, false)).toBe('.a{left:1px}');
    expect(compile(SOURCES.deferred, false)).toBe('.a{inset-inline-start:16px;inset-inline-start:0;inset-inline-end:auto}');
    expect(compile(SOURCES.transition, false)).toBe('.a{transition:opacity 100ms linear,inset-inline-start 200ms ease}');
  });

  test('the arms form is the physical side and the arm the hand series wrote', () => {
    expect(compile(SOURCES.start, true)).toBe(
      '.a{left:16px}.a:where(.mtrl-rtl,[dir=rtl]),:where(.mtrl-rtl) .a,:where(:host(.mtrl-rtl)) .a,' +
      '[dir=rtl] .a:not(:where(.mtrl-ltr,.mtrl-ltr *)){left:auto;right:16px}',
    );
    expect(compile(SOURCES.end, true)).toBe(
      '.a{right:4px}:where(.mtrl-rtl) .a,:where(:host(.mtrl-rtl)) .a,' +
      '[dir=rtl] .a:not(:where(.mtrl-ltr,.mtrl-ltr *)){right:auto;left:4px}',
    );
    expect(compile(SOURCES.sides, true)).toBe(
      '.a{left:0;right:auto}:where(.mtrl-rtl) .a,:where(:host(.mtrl-rtl)) .a,' +
      '[dir=rtl] .a:not(:where(.mtrl-ltr,.mtrl-ltr *)){left:auto;right:0}',
    );
    expect(compile(SOURCES.cornersFull, true)).toBe(
      '.a{border-radius:4px 8px 4px 8px}:where(.mtrl-rtl) .a,:where(:host(.mtrl-rtl)) .a,' +
      '[dir=rtl] .a:not(:where(.mtrl-ltr,.mtrl-ltr *)){border-radius:8px 4px 8px 4px}',
    );
    expect(compile(SOURCES.cornersPart, true)).toBe(
      '.a{border-top-left-radius:0;border-bottom-left-radius:0}:where(.mtrl-rtl) .a,:where(:host(.mtrl-rtl)) .a,' +
      '[dir=rtl] .a:not(:where(.mtrl-ltr,.mtrl-ltr *)){border-top-right-radius:0;border-bottom-right-radius:0}',
    );
    expect(compile(SOURCES.arms, true)).toBe(
      '.a{left:1px}:where(.mtrl-rtl) .a,:where(:host(.mtrl-rtl)) .a,' +
      '[dir=rtl] .a:not(:where(.mtrl-ltr,.mtrl-ltr *)){left:auto;right:1px}',
    );
    expect(compile(SOURCES.selfArms, true)).toBe(
      '.a{left:1px}.a:where(.mtrl-rtl,[dir=rtl]) .b{left:auto}',
    );
    // The deferred arm: the declaration without its own arm, the aggregated
    // selector arm beside it, named at the block that holds the subject.
    expect(compile(SOURCES.deferred, true)).toBe(
      '.a{left:16px;left:0;right:auto}' +
      ':where(.mtrl-rtl) .b,:where(:host(.mtrl-rtl)) .b,[dir=rtl] .b:not(:where(.mtrl-ltr,.mtrl-ltr *)){right:16px;left:auto}',
    );
    expect(compile(SOURCES.transition, true)).toBe('.a{transition:opacity 100ms linear,left 200ms ease,right 200ms ease}');
  });

  test('a spring on an inline inset names both physical sides in the arms form', () => {
    const spring = `@use 'abstract/mixins' as m;\n.a { transition: m.spring(opacity, fast-effects); }\n` +
      `.b { transition: m.spring(inset-inline-start, fast-spatial); }`;
    const logical = compile(spring, false);
    expect(logical).toContain('.a{transition:opacity ');
    expect(logical).toContain('.b{transition:inset-inline-start ');
    const arms = compile(spring, true);
    expect(arms).toContain('.a{transition:opacity ');
    // Both sides, each with its own duration and easing, unquoted. The easing
    // itself holds commas, so the entries are matched by their names.
    expect(arms).toContain('.b{transition:left 425ms ');
    expect(arms).toContain(',right 425ms ');
    expect(arms).not.toContain('inset-inline-start');
  });
});
