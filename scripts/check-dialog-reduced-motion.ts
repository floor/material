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
  afterOpenCount?: number;
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
    state.afterOpenCount = 0;
    dialog.on("afteropen", () => {
      state.afterOpen = true;
      state.afterOpenCount = (state.afterOpenCount ?? 0) + 1;
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

  // A retry from the first opening must not outlive its close. A first control
  // hidden by its own style keeps the retry pending; closed and reopened in the
  // same task, the retry would still be running in the second opening, and it
  // must not take the focus once its old target becomes visible.
  await page.evaluate(() => {
    const state = window as unknown as ReducedMotionWindow;
    state.reducedDialog?.close();
    const first = document.querySelector<HTMLElement>("#first");
    if (first) first.style.visibility = "hidden";
  });
  await page.evaluate(() => {
    const state = window as unknown as ReducedMotionWindow;
    const dialog = state.reducedDialog;
    if (!dialog) throw new Error("the dialog is missing");
    state.afterOpen = false;
    state.afterOpenCount = 0;
    dialog.open();
  });
  // The hidden first control keeps the initial focus pending, so this case
  // cannot wait for afteropen: the event is held until that focus lands. Wait
  // for the surface to be visible and for a retry frame to have run, then
  // close and reopen from that pending state.
  await page.waitForFunction(() => {
    let host: Element | null = document.querySelector("#first");
    while (host && ![...host.classList].some((name) => name.endsWith("--visible"))) host = host.parentElement;
    return host !== null;
  }, undefined, { timeout: 5000 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const pending = await page.evaluate(() => ({
    active: document.activeElement?.id || document.activeElement?.tagName || "none",
    afterOpenCount: (window as unknown as ReducedMotionWindow).afterOpenCount ?? 0,
  }));
  console.log(`dialog open with the first control hidden: ${JSON.stringify(pending)}`);
  assert.equal(pending.afterOpenCount, 0, "the held opening has not emitted afteropen");
  assert.notEqual(pending.active, "first", "the hidden first control keeps the initial focus pending");
  // Close and reopen in one task: the second opening asks for a new target
  await page.evaluate(() => {
    const state = window as unknown as ReducedMotionWindow;
    const dialog = state.reducedDialog;
    if (!dialog) throw new Error("the dialog is missing");
    state.afterOpen = false;
    state.afterOpenCount = 0;
    dialog.close();
    document.querySelector("#second")?.setAttribute("autofocus", "");
    dialog.open();
  });
  await page.waitForFunction(
    () => (window as unknown as ReducedMotionWindow).afterOpenCount === 1,
    undefined,
    { timeout: 5000 },
  );
  const reopened = await page.evaluate(() => ({
    active: document.activeElement?.id || document.activeElement?.tagName || "none",
    afterOpenCount: (window as unknown as ReducedMotionWindow).afterOpenCount ?? 0,
  }));
  console.log(`dialog reopened: ${JSON.stringify(reopened)}`);
  assert.equal(reopened.active, "second", "the reopened dialog takes the new initial focus");
  assert.equal(reopened.afterOpenCount, 1, "the reopened dialog emits afteropen once");

  // The old target becomes visible: the first opening's retry must be gone
  await page.evaluate(() => {
    const first = document.querySelector<HTMLElement>("#first");
    if (first) first.style.visibility = "visible";
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const settled = await page.evaluate(() => ({
    active: document.activeElement?.id || document.activeElement?.tagName || "none",
    afterOpenCount: (window as unknown as ReducedMotionWindow).afterOpenCount ?? 0,
  }));
  console.log(`dialog after the old target is shown: ${JSON.stringify(settled)}`);
  assert.equal(settled.active, "second", "a closed opening's retry does not take the focus back");
  assert.equal(settled.afterOpenCount, 1, "no second afteropen after the old target is shown");

  assert.deepEqual(errors, [], "dialog page errors");
  console.log("Passed dialog reduced-motion focus: after afteropen the first control holds the focus, and a reopened dialog keeps its new one.");
} finally {
  await browser.close();
}
