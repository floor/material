/**
 * A dialog's initial focus under prefers-reduced-motion: reduce.
 *
 * M3 dialog accessibility, "Initial focus": "When a dialog appears, focus
 * should automatically land on the first interactive element within the
 * dialog." https://m3.material.io/components/dialogs/accessibility, read
 * 2026-11-02.
 *
 * Build first for the stylesheet, then:
 * bun run scripts/check-dialog-reduced-motion.ts
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import type createDialog from "../src/components/dialog";

type ReducedMotionWindow = Window & {
  createDialog: typeof createDialog;
  reducedDialog?: ReturnType<typeof createDialog>;
  reducedTrigger?: HTMLButtonElement;
  afterOpen?: boolean;
};

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 900, height: 700 },
    reducedMotion: "reduce",
  });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addStyleTag({ content: await Bun.file("dist/styles.css").text() });

  const bundle = await Bun.build({
    entrypoints: ["src/components/dialog/index.ts"],
    target: "browser",
  });
  assert(bundle.success, String(bundle.logs));
  await page.evaluate(async (entry) => {
    (window as unknown as ReducedMotionWindow).createDialog = ((await import(entry)) as { default: typeof createDialog }).default;
  }, `data:text/javascript;base64,${Buffer.from(await bundle.outputs[0].text()).toString("base64")}`);

  assert.equal(
    await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
    true,
    "the page asks for reduced motion",
  );

  await page.evaluate(() => {
    const state = window as unknown as ReducedMotionWindow;
    const trigger = document.createElement("button");
    trigger.textContent = "Open";
    document.body.append(trigger);
    trigger.focus();
    const dialog = state.createDialog({
      title: "Edit name",
      content: '<input id="first"><input id="second">',
      buttons: [{ text: "Done", closeDialog: true }],
    });
    state.reducedDialog = dialog;
    state.reducedTrigger = trigger;
    state.afterOpen = false;
    dialog.on("afteropen", () => {
      state.afterOpen = true;
    });
    dialog.open();
  });

  await page.waitForFunction(
    () => (window as unknown as ReducedMotionWindow).afterOpen === true,
    undefined,
    { timeout: 5000 },
  );
  const seen = await page.evaluate(() => {
    const first = document.querySelector<HTMLElement>("#first");
    return {
      active: document.activeElement?.id || document.activeElement?.tagName || "none",
      visibility: first ? getComputedStyle(first).visibility : "missing",
    };
  });
  console.log(`dialog reduced motion: ${JSON.stringify(seen)}`);
  assert.equal(seen.active, "first", "under reduced motion the first control takes the initial focus");
  assert.deepEqual(errors, [], "dialog page errors");
  console.log("Passed dialog reduced-motion focus: after afteropen the first control holds the focus.");
} finally {
  await browser.close();
}
