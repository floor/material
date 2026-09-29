/** Search in the packed build: the open view's place in the page and the top layer (FLO-285). */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createSearch from "../src/components/search";

type SearchWindow = Window & { createSearch: typeof createSearch; search: ReturnType<typeof createSearch> };

/** Mounts a search between two paragraphs, optionally in a clipping parent. */
const mount = (page: Page, config: Parameters<typeof createSearch>[0], clip = false) => page.evaluate(({ config, clip }) => {
  const state = window as unknown as SearchWindow;
  state.search?.destroy();
  document.body.replaceChildren();
  const before = document.createElement("p"); before.textContent = "Before";
  const after = document.createElement("p"); after.id = "after"; after.textContent = "After";
  const holder = document.createElement("div");
  if (clip) holder.style.cssText = "overflow:hidden;height:60px;transform:translateZ(0)";
  state.search = state.createSearch(config);
  holder.append(state.search.element);
  document.body.append(before, holder, after);
}, { config, clip });

const layout = (page: Page) => page.evaluate(() => {
  const root = document.querySelector<HTMLElement>(".mtrl-search")!;
  // Before FLO-285 there was no surface: the root was the view.
  const surface = root.querySelector<HTMLElement>(".mtrl-search__surface") ?? root;
  const content = root.querySelector<HTMLElement>(".mtrl-search__content");
  const r = root.getBoundingClientRect(), s = surface.getBoundingClientRect();
  const probe = document.createElement("i"); probe.style.color = "color-mix(in srgb, var(--mtrl-sys-color-scrim) 32%, transparent)"; document.body.append(probe);
  const scrim = getComputedStyle(probe).color; probe.remove();
  const hit = content && content.getBoundingClientRect().height ? document.elementFromPoint(s.left + 20, content.getBoundingClientRect().top + 30) : null;
  return {
    state: root.classList.contains("mtrl-search--view") ? "view" : "bar",
    root: [Math.round(r.top), Math.round(r.height)],
    surface: [Math.round(s.left), Math.round(s.top), Math.round(s.width), Math.round(s.height)],
    bar: [Math.round(r.left), Math.round(r.top), Math.round(r.width)],
    after: Math.round(document.getElementById("after")!.getBoundingClientRect().top),
    topLayer: surface.matches(":popover-open"),
    popover: surface.hasAttribute("popover"),
    scrim: getComputedStyle(surface, "::backdrop").backgroundColor === scrim,
    content: content?.isConnected ? Math.round(content.getBoundingClientRect().height) : 0,
    reachable: hit ? root.contains(hit) : null,
    modal: [surface.tagName, surface.matches(":modal"), surface.getAttribute("role")],
    viewport: [innerWidth, innerHeight],
  };
});

export async function checkSearch(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1000, height: 800 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Docked: the page does not move; the bar and results show over it, in the
  // top layer, placed on the bar, over a 0.32 scrim.
  await mount(page, { placeholder: "Search messages", suggestions: ["Apple", "Banana", "Cherry"] });
  const closed = await layout(page);
  assert.deepEqual([closed.state, closed.root[1], closed.popover], ["bar", 56, false], "docked: a 56dp bar in the page");
  await page.locator(".mtrl-search__input").click();
  await page.waitForFunction(() => document.querySelector(".mtrl-search--view"));
  const docked = await layout(page);
  assert.equal(docked.after, closed.after, "docked: opening does not push the page down");
  assert.equal(docked.root[1], 56, "docked: the bar's place is kept");
  assert.deepEqual([docked.topLayer, docked.scrim], [true, true], "docked: in the top layer, over a 0.32 scrim");
  assert.deepEqual(docked.surface.slice(0, 3), docked.bar, "docked: placed on the bar, its width");
  assert.ok(docked.content >= 240, `docked: results at least 240dp tall (${docked.content})`);
  assert.deepEqual(docked.modal, ["DIALOG", false, "none"], "docked: not modal, and not announced as a dialog");
  // A click on the scrim closes it.
  await page.mouse.click(docked.surface[0] + docked.surface[2] + 100, 700);
  await page.waitForFunction(() => document.querySelector(".mtrl-search--bar"));
  const dismissed = await layout(page);
  assert.deepEqual([dismissed.popover, dismissed.after], [false, closed.after], "the scrim closes it, back in the page");

  // In a parent that clips, the results still show: the top layer escapes it.
  await mount(page, { suggestions: ["Apple", "Banana"] }, true);
  await page.locator(".mtrl-search__input").click();
  await page.waitForFunction(() => document.querySelector(".mtrl-search--view"));
  assert.equal((await layout(page)).reachable, true, "a clipping parent does not hide the results");

  // Full screen: a bar in the page until it opens; then the viewport, modal,
  // with Tab kept inside; Escape returns it to the page.
  await mount(page, { placeholder: "Search", viewMode: "fullscreen", suggestions: ["One"] });
  const bar = await layout(page);
  assert.deepEqual([bar.root[1], bar.surface[3], bar.after > bar.root[0]], [56, 56, true], "full screen, closed: a bar in the page, not covering it");
  await page.locator(".mtrl-search__input").click();
  await page.waitForFunction(() => document.querySelector(".mtrl-search--view"));
  const full = await layout(page);
  assert.deepEqual(full.surface, [0, 0, ...full.viewport], "full screen: the viewport");
  assert.deepEqual(full.modal, ["DIALOG", true, null], "full screen: a modal dialog (showModal)");
  assert.equal(await page.evaluate(() => document.activeElement?.className), "mtrl-search__input", "full screen: the input keeps focus as the dialog opens");
  assert.equal(await page.evaluate(() => { const outside = document.createElement("button"); document.body.append(outside); outside.focus(); const inert = document.activeElement !== outside; outside.remove(); return inert; }), true, "full screen: the page behind is inert");
  // The list opened under the pointer, where the bar was, and the pointer moves
  // over it: hovering is not choosing.
  await page.mouse.move(40, 120);
  assert.equal(await page.evaluate(() => document.querySelectorAll(".mtrl-search__suggestion-item--selected").length), 0, "a list opening under the pointer highlights nothing");
  await page.keyboard.press("Shift+Tab");
  await page.waitForTimeout(300);
  assert.deepEqual(await page.evaluate(() => [document.activeElement?.className, !!document.querySelector(".mtrl-search--view")]), ["mtrl-search__leading-icon", true], "full screen: moving to the back button does not close the view");
  // Escape from the back button is the dialog's cancel.
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector(".mtrl-search--bar"));
  await page.locator(".mtrl-search__input").click();
  await page.waitForFunction(() => document.querySelector(".mtrl-search--view"));
  await page.locator(".mtrl-search__input").focus();
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.querySelector(".mtrl-search--bar"));
  const back = await layout(page);
  assert.deepEqual([back.surface[3], back.after, back.popover], [56, bar.after, false], "Escape: back to a bar in the page");

  await page.evaluate(() => { (window as unknown as SearchWindow).search.destroy(); document.body.replaceChildren(); });
  console.log("Passed packed search: the open view over the page in the top layer (docked under the bar with a scrim, full screen as a modal dialog), the bar's place kept, a clipping parent escaped, scrim and Escape dismissal (FLO-285).");
}
