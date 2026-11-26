#!/usr/bin/env bun
// scripts/conformance/checkbox.ts
/**
 * The "ours" column of the checkbox conformance table: the harness runs these
 * cases on origin/main and prints the JSON the table is written from.
 *
 *   bun run scripts/conformance/checkbox.ts            # every case
 *   bun run scripts/conformance/checkbox.ts selected   # rows whose id matches
 *
 * Compose is the other column:
 *   COMPOSE_TOKENS_DIR=<pin> bun run scripts/conformance/compose-tokens.ts checkbox
 */
import { createConformanceHarness, fixtureEngine, selectFixtureCases, type Case } from "./measure";

const parts = [
  { name: "root", selector: ".mtrl-checkbox" },
  { name: "icon", selector: ".mtrl-checkbox__icon" },
  { name: "icon svg", selector: ".mtrl-checkbox__icon svg" },
  { name: "input", selector: ".mtrl-checkbox__input" },
  { name: "state layer", selector: ".mtrl-checkbox__icon", pseudo: "::before" as const },
];

type MountOptions = { checked?: boolean; label?: string; error?: boolean; disabled?: boolean };

const mount = (mtrl: Record<string, (...args: never[]) => unknown>, host: HTMLElement, config?: unknown) => {
  const { checked, label, error, disabled } = (config ?? {}) as MountOptions;
  const create = mtrl.createCheckbox as unknown as (settings: Record<string, unknown>) => { element: HTMLElement };
  const checkbox = create({
    ariaLabel: label ?? "Check",
    checked: checked ?? false,
    ...(error ? { error: true } : {}),
    ...(disabled ? { disabled: true } : {}),
  });
  host.append(checkbox.element);
};

const cases: Case[] = [];

// Geometry and colour, selected and unselected, every state.
for (const checked of [false, true]) {
  const name = checked ? "selected" : "unselected";
  cases.push({ id: `${name}/rest`, mount, config: { checked }, parts });
  for (const state of ["hover", "focus", "pressed"] as const) {
    cases.push({ id: `${name}/${state}`, state, mount, config: { checked }, parts });
  }
  cases.push({ id: `${name}/disabled`, state: "disabled", mount, config: { checked, disabled: true, label: "Check disabled" }, parts });
  cases.push({ id: `${name}/rest/dark`, scheme: "dark", mount, config: { checked }, parts });
}

// Density on the unselected rest case.
for (const density of [0, -1, -2, -3]) {
  cases.push({ id: `unselected/rest/density ${density}`, density, mount, config: {}, parts });
}

// Error styling, if the config takes it (rows land only when the class applies).
for (const checked of [false, true]) {
  const name = checked ? "selected" : "unselected";
  cases.push({ id: `${name}/error/rest`, mount, config: { checked, error: true }, parts });
}

const chosen = selectFixtureCases(cases);
const engine = fixtureEngine();

const harness = await createConformanceHarness({ component: "checkbox", engine });
try {
  const rows = await harness.measure(chosen);
  console.log(JSON.stringify({ component: "checkbox", source: harness.source, engine, rows }, null, 2));
} finally {
  await harness.close();
}
