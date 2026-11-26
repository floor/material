#!/usr/bin/env bun
// scripts/conformance/radio.ts
/**
 * The "ours" column of the radio conformance table: the harness runs these
 * cases on main and prints the JSON the table is written from.
 *
 *   bun run scripts/conformance/radio.ts            # every case
 *   bun run scripts/conformance/radio.ts selected   # rows whose id matches
 *
 * Compose is the other column:
 *   COMPOSE_TOKENS_DIR=<pin> bun run scripts/conformance/compose-tokens.ts radio
 */
import { createConformanceHarness, fixtureEngine, selectFixtureCases, type Case } from "./measure";

// The item is first: the harness aims hover/press at parts[0], and the item's
// box covers the control and label, where the state lands.
const parts = [
  { name: "item", selector: ".mtrl-radios__item" },
  { name: "control", selector: ".mtrl-radios__control" },
  { name: "circle", selector: ".mtrl-radios__circle" },
  { name: "dot", selector: ".mtrl-radios__circle", pseudo: "::after" as const },
  { name: "ripple", selector: ".mtrl-radios__ripple" },
  { name: "group", selector: ".mtrl-radios" },
];

type MountOptions = { checked?: boolean; disabled?: boolean };

const mount = (mtrl: Record<string, (...args: never[]) => unknown>, host: HTMLElement, config?: unknown) => {
  const { checked, disabled } = (config ?? {}) as MountOptions;
  const create = mtrl.createRadios as unknown as (settings: Record<string, unknown>) => { element: HTMLElement };
  const radios = create({
    name: "conformance",
    options: [
      { id: "a", value: "a", text: "Alpha" },
      { id: "b", value: "b", text: "Beta" },
    ],
    // The measured item (the first, A) must BE the option in the case's
    // state: selected cases check A; unselected cases check nothing, so A
    // is genuinely unchecked and the focused one. (The earlier fixture
    // checked B while measuring A.)
    value: checked ? "a" : undefined,
    ...(disabled ? { disabled: true } : {}),
  });
  host.append(radios.element);
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

const harness = await createConformanceHarness({ component: "radios", engine });
try {
  const rows = await harness.measure(chosen);
  // The fixture asserts itself: re-mount the two canonical configs and
  // verify the measured option (the first, A) carries the state the case
  // named — checked in selected cases, unchecked otherwise.
  const verify = await harness.page.evaluate(`
    (() => {
      const results = [];
      const host = document.querySelector("#mount") ?? document.body;
      for (const checked of [true, false]) {
        host.replaceChildren();
        const w = window;
        const radios = w.mtrl.createRadios({
          name: "verify",
          options: [
            { id: "a", value: "a", text: "Alpha" },
            { id: "b", value: "b", text: "Beta" },
          ],
          value: checked ? "a" : undefined,
        });
        host.append(radios.element);
        const first = document.querySelector(".mtrl-radios__item .mtrl-radios__input");
        const firstItem = document.querySelector(".mtrl-radios__item");
        results.push({ checked, firstIsChecked: first?.checked ?? null, firstHasCheckedClass: firstItem?.className.includes("checked") ?? null });
      }
      host.replaceChildren();
      return results;
    })()
  `) as Array<{ checked: boolean; firstIsChecked: boolean | null; firstHasCheckedClass: boolean | null }>;
  for (const entry of verify) {
    if (entry.firstIsChecked !== entry.checked) {
      throw new Error(`fixture: the measured option A reads checked=${entry.firstIsChecked} in a ${entry.checked ? "selected" : "unselected"} case`);
    }
  }
  console.log(JSON.stringify({ component: "radios", source: harness.source, engine, rows }, null, 2));
} finally {
  await harness.close();
}
