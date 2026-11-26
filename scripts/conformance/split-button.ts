#!/usr/bin/env bun
// scripts/conformance/split-button.ts
/**
 * The "ours" column of the split-button conformance table: the harness runs
 * these cases on origin/main and prints the JSON the table is written from.
 *
 *   bun run scripts/conformance/split-button.ts            # every case
 *   bun run scripts/conformance/split-button.ts filled     # rows whose id matches
 *
 * Compose is the other column: `bun run scripts/conformance/compose-tokens.ts --only=SplitButtonMediumTokens`.
 */
import { createConformanceHarness, fixtureEngine, selectFixtureCases, type Case } from "./measure";

const SIZES = ["xs", "s", "m", "l", "xl"] as const;
const VARIANTS = ["filled", "tonal", "outlined", "elevated"] as const;

const parts = [
  { name: "root", selector: ".mtrl-split-button" },
  { name: "leading", selector: ".mtrl-split-button__leading" },
  { name: "trailing", selector: ".mtrl-split-button__trailing" },
  { name: "chevron", selector: ".mtrl-split-button__chevron" },
  { name: "leading state layer", selector: ".mtrl-split-button__leading", pseudo: "::before" as const },
];

type MountOptions = {
  variant?: string;
  size?: string;
  disabled?: boolean;
};

/**
 * One mount for every case, taking its options as the case's data: the
 * factory's visible text is its content, and a closure cannot cross into the
 * page.
 */
const mount = (mtrl: Record<string, (...args: never[]) => unknown>, host: HTMLElement, config?: unknown) => {
  const { variant, size, disabled } = (config ?? {}) as MountOptions;
  const create = mtrl.createSplitButton as unknown as (settings: Record<string, unknown>) => { element: HTMLElement };
  const button = create({ text: "Split", variant, size, disabled, items: [{ text: "One" }, { text: "Two" }] });
  host.append(button.element);
};

const cases: Case[] = [];

for (const variant of VARIANTS) {
  for (const size of SIZES) {
    cases.push({ id: `${variant}/${size}/rest`, mount, config: { variant, size }, parts });
  }
}

for (const state of ["hover", "focus", "pressed"] as const) {
  for (const size of ["xs", "s", "m", "l", "xl"] as const) {
    cases.push({ id: `filled/${size}/${state} (leading)`, state, mount, config: { variant: "filled", size }, parts });
  }
}

for (const density of [0, -1, -2, -3]) {
  cases.push({ id: `filled/m/density ${density}`, density, mount, config: { variant: "filled", size: "m" }, parts });
}

cases.push({ id: "filled/m/dark", scheme: "dark", mount, config: { variant: "filled", size: "m" }, parts });
cases.push({ id: "filled/m/disabled", state: "disabled", mount, config: { variant: "filled", size: "m", disabled: true }, parts });
cases.push({ id: "outlined/m/rest (border)", mount, config: { variant: "outlined", size: "m" }, parts });
cases.push({ id: "elevated/m/rest (shadow)", mount, config: { variant: "elevated", size: "m" }, parts });
cases.push({ id: "elevated/m/hover (shadow)", state: "hover", mount, config: { variant: "elevated", size: "m" }, parts });

// The press is the ripple wave, not the ::before state layer: read the wave.
cases.push({
  id: "filled/m/pressed (ripple wave)",
  state: "pressed",
  mount,
  config: { variant: "filled", size: "m" },
  parts: [
    // The press lands on the leading half, where the wave mounts.
    { name: "leading", selector: ".mtrl-split-button__leading" },
    { name: "ripple wave", selector: ".mtrl-ripple-wave" },
  ],
  properties: ["opacity", "backgroundColor", "width", "height"],
});

// The two rows m3.material.io adds and Compose has no token for: the menu
// icon's optical offset when unselected, and the layer a selected trailing
// half carries without changing colour.
for (const size of SIZES) {
  cases.push({
    id: `chevron offset/${size}`,
    mount,
    config: { variant: "filled", size },
    parts: [{ name: "chevron", selector: ".mtrl-split-button__chevron" }],
    properties: ["transform", "translate", "width", "height", "marginLeft", "marginRight"],
  });
  cases.push({
    id: `selected layer/${size}`,
    mount: (mtrl, host, config) => {
      const create = mtrl.createSplitButton as unknown as (settings: Record<string, unknown>) => { element: HTMLElement };
      const { variant, size: sizeName } = (config ?? {}) as MountOptions;
      const button = create({ text: "Split", variant, size: sizeName, items: [{ text: "One" }] });
      host.append(button.element);
      // Selected: the trailing half's menu is open.
      button.element.querySelector<HTMLElement>(".mtrl-split-button__trailing")?.click();
    },
    config: { variant: "filled", size },
    parts: [{ name: "trailing layer", selector: ".mtrl-split-button__trailing", pseudo: "::before" }],
    properties: ["opacity", "backgroundColor"],
  });
}

const chosen = selectFixtureCases(cases);
const engine = fixtureEngine();

const harness = await createConformanceHarness({ component: "split-button", engine });
try {
  const rows = await harness.measure(chosen);
  console.log(JSON.stringify({ component: "split-button", source: harness.source, engine, rows }, null, 2));
} finally {
  await harness.close();
}
