// test/scripts/size.test.ts
/**
 * The measurement script used to be able to skip a failed build and still
 * exit 0. A component that fails to compile, leaks into another bundle, or
 * grows past its gzip budget has to fail the command.
 */

import { describe, test, expect } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';
import {
  BUDGET_BYTES,
  DEFERRED_BUDGET_BYTES,
  COMPONENTS,
  KNOWN_DEPS,
  SCENARIO_DEFS,
  buildScenario,
  brotliBytes,
  missingMeasuredScenarios,
  sizeGateFails,
} from '../../scripts/size';

describe('size gate', () => {
  test('each deferred budget is for a measured scenario, and positive', () => {
    const names = new Set<string>(SCENARIO_DEFS.map((scenario) => scenario.name));
    for (const [name, bytes] of Object.entries(DEFERRED_BUDGET_BYTES)) {
      expect(names.has(name)).toBe(true);
      expect(bytes).toBeGreaterThan(0);
    }
  });

  test('budgets every measured scenario', () => {
    // core, every component, all, and the two shapes scenarios
    expect(SCENARIO_DEFS.length).toBe(COMPONENTS.length + 4);
    for (const scenario of SCENARIO_DEFS) {
      expect(BUDGET_BYTES[scenario.name]).toBeGreaterThan(0);
    }
  });

  test('fails the command when a scenario fails to build', () => {
    expect(sizeGateFails({
      buildFailures: ['core'],
      treeShakeFailures: [],
      overBudget: [],
    })).toBe(true);
  });

  test('fails the command when a component exceeds its budget', () => {
    expect(sizeGateFails({
      buildFailures: [],
      treeShakeFailures: [],
      overBudget: ['button'],
    })).toBe(true);
  });

  test('fails the command when a component leaks into another bundle', () => {
    expect(sizeGateFails({
      buildFailures: [],
      treeShakeFailures: [{ scenario: 'badge', leaked: 'slider', marker: 'slider' }],
      overBudget: [],
    })).toBe(true);
  });

  test('treats a dropped measurement as a missing scenario', () => {
    const measured = SCENARIO_DEFS
      .map((scenario) => scenario.name)
      .filter((name) => name !== 'core');
    expect(missingMeasuredScenarios(measured)).toEqual(['core']);
  });

  test('passes when every scenario built, tree-shook, and stayed in budget', () => {
    expect(sizeGateFails({
      buildFailures: [],
      treeShakeFailures: [],
      overBudget: [],
    })).toBe(false);
  });

  test('names only real components as static dependencies', () => {
    const names = new Set(COMPONENTS.map((component) => component.name));
    for (const name of Object.keys(KNOWN_DEPS) as (keyof typeof KNOWN_DEPS)[]) {
      expect(names.has(name)).toBe(true);
      for (const dep of KNOWN_DEPS[name] ?? []) expect(names.has(dep)).toBe(true);
    }
  });
});

describe('brotli measurement', () => {
  // The reported figure is the CDN one: quality 11, the setting
  // check-adapter-size.ts gates adapters on. The sample is varied enough that
  // a lower quality measurably disagrees, so the equality pins the setting.
  const SAMPLE = new TextEncoder().encode(
    Array.from({ length: 96 }, (_, i) => `export const hook${i} = (v) => v * ${i} + ${i % 7}; // ${'x'.repeat(i % 13)}\n`).join(''),
  );

  test('reports quality 11, not another quality', () => {
    expect(brotliBytes(SAMPLE)).toBe(
      brotliCompressSync(SAMPLE, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
    );
    expect(brotliBytes(SAMPLE)).not.toBe(
      brotliCompressSync(SAMPLE, { params: { [constants.BROTLI_PARAM_QUALITY]: 1 } }).length,
    );
  });

  test('is deterministic and smaller than the minified input it measures', () => {
    expect(brotliBytes(SAMPLE)).toBe(brotliBytes(SAMPLE));
    expect(brotliBytes(SAMPLE)).toBeGreaterThan(0);
    expect(brotliBytes(SAMPLE)).toBeLessThan(SAMPLE.byteLength);
  });
});

describe('size measurement determinism', () => {
  // The bundler derives chunk names from the module paths it is given, so an
  // absolute entry in a fresh temporary directory (or a different checkout
  // path) moved the measured bytes by a few gzipped bytes run to run and
  // machine to machine (floor/material#131). Two identical trees at different
  // absolute roots must build identical bytes.
  const SOURCES: Record<string, string> = {
    'src/core/compose/index.ts': [
      'export const pipe = (a: number) => a + 1;',
      'export const createBase = (a: number) => a * 2;',
      'export const withElement = (a: number) => import("./scale.ts").then((m) => m.scale(a));',
      '',
    ].join('\n'),
    'src/core/compose/scale.ts': 'export const scale = (a: number) => a * 4;\n',
  };

  const project = async (root: string): Promise<void> => {
    for (const [path, source] of Object.entries(SOURCES)) {
      const file = join(root, path);
      mkdirSync(join(file, '..'), { recursive: true });
      await Bun.write(file, source);
    }
  };

  test('the same source builds identical bytes at two checkout paths', async () => {
    const roots = [mkdtempSync(join(tmpdir(), 'mtrl-size-one-')), mkdtempSync(join(tmpdir(), 'mtrl-size-two-'))];
    try {
      for (const root of roots) await project(root);
      const core = SCENARIO_DEFS.find((scenario) => scenario.name === 'core')!;
      const built = [];
      for (const root of roots) built.push(await buildScenario(root, core));

      for (const result of built) {
        if (typeof result === 'string') throw new Error(result);
      }
      const [one, two] = built as Exclude<(typeof built)[number], string>[];
      expect(one.initialBytes.length).toBeGreaterThan(0);
      expect([...two.initialBytes]).toEqual([...one.initialBytes]);
      expect([...two.deferredBytes]).toEqual([...one.deferredBytes]);
    } finally {
      for (const root of roots) rmSync(root, { recursive: true, force: true });
    }
  });

  test('repeated builds of one tree are byte-identical', async () => {
    const root = mkdtempSync(join(tmpdir(), 'mtrl-size-again-'));
    try {
      await project(root);
      const core = SCENARIO_DEFS.find((scenario) => scenario.name === 'core')!;
      const first = await buildScenario(root, core);
      const second = await buildScenario(root, core);
      if (typeof first === 'string') throw new Error(first);
      if (typeof second === 'string') throw new Error(second);
      expect([...second.initialBytes]).toEqual([...first.initialBytes]);
      expect([...second.deferredBytes]).toEqual([...first.deferredBytes]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
