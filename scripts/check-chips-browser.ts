/** Material chips: packed styles, native keyboard activation and removal. */
import assert from "node:assert/strict";
import { join } from "node:path";
import type { Page } from "playwright";
import type * as Chips from "../src/components/chips";

type ChipWindow = Window & {
  core: typeof Chips;
  chipCases: Chips.ChipComponent[];
  chipChanges: number;
  chipRemovals: number;
};
export async function checkChips(page: Page, artifacts: string): Promise<void> {
  await page.setViewportSize({ width: 920, height: 480 });
  await page.evaluate(() => {
    const state = window as unknown as ChipWindow;
    const { createAssistChip, createFilterChip, createInputChip, createSuggestionChip } = state.core;
    document.documentElement.setAttribute("data-theme", "baseline");
    document.documentElement.setAttribute("data-theme-mode", "light");
    state.chipChanges = 0; state.chipRemovals = 0;
    document.body.style.cssText = "display:flex; flex-wrap:wrap; align-content:flex-start; gap:24px; padding:32px";
    const icon = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
    state.chipCases = [
      createAssistChip({ label: "Assist", leadingIcon: icon }),
      createFilterChip({ label: "Filter", leadingIcon: icon, onChange: () => state.chipChanges++ }),
      createInputChip({ label: "Ada", onRemove: () => state.chipRemovals++ }),
      createSuggestionChip({ label: "Suggestion" }),
      createAssistChip({ label: "Elevated assist", elevated: true }),
      createFilterChip({ label: "Selected filter", selected: true }),
      createInputChip({ label: "Selected input", selected: true, disabled: true }),
      createInputChip({ label: "Avatar", avatar: icon, onRemove: () => {} }),
    ];
    state.chipCases.forEach((chip, index) => { chip.element.id = `chip-${index}`; document.body.append(chip.element); });
  });
  const geometry = await page.evaluate(() => (window as unknown as ChipWindow).chipCases.map(chip => {
    const style = getComputedStyle(chip.element);
    return { height: chip.element.getBoundingClientRect().height, radius: style.borderRadius, background: style.backgroundColor, border: style.borderTopWidth, outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineOffset}`, shadow: style.boxShadow };
  }));
  for (const result of geometry) { assert.equal(result.height, 32); assert.equal(result.radius, "8px"); }
  // The 1dp stroke is an outline drawn inside the chip, so it takes no room and the
  // paddings measure from the edge as M3 gives them (FLO-256).
  for (const result of geometry.slice(0, 4)) { assert.equal(result.background, "rgba(0, 0, 0, 0)"); assert.equal(result.border, "0px"); assert.equal(result.outline, "solid 1px -1px"); }
  assert.notEqual(geometry[4].shadow, "none");
  assert.notEqual(geometry[5].background, "rgba(0, 0, 0, 0)");
  assert.notEqual(geometry[6].background, "rgba(0, 0, 0, 0)");
  assert.equal(await page.locator("#chip-7 .mtrl-chip__action").evaluate(el => getComputedStyle(el).paddingInlineStart), "4px");
  assert.deepEqual(await page.locator("#chip-0 .mtrl-chip__leading-icon").evaluate(el => ({ width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height })), { width: 18, height: 18 });
  await page.locator("#chip-1 .mtrl-chip__action").focus();
  await page.keyboard.press("Space");
  assert.equal(await page.locator("#chip-1 .mtrl-chip__action").getAttribute("aria-checked"), "true");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#chip-1 .mtrl-chip__action").getAttribute("aria-checked"), "false");
  assert.equal(await page.evaluate(() => (window as unknown as ChipWindow).chipChanges), 2);
  await page.locator("#chip-2 .mtrl-chip__action").focus();
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("aria-label")), "Remove Ada");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => (window as unknown as ChipWindow).chipRemovals), 1);
  // Input chips are always removable, and on its own a chip leaves the page (FLO-257).
  assert.equal(await page.locator("#chip-2").count(), 0);
  await page.evaluate(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); });
  await page.screenshot({ path: join(artifacts, "chips-light.png"), animations: "disabled" });
  await page.evaluate(() => document.documentElement.setAttribute("data-theme-mode", "dark"));
  await page.screenshot({ path: join(artifacts, "chips-dark.png"), animations: "disabled" });
  const dark = await page.locator("#chip-5").evaluate(el => getComputedStyle(el).backgroundColor);
  assert.notEqual(dark, geometry[5].background, "Chip selection color must follow the dark theme");
  await page.evaluate(() => {
    const chip = (window as unknown as ChipWindow).chipCases[2];
    document.body.append(chip.element); // back on the page for the truncation check
    chip.element.style.maxWidth = "140px";
    chip.setLabel("A long recipient label that must truncate");
  });
  assert.equal(await page.locator("#chip-2").evaluate(el => el.scrollWidth <= el.clientWidth), true, "Long input labels must fit beside removal");
  assert.equal(await page.locator("#chip-2 .mtrl-chip__label").evaluate(el => el.scrollWidth > el.clientWidth), true);
  // Conformance on the painted page (FLO-256, FLO-259, #202): M3's paddings with the
  // stroke drawn inside, 48dp targets that never overflow, the trailing button, no
  // icon motion on a chip's first render but motion after, the dragged state, and a
  // ripple that belongs to the action alone.
  // With motion on: under reduced motion (which check-core sets before this) nothing
  // animates, so neither the load check nor the motion check would mean anything.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const painted = await page.evaluate(async () => {
    const { createFilterChip, createInputChip } = (window as unknown as ChipWindow).core;
    const icon = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
    const host = document.createElement("div");
    host.style.cssText = "display:flex; gap:24px; padding:24px; width:100%";
    document.body.append(host);
    const plain = createFilterChip({ label: "Plain" });
    const input = createInputChip({ label: "Ada" });
    const menu = createFilterChip({ label: "Price", trailingMenu: true, onTrailingClick: () => {} });
    const selected = createFilterChip({ label: "On", selected: true, leadingIcon: icon });
    for (const chip of [plain, input, menu, selected]) host.append(chip.element);
    await new Promise(requestAnimationFrame);
    const firstFrame = selected.element.querySelector(".mtrl-chip__checkmark")!.getBoundingClientRect().width;
    const box = (element: Element) => element.getBoundingClientRect();
    const around = (chip: typeof input, selector: string) => {
      const c = box(chip.element), l = box(chip.element.querySelector(".mtrl-chip__label")!), i = box(chip.element.querySelector(`${selector} svg`)!);
      return { fromLabel: Math.round(i.left - l.right), toEdge: Math.round(c.right - i.right), overflow: chip.element.scrollWidth - chip.element.clientWidth };
    };
    const hit = (x: number, y: number) => (document.elementFromPoint(x, y) as HTMLElement | null)?.className ?? "";
    const p = box(plain.element), removeIcon = box(input.element.querySelector(".mtrl-chip__remove svg")!);
    const waves = (chip: typeof input) => chip.element.querySelectorAll(".mtrl-ripple-wave").length;
    input.element.querySelector(".mtrl-chip__remove")!.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: removeIcon.left + 9, clientY: removeIcon.top + 9 }));
    const removeRipples = waves(input);
    plain.action.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: p.left + 20, clientY: p.top + 16 }));
    const actionRipples = plain.action.querySelectorAll(".mtrl-ripple-wave").length;
    plain.element.dispatchEvent(new Event("dragstart", { bubbles: true }));
    const dragged = { shadow: getComputedStyle(plain.element).boxShadow, layer: getComputedStyle(plain.element, "::after").opacity };
    plain.element.dispatchEvent(new Event("dragend", { bubbles: true }));
    selected.action.click();
    const motion = { marked: selected.element.classList.contains("mtrl-chip--motion"), transition: getComputedStyle(selected.element.querySelector(".mtrl-chip__checkmark")!).transitionProperty };
    const result = {
      labelStart: Math.round(box(plain.element.querySelector(".mtrl-chip__label")!).left - p.left),
      remove: around(input, ".mtrl-chip__remove"), trailing: around(menu, ".mtrl-chip__trailing-action"),
      hitAbove: hit(p.left + 10, p.top - 6), hitBelow: hit(p.left + 10, p.bottom + 6), hitAboveRemove: hit(removeIcon.left + 9, removeIcon.top - 12),
      firstFrame, removeRipples, actionRipples, dragged, motion,
    };
    for (const chip of [plain, input, menu, selected]) chip.destroy();
    host.remove();
    return result;
  });
  assert.equal(painted.labelStart, 16, "16dp before a label without icons");
  for (const [name, geometry] of [["remove", painted.remove], ["trailing", painted.trailing]] as const) {
    assert.deepEqual(geometry, { fromLabel: 8, toEdge: 8, overflow: 0 }, `${name} icon: 8dp from the label and the edge, no overflow`);
  }
  for (const [where, hit] of [["above", painted.hitAbove], ["below", painted.hitBelow]]) assert.match(hit, /mtrl-chip__action/, `the 48dp target reaches ${where} the chip`);
  assert.match(painted.hitAboveRemove, /mtrl-chip__remove/, "the remove button's 48dp target reaches above its icon");
  assert.equal(painted.firstFrame, 18, "a chip's first render does not animate its checkmark");
  assert.deepEqual(painted.motion.marked, true, "a change after creation animates");
  assert.match(painted.motion.transition, /width/);
  assert.notEqual(painted.dragged.shadow, "none", "dragged: elevation 4");
  assert.equal(painted.dragged.layer, "0.16", "dragged: 0.16 state layer");
  assert.equal(painted.removeRipples, 0, "pressing remove does not ripple the chip");
  assert.ok(painted.actionRipples > 0, "pressing the chip ripples its action");
  await page.emulateMedia({ reducedMotion: "reduce" });

  // A chip set is a grid with one Tab stop (FLO-261): Tab lands on the first cell, an
  // arrow moves on, the focused cell draws the 3px ring 2px outside the chip, and a
  // real Space selects the cell.
  await page.evaluate(() => {
    const { createChips } = (window as unknown as ChipWindow).core;
    const before = document.createElement("button");
    before.id = "before-set"; before.textContent = "before";
    document.body.append(before);
    const set = createChips({ label: "Grid", chips: [{ label: "One", value: "one" }, { label: "Two", value: "two" }, { label: "Three", value: "three" }] });
    set.element.id = "grid-set";
    document.body.append(set.element);
    (window as unknown as { gridSet: typeof set }).gridSet = set;
    before.focus();
  });
  await page.keyboard.press("Tab");
  const tabbed = await page.evaluate(() => ({ role: document.activeElement?.getAttribute("role"), label: document.activeElement?.textContent }));
  assert.deepEqual(tabbed, { role: "gridcell", label: "One" }, "Tab enters the set on its first cell");
  await page.keyboard.press("ArrowRight");
  const ring = await page.evaluate(() => {
    const cell = document.activeElement as HTMLElement, before = getComputedStyle(cell, "::before"), style = getComputedStyle(cell);
    return { label: cell.textContent, width: before.borderTopWidth, inset: before.top, stroke: `${style.outlineWidth} ${style.outlineOffset}` };
  });
  assert.deepEqual(ring, { label: "Two", width: "3px", inset: "-5px", stroke: "1px -1px" }, "the focused cell's 3px ring 2px outside, the stroke kept");
  await page.keyboard.press("Space");
  assert.equal(await page.locator("#grid-set [role=gridcell]").nth(1).getAttribute("aria-selected"), "true", "Space selects the focused cell");
  await page.keyboard.press("Tab");
  assert.notEqual(await page.evaluate(() => document.activeElement?.closest("#grid-set") !== null), true, "Tab leaves the set: one Tab stop");
  // A click focuses the cell as pointer focus: no keyboard ring. Moving focus by
  // script matched :focus-visible and drew it.
  await page.locator("#grid-set [role=gridcell]").nth(2).click();
  const clicked = await page.evaluate(() => {
    const cell = document.activeElement as HTMLElement;
    return { label: cell.textContent, focusVisible: cell.matches(":focus-visible"), ring: getComputedStyle(cell, "::before").borderTopWidth };
  });
  assert.deepEqual(clicked, { label: "Three", focusVisible: false, ring: "0px" }, "a clicked cell takes focus without the keyboard ring");
  // A click on the cell that already has keyboard focus clears the ring too, and so
  // does a click in a browser that ignores focusVisible (Chromium 130): focus()
  // stripped of its options stands in for one.
  const ringOf = () => page.evaluate(() => {
    const cell = document.activeElement as HTMLElement;
    return { label: cell.textContent, ring: getComputedStyle(cell, "::before").borderTopWidth };
  });
  await page.keyboard.press("ArrowLeft");
  assert.deepEqual(await ringOf(), { label: "Two", ring: "3px" }, "the arrow key shows the ring");
  await page.locator("#grid-set [role=gridcell]").nth(1).click();
  assert.deepEqual(await ringOf(), { label: "Two", ring: "0px" }, "a click on the keyboard-focused cell clears its ring");
  await page.keyboard.press("ArrowLeft");
  assert.deepEqual(await ringOf(), { label: "One", ring: "3px" }, "a key after a click shows the ring again");
  await page.evaluate(() => {
    const focus = HTMLElement.prototype.focus;
    (window as unknown as { nativeFocus: typeof focus }).nativeFocus = focus;
    HTMLElement.prototype.focus = function (this: HTMLElement) { focus.call(this); };
  });
  await page.locator("#grid-set [role=gridcell]").nth(2).click();
  assert.deepEqual(await ringOf(), { label: "Three", ring: "0px" }, "no ring where focusVisible is ignored");
  await page.evaluate(() => { HTMLElement.prototype.focus = (window as unknown as { nativeFocus: HTMLElement["focus"] }).nativeFocus; });
  // FLO-542: a chip destroyed directly while it has focus hands focus to its
  // neighbour, as the set's removeChip does; it used to fall to the page.
  const handed = await page.evaluate(() => {
    type Chip = { focus: () => void; destroy: () => void; getValue: () => string | null };
    const set = (window as unknown as { gridSet: { getChips: () => Chip[] } }).gridSet;
    const two = set.getChips()[1];
    two.focus();
    const before = document.activeElement?.textContent;
    two.destroy();
    return { before, after: document.activeElement?.textContent, left: set.getChips().map((chip) => chip.getValue()) };
  });
  assert.deepEqual(handed, { before: "Two", after: "Three", left: ["one", "three"] }, "a focused chip destroyed directly hands focus to the next");
  await page.evaluate(() => {
    (window as unknown as { gridSet: { destroy: () => void } }).gridSet.destroy();
    document.querySelector("#grid-set")?.remove();
    document.querySelector("#before-set")?.remove();
  });

  await page.evaluate(() => {
    for (const chip of (window as unknown as ChipWindow).chipCases) chip.destroy();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-mode");
  });
  assert.equal(await page.locator(".mtrl-chip").count(), 0);
  console.log("Passed packed Material chips: 32px geometry, flat/elevated/selected styles, icons/avatar, native keyboard toggle/removal, M3 paddings and 48dp targets, trailing action, motion only after creation, dragged state, action-only ripple, the set as a one-Tab-stop grid with a 3px focus ring, and cleanup.");
}
