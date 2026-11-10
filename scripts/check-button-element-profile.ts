#!/usr/bin/env bun
/** CI-only, client-only packed public-entry experiment; no SSR saving claim. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, writeFile, symlink, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";
import { build } from "vite";
import { chromium, type Page } from "playwright";
import { createPackageFixture } from "./package-fixture";
import { optionalElementFiles, validateOptionalElementProfiles } from "./optional-element-profiles";

assert(process.env.CI, "This experiment builds and measures in CI only");
const threshold = { initialGzipSaving: 512, totalGzipSaving: 512, packedAdded: 2048, unpackedAdded: 10240, filesAdded: 6 };
const fixture = await createPackageFixture();
const scratch = await mkdtemp(resolve(".button-element-profile-"));
const metrics = (text: string) => ({ raw: Buffer.byteLength(text), gzip: gzipSync(text, { level: 9 }).length,
  brotli: brotliCompressSync(text, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length });
const digest = (text: string) => createHash("sha256").update(text).digest("hex");
const walk = async (dir: string, prefix = ""): Promise<Map<string, string>> => {
  const files = new Map<string, string>();
  for (const item of await readdir(join(dir, prefix), { withFileTypes: true })) {
    const path = prefix + item.name;
    if (item.isDirectory()) for (const pair of await walk(dir, path + "/")) files.set(...pair);
    else if (/\.(?:js|css|d\.ts)$/.test(path)) files.set(path, await readFile(join(dir, path), "utf8"));
  }
  return files;
};
const current = await walk(join(fixture.installed, "dist"));
const baseline = await walk("analysis/fixed-baseline-dist");
validateOptionalElementProfiles(current);
const baseManifest = JSON.parse(await readFile("analysis/fixed-baseline-dist/package.json", "utf8"));
const manifest = JSON.parse(await readFile(join(fixture.installed, "package.json"), "utf8"));
const relocated = (value: unknown): unknown => typeof value === "string" ? value.replace(/^\.\/dist\//, "./") :
  value && typeof value === "object" ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, relocated(item)])) : value;
for (const [key, target] of Object.entries(baseManifest.exports)) assert.deepEqual(relocated(manifest.exports[key]), target, `Existing export ${key} changed`);
assert.deepEqual(Object.keys(manifest.exports).filter(key => !(key in baseManifest.exports)), ["./elements/button-filled-small-round"]);

const identity: Record<string, string> = {};
for (const [path, text] of baseline) {
  assert.equal(current.get(path), text, `${path}: existing output changed against fresh green main`);
  identity[path] = digest(text);
}
assert.deepEqual([...current.keys()].filter(path => !baseline.has(path)).sort(), [...optionalElementFiles].sort(), "Only declared optional files may be additive");
const baseReport = JSON.parse(await readFile("analysis/fixed-baseline-report/browser/button-profile.json", "utf8"));
const packageDelta = { packed: fixture.pack.size - baseReport.package.packed, unpacked: fixture.pack.unpackedSize - baseReport.package.unpacked,
  files: fixture.pack.entryCount - baseReport.package.files };
const report: Record<string, unknown> = {
  prototype: true, clientOnly: true, ssrSaving: null, threshold,
  baseline: { head: "3e0ece66447b010fce85e64e15b76ddaf22fee10", ci: 42869896711, distArtifact: 13788642541, packageReportArtifact: 13790185041 },
  head: Bun.spawnSync(["git", "rev-parse", "HEAD"]).stdout.toString().trim(), ci: process.env.GITHUB_RUN_ID,
  package: { packed: fixture.pack.size, unpacked: fixture.pack.unpackedSize, files: fixture.pack.entryCount, delta: packageDelta },
  identity, excludes: ["HTML", "fonts", "external icons", "source maps"],
  contract: "Visual attributes and property/component setter writes are inert; getters are filled/s/round. General tag retains full setters. Client-only; no SSR definition or saving.",
};
type Output = { html: string; files: Map<string, string> };
const outputs = new Map<string, Output>();
const results: Record<string, { initial: number; deferred: number; total: number; assets: unknown[]; modules: string[]; retainsGeneralStyleModule: boolean; delivery: Record<string, Record<string, number>> }> = {};
const names: string[] = [];
try {
  await mkdir(join(scratch, "node_modules"));
  await symlink(fixture.installed, join(scratch, "node_modules/material"), "dir");
  await writeFile(join(scratch, "package.json"), '{"type":"module","sideEffects":true}');
  for (const mixed of [false, true]) for (const reverse of mixed ? [false, true] : [false]) for (const fixed of [false, true]) {
    const name = `${mixed ? "mixed" : "button"}-${reverse ? "reverse" : "forward"}-${fixed ? "fixed" : "general"}`;
    names.push(name);
    const dir = join(scratch, name); await mkdir(dir);
    const profile = fixed ? "button-filled-small-round" : "button";
    const style = `import 'material/elements/css/${profile}';`;
    const extra = mixed ? `import 'material/elements/css/button';import 'material/styles/tabs';import createTabs from 'material/components/tabs';import {defineButton} from 'material/elements';defineButton({prefix:'general'});const tabs=createTabs({tabs:[{text:'One',value:'one'},{text:'Two',value:'two'}]});document.body.append(tabs.element);` : "";
    const entry = `import 'material/styles/base-elements';import 'material/elements/preupgrade/${profile}.css';
${reverse ? extra + style : style + extra}
import {${fixed ? "defineButtonFilledSmallRound" : "defineButton"} as defineProfile} from 'material/${fixed ? 'elements/button-filled-small-round' : 'elements'}';
const button=document.querySelector('#button'),toggle=document.querySelector('#toggle');
// Own properties before definition must be replayed, and slot nodes preserved.
toggle.selected=true;button.value='early';${fixed ? "button.variant='outlined';button.size='xl';button.shape='square';" : ""}const original=document.querySelector('#slot');
let submits=0,changes=0;document.querySelector('form').addEventListener('submit',event=>{event.preventDefault();submits++});toggle.addEventListener('change',()=>changes++);
window.upgrade=async()=>{defineProfile();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));};
window.state=()=>({submits,changes,sameSlot:document.querySelector('#slot')===original});
Object.assign(window,{button,toggle});document.documentElement.dataset.ready='true';`;
    await writeFile(join(dir, "entry.js"), entry);
    const tag = `m-${profile}`;
    const html = `<!doctype html><html data-theme="baseline"><head><meta charset="utf-8"><style>body{padding:40px}form{display:flex;gap:20px;align-items:start}</style></head><body><form><${tag} id="button" type="submit" name="action"><span id="slot">Continue</span></${tag}><${tag} id="toggle" toggle name="choice" value="yes">Selected</${tag}></form>${mixed ? '<general-button id="general" variant="outlined" size="m" shape="square" toggle selected>General</general-button>' : ''}<script type="module" src="./entry.js"></script></body></html>`;
    await writeFile(join(dir, "index.html"), html);
    const built = await build({ root: dir, base: `/${name}/`, configFile: false, envFile: false, logLevel: "error", build: {
      write: false, minify: true, cssMinify: true, modulePreload: { polyfill: false },
    } });
    assert(!Array.isArray(built) && "output" in built);
    const chunks = built.output.filter(item => item.type === "chunk");
    const htmlAsset = built.output.find(item => item.fileName === "index.html"); assert(htmlAsset?.type === "asset");
    const emittedHtml = String(htmlAsset.source);
    const initial = new Set<string>();
    for (const match of emittedHtml.matchAll(new RegExp(`(?:src|href)="/${name}/([^"?#]+)"`, "g"))) initial.add(match[1]);
    const visit = (file: string): void => {
      const chunk = chunks.find(chunk => chunk.fileName === file);
      for (const imported of [...chunk?.imports ?? [], ...((chunk as unknown as { viteMetadata?: { importedCss?: Set<string> } })?.viteMetadata?.importedCss ?? [])]) {
        if (!initial.has(imported)) { initial.add(imported); visit(imported); }
      }
    };
    for (const file of [...initial]) visit(file);
    const files = new Map<string, string>();
    const assets: { file: string; initial: boolean; raw: number; gzip: number; brotli: number; imports: string[]; dynamicImports: string[] }[] = [];
    for (const item of built.output) {
      const text = item.type === "chunk" ? item.code : typeof item.source === "string" ? item.source : Buffer.from(item.source).toString();
      files.set(item.fileName, text);
      if (/\.(?:js|css)$/.test(item.fileName)) assets.push({ file: item.fileName, initial: initial.has(item.fileName), ...metrics(text),
        imports: item.type === "chunk" ? item.imports : [], dynamicImports: item.type === "chunk" ? item.dynamicImports : [] });
    }
    const modules = [...new Set(chunks.flatMap(chunk => Object.keys(chunk.modules)).filter(path => path.includes("/material/dist/")).map(path => path.split("/material/dist/")[1]))].sort();
    const retainsGeneralStyleModule = modules.includes("elements/css/button.js");
    assert.equal(retainsGeneralStyleModule, !fixed || mixed, `${name}: unexpected general shadow registration retention`);
    assert.equal([...files.values()].some(text => text.includes(".mtrl-button--xl")), !fixed || mixed, `${name}: full general shadow string retention`);
    const initialBytes = assets.filter(asset => asset.initial).reduce((sum, asset) => sum + asset.gzip, 0);
    const deferred = assets.filter(asset => !asset.initial).reduce((sum, asset) => sum + asset.gzip, 0);
    const sum = (selected: typeof assets) => Object.fromEntries((["raw", "gzip", "brotli"] as const).map(metric => [metric, selected.reduce((total, asset) => total + asset[metric], 0)]));
    const delivery = { initial: sum(assets.filter(asset => asset.initial)), deferred: sum(assets.filter(asset => !asset.initial)), total: sum(assets) };
    assert(assets.some(asset => asset.initial && asset.file.endsWith(".css")), "required pre-upgrade/base CSS must be in the initial graph");
    results[name] = { initial: initialBytes, deferred, total: initialBytes + deferred, assets, modules, retainsGeneralStyleModule, delivery };
    outputs.set(name, { html: emittedHtml, files });
  }
  report.results = results;
  report.saving = Object.fromEntries(["button-forward", "mixed-forward", "mixed-reverse"].map(name => [name, {
    initial: results[`${name}-general`].initial - results[`${name}-fixed`].initial,
    total: results[`${name}-general`].total - results[`${name}-fixed`].total,
  }]));
  const browser = await chromium.launch();
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
    const [name, ...rest] = new URL(request.url).pathname.slice(1).split("/");
    const output = outputs.get(name), path = rest.join("/") || "index.html";
    const text = path === "index.html" ? output?.html : output?.files.get(path);
    return new Response(text ?? "missing", { status: text ? 200 : 404, headers: { "Content-Type": path.endsWith(".js") ? "text/javascript" : path.endsWith(".css") ? "text/css" : "text/html" } });
  } });
  const comparisons: string[] = [];
  const requests: Record<string, string[]> = {};
  try {
    for (const fallback of [false, true]) {
      const pages: Page[] = [];
      const errors: string[] = [];
      for (const name of names) {
        const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
        page.setDefaultTimeout(10000);
        if (fallback) await page.addInitScript(() => { Reflect.deleteProperty(CSSStyleSheet.prototype, "replaceSync"); });
        page.on("pageerror", error => errors.push(`${name}: ${error.message}`));
        const key = `${fallback ? "fallback" : "adopted"}/${name}`;
        requests[key] = []; page.on("request", request => requests[key].push(new URL(request.url()).pathname));
        await page.goto(`${server.url}${name}/`);
        await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
        pages.push(page);
      }
      const sample = async (page: Page) => page.evaluate(async () => {
        await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
        await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
        const properties = ["display", "height", "min-width", "gap", "padding-inline-start", "padding-inline-end", "border-radius", "background-color", "color", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "box-shadow", "outline", "border-width", "border-style", "opacity"];
        const values = (element: Element, pseudo?: string) => { const style = getComputedStyle(element, pseudo); return Object.fromEntries(properties.map(key => [key, style.getPropertyValue(key)])); };
        return Object.fromEntries(["button", "toggle", "general"].map(id => {
          const host = document.getElementById(id); if (!host) return [id, null];
          const control = host.shadowRoot?.querySelector("button") as HTMLButtonElement | null;
          return [id, { box: { width: host.getBoundingClientRect().width, height: host.getBoundingClientRect().height },
            style: values(control ?? host), before: values(control ?? host, "::before"), after: values(control ?? host, "::after"),
            disabled: control?.disabled ?? null, selected: control?.getAttribute("aria-pressed") ?? null,
            children: [...host.shadowRoot?.querySelectorAll(".mtrl-button__icon,.mtrl-button__text,.mtrl-button__progress") ?? []].map(child => ({ class: child.className, style: values(child) })),
            label: host.textContent, busy: control?.getAttribute("aria-busy") ?? null }];
        }));
      });
      const compare = async (label: string) => {
        for (let i = 0; i < pages.length; i += 2) assert.deepEqual(await sample(pages[i + 1]), await sample(pages[i]), `${label} ${names[i]} fallback=${fallback}`);
        comparisons.push(`${fallback ? "fallback" : "adopted"}: ${label}`);
      };
      await compare("before delayed definition");
      for (const page of pages) {
        const box = await page.locator("#button").boundingBox(); assert(box && box.height === 40 && box.width > 0, "pre-upgrade geometry must be styled");
        await page.evaluate(async () => { await (window as unknown as { upgrade(): Promise<void> }).upgrade(); });
        assert.equal(await page.evaluate(() => (window as unknown as { state(): { sameSlot: boolean } }).state().sameSlot), true);
      }
      await compare("after upgrade, early property and original slot");
      for (const page of pages) {
        assert.equal(await page.locator("#button button").evaluate(el => getComputedStyle(el).height), "40px");
        const styleCount = await page.locator("#button").evaluate(el => el.shadowRoot!.querySelectorAll("style").length);
        assert.equal(styleCount > 0, fallback, "actual stylesheet delivery path");
        assert.equal(await page.locator("#toggle").evaluate(el => (el as HTMLElement & { selected: boolean }).selected), true);
      }
      for (const page of pages) await page.locator("#button button").hover();
      await compare("hover");
      for (const page of pages) await page.mouse.down();
      await compare("native press");
      for (const page of pages) { await page.mouse.up(); await page.mouse.move(0, 0); await page.evaluate(() => { document.body.tabIndex = -1; document.body.focus(); }); await page.keyboard.press("Tab"); }
      await compare("focus ring");
      for (const page of pages) assert((await page.locator("#button button").evaluate(el => getComputedStyle(el).outline)).includes("3px"), "keyboard focus must paint its ring");
      for (const page of pages) await page.keyboard.press("Enter");
      for (const page of pages) assert.equal(await page.evaluate(() => (window as unknown as { state(): { submits: number } }).state().submits), 2, "pointer and keyboard submit");
      for (const page of pages) await page.locator("#toggle button").click();
      for (const page of pages) assert.equal(await page.evaluate(() => (window as unknown as { state(): { changes: number } }).state().changes), 1);
      for (const page of pages) await page.evaluate(() => (document.querySelector("form") as HTMLFormElement).reset());
      await compare("form reset");
      for (const page of pages) await page.evaluate(() => { document.querySelector("#button")!.setAttribute("disabled", ""); });
      await compare("disabled");
      for (const page of pages) await page.evaluate(async () => {
        const host = document.querySelector("#button") as HTMLElement & { component: { setLoading(v: boolean, text: string): Promise<void> } };
        host.removeAttribute("disabled"); host.setAttribute("loading", ""); await host.component.setLoading(true, "Working");
      });
      await compare("real lazy progress and busy transition");
      for (const page of pages) assert(await page.locator("#button .mtrl-button__progress").isVisible(), "actual lazy progress is visible");
      for (const page of pages) await page.evaluate(async () => {
        const host = document.querySelector("#button") as HTMLElement & { component: { setLoading(v: boolean, text: string): Promise<void> } };
        await host.component.setLoading(false, "Continue");
        host.setAttribute("icon", '<svg viewBox="0 0 24 24"><path d="M4 12h16"/></svg>'); host.setAttribute("icon-position", "end");
        document.documentElement.dir = "rtl"; document.documentElement.style.setProperty("--mtrl-density", "-1"); host.style.setProperty("--mtrl-button-shape", "9px");
      });
      await compare("attribute rebuild, trailing icon, RTL, density, container override");
      for (const page of pages) await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
      await compare("dark and reduced motion");
      for (let i = 1; i < pages.length; i += 2) await pages[i].evaluate(() => {
        const host = document.querySelector("#button") as HTMLElement & { variant: string; size: string; shape: string; component: { setVariant(v: string): unknown; setSize(v: string): unknown; setShape(v: string): unknown } };
        for (const [key, value] of Object.entries({ variant: "outlined", size: "xl", shape: "square" })) host.setAttribute(key, value);
        host.variant = "tonal"; host.size = "m"; host.shape = "square";
        host.component.setVariant("text"); host.component.setSize("l"); host.component.setShape("square");
        if (host.variant !== "filled" || host.size !== "s" || host.shape !== "round") throw Error("fixed getters escaped");
      });
      await compare("fixed unsupported visual writes stay inert");
      for (const page of pages.filter((_, i) => i >= 2)) await page.evaluate(() => {
        const host = document.querySelector("#general") as HTMLElement & { component: { setVariant(v: string): void; setSize(v: string): void; setShape(v: string): void } };
        host.component.setVariant("tonal"); host.component.setSize("l"); host.component.setShape("round");
        if (!host.shadowRoot!.querySelector(".mtrl-button--tonal.mtrl-button--l.mtrl-button--round")) throw Error("general setters lost their complete profile");
      });
      await compare("general full setters coexist in both orders");
      assert.deepEqual(errors, [], "no page errors");
      for (const page of pages) await page.close();
    }
  } finally { server.stop(true); await browser.close(); }
  report.comparisons = comparisons; report.requests = requests;
  const saving = (report.saving as Record<string, { initial: number; total: number }>)["button-forward"];
  report.useful = saving.initial >= threshold.initialGzipSaving && saving.total >= threshold.totalGzipSaving &&
    packageDelta.packed <= threshold.packedAdded && packageDelta.unpacked <= threshold.unpackedAdded && packageDelta.files <= threshold.filesAdded;
  console.log(JSON.stringify({ saving: report.saving, package: report.package, useful: report.useful, comparisons: comparisons.length }, null, 2));
} finally {
  await mkdir("analysis/browser", { recursive: true });
  await writeFile("analysis/browser/button-element-profile.json", JSON.stringify(report, null, 2) + "\n");
  await rm(scratch, { recursive: true, force: true }); await fixture.cleanup();
}
