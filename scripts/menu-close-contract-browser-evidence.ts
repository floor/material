// A standalone browser document, with the actual source menu and native
// popovers. Compare the raced precondition with observing it in open()'s task.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import type createMenu from "../src/components/menu";

declare global {
  interface Window { closeContractCreateMenu: typeof createMenu }
}
// An explicit entry exposes the factory without a product build or a website.
const entry = await Bun.build({
  entrypoints: ["scripts/fixtures/menu-close-contract-evidence.ts"],
  target: "browser", format: "iife",
});
assert(entry.success, String(entry.logs));
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.setContent("<!doctype html><body></body>");
  await page.addScriptTag({ content: await entry.outputs[0].text() });
  for (const layer of [undefined, "top"] as const) {
    for (const delayed of [true, false]) {
      const measured = await page.evaluate(async ({ layer, delayed }) => {
        const opener = document.createElement("button"); document.body.append(opener);
        const menu = window.closeContractCreateMenu({ opener, layer, items: [{ id: "copy", text: "Copy" }] });
        const events: string[] = [];
        menu.on("open", () => events.push("open"));
        menu.on("close", () => events.push("close"));
        // Initialization was queued when the factory returned; this task follows it.
        await new Promise(resolve => setTimeout(resolve, 0));
        menu.open();
        const opened = performance.now();
        if (delayed) {
          const deadline = performance.now() + 40;
          while (performance.now() < deadline) { /* controlled scheduler pause */ }
          await new Promise(resolve => setTimeout(resolve, 3));
        }
        const beforeClick = menu.element.classList.contains("mtrl-menu--visible");
        const elapsed = performance.now() - opened;
        document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        const openAfterClick = menu.isOpen();
        await new Promise(resolve => setTimeout(resolve, 160));
        const visibleAfter = menu.element.classList.contains("mtrl-menu--visible");
        menu.destroy(); opener.remove();
        return { beforeClick, openAfterClick, visibleAfter, events, elapsed };
      }, { layer, delayed });
      console.log(JSON.stringify({ layer: layer ?? "default", delayed, ...measured }));
      assert.equal(measured.beforeClick, delayed, "The delayed assertion races the surface reveal");
      assert.equal(measured.openAfterClick, false);
      assert.equal(measured.visibleAfter, false);
      assert.deepEqual(measured.events, ["open", "close"]);
    }
  }
} finally { await browser.close(); }
