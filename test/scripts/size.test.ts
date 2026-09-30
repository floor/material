// test/scripts/size.test.ts
/**
 * The measurement script used to be able to skip a failed build and still
 * exit 0. A component that fails to compile, leaks into another bundle, or
 * grows past its gzip budget has to fail the command.
 */

import { describe, test, expect } from 'bun:test';
import {
  BUDGET_BYTES,
  DEFERRED_BUDGET_BYTES,
  COMPONENTS,
  KNOWN_DEPS,
  SCENARIO_DEFS,
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
    expect(SCENARIO_DEFS.length).toBe(COMPONENTS.length + 2);
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
