#!/usr/bin/env bun
// scripts/conformance/icon-button.ts
/**
 * The "ours" column of the icon-button conformance table: the harness runs
 * these cases on origin/main and prints the JSON the table is written from.
 * The fixture asserts itself: a part a row names must be found and have a
 * box, or the run fails instead of printing a table row.
 *
 *   bun run scripts/conformance/icon-button.ts            # every case
 *   bun run scripts/conformance/icon-button.ts width      # rows whose id matches
 *
 * Compose is the other column: `COMPOSE_TOKENS_DIR=.compose-tokens-41.1.19
 * bun run scripts/conformance/compose-tokens.ts --only=IconButtonMediumTokens,…`.
 */
import { assertFixture, createConformanceHarness, type Case } from "./measure";

const SIZES = ["xs", "s", "m", "l", "xl"] as const;
const VARIANTS = ["filled", "tonal", "outlined", "standard"] as const;

/** The star the icon cases draw: a 1em glyph that scales with the icon box. */
const ICON = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="currentColor" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;

const parts = [
  { name: "root", selector: ".mtrl-icon-button" },
  { name: "icon", selector: ".mtrl-icon-button__icon" },
  { name: "state layer", selector: ".mtrl-icon-button", pseudo: "::before" as const },
];

const properties = [
  "height", "width", "minWidth", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius",
  "borderTopWidth", "borderTopColor", "backgroundColor", "color", "opacity",
  "outlineStyle", "outlineWidth", "outlineColor", "outlineOffset", "boxShadow",
];

type MountOptions = {
  variant?: string;
  size?: string;
  shape?: string;
  width?: string;
  toggle?: boolean;
  selected?: boolean;
  disabled?: boolean;
};

/**
 * One mount for every case, taking its options as the case's data: the icon
 * rides on the module namespace, and a closure cannot cross into the page.
 */
const mount = (mtrl: Record<string, (...args: never[]) => unknown>, host: HTMLElement, config?: unknown) => {
  const options = (config ?? {}) as MountOptions;
  const create = mtrl.createIconButton as unknown as (settings: Record<string, unknown>) => { element: HTMLElement };
  // Only the keys a case sets reach the factory: a key present with an
  // undefined value is not the same call (it can drop a default class).
  const settings: Record<string, unknown> = { icon: mtrl.__icon, ariaLabel: "Button" };
  for (const key of ["variant", "size", "shape", "width"] as const) {
    if (options[key] !== undefined) settings[key] = options[key];
  }
  if (options.toggle) {
    settings.toggle = true;
    settings.selected = options.selected === true;
    settings.selectedIcon = mtrl.__icon;
  }
  if (options.disabled) settings.disabled = true;
  const button = create(settings);
  host.append(button.element);
};

const cases: Case[] = [];

// Every variant at every size at its default width.
for (const variant of VARIANTS) {
  for (const size of SIZES) {
    cases.push({ id: `${variant}/${size}/rest`, mount, config: { variant, size }, parts, properties });
  }
}

// The three widths: narrow and wide beside the default of the rest rows.
for (const width of ["narrow", "wide"] as const) {
  for (const size of SIZES) {
    cases.push({ id: `filled/${size}/width ${width}`, mount, config: { variant: "filled", size, width }, parts, properties });
  }
}

