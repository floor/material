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
  const itemSelector = visibleItem(firstId);
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
  await waitForItemFocus(page, scopeSelector, itemSelector, label);
}

const visibleItem = (id: string): string => `.mtrl-menu--visible[role="menu"] [data-id="${id}"]`;

async function waitForItemFocus(page: Page, scopeSelector: string, itemSelector: string, label: string): Promise<void> {
  try {
    await page.waitForFunction(({ scopeSelector, itemSelector }) => {
      const host = document.querySelector(scopeSelector);
      const item = (host?.shadowRoot ?? host)?.querySelector(itemSelector);
      if (!item) return false;
      return (item.getRootNode() as Document | ShadowRoot).activeElement === item;
    }, { scopeSelector, itemSelector }, { timeout: 5000 });
  } catch (error) {
    throw new Error(`${label}: the first item did not receive focus after Enter`, { cause: error });
  }
}

export async function checkMenuConsumerFocus(page: Page, webkit: boolean, check: (name: string) => void): Promise<void> {
  const url = page.url();
  const ready = () => page.waitForFunction(() => "ready" in window && window.ready === true);
  await ready();
  await page.locator("#host").evaluate(host => {
    host.innerHTML = `<m-fab-menu id="menu-fab" presentation="menu" aria-label="New">
      <m-fab-menu-item value="document">Document</m-fab-menu-item>
      <m-fab-menu-item value="sheet">Sheet</m-fab-menu-item>
    </m-fab-menu>`;
  });
  await checkStalledMenuFocus(page, "#menu-fab", page.getByRole("button", { name: "New" }), "document", "FAB menu");
  await page.keyboard.press("Escape");
  await page.locator("#menu-fab[open]").waitFor({ state: "detached", timeout: 5000 });
  check("FAB menu: the menu presentation focuses the first item after an opening stall");

  const select = "#submenu-select";
  const mountSelect = async (top: boolean): Promise<Locator> => {
    await page.goto(url);
    await ready();
    await page.evaluate(top => {
      const { createSelect } = (window as unknown as { mtrl: { createSelect: (config: object) => { element: HTMLElement } } }).mtrl;
      const host = document.getElementById("host")!;
      host.id = "submenu-select";
      host.style.width = "280px";
      const select = createSelect({
        label: "Fruit",
        options: [
          { id: "apple", text: "Apple" },
          { id: "more", text: "More", hasSubmenu: true, submenu: [{ id: "cherry", text: "Cherry" }] },
        ],
        ...(top ? { layer: "top" } : {}),
      });
      host.append(select.element);
    }, top);
    return page.locator(`${select} input`);
  };

  for (const top of [false, true]) {
    const label = `select with submenu options (${top ? "top" : "default"} layer)`;
    const opener = await mountSelect(top);
    await checkStalledMenuFocus(page, select, opener, "apple", label);
    const popup = page.locator(`${select} .mtrl-menu--visible`);
    assert.equal(await popup.evaluate(menu => menu.matches(":popover-open")), top, `${label}: opened in the requested layer`);
    check(`${label}: focuses the first item after an opening stall`);
  }

  // A cold top-layer opening also lost the handoff in WebKit without a stall.
  if (webkit) {
    const runs = 20;
    for (let run = 1; run <= runs; run += 1) {
      const opener = await mountSelect(true);
      await opener.focus();
      await page.keyboard.press("Enter");
      await waitForItemFocus(page, select, visibleItem("apple"), `top-layer submenu select, WebKit opening ${run}/${runs}`);
    }
    check(`select with submenu options (top layer): focuses the first item in all ${runs} WebKit openings without a stall`);
  }
}
