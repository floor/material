/**
 * A dialog's `afteropen` waits for the initial focus.
 *
 * M3 dialogs, "Behavior": "Dialogs use an enter and exit transition pattern to
 * appear on screen." https://m3.material.io/components/dialogs/guidelines
 * M3 dialogs accessibility, "Initial focus": "When a dialog appears, focus
 * should automatically land on the first interactive element within the
 * dialog." https://m3.material.io/components/dialogs/accessibility
 * Both read 2026-11-02.
 *
 * With a short custom animationDuration under prefers-reduced-motion: reduce,
 * the open timer fires while the focus wait is still running: at 0 ms the
 * surface still computes visibility: hidden, at 40 ms it is visible but the
 * focus is still on its way. `open` already says the surface may not be
 * visible and focus may not be in it; `afteropen` must not.
 *
 * The matrix keeps the passing cells as controls: normal motion lands the
 * focus in the same frame at every duration, and 500 ms lands it long before
 * the timer under either preference.
 *
 * Build first for the stylesheet, then:
 * bun run scripts/check-dialog-afteropen.ts
 */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import type createDialog from "../src/components/dialog";

type AfterOpenWindow = Window & {
  createDialog: typeof createDialog;
  run?: {
    at?: { active: string; visibility: string };
    dialog?: ReturnType<typeof createDialog>;
    trigger?: HTMLButtonElement;
  };
};

const CASES = [
  { motion: "no-preference", duration: 0 },
  { motion: "no-preference", duration: 40 },
  { motion: "reduce", duration: 0 },
  { motion: "reduce", duration: 40 },
  { motion: "reduce", duration: 500 },
] as const;

const browser = await chromium.launch({ headless: true });
try {
  const bundle = await Bun.build({
    entrypoints: ["src/components/dialog/index.ts"],
    target: "browser",
  });
  assert(bundle.success, String(bundle.logs));
  const entry = `data:text/javascript;base64,${Buffer.from(await bundle.outputs[0].text()).toString("base64")}`;
  const stylesheet = await Bun.file("dist/styles.css").text();
  // Every cell runs before anything is asserted: a tree that fails some cells
  // names all of them in one run, not just the first
  const seen: { motion: string; duration: number; active: string; visibility: string }[] = [];

  for (const { motion, duration } of CASES) {
    const page = await browser.newPage({
      viewport: { width: 900, height: 700 },
      reducedMotion: motion,
    });
    try {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.setContent("<!doctype html><html><body></body></html>");
      await page.addStyleTag({ content: stylesheet });
      await page.evaluate(async (entry) => {
        (window as unknown as AfterOpenWindow).createDialog = ((await import(entry)) as { default: typeof createDialog }).default;
      }, entry);

      assert.equal(
        await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
        motion === "reduce",
        `${motion}: the page asks for its motion preference`,
      );

      await page.evaluate((duration) => {
        const state = window as unknown as AfterOpenWindow;
        const trigger = document.createElement("button");
        trigger.textContent = "Open";
        document.body.append(trigger);
        trigger.focus();
        const dialog = state.createDialog({
          title: "Edit name",
          content: '<input id="first"><input id="second">',
          buttons: [{ text: "Done", closeDialog: true }],
          animationDuration: duration,
        });
        const run: NonNullable<AfterOpenWindow["run"]> = { dialog, trigger };
        state.run = run;
        dialog.on("afteropen", () => {
          run.at = {
            active: document.activeElement?.id || document.activeElement?.tagName || "none",
            visibility: getComputedStyle(document.querySelector("#first")!).visibility,
          };
        });
        dialog.open();
      }, duration);

      await page.waitForFunction(
        () => (window as unknown as AfterOpenWindow).run?.at !== undefined,
        undefined,
        { timeout: 5000 },
      );
      const at = await page.evaluate(() => (window as unknown as AfterOpenWindow).run!.at!);
      const row = { motion, duration, ...at };
      seen.push(row);
      console.log(`dialog afteropen ${motion} ${duration}ms: ${JSON.stringify(at)}`);
      assert.deepEqual(errors, [], `${motion} at ${duration}ms: dialog page errors`);
    } finally {
      await page.close();
    }
  }

  // At the moment afteropen fires the initial focus must have landed on the
  // first control; the surface's own visibility is what the focus waited for
  const missed = seen
    .filter((row) => row.active !== "first")
    .map((row) => `${row.motion} at ${row.duration}ms: activeElement is ${row.active}, visibility ${row.visibility}`);
  assert.deepEqual(missed, [], "afteropen fired before the initial focus landed");
  console.log(
    "Passed dialog afteropen focus: the initial focus has landed when afteropen fires at 0, 40 and 500 ms, under both motion preferences.",
  );
} finally {
  await browser.close();
}
