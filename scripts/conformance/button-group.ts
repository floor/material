#!/usr/bin/env bun
// scripts/conformance/button-group.ts
/**
 * The "ours" column of the button-group conformance table: the harness runs
 * these cases on origin/main and prints the JSON the table is written from.
 *
 *   bun run scripts/conformance/button-group.ts            # every case
 *   bun run scripts/conformance/button-group.ts connected  # rows whose id matches
 *
 * M3's column: m3.material.io's button-groups specs page (standard padding by
 * size, the 2 dp connected gap, the inner corner per size) and Compose's
 * ConnectedButtonGroupSmallTokens in the pinned token files (see
 * compose-tokens.ts).
 */
import { createConformanceHarness, fixtureEngine, selectFixtureCases, type Case } from "./measure";

const SIZES = ["xs", "s", "m", "l", "xl"] as const;

/**
 * The parts of a three-button group: the container, the three buttons, and
 * the middle button's four corners (the inner ones differ from the outer).
 */
const parts = [
  { name: "group", selector: ".mtrl-button-group" },
  { name: "first", selector: ".mtrl-button:nth-child(1)" },
  { name: "middle", selector: ".mtrl-button:nth-child(2)" },
  { name: "last", selector: ".mtrl-button:nth-child(3)" },
];

const properties = [
  "height", "width", "minWidth", "gap", "columnGap", "rowGap",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius",
  "borderTopWidth", "borderTopColor", "backgroundColor", "paddingLeft", "paddingRight",
];

type MountOptions = {
  kind?: string;
  size?: string;
  variant?: string;
  shape?: string;
  density?: string;
  orientation?: string;
  selection?: string;
  count?: number;
  selectFirst?: boolean;
  mixed?: boolean;
};

/** One mount for every case, taking its options as the case's data. */
const mount = (mtrl: Record<string, (...args: never[]) => unknown>, host: HTMLElement, config?: unknown) => {
  const { kind, size, variant, shape, density, orientation, selection, count, selectFirst, mixed } = (config ?? {}) as MountOptions;
  const create = mtrl.createButtonGroup as unknown as (settings: Record<string, unknown>) => { element: HTMLElement };
  const buttons = Array.from({ length: count ?? 3 }, (_, index) => ({
    text: `B${index + 1}`, value: `b${index + 1}`,
    ...(mixed && index === 0 ? { variant: "filled", size: "l", width: "wide" } : {}),
  }));
  const group = create({ kind, size, variant, shape, density, orientation, selection, buttons });
  host.append(group.element);
  // A selected button is the group's first: a click toggles it.
  if (selectFirst) group.element.querySelector<HTMLElement>(".mtrl-button")?.click();
};

const cases: Case[] = [{
  id: "standard/mixed-options", mount, config: { kind: "standard", variant: "tonal", size: "s", mixed: true },
  properties, parts: [
    ...parts, { name: "filledItem", selector: ".mtrl-button-group > .mtrl-button--filled:first-child" },
    { name: "largeItem", selector: ".mtrl-button-group > .mtrl-button--large:first-child" },
    { name: "wideItem", selector: ".mtrl-button-group > .mtrl-button--wide:first-child" },
  ],
}];

// Standard groups: the padding between buttons per size (18/12/8/8/8 dp).
for (const size of SIZES) {
  cases.push({ id: `standard/${size}/rest`, mount, config: { kind: "standard", size }, parts, properties });
}

// Connected groups, round and square: the 2 dp gap and the inner corners
// (4/8/8/16/20 dp), with the outer corner on the same shape scale.
for (const shape of ["round", "square"] as const) {
  for (const size of SIZES) {
    cases.push({ id: `connected/${shape}/${size}/rest`, mount, config: { kind: "connected", size, shape }, parts, properties });
  }
}

// A connected group selects: the selected button becomes a pill (50 % corner).
for (const shape of ["round", "square"] as const) {
  cases.push({ id: `connected/${shape}/m/selected`, mount, config: { kind: "connected", size: "m", shape, selection: "single", selectFirst: true }, parts, properties });
}

// Density: four levels on a small group, whose buttons start at 40 dp.
for (const kind of ["standard", "connected"] as const) {
  for (const density of [0, -1, -2, -3]) {
    cases.push({ id: `${kind}/s/density ${density}`, density, mount, config: { kind, size: "s" }, parts, properties });
  }
}

// The group's own density option, which sets the same variable on itself.
for (const density of ["comfortable", "compact"] as const) {
  cases.push({ id: `standard/s/density option ${density}`, mount, config: { kind: "standard", size: "s", density }, parts, properties });
}

// The group follows its buttons: a denser button takes its group's height
// with it (m3.material.io: "Button groups adapt to the height of the buttons
// inside, including when density is applied").
for (const kind of ["standard", "connected"] as const) {
  for (const density of [0, -2, -3]) {
    cases.push({ id: `${kind}/s/follows buttons at ${density}`, density, mount, config: { kind, size: "s" }, parts,
      properties: ["height", "gap", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"] });
  }
}

// Vertical orientation: the same spacing down the column.
cases.push({ id: "standard/m/vertical", mount, config: { kind: "standard", size: "m", orientation: "vertical" }, parts, properties });
cases.push({ id: "connected/m/vertical", mount, config: { kind: "connected", size: "m", orientation: "vertical" }, parts, properties });

// Pressed: a connected button squares its inner corners to 4 dp while pressed
// (ConnectedButtonGroupSmallTokens.PressedInnerCornerCornerSize), and a
// standard group's pressed button widens while its neighbours narrow (m3:
// "This interaction changes the width, shape, and padding of the selected or
// activated button, which adjusts the width of buttons directly next to it").
cases.push({ id: "connected/m/pressed (middle)", state: "pressed", mount, config: { kind: "connected", size: "m" }, parts, properties });
cases.push({ id: "standard/m/pressed (middle)", state: "pressed", mount, config: { kind: "standard", size: "m" }, parts, properties });

// A standard group's toggle swaps its resting shape on selection (round to
// square, as a standalone toggle button does).
cases.push({ id: "standard/m/selected (toggle)", mount, config: { kind: "standard", size: "m", selection: "single", selectFirst: true }, parts, properties });

// Minimum width: xs and s connected groups have 48 dp targets.
for (const size of ["xs", "s"] as const) {
  cases.push({ id: `connected/m/min width ${size}`, mount, config: { kind: "connected", size, count: 1 }, parts, properties });
}

// The icon-button group the specs page shows (a row of icon buttons).
cases.push({
  id: "standard/m/icon buttons",
  mount: (mtrl, host) => {
    const icon = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="currentColor" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;
    const create = mtrl.createButtonGroup as unknown as (settings: Record<string, unknown>) => { element: HTMLElement };
    const group = create({ kind: "standard", size: "m", buttons: [{ icon, ariaLabel: "One" }, { icon, ariaLabel: "Two" }, { icon, ariaLabel: "Three" }] });
    host.append(group.element);
  },
  parts: [
    { name: "group", selector: ".mtrl-button-group" },
    { name: "first", selector: ".mtrl-icon-button:nth-child(1)" },
    { name: "middle", selector: ".mtrl-icon-button:nth-child(2)" },
    { name: "last", selector: ".mtrl-icon-button:nth-child(3)" },
  ],
  properties,
});

const chosen = selectFixtureCases(cases);
const engine = fixtureEngine();

const harness = await createConformanceHarness({ component: "button-group", engine });
try {
  const rows = await harness.measure(chosen);
  console.log(JSON.stringify({ component: "button-group", source: harness.source, engine, rows }, null, 2));
} finally {
  await harness.close();
}
