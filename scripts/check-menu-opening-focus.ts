// scripts/check-menu-opening-focus.ts
import assert from "node:assert/strict";
import type { Locator, Page } from "playwright";

export async function checkStalledMenuFocus(
  page: Page,
  scopeSelector: string,
  opener: Locator,
  firstId: string,
  label: string,
): Promise<void> {
  const scope = page.locator(scopeSelector);
  const itemSelector = `.mtrl-menu--visible[role="menu"] [data-id="${firstId}"]`;
  // Stall the task that places the menu, before the first transition frame.
  // The opening class must make the first item focusable without a paint.
  await scope.evaluate((host, selector) => {
    const root = host.shadowRoot ?? host;
    host.removeAttribute("data-opening-visibility");
    const observer = new MutationObserver(() => {
      const item = root.querySelector(selector);
      if (!item) return;
      observer.disconnect();
      const resume = performance.now() + 350;
      while (performance.now() < resume) { /* Keep the renderer in this task. */ }
      host.setAttribute("data-opening-visibility", getComputedStyle(item).visibility);
    });
    observer.observe(root, { subtree: true, attributes: true, attributeFilter: ["class"] });
  }, itemSelector);

  await opener.focus();
  await page.keyboard.press("Enter");
  await page.locator(`${scopeSelector}[data-opening-visibility]`).waitFor({ state: "attached", timeout: 5000 });
  assert.equal(await scope.getAttribute("data-opening-visibility"), "visible", `${label}: the first item is visible before the first transition frame`);
  await page.waitForFunction(({ scopeSelector, itemSelector }) => {
    const host = document.querySelector(scopeSelector);
    const item = (host?.shadowRoot ?? host)?.querySelector(itemSelector);
    if (!item) return false;
    return (item.getRootNode() as Document | ShadowRoot).activeElement === item;
  }, { scopeSelector, itemSelector }, { timeout: 5000 });
}