// The square shape, at rest and pressed (pressed 8/8/12/16/16 dp).
for (const size of SIZES) {
  cases.push({
    id: `filled/${size}/square rest`,
    mount,
    config: { variant: "filled", size, shape: "square" },
    parts: [{ name: "root", selector: ".mtrl-icon-button" }, { name: "icon", selector: ".mtrl-icon-button__icon" }],
    properties: ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius", "height", "width"],
  });
  cases.push({
    id: `filled/${size}/square pressed`,
    state: "pressed",
    mount,
    config: { variant: "filled", size, shape: "square" },
    parts: [{ name: "root", selector: ".mtrl-icon-button" }, { name: "icon", selector: ".mtrl-icon-button__icon" }],
    properties: ["height", "width", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"],
  });
}

// Toggle: the unselected and selected colour roles of each variant, and the
// round-to-square swap of a selected toggle.
for (const variant of VARIANTS) {
  for (const selected of [false, true]) {
    cases.push({
      id: `${variant}/m/toggle ${selected ? "selected" : "unselected"}`,
      mount,
      config: { variant, size: "m", toggle: true, selected },
      parts,
      properties,
    });
  }
}
cases.push({
  id: "filled/m/toggle selected shape",
  mount,
  config: { variant: "filled", size: "m", toggle: true, selected: true },
  parts: [{ name: "root", selector: ".mtrl-icon-button" }, { name: "icon", selector: ".mtrl-icon-button__icon" }],
  properties: ["height", "width", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"],
});

// The selected shape at every size: a round toggle becomes square, its corner
// the size's SelectedContainerShapeRound.
for (const size of SIZES) {
  cases.push({
    id: `filled/${size}/toggle selected corner`,
    mount,
    config: { variant: "filled", size, toggle: true, selected: true },
    parts: [{ name: "root", selector: ".mtrl-icon-button" }, { name: "icon", selector: ".mtrl-icon-button__icon" }],
    properties: ["height", "width", "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"],
  });
}

// States on the filled button, and the state layer's opacities.
for (const state of ["hover", "focus", "pressed"] as const) {
  cases.push({ id: `filled/m/${state}`, state, mount, config: { variant: "filled", size: "m" }, parts, properties });
}
cases.push({
  id: "filled/m/pressed (ripple wave)",
  state: "pressed",
  mount,
  config: { variant: "filled", size: "m" },
  parts: [{ name: "root", selector: ".mtrl-icon-button" }, { name: "icon", selector: ".mtrl-icon-button__icon" }, { name: "ripple wave", selector: ".mtrl-ripple-wave" }],
  properties: ["opacity", "backgroundColor", "width", "height"],
});

// Disabled, per variant.
for (const variant of VARIANTS) {
  cases.push({
    id: `${variant}/m/disabled`,
    state: "disabled",
    mount,
    config: { variant, size: "m", disabled: true },
    parts,
    properties,
  });
}

// Dark, per variant.
for (const variant of VARIANTS) {
  cases.push({ id: `${variant}/m/dark`, scheme: "dark", mount, config: { variant, size: "m" }, parts, properties });
}

// Density: M3's scale is 0, −1, −2, −3, four dp a step.
for (const size of ["s", "m"] as const) {
  for (const density of [0, -1, -2, -3]) {
    cases.push({ id: `filled/${size}/density ${density}`, density, mount, config: { variant: "filled", size }, parts, properties });
  }
}

// The 48 dp target at xs and s.
for (const size of ["xs", "s"] as const) {
  cases.push({
    id: `filled/${size}/touch target`,
    mount,
    config: { variant: "filled", size },
    parts: [
      { name: "root", selector: ".mtrl-icon-button" },
      { name: "hit area", selector: ".mtrl-icon-button", pseudo: "::after" as const },
    ],
    properties: ["content", "height", "top", "bottom", "insetTop", "insetBottom", "transform"],
  });
}

const filter = process.argv[2];
const chosen = filter ? cases.filter((testCase) => testCase.id.includes(filter)) : cases;

const harness = await createConformanceHarness({ component: "icon-button", engines: ["chromium"] });
await harness.page.evaluate((svg) => {
  (window as unknown as { mtrl: Record<string, unknown> }).mtrl.__icon = svg;
}, ICON);
try {
  const rows = await harness.measure(chosen);
  // Self-asserting fixture: every row found its root and its icon.
  assertFixture(rows);
  console.log(JSON.stringify({ component: "icon-button", source: harness.source, rows }, null, 2));
} finally {
  await harness.close();
}
