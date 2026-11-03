#!/usr/bin/env bun
// scripts/check-switch-transition.ts
//
// The switch handle springs on `inset-inline-start`. A consumer's bundler
// targeting old browsers lowers that inset into `:lang()`-guarded `left`/`right`
// rules (#125's arms), so the transitioned property no longer exists in the
// base rule and the handle jumps instead of sliding. This check bundles the
// shipped sheet exactly as such a build does (Bun.build, minified, the
// size:check path), toggles a switch in every direction case, and samples the
// handle every frame: it must move through intermediate values, and it must
// land where a cold render of the same case lands — motion is restored, never
// a different destination. The unbundled sheet, which keeps the logical inset,
// is the control: it slides before and after the fix.
//
//   bun run build && bun run switch-transition:check
import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";

const WIDTH = 600;

interface Sample { t: number; x: number }

// What a consumer's old-target bundler makes of the shipped stylesheet:
// minified, with every direction rule the bundler can lower lowered.
const bundledBuild = await Bun.build({
  entrypoints: ["dist/styles.css"],
  format: "esm",
  target: "browser",
  minify: true,
});
assert(bundledBuild.success, String(bundledBuild.logs));
const bundledCss = await bundledBuild.outputs.find((output) => output.path.endsWith(".css"))!.text();

const factoryBuild = await Bun.build({ entrypoints: ["scripts/fixtures/switch-factory.ts"], target: "browser", format: "iife" });
assert(factoryBuild.success, String(factoryBuild.logs));
const factoryJs = await factoryBuild.outputs[0].text();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/styles.bundled.css") return new Response(bundledCss, { headers: { "Content-Type": "text/css" } });
    if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"));
    if (path === "/switch.js") return new Response(factoryJs, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/switch") {
      const q = url.searchParams;
      const sheet = q.get("sheet") === "plain" ? "/styles.css" : "/styles.bundled.css";
      const dir = q.get("dir") === "rtl" ? ' dir="rtl"' : "";
      const lang = q.get("lang") ? ` lang="${q.get("lang")}"` : "";
      const rtlClass = q.get("class") === "mtrl-rtl" ? ' class="mtrl-rtl"' : "";
      const checked = q.get("state") === "on" ? "true" : "false";
      return new Response(
        `<!doctype html><html${dir}${lang}><head><link rel="stylesheet" href="${sheet}">
<style>body{margin:0;width:${WIDTH}px;padding:24px}</style></head>
<body><div id="host"${rtlClass}></div><script src="/switch.js"></script>
<script>window.addEventListener("load", () => { const host = document.getElementById("host");
host.append(window.createSwitch({ label: "Wi-Fi", checked: ${checked} }).element); window.ready = true; });</script>
</body></html>`,
        { headers: { "Content-Type": "text/html" } },
      );
    }
    return new Response("not found", { status: 404 });
  },
});

const browser = await chromium.launch({ headless: true });
let page: Page | undefined;
try {
  page = await browser.newPage({ viewport: { width: WIDTH, height: 300 }, reducedMotion: "no-preference" });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const base = server.url.href;

  // Where the handle of this case rests: a cold render of the same page with
  // the target state already set, so no transition ran. Every slide below must
  // land exactly here — the fix adds motion, not a destination.
  const resting = async (query: string): Promise<{ off: number; on: number }> => {
    const at = async (state: string) => {
      await page!.goto(`${base}switch?${query}&state=${state}`);
      await page!.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
      await page!.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
      return page!.evaluate(() => {
        const thumb = document.querySelector(".mtrl-switch__thumb")!, track = document.querySelector(".mtrl-switch__track")!;
        return thumb.getBoundingClientRect().left - track.getBoundingClientRect().left;
      });
    };
    return { off: await at("off"), on: await at("on") };
  };

  // Toggle the switch and sample the handle every frame across the spring.
  const slide = async (query: string): Promise<{ from: number; to: number; between: number }> => {
    await page!.goto(`${base}switch?${query}&state=off`);
    await page!.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    await page!.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
    const samples = await page!.evaluate(() => new Promise<Sample[]>((done) => {
      const thumb = document.querySelector(".mtrl-switch__thumb")!;
      const track = document.querySelector(".mtrl-switch__track")!;
      const at = () => ({ t: performance.now(), x: thumb.getBoundingClientRect().left - track.getBoundingClientRect().left });
      const samples = [at()];
      (document.querySelector(".mtrl-switch__input") as HTMLInputElement).click();
      const start = performance.now();
      const tick = () => {
        samples.push(at());
        if (performance.now() - start < 650) requestAnimationFrame(tick);
        else done(samples);
      };
      requestAnimationFrame(tick);
    }));
    const from = samples[0]!.x;
    const to = samples[samples.length - 1]!.x;
    const span = to - from;
    const band = Math.abs(span) * 0.2;
    // The handle must move through the middle of its travel, not skip to the
    // far side in one frame: count the samples strictly inside, clear of both
    // ends. A jump produces none; the 425ms spring produces several a frame
    // apart even on a slow runner.
    const between = samples.filter((s) => Math.abs(s.x - from) > band && Math.abs(s.x - to) > band).length;
    return { from, to, between };
  };

  interface Case { name: string; query: string }
  const bundled: Case[] = [
    { name: "bundled, lang=en", query: "sheet=bundled&lang=en" },
    { name: "bundled, dir=rtl, lang=en", query: "sheet=bundled&dir=rtl&lang=en" },
    { name: "bundled, lang=ar only", query: "sheet=bundled&lang=ar" },
    { name: "bundled, .mtrl-rtl class, lang=en", query: "sheet=bundled&class=mtrl-rtl&lang=en" },
  ];
  const plain: Case[] = [
    { name: "unbundled, lang=en", query: "sheet=plain&lang=en" },
    { name: "unbundled, dir=rtl, lang=en", query: "sheet=plain&dir=rtl&lang=en" },
  ];

  // Every case runs even when one fails, so a red run reports the whole sheet:
  // which direction cases jump and that the unbundled control still slides.
  const failures: string[] = [];
  for (const { name, query } of [...bundled, ...plain]) {
    const checks: [string, boolean][] = [];
    try {
      const rest = await resting(query);
      // The two rests differ: this case's own placement of the handle.
      checks.push([`the handle rests 16dp apart off and on (off ${rest.off}, on ${rest.on})`, Math.abs(rest.on - rest.off) >= 12]);
      const { from, to, between } = await slide(query);
      checks.push([`the slide starts at the off rest (${from} vs ${rest.off})`, Math.abs(from - rest.off) < 0.5]);
      checks.push([`the slide lands on the on rest (${to} vs ${rest.on})`, Math.abs(to - rest.on) < 0.5]);
      checks.push([`the handle slides through ${between} intermediate samples, not a jump`, between >= 3]);
      failures.push(...checks.filter(([, ok]) => !ok).map(([what]) => `${name}: ${what}`));
    } catch (error) {
      failures.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  assert.deepEqual(failures, []);
  console.log(`Passed ${bundled.length + plain.length} switch-transition checks: the handle slides in the bundled sheet in every direction case (lang=en, dir=rtl, lang=ar, .mtrl-rtl) and in the unbundled sheet, always landing on its cold-rendered rest.`);
} finally {
  await browser.close();
  server.stop(true);
}
