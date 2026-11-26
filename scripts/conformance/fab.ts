#!/usr/bin/env bun
// scripts/conformance/fab.ts
/**
 * The "ours" column of the FAB conformance table: the harness runs these cases
 * on origin/main and prints the JSON the table is written from. The fixture
 * asserts itself: every part a row names must be found with a box.
 *
 *   bun run scripts/conformance/fab.ts            # every case
 *   bun run scripts/conformance/fab.ts large      # rows whose id matches
 *
 * Compose is the other column: `COMPOSE_TOKENS_DIR=.compose-tokens-41.1.19
 * bun run scripts/conformance/compose-tokens.ts --only=FabBaselineTokens,…`.
 */
import { assertFixture, createConformanceHarness, type Case } from "./measure";

const SIZES = ["default", "medium", "large"] as const;
const VARIANTS = ["primary-container", "secondary-container", "tertiary-container", "primary", "secondary", "tertiary"] as const;

const ICON = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>`;

const parts = [
  { name: "root", selector: ".mtrl-fab" },
  { name: "icon", selector: ".mtrl-fab__icon" },
  { name: "state layer", selector: ".mtrl-fab", pseudo: "::before" as const },
];

const properties = [
  "height", "width", "minWidth", "maxWidth", "paddingLeft", "paddingRight", "gap", "columnGap",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius",
  "backgroundColor", "color", "boxShadow", "outlineStyle", "outlineWidth", "outlineColor", "outlineOffset",
  // The state layer is the ::before the hover, focus and pressed rules draw.
  "opacity", "content", "display",
];

type MountOptions = { variant?: string; size?: string };

/** One mount for every case; the icon rides on the module namespace. */
const mount = (mtrl: Record<string, (...args: never[]) => unknown>, host: HTMLElement, config?: unknown) => {
  const options = (config ?? {}) as MountOptions;
  const create = mtrl.createFab as unknown as (settings: Record<string, unknown>) => { element: HTMLElement };
  const settings: Record<string, unknown> = { icon: mtrl.__icon, ariaLabel: "Create" };
  for (const key of ["variant", "size"] as const) {
    if (options[key] !== undefined) settings[key] = options[key];
  }
  host.append(create(settings).element);
};

const cases: Case[] = [];

// The three sizes.
for (const size of SIZES) {
  cases.push({ id: `size/${size}/rest`, mount, config: { size }, parts, properties });
}

// The six colour styles, light and dark.
for (const variant of VARIANTS) {
  cases.push({ id: `${variant}/default/rest`, mount, config: { variant }, parts, properties });
  cases.push({ id: `${variant}/default/dark`, scheme: "dark", mount, config: { variant }, parts, properties });
}

// States on the default style: the 8 % hover, 10 % focus and 10 % pressed
// layers, and the hover elevation step the m3 states section names.
for (const state of ["hover", "focus", "pressed"] as const) {
  cases.push({ id: `primary-container/default/${state}`, state, mount, config: { variant: "primary-container" }, parts, properties });
}
cases.push({
  id: "primary-container/default/pressed (ripple wave)",
  state: "pressed",
  mount,
  config: { variant: "primary-container" },
  parts: [{ name: "root", selector: ".mtrl-fab" }, { name: "icon", selector: ".mtrl-fab__icon" }, { name: "ripple wave", selector: ".mtrl-ripple-wave" }],
  properties: ["opacity", "backgroundColor", "width", "height"],
});

// Every size in each state that changes a box: hover and focus keep the size,
// the press does too; the rows exist so a size change would show.
for (const size of ["medium", "large"] as const) {
  cases.push({ id: `primary-container/${size}/hover`, state: "hover", mount, config: { variant: "primary-container", size }, parts, properties });
  cases.push({ id: `primary-container/${size}/pressed`, state: "pressed", mount, config: { variant: "primary-container", size }, parts, properties });
}

const filter = process.argv[2];
const chosen = filter ? cases.filter((testCase) => testCase.id.includes(filter)) : cases;

const harness = await createConformanceHarness({ component: "fab", engines: ["chromium"] });
await harness.page.evaluate((svg) => {
  (window as unknown as { mtrl: Record<string, unknown> }).mtrl.__icon = svg;
}, ICON);
try {
  const rows = await harness.measure(chosen);
  assertFixture(rows);
  console.log(JSON.stringify({ component: "fab", source: harness.source, rows }, null, 2));
} finally {
  await harness.close();
}
