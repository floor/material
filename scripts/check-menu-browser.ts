// scripts/check-menu-browser.ts
/** Synchronous content keeps menu opening, positioning and focus intact. */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createMenu from "../src/components/menu";

type MenuWindow = Window & { createMenu: typeof createMenu; menu: ReturnType<typeof createMenu> };

export async function checkMenu(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const initial = await page.evaluate(() => {
    document.body.replaceChildren();
    const state = window as unknown as MenuWindow;
    const opener = document.createElement("button");
    opener.id = "menu-opener";
    opener.textContent = "Edit";
    document.body.append(opener);
    opener.focus();
    state.menu = state.createMenu({ opener, items: [
      { id: "disabled", text: "Unavailable", disabled: true },
      { id: "copy", text: "Copy" },
      { id: "paste", text: "Paste" },
    ] });
    const items = Array.from(state.menu.element.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const detached = !state.menu.element.isConnected;
    state.menu.open(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    return {
      detached,
      items: items.map(item => [item.textContent, item.tabIndex]),
      opening: [state.menu.element.style.opacity, state.menu.element.getAttribute("aria-hidden"), document.activeElement === opener],
      duration: getComputedStyle(state.menu.element).transitionDuration,
    };
  });
  assert.deepEqual(initial.items, [["Unavailable", -1], ["Copy", 0], ["Paste", -1]], "items and tab stops exist before opening");
  assert.equal(initial.detached, true, "construction does not attach the menu");
  assert.deepEqual(initial.opening, ["0", "true", true], "opening retains its hidden first frame and deferred focus");
  assert.notEqual(initial.duration, "0s", "opening still has a CSS transition");
  await page.waitForFunction(() => document.activeElement?.getAttribute("data-id") === "disabled");
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-id")), "copy", "disabled items remain reachable for reading, followed by enabled items");
  await page.keyboard.press("ArrowDown");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-id")), "paste", "keyboard navigation after opening");
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => document.activeElement?.id === "menu-opener");
  await page.evaluate(() => (window as unknown as MenuWindow).menu.destroy());

  // A caller can attach an initially visible menu and its opener after creation.
  // The old initialization timer protected this measurement boundary.
  const before = await page.evaluate(() => {
    document.body.replaceChildren();
    const state = window as unknown as MenuWindow;
    const opener = document.createElement("button");
    opener.style.cssText = "position:absolute;left:140px;top:80px;width:100px;height:40px";
    let reads = 0;
    const rect = opener.getBoundingClientRect.bind(opener);
    opener.getBoundingClientRect = () => { reads++; return rect(); };
    state.menu = state.createMenu({ opener, visible: true, items: [{ id: "one", text: "One" }] });
    const initialReads = reads;
    document.body.append(opener, state.menu.element);
    return initialReads;
  });
  assert.equal(before, 0, "initially visible positioning waits for attachment");
  await page.waitForFunction(() => (window as unknown as MenuWindow).menu.element.style.top !== "");
  const placed = await page.evaluate(() => {
    const menu = (window as unknown as MenuWindow).menu.element;
    return [parseFloat(menu.style.left), parseFloat(menu.style.top), menu.classList.contains("mtrl-menu--visible")];
  });
  assert.deepEqual(placed, [140, 120, true], "initially visible menu measures the attached opener");
  await page.evaluate(() => { (window as unknown as MenuWindow).menu.destroy(); document.body.replaceChildren(); });
  console.log("Passed packed menu: synchronous items and tab stops; deferred opening, keyboard focus, navigation, Escape restoration and initially visible positioning.");
}
