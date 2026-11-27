#!/usr/bin/env bun
/**
 * The three-theme read of a keyboard focus ring must not race the focus move.
 *
 * The menu's focus case presses ArrowDown on the opener: the menu opens and
 * moves focus to its first item a frame later. The measurement read the item
 * as soon as its animations settled, which on a cold seed-theme page could be
 * before that move: the item had `outline-style: none` and the seed row
 * recorded a transparent outline (the full matrix run that found this read
 * `#00000000` in WebKit), which then failed to resolve to a theme role.
 *
 * This check boots the packaged fixture (build first: it reads dist/, and
 * dist/theme/ for the seed scheme) and repeats the seed-theme focus read 60
 * times on fresh pages in WebKit, asserting every reading is the 3dp solid
 * Secondary ring. It fails on the read that does not wait for the case's own
 * state selector, and passes once the read waits for it.
 */
import assert from "node:assert/strict";
import { parseColour } from "./conformance/matrix-colours";

// The harness reads this flag at creation; the seed page needs dist/theme/.
process.argv.push(`--theme-cases=${JSON.stringify(["baseline/light/unselected/focus"])}`);

const { createConformanceHarness } = await import("./conformance/measure");
import type { Case } from "./conformance/measure";

const mount = (mtrl: Record<string, unknown>, host: HTMLElement, data: unknown) => {
  const { variant, color, direction, state, selected, grouped } = data as {
    variant: "baseline" | "vertical"; color: "standard" | "vibrant"; direction: "ltr" | "rtl";
    state: string; selected: boolean; grouped: boolean;
  };
  const page = window as Window & { conformanceMenu?: { destroy: () => void } };
  page.conformanceMenu?.destroy();
  document.documentElement.dir = direction;
  host.style.width = "400px";
  const opener = document.createElement("button");
  opener.id = "menu-opener";
  opener.textContent = "Actions";
  host.append(opener);
  const icon = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
  const items = [
    { id: "a", text: "First", icon, shortcut: "⌘A", disabled: state === "disabled" },
    { id: "b", text: "Second", icon, supportingText: "Extra context" },
    { id: "c", text: "Third", icon },
    grouped ? { type: "gap" } : { type: "divider" },
    { id: "d", text: "Fourth", icon, hasSubmenu: true, submenu: [{ id: "child", text: "Child" }] },
    { id: "e", text: "Last", icon },
  ];
  const menu = (mtrl.createMenu as (config: unknown) => { element: HTMLElement; setSelected: (id: string) => void })(
    { opener, variant, color, items, width: "240px", offset: 8, openSubmenuOnHover: true },
  );
  page.conformanceMenu = menu as never;
  if (selected) menu.setSelected("a");
  if (state === "focus") opener.focus();
  else (menu as unknown as { open: (event?: Event, mode?: string) => void }).open(undefined, "mouse");
};

const item = ".mtrl-menu__item[data-id='a']";
const focusCase: Case = {
  id: "baseline/light/unselected/focus",
  mount: mount as unknown as Case["mount"],
  config: { variant: "baseline", color: "standard", grouped: false, direction: "ltr", state: "focus", selected: false },
  scheme: "light",
  density: 0,
  before: 300,
  state: "rest",
  keys: ["ArrowDown"],
  properties: ["outlineColor", "outlineStyle"],
  parts: [
    { name: "item", selector: item, document: true },
    { name: "verifiedState", selector: `${item}:is(:focus-visible,.mtrl-menu__item--keyboard-active,.mtrl-menu__item--active)`, document: true },
  ],
};

const RUNS = 60;

// A case whose verified state can never match: the shared measurement must
// throw, naming the case, the selector and the theme, instead of emitting a
// reading of the wrong state.
const missingCase: Case = {
  ...focusCase,
  id: "baseline/light/unselected/focus-missing",
  parts: [
    { name: "item", selector: item, document: true },
    { name: "verifiedState", selector: `${item}[data-missing='never']`, document: true },
  ],
};

