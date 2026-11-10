#!/usr/bin/env bun
// Build first. --default-profile is the behavioral red on unchanged main dist:
// it measures a real button, rather than failing on a missing optional export.
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium } from "playwright";
import * as sass from "sass";

const defaults = process.argv.includes("--default-profile");
const compile = (source: string) => sass.compileString(
  '@use "config" with ($typescale-tokens: true);' + source,
  { loadPaths: ["src/styles"], style: "compressed", logger: sass.Logger.silent },
).css;
const styles = defaults ? undefined : Object.fromEntries(["ripple", "progress", "button"].map(name =>
  [name, compile(`@use "element-styles" with ($name: "${name}");`)]));
const scratch = await mkdtemp(resolve(".typescale-check-"));
const report: Record<string, unknown> = { defaults };
const browser = await chromium.launch();
try {
  const entry = join(scratch, "entry.ts");
  await writeFile(entry, `
import createButton from ${JSON.stringify(resolve("dist/components/button/index.js"))};
import { defineButton } from ${JSON.stringify(resolve("dist/elements/index.js"))};
${defaults ? `import ${JSON.stringify(resolve("dist/elements/css/button.js"))};` :
`import { registerStyles } from ${JSON.stringify(resolve("dist/elements/index.js"))};\nregisterStyles(${JSON.stringify(styles)});`}
const button = createButton({text:"Factory"});
button.element.id="factory";
document.body.append(button.element);
document.body.insertAdjacentHTML("beforeend", '<m-button>Element</m-button>');
Object.assign(window, { defineButton });
`);
  const built = await Bun.build({ entrypoints: [entry], target: "browser" });
  assert(built.success, String(built.logs));
  const page = await browser.newPage();
  await page.setContent("<!doctype html><html><head></head><body></body></html>");
  const css = (await Bun.file("dist/styles/base.css").text()) +
    (defaults ? await Bun.file("dist/styles/button.css").text() : styles!.button) +
    (defaults ? await Bun.file("dist/elements/preupgrade.css").text() : compile('@use "preupgrade";'));
  await page.addStyleTag({ content: css });
  await page.addStyleTag({ content: ":root{--mtrl-sys-typescale-label-large-font-size:19px}" });
  await page.addScriptTag({ content: await built.outputs[0].text() });
  const fontSize = (selector: string) => page.locator(selector).evaluate(el => getComputedStyle(el).fontSize);
  const factory = await fontSize("#factory");
  const preupgrade = await fontSize("m-button");
  await page.evaluate(() => (window as unknown as { defineButton: () => void }).defineButton());
  const shadow = await fontSize("m-button button");
  report.sentinel = { token: "19px", factory, preupgrade, shadow };
  console.log(JSON.stringify(report.sentinel));
  assert.deepEqual([factory, preupgrade, shadow], ["19px", "19px", "19px"], "role-size token must reach factory, pre-upgrade and shadow typography");
} finally {
  await Bun.write("analysis/browser/typescale-consumers.json", JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  await rm(scratch, { recursive: true, force: true });
}

if (!defaults) await import("./check-typescale-profile");
