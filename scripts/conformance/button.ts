#!/usr/bin/env bun
// scripts/conformance/button.ts
/**
 * The "ours" column of the button conformance table: the harness runs these
 * cases on origin/main and prints the JSON the table is written from.
 *
 *   bun run scripts/conformance/button.ts            # every case
 *   bun run scripts/conformance/button.ts density    # rows whose id matches
 *
 * Compose is the other column: `COMPOSE_TOKENS_DIR=.compose-tokens-41.1.19
 * bun run scripts/conformance/compose-tokens.ts --only=ButtonMediumTokens,…
 */
import { createConformanceHarness, type Case } from "./measure";

const SIZES = ["xs", "s", "m", "l", "xl"] as const;
const VARIANTS = ["filled", "tonal", "outlined", "elevated", "text"] as const;

/** The star the icon cases draw: a 1em glyph that scales with the icon box. */
const ICON = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="currentColor" d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`;

const parts = [
  { name: "root", selector: ".mtrl-button" },
  { name: "text", selector: ".mtrl-button__text" },
  { name: "icon", selector: ".mtrl-button__icon" },
  { name: "state layer", selector: ".mtrl-button", pseudo: "::before" as const },
];

type MountOptions = {
  variant?: string;
  size?: string;
  shape?: string;
  disabled?: boolean;
  icon?: boolean;
};

/**
 * One mount for every case, taking its options as the case's data: a closure
 * cannot cross into the page.
 */
const mount = (mtrl: Record<string, (...args: never[]) => unknown>, host: HTMLElement, config?: unknown) => {
  const { variant, size, shape, disabled, icon } = (config ?? {}) as MountOptions;
  const create = mtrl.createButton as unknown as (settings: Record<string, unknown>) => { element: HTMLElement };
  const button = create({ text: "Button", variant, size, shape, disabled, icon: icon ? mtrl.__icon : undefined });
  host.append(button.element);
};

const cases: Case[] = [];

// Every variant at every size, at rest.
for (const variant of VARIANTS) {
  for (const size of SIZES) {
    cases.push({ id: `${variant}/${size}/rest`, mount, config: { variant, size }, parts });
  }
}

// The square shape's corner per size (m3.material.io corner sizes table).
for (const size of SIZES) {
  cases.push({
    id: `filled/${size}/square rest`,
    mount,
    config: { variant: "filled", size, shape: "square" },
    parts: [{ name: "root", selector: ".mtrl-button" }],
    properties: ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius", "height"],
  });
}

// The states on the filled button at every size.
for (const state of ["hover", "focus", "pressed"] as const) {
  for (const size of SIZES) {
    cases.push({ id: `filled/${size}/${state}`, state, mount, config: { variant: "filled", size }, parts });
  }
}

// The press reads the ripple wave: `::before` keeps the hover opacity.
cases.push({
  id: "filled/m/pressed (ripple wave)",
  state: "pressed",
  mount,
  config: { variant: "filled", size: "m" },
  parts: [{ name: "root", selector: ".mtrl-button" }, { name: "ripple wave", selector: ".mtrl-ripple-wave" }],
  properties: ["opacity", "backgroundColor", "width", "height"],
});

// Icon and label: the icon box, the gap between them, and the padding.
for (const size of SIZES) {
  cases.push({
    id: `filled/${size}/icon rest`,
    mount,
    config: { variant: "filled", size, icon: true },
    parts,
    properties: [
      "height", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom", "columnGap", "gap",
      "fontSize", "lineHeight", "fontWeight", "letterSpacing",
    ],
  });
}

// The 48 dp touch target: the ::after overlay at xs and s.
for (const size of ["xs", "s", "m"] as const) {
  cases.push({
    id: `filled/${size}/touch target`,
    mount,
    config: { variant: "filled", size },
    parts: [{ name: "root", selector: ".mtrl-button" }, { name: "hit area", selector: ".mtrl-button", pseudo: "::after" as const }],
    properties: ["content", "height", "top", "bottom", "insetTop", "insetBottom", "transform"],
  });
}

// Density: M3's scale is 0, −1, −2, −3, four dp a step. Small starts at 40.
for (const size of ["xs", "s", "m"] as const) {
  for (const density of [0, -1, -2, -3]) {
    cases.push({ id: `filled/${size}/density ${density}`, density, mount, config: { variant: "filled", size }, parts });
  }
}

// Both halves of the toggle's shape swap at s and m: round → CornerMedium at
// s and CornerLarge at m; square → CornerMedium at s and CornerFull at m.
for (const size of ["xs", "s", "m"] as const) {
  for (const shape of ["round", "square"] as const) {
    cases.push({
      id: `filled/${size}/selected (${shape} toggle)`,
      mount: (mtrl, host, config) => {
        const { shape: shapeName, size: sizeName } = (config ?? {}) as MountOptions;
        const create = mtrl.createButton as unknown as (settings: Record<string, unknown>) => { element: HTMLElement };
        const button = create({ text: "Button", variant: "filled", size: sizeName, shape: shapeName, toggle: true, selected: true });
        host.append(button.element);
      },
      config: { shape, size },
      parts: [{ name: "root", selector: ".mtrl-button" }],
      properties: ["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius", "height"],
    });
  }
}

// Colours: the five variants' container and label, light and dark.
for (const variant of VARIANTS) {
  cases.push({ id: `${variant}/m/dark`, scheme: "dark", mount, config: { variant, size: "m" }, parts });
}
cases.push({ id: "outlined/m/rest (border)", mount, config: { variant: "outlined", size: "m" }, parts,
  properties: ["height", "borderTopWidth", "borderTopColor", "borderTopLeftRadius", "backgroundColor", "color"] });
cases.push({ id: "elevated/m/rest (shadow)", mount, config: { variant: "elevated", size: "m" }, parts,
  properties: ["height", "boxShadow", "backgroundColor"] });
cases.push({ id: "elevated/m/hover (shadow)", state: "hover", mount, config: { variant: "elevated", size: "m" }, parts,
  properties: ["height", "boxShadow", "backgroundColor"] });

// Disabled: container and label opacities.
cases.push({ id: "filled/m/disabled", state: "disabled", mount, config: { variant: "filled", size: "m", disabled: true }, parts,
  properties: ["height", "backgroundColor", "color", "opacity"] });
cases.push({ id: "outlined/m/disabled", state: "disabled", mount, config: { variant: "outlined", size: "m", disabled: true }, parts,
  properties: ["height", "backgroundColor", "color", "borderTopColor", "borderTopWidth"] });

const filter = process.argv[2];
const chosen = filter ? cases.filter((testCase) => testCase.id.includes(filter)) : cases;

const harness = await createConformanceHarness({ component: "button", engines: ["chromium"] });
// The icon SVG rides on the module namespace: a mount is rebuilt from source
// inside the page, so it reads nothing from here but its arguments.
await harness.page.evaluate((svg) => {
  (window as unknown as { mtrl: Record<string, unknown> }).mtrl.__icon = svg;
}, ICON);
try {
  const rows = await harness.measure(chosen);
  console.log(JSON.stringify({ component: "button", source: harness.source, rows }, null, 2));
} finally {
  await harness.close();
}
