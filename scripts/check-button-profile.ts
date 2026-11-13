#!/usr/bin/env bun
// Measure the public entry from the CI package, including its real imports.
// Full and narrow consumers share the real factory, base and progress CSS.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile, symlink, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";
import { build } from "vite";
import { chromium, type Page } from "playwright";
import { createPackageFixture } from "./package-fixture";
import { filledSmallRoundCss } from "./button-style-profile";
import type createButton from "../src/components/button";

const fixture = await createPackageFixture();
const scratch = await mkdtemp(resolve(".button-profile-"));
const metrics = (text: string) => ({ raw: Buffer.byteLength(text), gzip: gzipSync(text, { level: 9 }).length,
  brotli: brotliCompressSync(text, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length });
const fullCss = await Bun.file(join(fixture.installed, "dist/styles/button.css")).text();
const projected = filledSmallRoundCss(fullCss);
assert.equal(await Bun.file(join(fixture.installed, "dist/styles/button-filled-small-round.css")).text(), projected);
const report: Record<string, unknown> = {
  prototype: false, source: "public entry from CI package staged exactly like publish", version: fixture.pack.version,
  commit: Bun.spawnSync(["git", "rev-parse", "HEAD"]).stdout.toString().trim(),
  ciRun: process.env.GITHUB_RUN_ID ?? null,
  bun: Bun.version, nodeForPacking: Bun.spawnSync(["node", "--version"]).stdout.toString().trim(),
  npmForPacking: Bun.spawnSync(["npm", "--version"]).stdout.toString().trim(), vite: (await import("vite")).version,
  package: { packed: fixture.pack.size, unpacked: fixture.pack.unpackedSize, files: fixture.pack.entryCount },
  direct: { full: metrics(fullCss), profile: metrics(projected) },
  excludes: ["HTML", "fonts", "external icon assets", "source maps", "runtime timings"],
};
const output = new Map<string, { html: string; files: Map<string, string> }>();
type Scenario = { initialJs: number; initialCss: number; initial: number; deferred: number; total: number; assets: unknown[] };
const sizes: Record<string, Scenario> = {};
const app = `
import createButton from 'material/components/button';
const config={text:'Continue',variant:'filled',size:'s',shape:'round',progress:true};
const button=createButton(config);button.element.id='button';document.body.append(button.element);
const toggle=createButton({...config,text:'Selected',toggle:true});toggle.element.id='toggle';document.body.append(toggle.element);
Object.assign(window,{button,toggle,createButton});
`;
try {
  await mkdir(join(scratch, "node_modules"));
  await symlink(fixture.installed, join(scratch, "node_modules/material"), "dir");
  await writeFile(join(scratch, "package.json"), '{"type":"module","sideEffects":true}');
  for (const mixed of [false, true]) for (const narrow of [false, true]) {
    const name = `${mixed ? "mixed" : "button"}-${narrow ? "narrow" : "full"}`;
    const dir = join(scratch, name); await mkdir(dir);
    const styles = narrow ? "import 'material/styles/button-filled-small-round';" : "import 'material/styles/button';";
    const tabs = mixed ? "import 'material/styles/tabs';import createTabs from 'material/components/tabs';const tabs=createTabs({tabs:[{text:'One',value:'one'},{text:'Two',value:'two'}]});document.body.append(tabs.element);const general=createButton({text:'General',variant:'outlined',size:'m',shape:'square',toggle:true,selected:true});general.element.id='general';document.body.append(general.element);" : "";
    await writeFile(join(dir, "entry.js"), `import 'material/styles/base';${styles}\n${app}\n${tabs}\ndocument.documentElement.dataset.ready="true";`);
    await writeFile(join(dir, "index.html"), '<!doctype html><html data-theme="baseline"><head><meta charset="utf-8"><style>body{padding:40px}button{margin:8px}</style></head><body><script type="module" src="./entry.js"></script></body></html>');
    const result = await build({ root: dir, base: `/${name}/`, configFile: false, envFile: false, logLevel: "error", build: {
      write: false, minify: true, cssMinify: true, modulePreload: { polyfill: false },
    } });
    assert(!Array.isArray(result) && "output" in result);
    const chunks = result.output.filter(item => item.type === "chunk");
    const htmlAsset = result.output.find(item => item.fileName === "index.html"); assert(htmlAsset?.type === "asset");
    const html = String(htmlAsset.source);
    const initial = new Set<string>();
    for (const match of html.matchAll(/(?:src|href)="\/(?:button|mixed)-(?:full|narrow)\/([^"?#]+)"/g)) initial.add(match[1]);
    const visit = (file: string): void => {
      const chunk = chunks.find(chunk => chunk.fileName === file);
      for (const imported of chunk?.imports ?? []) if (!initial.has(imported)) { initial.add(imported); visit(imported); }
    };
    for (const file of [...initial]) visit(file);
    const files = new Map<string, string>();
    const assets: { file: string; initial: boolean; raw: number; gzip: number; brotli: number }[] = [];
    for (const item of result.output) {
      const text = item.type === "chunk" ? item.code : typeof item.source === "string" ? item.source : Buffer.from(item.source).toString();
      files.set(item.fileName, text);
      if (/\.(?:js|css)$/.test(item.fileName)) assets.push({ file: item.fileName, initial: initial.has(item.fileName), ...metrics(text) });
    }
    assert(assets.some(asset => asset.initial && asset.file.endsWith(".css")), "styled consumer has no CSS");
    assert(assets.some(asset => asset.initial && asset.file.endsWith(".js")), "consumer has no initial JS");
    const initialJs = assets.filter(a => a.initial && a.file.endsWith(".js")).reduce((n, a) => n + a.gzip, 0);
    const initialCss = assets.filter(a => a.initial && a.file.endsWith(".css")).reduce((n, a) => n + a.gzip, 0);
    const deferred = assets.filter(a => !a.initial).reduce((n, a) => n + a.gzip, 0);
    sizes[name] = { initialJs, initialCss, initial: initialJs + initialCss, deferred, total: initialJs + initialCss + deferred, assets };
    output.set(name, { html, files });
  }
  report.sizes = sizes;
  report.saving = { buttonInitial: sizes["button-full"].initial - sizes["button-narrow"].initial,
    buttonTotal: sizes["button-full"].total - sizes["button-narrow"].total,
    mixedInitial: sizes["mixed-full"].initial - sizes["mixed-narrow"].initial,
    mixedTotal: sizes["mixed-full"].total - sizes["mixed-narrow"].total };
  console.log(JSON.stringify({ direct: report.direct, sizes, saving: report.saving }, null, 2));

  const browser = await chromium.launch();
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
    const [name, ...rest] = new URL(request.url).pathname.slice(1).split("/");
    const result = output.get(name), file = rest.join("/") || "index.html";
    const text = file === "index.html" ? result?.html : result?.files.get(file);
    return new Response(text ?? "missing", { status: text ? 200 : 404, headers: { "Content-Type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html" } });
  } });
  try {
    const pages: Page[] = [];
    const pageErrors: Record<string, string[]> = {};
    for (const name of ["button-full", "button-narrow", "mixed-full", "mixed-narrow"]) {
      const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
      page.setDefaultTimeout(10_000);
      pageErrors[name] = [];
      page.on("pageerror", error => pageErrors[name].push(error.message));
      await page.goto(`${server.url}${name}/`);
      await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
      if (name.startsWith("mixed")) { await page.waitForSelector("#general"); await page.waitForSelector('[role="tablist"]'); }
      pages.push(page);
    }
    const sample = async (page: Page) => page.evaluate(async () => {
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
      const properties = ["display", "position", "width", "height", "min-width", "gap", "padding-inline-start", "padding-inline-end", "border-radius", "background-color", "color", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "box-shadow", "outline", "outline-offset", "border-width", "border-style", "opacity", "transition-property", "transition-duration", "transition-timing-function"];
      const values = (el: Element, pseudo?: string) => { const s = getComputedStyle(el, pseudo); return Object.fromEntries(properties.map(p => [p, s.getPropertyValue(p)])); };
      return Object.fromEntries(["#button", "#toggle", "#general"].filter(selector => document.querySelector(selector)).map(selector => {
        const el = document.querySelector<HTMLButtonElement>(selector)!;
        return [selector, { main: values(el), before: values(el, "::before"), after: values(el, "::after"),
          children: [...el.querySelectorAll(".mtrl-button__icon,.mtrl-button__text,.mtrl-button__progress,.mtrl-progress__canvas")].map(child => ({ class: child.className, style: values(child) })),
          disabled: el.disabled, selected: el.getAttribute("aria-pressed"), text: el.textContent }];
      }));
    });
    const outcomes: string[] = [];
    const snapshots: Record<string, Awaited<ReturnType<typeof sample>>> = {};
    const compare = async (name: string) => {
      const full = await sample(pages[0]), narrow = await sample(pages[1]);
      assert.deepEqual(narrow, full, name);
      assert.deepEqual(await sample(pages[3]), await sample(pages[2]), `mixed ${name}`);
      outcomes.push(name); snapshots[name] = full;
    };
    await compare("rest");
    const rest = snapshots.rest["#button"];
    assert.equal(rest.main.height, "40px", "control is a styled small button");
    assert.notEqual(rest.main["background-color"], "rgba(0, 0, 0, 0)", "filled control must have a painted background");
    assert.equal(rest.after.height, "48px", "small button retains its touch target");
    for (const page of pages) await page.locator("#button").hover();
    await compare("hover");
    for (const page of pages) await page.mouse.down();
    await compare("native pointer press");
    assert.notEqual(snapshots["native pointer press"]["#button"].main["border-radius"], rest.main["border-radius"], "native press must change shape");
    for (const page of pages) await page.mouse.up();
    for (const page of pages) { await page.mouse.move(0, 0); await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); }); await page.keyboard.press("Tab"); }
    await compare("keyboard focus");
    assert.equal(snapshots["keyboard focus"]["#button"].main.outline.includes("3px"), true, "keyboard focus ring must be visible");
    for (const page of pages) await page.evaluate(() => (window as unknown as {button:{setActive(v:boolean):void}}).button.setActive(true));
    await compare("pressed active state");
    assert.notEqual(snapshots["pressed active state"]["#button"].main["border-radius"], rest.main["border-radius"], "pressed shape must change");
    for (const page of pages) await page.evaluate(() => { const w=window as unknown as {button:{setActive(v:boolean):void;disable():void};toggle:{setSelected(v:boolean):void}};w.button.setActive(false);w.button.disable();w.toggle.setSelected(true); });
    await compare("disabled and selected toggle");
    assert.equal(snapshots["disabled and selected toggle"]["#button"].disabled, true);
    assert.equal(snapshots["disabled and selected toggle"]["#toggle"].selected, "true");
    for (const page of pages) await page.evaluate(async () => { const w=window as unknown as {button:{enable():void;setLoading(v:boolean,text:string):Promise<void>}};w.button.enable();await w.button.setLoading(true,"Working"); });
    await compare("loading with actual lazy progress");
    assert(snapshots["loading with actual lazy progress"]["#button"].children.some(child => String(child.class).includes("mtrl-button__progress") && child.style.display !== "none"), "loading must show real progress");
    for (const page of pages) await page.evaluate(async () => { const w=window as unknown as {button:{setLoading(v:boolean,text:string):Promise<void>;setIcon(v:string):void}};await w.button.setLoading(false,"Continue");w.button.setIcon('<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>');document.documentElement.dir="rtl";document.documentElement.style.setProperty("--mtrl-density","-1");document.querySelector<HTMLElement>("#button")!.style.setProperty("--mtrl-button-shape","9px"); });
    await compare("icon, RTL, density and container shape override");
    for (const page of pages) await page.emulateMedia({ colorScheme: "dark" });
    await compare("dark theme");
    for (const page of pages) await page.emulateMedia({ reducedMotion: "reduce" });
    await compare("reduced motion");
    // Exercise both file orders directly as well as Vite's bundled cascade.
    // The general sheet must keep restoring the complete setter contract.
    for (const reverse of [false, true]) {
      await pages[3].evaluate(({ fullCss, projected, reverse }) => {
        document.querySelectorAll("[data-profile-order]").forEach(el => el.remove());
        for (const css of reverse ? [projected, fullCss] : [fullCss, projected]) {
          const style = document.createElement("style"); style.dataset.profileOrder = "true";
          style.textContent = css; document.head.append(style);
        }
      }, { fullCss, projected, reverse });
      for (const page of pages.slice(2)) await page.evaluate(() => {
        const button = (window as unknown as {button:{setVariant(v:string):void;setSize(v:string):void;setShape(v:string):void}}).button;
        button.setVariant("outlined"); button.setSize("l"); button.setShape("square");
      });
      await compare(`mixed general setter contract, ${reverse ? "profile first" : "general first"}`);
    }
    // App resets commonly constrain canvases. The button's indicator must be
    // drawn at its 20px icon slot, not squeezed from a 24px standalone canvas.
    const progressSizing = [];
    for (const [index, page] of pages.entries()) {
      const rows = await page.evaluate(async () => {
        const { createButton: makeButton } = window as unknown as { createButton: typeof createButton };
        const reset = document.createElement("style");
        reset.textContent = "canvas { max-width: 100% }";
        document.head.append(reset);
        const rows = [];
        for (const shape of ["flat", "wavy"] as const) {
          const button = makeButton({ text: "Save", progress: { shape },
            icon: '<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>' });
          document.body.append(button.element);
          const box = (el: Element) => {
            const { width, height } = el.getBoundingClientRect();
            return { width, height };
          };
          const before = box(button.element);
          await button.setLoading!(true);
          const slot = button.element.querySelector<HTMLElement>(".mtrl-button__progress")!;
          const canvas = slot.querySelector("canvas")!;
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          const row = { shape, before, loading: box(button.element), slot: box(slot), canvas: box(canvas),
            bitmap: { width: canvas.width, height: canvas.height }, ratio: devicePixelRatio,
            maxWidth: getComputedStyle(canvas).maxWidth };
          await button.setLoading!(false);
          rows.push({ ...row, restored: box(button.element) });
          button.destroy();
        }
        reset.remove();
        return rows;
      });
      progressSizing.push({ page: [...output.keys()][index], rows });
    }
    report.progressSizing = progressSizing;
    console.log(`Button progress sizing: ${JSON.stringify(progressSizing)}`);
    for (const { page, rows } of progressSizing) for (const row of rows) {
      const name = `${page}/${row.shape}`;
      assert.deepEqual(row.slot, { width: 20, height: 20 }, `${name}: icon slot remains 20px`);
      assert.deepEqual(row.canvas, row.slot, `${name}: canvas must match the square icon slot`);
      assert.deepEqual(row.bitmap, { width: 20 * row.ratio, height: 20 * row.ratio }, `${name}: drawing resolution follows the slot`);
      assert.equal(row.maxWidth, "none", `${name}: canvas opts out of app max-width constraints`);
      assert.deepEqual(row.loading, row.before, `${name}: loading does not move the button`);
      assert.deepEqual(row.restored, row.before, `${name}: hiding progress restores its box`);
    }
    for (const [name, errors] of Object.entries(pageErrors)) assert.deepEqual(errors, [], `${name}: browser errors`);
    report.states = outcomes; report.stateSnapshots = snapshots; report.pageErrors = pageErrors;
    console.log(`Public button profile: ${outcomes.length} state comparisons pass`);
  } finally { await browser.close(); server.stop(true); }
} finally {
  await mkdir("analysis/browser", { recursive: true });
  await Bun.write("analysis/browser/button-profile.json", JSON.stringify(report, null, 2) + "\n");
  await Bun.write("analysis/browser/button-filled-small-round.css", projected);
  await rm(scratch, { recursive: true, force: true });
  await fixture.cleanup();
}
