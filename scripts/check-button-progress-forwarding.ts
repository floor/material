// The same lazy-reference check runs standalone on source and on every packed button profile.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { chromium, type Page } from "playwright";
import { chromiumProfileDir } from "./browser-profile";
import type createButton from "../src/components/button";

export async function checkButtonProgressForwarding(page: Page, label = "source") {
  const rows = await page.evaluate(async () => {
    const make = (window as unknown as { createButton: typeof createButton }).createButton;
    const rows = [];
    for (const loading of [false, true]) for (const operation of ["show", "value", "indeterminate", "loading"] as const) {
      const button = make({ text: "Save", ...(loading ? { loading: true } : { progress: true }) });
      document.body.append(button.element);
      const initial = button.progress === undefined;
      if (operation === "show") await button.showProgress!();
      if (operation === "value") await button.setProgress!(31);
      if (operation === "indeterminate") await button.setIndeterminate!(false);
      if (operation === "loading") await button.setLoading!(true, "Saving...");
      const progress = button.progress;
      await button.showProgress!();
      const attached = progress?.element === button.element.querySelector(".mtrl-button__progress");
      progress?.setValue(73, false);
      const directValue = progress?.getValue() ?? null;
      await button.setProgress!(41);
      const forwardedValue = progress?.getValue() ?? null;
      await button.hideProgress!();
      await button.showProgress!();
      rows.push({ loading, operation, initial, exposed: !!progress, attached, directValue, forwardedValue,
        stable: !!progress && progress === button.progress });
      button.destroy();
    }
    const plain = make({ text: "Plain" });
    const absent = plain.progress === undefined;
    plain.destroy();
    return { absent, rows };
  });
  console.log("Button progress forwarding (" + label + "): " + JSON.stringify(rows));
  await mkdir("analysis/browser", { recursive: true });
  await Bun.write("analysis/browser/button-progress-forwarding-" + label + ".json", JSON.stringify(rows, null, 2) + "\n");
  assert(rows.absent, "plain buttons do not create a progress instance");
  for (const row of rows.rows) {
    assert(row.initial, "progress remains lazy before the first operation");
    assert(row.exposed, `${label}/${row.operation}: button.progress exposes the lazy instance`);
    assert(row.attached, "the public instance owns the displayed indicator");
    assert.equal(row.directValue, 73, "the public progress API accepts direct updates");
    assert.equal(row.forwardedValue, 41, "button helpers update the same progress instance");
    assert(row.stable, "hide/show retains the public instance");
  }
  console.log("Button progress forwarding passed: " + label);
  return rows;
}

if (import.meta.main) {
  const directory = "analysis/button-progress-forwarding";
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
  const browser = await chromium.launchPersistentContext(chromiumProfileDir);
  try {
    const page = await browser.newPage();
    await page.goto(String(server.url));
    await page.waitForFunction(() => typeof Reflect.get(window, "createButton") === "function");
    await checkButtonProgressForwarding(page);
  } finally { await browser.close(); server.stop(true); }
}
