// The same transition check runs standalone on source and on every packed button profile.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { chromium, type Page } from "playwright";
import type createButton from "../src/components/button";

export async function checkButtonInitialLoading(page: Page, label = "source") {
  const rows = await page.evaluate(async () => {
    const make = (window as unknown as { createButton: typeof createButton }).createButton;
    const state = (button: ReturnType<typeof make>) => {
      const indicator = button.element.querySelector<HTMLElement>(".mtrl-button__progress");
      return { busy: button.element.getAttribute("aria-busy"), disabled: button.element.disabled,
        apiDisabled: button.isDisabled(), text: button.getText(),
        visible: !!indicator && getComputedStyle(indicator).display !== "none" };
    };
    const rows = [];
    for (const disabled of [false, true]) {
      const button = make({ text: "Save", loading: true, disabled });
      document.body.append(button.element);
      const initial = state(button);
      await button.setLoading!(false);
      rows.push({ mode: "clear", disabled, initial, cleared: state(button) });
      button.destroy();
      for (const prepared of [false, true]) {
        const button = make({ text: "Save", loading: true, disabled });
        document.body.append(button.element);
        if (prepared) await button.setProgress!(25);
        const initial = state(button);
        await button.setLoading!(true, "Saving...");
        const resumed = state(button);
        await button.setLoading!(false);
        const cleared = state(button);
        await button.setLoading!(true, "Again...");
        const restarted = state(button);
        await button.setLoading!(false);
        rows.push({ mode: "resume", disabled, prepared, initial, resumed, cleared,
          restarted, restored: state(button) });
        button.destroy();
      }
    }
    const button = make({ text: "Save", progress: true });
    document.body.append(button.element);
    button.disable();
    await button.setLoading!(true, "Working...");
    await button.setLoading!(false);
    rows.push({ mode: "disabled before loading", disabled: true, cleared: state(button) });
    button.destroy();
    return rows;
  });
  console.log("Initial button loading (" + label + "): " + JSON.stringify(rows));
  await mkdir("analysis/browser", { recursive: true });
  await Bun.write("analysis/browser/button-loading-initial-" + label + ".json",
    JSON.stringify({ ciRun: process.env.GITHUB_RUN_ID ?? null, rows }, null, 2) + "\n");
  for (const row of rows) {
    const cleared = { busy: null, disabled: row.disabled, apiDisabled: row.disabled, text: "Save", visible: false };
    assert.deepEqual(row.cleared, cleared, label + "/" + row.mode + ": preserve independent disabled state");
    if (row.mode === "resume" && "resumed" in row) {
      assert.deepEqual(row.resumed, { busy: "true", disabled: true, apiDisabled: true, text: "Saving...", visible: true });
      assert.deepEqual(row.restarted, { busy: "true", disabled: true, apiDisabled: true, text: "Again...", visible: true });
      assert.deepEqual(row.restored, cleared, "every cycle restores the original text and disabled state");
    }
    if ("initial" in row) assert.deepEqual(row.initial, {
      busy: "true", disabled: true, apiDisabled: true, text: "Save", visible: false,
    }, "initial semantics stay synchronous without starting an indicator");
  }
  console.log("Initial loading transitions passed: " + label);
  return rows;
}

if (import.meta.main) {
  const directory = "analysis/button-loading-initial";
  await mkdir(directory, { recursive: true });
  const entry = directory + "/entry.ts";
  await Bun.write(entry, 'import createButton from "../../src/components/button"; Reflect.set(window,"createButton",createButton);');
  const built = await Bun.build({ entrypoints: [entry], outdir: resolve(directory, "out"),
    target: "browser", splitting: true });
  assert(built.success, String(built.logs));
  const files = new Map(await Promise.all(built.outputs.map(async output => [basename(output.path), await output.text()] as const)));
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/js/")) return new Response(files.get(basename(path)) ?? "missing", {
      headers: { "Content-Type": "text/javascript" },
    });
    if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"));
    return new Response('<!doctype html><html><head><link rel="stylesheet" href="/styles.css"></head><body><script type="module" src="/js/entry.js"></script></body></html>', {
      headers: { "Content-Type": "text/html" },
    });
  } });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(String(server.url));
    await page.waitForFunction(() => typeof Reflect.get(window, "createButton") === "function");
    await checkButtonInitialLoading(page);
  } finally { await browser.close(); server.stop(true); }
}
