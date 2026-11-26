#!/usr/bin/env bun
// scripts/conformance/fab-menu.ts
/**
 * The "ours" column of the FAB-menu conformance table: the harness runs these
 * cases on origin/main and prints the JSON the table is written from. The
 * fixture asserts itself: every part a row names must be found with a box.
 *
 *   bun run scripts/conformance/fab-menu.ts            # every case
 *   bun run scripts/conformance/fab-menu.ts open       # rows whose id matches
 *
 * Compose is the other column: `COMPOSE_TOKENS_DIR=.compose-tokens-41.1.19
 * bun run scripts/conformance/compose-tokens.ts --only=FabMenuBaselineTokens,…`.
 */
import { assertFixture, createConformanceHarness, type Case } from "./measure";

const COLORS = ["primary", "secondary", "tertiary"] as const;
const SIZES = ["default", "medium", "large"] as const;

const ICON = `<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>`;

/** The FAB itself, its close face, the list, and the first two items. */
const parts = [
  { name: "fab", selector: ".mtrl-fab-menu__fab" },
  { name: "close icon", selector: ".mtrl-fab-menu__close" },
  { name: "list", selector: ".mtrl-fab-menu__list" },
  { name: "item 1", selector: ".mtrl-fab-menu__item:nth-child(1)" },
  { name: "item 2", selector: ".mtrl-fab-menu__item:nth-child(2)" },
  { name: "item content", selector: ".mtrl-fab-menu__item:nth-child(1) .mtrl-fab-menu__item-content" },
  { name: "item icon", selector: ".mtrl-fab-menu__item:nth-child(1) .mtrl-fab-menu__item-icon" },
  { name: "item text", selector: ".mtrl-fab-menu__item:nth-child(1) .mtrl-fab-menu__item-text" },
];

const properties = [
  "height", "width", "minWidth", "paddingLeft", "paddingRight", "paddingTop", "paddingBottom",
  "gap", "columnGap", "rowGap",
  "borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius",
  "backgroundColor", "color", "boxShadow", "borderTopWidth", "borderTopColor",
  "fontSize", "lineHeight", "fontWeight", "letterSpacing",
  "opacity", "content", "display", "visibility",
];

type MountOptions = { color?: string; size?: string };

/**
 * One mount for every case, open. The menu takes three items; the icon rides
 * on the module namespace, and a closure cannot cross into the page.
 */
const mount = (mtrl: Record<string, (...args: never[]) => unknown>, host: HTMLElement, config?: unknown) => {
  const options = (config ?? {}) as MountOptions;
  const create = mtrl.createFabMenu as unknown as (settings: Record<string, unknown>) => {
    element: HTMLElement;
    open?: (event?: Event) => unknown;
  };
  // The m3.material.io FAB menu is the expressive list: pills above the FAB
  // that collapse into a close button. The baseline menu is the other
  // presentation and is not the page's subject.
  const settings: Record<string, unknown> = {
    icon: mtrl.__icon,
    ariaLabel: "Create",
    presentation: "list",
    items: [
      { text: "Item one", icon: mtrl.__icon, value: "one" },
      { text: "Item two", icon: mtrl.__icon, value: "two" },
      { text: "Item three", icon: mtrl.__icon, value: "three" },
    ],
  };
  for (const key of ["color", "size"] as const) {
    if (options[key] !== undefined) settings[key] = options[key];
  }
  const menu = create(settings);
  host.append(menu.element);
  menu.open?.();
};

const cases: Case[] = [];

// The three colour sets, open, light and dark.
for (const color of COLORS) {
  cases.push({ id: `${color}/open`, mount, config: { color }, parts, properties });
  cases.push({ id: `${color}/open dark`, scheme: "dark", mount, config: { color }, parts, properties });
}

// The FAB sizes the menu opens from: the close face is always 56 dp.
for (const size of SIZES) {
  cases.push({ id: `primary/size ${size}/open`, mount, config: { color: "primary", size }, parts, properties });
}

// States on the close face and on an item. The state lands on the first
// part, so the item's own row puts the item first.
cases.push({ id: "primary/close hover", state: "hover", mount, config: { color: "primary" }, parts, properties });
cases.push({
  id: "primary/item hover",
  state: "hover",
  mount,
  config: { color: "primary" },
  before: 450,
  parts: [
    { name: "item 1", selector: ".mtrl-fab-menu__item:nth-child(1)" },
    { name: "item layer", selector: ".mtrl-fab-menu__item:nth-child(1)", pseudo: "::before" as const },
    { name: "list", selector: ".mtrl-fab-menu__list" },
  ],
  properties: ["height", "width", "boxShadow", "backgroundColor", "borderTopLeftRadius", "opacity", "content"],
});
cases.push({
  id: "primary/item pressed",
  state: "pressed",
  mount,
  config: { color: "primary" },
  before: 450,
  parts: [
    { name: "item 1", selector: ".mtrl-fab-menu__item:nth-child(1)" },
    { name: "list", selector: ".mtrl-fab-menu__list" },
  ],
  properties: ["height", "width", "boxShadow", "backgroundColor", "borderTopLeftRadius"],
});

// The anchor: the m3 page says the menu opens from the FAB's top trailing
// edge. The viewport at its left edge cannot fit a 155 px list to the left of
// the FAB, so the component aligns to the start there; the row is measured
// with the FAB against the page's end, where the end alignment can hold.
cases.push({
  id: "primary/anchor at the end edge",
  mount: (mtrl, host) => {
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "width:300px;display:flex;justify-content:flex-end";
    host.append(wrapper);
    const create = mtrl.createFabMenu as unknown as (settings: Record<string, unknown>) => { element: HTMLElement; open?: () => unknown };
    const menu = create({
      icon: mtrl.__icon,
      ariaLabel: "Create",
      presentation: "list",
      color: "primary",
      items: [
        { text: "Item one", icon: mtrl.__icon, value: "one" },
        { text: "Item two", icon: mtrl.__icon, value: "two" },
      ],
    });
    wrapper.append(menu.element);
    menu.open?.();
  },
  parts: [
    { name: "fab", selector: ".mtrl-fab-menu__fab" },
    { name: "list", selector: ".mtrl-fab-menu__list" },
  ],
  properties: ["width", "height"],
});

const filter = process.argv[2];
const chosen = filter ? cases.filter((testCase) => testCase.id.includes(filter)) : cases;

const harness = await createConformanceHarness({ component: "fab-menu", engines: ["chromium"], viewport: { width: 900, height: 760 } });
await harness.page.evaluate((svg) => {
  (window as unknown as { mtrl: Record<string, unknown> }).mtrl.__icon = svg;
}, ICON);
try {
  // Opening runs the list's reveal, which measures the items as it animates:
  // the harness's own settle time covers it, and the list is read after it.
  const rows = await harness.measure(chosen);
  assertFixture(rows);
  console.log(JSON.stringify({ component: "fab-menu", source: harness.source, rows }, null, 2));
} finally {
  await harness.close();
}