const vanishingMount = (mtrl: Record<string, unknown>, host: HTMLElement) => {
  // The same baseline focus mount, inline (the mount source is serialized).
  (window as Window & { conformanceMenu?: { destroy: () => void } }).conformanceMenu?.destroy();
  document.documentElement.dir = "ltr";
  host.style.width = "400px";
  const opener = document.createElement("button");
  opener.id = "menu-opener";
  opener.textContent = "Actions";
  host.append(opener);
  const icon = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
  (mtrl.createMenu as (config: unknown) => { element: HTMLElement })(
    { opener, variant: "baseline", color: "standard", width: "240px", offset: 8, openSubmenuOnHover: true,
      items: [{ id: "a", text: "First", icon, shortcut: "⌘A" }, { id: "b", text: "Second", icon }, { id: "c", text: "Third", icon }] },
  );
  opener.focus();
  const marker = document.createElement("span");
  marker.setAttribute("data-vanish", "now");
  host.append(marker);
  // The marker is there when the wait lands on it, and its own finite
  // animation removes it on completion: no timer and no inherited delay, so
  // the settle is what carries the animation to its end and the read after
  // it must report the state as vanished.
  marker.animate([{ opacity: "1" }, { opacity: "0.5" }], { duration: 600, fill: "forwards" })
    .finished.then(() => marker.remove()).catch(() => undefined);
};
const vanishingCase: Case = {
  ...focusCase,
  id: "baseline/light/unselected/focus-vanishing",
  mount: vanishingMount as unknown as Case["mount"],
  // No inherited pre-key delay: the marker must be in place when the wait
  // reads, and go away only when its animation finishes during the settle.
  before: 0,
  parts: [
    { name: "item", selector: item, document: true },
    { name: "verifiedState", selector: "[data-vanish='now']", document: true },
  ],
};

const failures: string[] = [];
for (const engine of ["webkit", "chromium"] as const) {
  const harness = await createConformanceHarness({ component: "menu", engine });
  try {
    for (let run = 1; run <= RUNS; run += 1) {
      const rows = await harness.measure([focusCase]);
      const row = rows.find((candidate) => candidate.id === focusCase.id);
      assert.ok(row?.themes, `${engine} run ${run}: no three-theme reading for ${focusCase.id}`);
      const seed = row.themes.seed.item;
      if (!seed) {
        failures.push(`${engine} run ${run}: the item is missing from the seed reading`);
        continue;
      }
      const expected = row.themes.palettes.seed.Secondary;
      const style = seed.style;
      const colour = style.outlineColor ? parseColour(style.outlineColor) : undefined;
      if (style.outlineStyle !== "solid" || colour?.hex !== expected || colour?.opacity !== 1) {
        failures.push(`${engine} run ${run}: outline ${style.outlineStyle} ${style.outlineColor}, expected solid ${expected}`);
      }
    }
    // The negative: a missing verified state throws, naming all three.
    await assert.rejects(
      () => harness.measure([missingCase]),
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        return message.includes(missingCase.id)
          && message.includes("data-missing='never'")
          && /\((?:light|dark|seed)\)/.test(message);
      },
      `${engine}: a missing verified state must throw, naming the case, selector and theme`,
    );
    // A state that lands and then vanishes during the settle reads as no state.
    // The assertion names the specific read, not any error: a wait that never
    // found the marker is a different defect and must not pass as this one.
    await assert.rejects(
      () => harness.measure([vanishingCase]),
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        return message.includes("the verified state vanished before the read")
          && message.includes(vanishingCase.id)
          && message.includes("data-vanish='now'")
          && /\((?:light|dark|seed)\)/.test(message);
      },
      `${engine}: a verified state that vanishes during the settle must throw "vanished before the read" naming the case, selector and theme`,
    );
    console.log(`ok ${engine}: ${RUNS} seed-theme reads are the solid Secondary ring; a missing or vanished state throws naming case, selector and theme`);
  } finally {
    await harness.close();
  }
}
assert.deepEqual(failures, [], `menu focus ring:\n  ${failures.join("\n  ")}`);
console.log(`menu focus ring: ${RUNS} seed-theme reads in Chromium and WebKit, every one the solid Secondary ring.`);
