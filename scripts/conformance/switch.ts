#!/usr/bin/env bun
// scripts/conformance/switch.ts
/**
 * The "ours" column of the switch conformance table: the harness runs these
 * cases on main and prints the JSON the table is written from.
 *
 *   bun run scripts/conformance/switch.ts            # every case
 *   bun run scripts/conformance/switch.ts selected   # rows whose id matches
 *
 * Compose is the other column:
 *   COMPOSE_TOKENS_DIR=<pin> bun run scripts/conformance/compose-tokens.ts switch
 */
import { createConformanceHarness, fixtureEngine, selectFixtureCases, type Case } from "./measure";

// The root is first: the harness aims hover/press at parts[0], and the root's
// box covers the track and thumb.
const parts = [
  { name: "root", selector: ".mtrl-switch" },
  { name: "track", selector: ".mtrl-switch__track" },
  { name: "thumb", selector: ".mtrl-switch__thumb" },
  { name: "icon", selector: ".mtrl-switch__thumb-icon" },
  { name: "icon svg", selector: ".mtrl-switch__thumb-icon svg" },
  { name: "input", selector: ".mtrl-switch__input" },
];

type MountOptions = { checked?: boolean; disabled?: boolean };

const mount = (mtrl: Record<string, (...args: never[]) => unknown>, host: HTMLElement, config?: unknown) => {
  const { checked, disabled } = (config ?? {}) as MountOptions;
  const create = mtrl.createSwitch as unknown as (settings: Record<string, unknown>) => { element: HTMLElement };
  const sw = create({
    ariaLabel: "Sync",
    checked: checked ?? false,
    ...(disabled ? { disabled: true } : {}),
  });
  host.append(sw.element);
};

const cases: Case[] = [];

for (const checked of [false, true]) {
  const name = checked ? "selected" : "unselected";
  cases.push({ id: `${name}/rest`, mount, config: { checked }, parts });
  for (const state of ["hover", "focus", "pressed"] as const) {
    cases.push({ id: `${name}/${state}`, state, mount, config: { checked }, parts });
  }
  cases.push({ id: `${name}/disabled`, state: "disabled", mount, config: { checked, disabled: true }, parts });
  cases.push({ id: `${name}/rest/dark`, scheme: "dark", mount, config: { checked }, parts });
}

for (const density of [0, -1, -2, -3]) {
  cases.push({ id: `unselected/rest/density ${density}`, density, mount, config: {}, parts });
}

const chosen = selectFixtureCases(cases);
const engine = fixtureEngine();

const harness = await createConformanceHarness({ component: "switch", engine });
try {
  const rows = await harness.measure(chosen);
  // The fixture asserts itself: the measured switch carries the state the
  // case named — its input is checked exactly in selected cases.
  const verify = await harness.page.evaluate(`
    (() => {
      const results = [];
      const host = document.querySelector("#mount") ?? document.body;
      for (const checked of [true, false]) {
        host.replaceChildren();
        const w = window;
        const sw = w.mtrl.createSwitch({ ariaLabel: "verify", checked });
        host.append(sw.element);
        const input = document.querySelector(".mtrl-switch__input");
        results.push({ checked, inputIsChecked: input?.checked ?? null });
      }
      host.replaceChildren();
      return results;
    })()
  `) as Array<{ checked: boolean; inputIsChecked: boolean | null }>;
  for (const entry of verify) {
    if (entry.inputIsChecked !== entry.checked) {
      throw new Error(`fixture: the measured switch reads checked=${entry.inputIsChecked} in a ${entry.checked ? "selected" : "unselected"} case`);
    }
  }
  console.log(JSON.stringify({ component: "switch", source: harness.source, engine, rows }, null, 2));
} finally {
  await harness.close();
}
