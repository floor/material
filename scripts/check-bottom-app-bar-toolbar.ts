// CI-only prototype evidence: packed baseline, retained graphs, styled parity.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";
import { build } from "vite";
import { chromium, type Page } from "playwright";
import { createPackageFixture } from "./package-fixture";

const receipt = { commit: "88eb8ce8a84fc249f9e890bbb8a9ac8c510e57c9", run: 42894840574 };
const cwd = process.cwd();
const candidate = await createPackageFixture();
let baseline: Awaited<ReturnType<typeof createPackageFixture>>;
try { process.chdir(resolve(".prototype-baseline")); baseline = await createPackageFixture(); }
finally { process.chdir(cwd); }
const scratch = await mkdtemp(resolve(".bottom-app-bar-toolbar-"));
const report: Record<string, unknown> = { prototype: true, baseline: receipt, ci: process.env.GITHUB_RUN_ID,
  package: { candidate: candidate.pack, baseline: baseline.pack }, bun: Bun.version };
const metrics = (bytes: Uint8Array) => ({ raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length,
  brotli: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length,
  sha256: createHash("sha256").update(bytes).digest("hex") });
const failures: string[] = [];
const check = (ok: boolean, message: string) => { if (!ok) failures.push(message); };
const output = new Map<string, { html: string; files: Map<string, string> }>();
const sizes: Record<string, unknown> = {};
const states: string[] = [];
const browser = await chromium.launch();
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
  const [name, ...rest] = new URL(request.url).pathname.slice(1).split("/");
  const page = output.get(name), file = rest.join("/") || "index.html";
  const text = file === "index.html" ? page?.html : page?.files.get(file);
  return new Response(text ?? "missing", { status: text ? 200 : 404, headers: {
    "Content-Type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html",
  } });
} });
try {
  // Compare all existing default payloads independently, allowing only the
  // toolbar's deliberate shared-core extraction and catalogue provenance.
  const unchanged: string[] = [], changed: string[] = [];
  const walk = async (dir = ""): Promise<void> => {
    for (const entry of await readdir(join(baseline.installed, "dist", dir), { withFileTypes: true })) {
      const path = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) { await walk(path); continue; }
      if (path === "tokens/catalogue.json" || path === "package.json" || path.startsWith("components/toolbar/")) continue;
      const before = await readFile(join(baseline.installed, "dist", path));
      const after = await readFile(join(candidate.installed, "dist", path));
      (before.equals(after) ? unchanged : changed).push(path);
    }
  };
  await walk(); report.defaultPayloads = { unchanged, changed };
  check(changed.length === 0, "existing legacy/default CSS, elements, declarations or SSR payload changed");

  const bundle = async (label: string, installed: string, source: string) => {
    const dir = join(scratch, label); await mkdir(join(dir, "node_modules"), { recursive: true });
    await symlink(installed, join(dir, "node_modules/material"), "dir");
    await writeFile(join(dir, "package.json"), '{"type":"module"}');
    const entry = join(dir, "all-js.ts"); await writeFile(entry, source);
    const result = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
    assert(result.success, String(result.logs));
    assert.equal(result.outputs.length, 1);
    return new Uint8Array(await result.outputs[0].arrayBuffer());
  };
  const rootBefore = await bundle("baseline-root", baseline.installed, "export * from 'material';\n");
  const rootAfter = await bundle("candidate-root", candidate.installed, "export * from 'material';\n");
  const legacyBefore = await bundle("baseline-legacy", baseline.installed, "export * from 'material/components/bottom-app-bar';\n");
  const legacyAfter = await bundle("candidate-legacy", candidate.installed, "export * from 'material/components/bottom-app-bar';\n");
  const optIn = await bundle("candidate-opt-in", candidate.installed, "export * from 'material/components/bottom-app-bar-toolbar';\n");
  assert.equal(metrics(rootBefore).gzip, 131091, "independent baseline must reproduce its green CI root ruler");
  const rootEqual = Buffer.from(rootBefore).equals(Buffer.from(rootAfter));
  report.graphs = { root: { baseline: metrics(rootBefore), candidate: metrics(rootAfter), identical: rootEqual },
    legacy: { baseline: metrics(legacyBefore), candidate: metrics(legacyAfter) }, optIn: metrics(optIn) };
  check(rootEqual, "root retained JS bytes changed during shared-core factoring");
  check(Buffer.from(legacyBefore).equals(Buffer.from(legacyAfter)), "legacy entry retained JS bytes changed");
  check(!Buffer.from(rootAfter).includes("createBottomAppBarToolbar"), "opt-in marker leaked into root");
  check(Buffer.from(optIn).includes("createBottomAppBarToolbar"), "positive opt-in graph control is missing");
  console.log(JSON.stringify({ graphs: report.graphs, changedDefaults: changed }));

  const pageBuild = async (name: string, installed: string, source: string) => {
    const dir = join(scratch, name); await mkdir(join(dir, "node_modules"), { recursive: true });
    await symlink(installed, join(dir, "node_modules/material"), "dir");
    await writeFile(join(dir, "package.json"), '{"type":"module","sideEffects":true}');
    await writeFile(join(dir, "entry.js"), source);
    await writeFile(join(dir, "index.html"), '<!doctype html><html data-theme="baseline"><head><meta charset="utf-8"><style>body{margin:0;min-height:5000px}.probe{position:relative;width:min(360px,100%);height:160px}button{width:44px;height:40px;padding:0;border:0}</style></head><body><script type="module" src="./entry.js"></script></body></html>');
    const result = await build({ root: dir, base: `/${name}/`, configFile: false, envFile: false, logLevel: "error", build: {
      write: false, minify: true, cssMinify: true, modulePreload: { polyfill: false },
    } });
    assert(!Array.isArray(result) && "output" in result);
    const htmlAsset = result.output.find(item => item.fileName === "index.html"); assert(htmlAsset?.type === "asset");
    const html = String(htmlAsset.source), files = new Map<string, string>();
    const initial = new Set([...html.matchAll(/(?:src|href)="[^"?#]*\/([^/"?#]+\.(?:js|css))"/g)].map(match => `assets/${match[1]}`));
    const chunks = result.output.filter(item => item.type === "chunk");
    const visit = (name: string) => {
      for (const imported of chunks.find(chunk => chunk.fileName === name)?.imports ?? []) {
        if (!initial.has(imported)) { initial.add(imported); visit(imported); }
      }
    };
    [...initial].forEach(visit);
    const assets: { path: string; initial: boolean; raw: number; gzip: number; brotli: number; sha256: string }[] = [];
    for (const item of result.output) {
      const text = item.type === "chunk" ? item.code : typeof item.source === "string" ? item.source : Buffer.from(item.source).toString();
      files.set(item.fileName, text);
      if (/\.(js|css)$/.test(item.fileName)) assets.push({ path: item.fileName, initial: initial.has(item.fileName), ...metrics(Buffer.from(text)) });
    }
    assert(assets.some(asset => asset.initial && asset.path.endsWith(".css")), "missing real initial CSS");
    sizes[name] = { initialJs: assets.filter(a => a.initial && a.path.endsWith(".js")).reduce((n, a) => n + a.gzip, 0),
      initialCss: assets.filter(a => a.initial && a.path.endsWith(".css")).reduce((n, a) => n + a.gzip, 0),
      initial: assets.filter(a => a.initial).reduce((n, a) => n + a.gzip, 0),
      deferred: assets.filter(a => !a.initial).reduce((n, a) => n + a.gzip, 0), assets };
    output.set(name, { html, files });
  };
  // Separate standalone styled consumers: mixed parity pages below are not
  // mistaken for the standalone delivery cost of either entry.
  for (const opt of [false, true]) await pageBuild(`cost-${opt ? "opt-in" : "legacy"}`, candidate.installed,
    `import 'material/styles/base';import 'material/styles/${opt ? "bottom-app-bar-toolbar" : "bottom-app-bar"}';` +
    `import make from 'material/components/${opt ? "bottom-app-bar-toolbar" : "bottom-app-bar"}';document.body.append(make().element);`);

  const app = (opt: boolean) => `
import make from 'material/components/${opt ? "bottom-app-bar-toolbar" : "bottom-app-bar"}';
import legacy from 'material/components/bottom-app-bar';
import toolbar from 'material/components/toolbar';
const scopes=['subject','legacy','toolbar'].map(id=>{const el=document.createElement('section');el.className='probe';el.id=id;document.body.append(el);return el});
const events=[];let reenter=false;const bar=make({tag:'footer',autoHide:true,transitionDuration:123,fabPosition:'center',onVisibilityChange:v=>{events.push([v,bar.isVisible()]);if(reenter&&!v)bar.show()}});
const button=text=>{const el=document.createElement('button');el.textContent=text;return el};
bar.addAction(button('One')).addAction(button('Two'));scopes[0].append(bar.element);
const old=legacy();old.addAction(button('Legacy'));scopes[1].append(old.element);
const normal=toolbar({variant:'docked',placement:'bottom',items:[button('Toolbar one'),button('Toolbar two')]});scopes[2].append(normal.element);
Object.assign(window,{probe:{bar,old,normal,events,button,setReenter:v=>reenter=v}});document.documentElement.dataset.ready='true';`;
  const sample = (page: Page) => page.evaluate(async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
    const rect = (el: Element, parent: DOMRect) => { const r = el.getBoundingClientRect(); return [r.x-parent.x,r.y-parent.y,r.width,r.height].map(n => Math.round(n*100)/100); };
    return ['subject','legacy','toolbar'].map(id => {
      const scope=document.getElementById(id)!, root=scope.firstElementChild!, parent=scope.getBoundingClientRect();
      const css=getComputedStyle(root);
      return { id, box:rect(root,parent), role:root.getAttribute('role'), name:root.getAttribute('aria-label'),
        roles:scope.querySelectorAll('[role="toolbar"]').length,inert:root.hasAttribute('inert'),
        style:Object.fromEntries(['height','min-height','padding-top','padding-right','padding-bottom','padding-left','background-color','box-shadow','border-radius','transition-duration','transform'].map(p=>[p,css.getPropertyValue(p)])),
        actions:[...root.querySelectorAll('button')].map(el=>({text:el.textContent,box:rect(el,parent),tab:el.getAttribute('tabindex')})),
      };
    });
  });
  for (const base of [false,true]) for (const full of [false,true]) for (const reverse of [false,true]) {
    const name=`${base?"base":"no-base"}-${full?"full":"selective"}-${reverse?"reverse":"forward"}`;
    const pages: Page[]=[];
    for (const opt of [false,true]) {
      const label=`${name}-${opt?"opt-in":"baseline"}`;
      const general=full?"import 'material/styles';":"import 'material/styles/bottom-app-bar';import 'material/styles/toolbar';";
      const optional=opt?"import 'material/styles/bottom-app-bar-toolbar';":"";
      await pageBuild(label,opt?candidate.installed:baseline.installed,
        (base?"import 'material/styles/base';":"")+(reverse?optional+general:general+optional)+app(opt));
      const page=await browser.newPage({viewport:{width:800,height:700}});page.setDefaultTimeout(10000);
      const errors: string[]=[];page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`${server.url}${label}/`);await page.waitForFunction(()=>document.documentElement.dataset.ready==='true');
      pages.push(page);
      check(errors.length===0,`${label}: browser errors ${errors.join(';')}`);
    }
    const compare=async(state:string)=>{try{assert.deepEqual(await sample(pages[1]),await sample(pages[0]));states.push(`${name}: ${state}`);}catch(error){failures.push(`${name}: ${state}: ${String(error)}`);}};
    await compare('empty FAB and visible native Tab order');
    for(const page of pages)await page.keyboard.press('Tab');
    check(await pages[0].evaluate(()=>document.activeElement?.textContent)===await pages[1].evaluate(()=>document.activeElement?.textContent),`${name}: Tab order`);
    const mutate=async(source:string)=>{for(const page of pages)await page.evaluate(source);};
    await mutate("probe.bar.addFab(probe.button('FAB'));probe.bar.getActionsContainer().append(probe.button('Direct'))");await compare('late center FAB and direct append');
    await mutate("probe.bar.addFab(probe.button('Replacement'))");await compare('replacement FAB');
    for(const y of [10,20,25,30,41,31,20]){for(const page of pages){await page.evaluate(y=>window.scrollTo(0,y),y);await page.waitForTimeout(35);}await compare(`scroll ${y}`);}
    await mutate("probe.bar.hide();probe.bar.hide();probe.bar.show();probe.setReenter(true);probe.bar.hide()");await compare('manual visibility and nested callback');
    check(JSON.stringify(await pages[0].evaluate('probe.events'))===JSON.stringify(await pages[1].evaluate('probe.events')),`${name}: callback values/state/counts`);
    for(const page of pages){await page.evaluate(()=>{document.documentElement.dir='rtl';document.documentElement.style.setProperty('--mtrl-density','-2');});await page.emulateMedia({reducedMotion:'reduce',colorScheme:'dark'});}
    await compare('RTL, density, dark and custom duration with reduced motion');
    for(const page of pages)await page.setViewportSize({width:320,height:700});await compare('narrow container');
    for(const page of pages)await page.close();
  }
  report.states=states;report.sizes=sizes;report.failures=failures;
  console.log(JSON.stringify({sizes,states:states.length,failures},null,2));
  assert.deepEqual(failures,[],"prototype admission requires unchanged root/default bytes and full compatibility");
} finally {
  report.failures=failures;report.sizes=sizes;report.states=states;
  await mkdir('analysis/browser',{recursive:true});
  await writeFile('analysis/browser/bottom-app-bar-toolbar.json',JSON.stringify(report,null,2)+'\n');
  await browser.close();server.stop(true);await rm(scratch,{recursive:true,force:true});
  await candidate.cleanup();await baseline.cleanup();
}
