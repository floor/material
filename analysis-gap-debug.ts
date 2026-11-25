import { chromium } from "playwright";
import * as sass from "sass";
import { resolve } from "node:path";
const prelude = '@use "abstract/emit" as arms-config with ($direction-arms: true);\n';
const sheet = sass.compileString(prelude + (await Bun.file("src/styles/main.scss").text()), { loadPaths: ["src/styles"], style: "compressed", logger: sass.Logger.silent }).css;
await Bun.write("analysis-entry.ts", `import createSlider from "${resolve("src/components/slider/index.ts")}";\n(window as any).createSlider = createSlider;\n`);
const bundle = await Bun.build({ entrypoints: [resolve("analysis-entry.ts")], target: "browser", format: "esm", minify: true });
const js = (await bundle.outputs[0]!.text()).replaceAll("\u0000", "\\u0000");
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(req) {
  const p = new URL(req.url).pathname;
  if (p === "/slider.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
  if (p === "/styles.css") return new Response(sheet, { headers: { "Content-Type": "text/css" } });
  return new Response(`<!doctype html><html data-theme="baseline" data-theme-mode="light"><head><link rel="stylesheet" href="/styles.css"><style>body{margin:0;padding:24px;background:#fff}#host{width:420px}.mtrl-slider *,.mtrl-slider{transition:none!important}</style></head><body><div id="host"></div><script type="module">import "/slider.js";window.ready=true;</script></body></html>`, { headers: { "Content-Type": "text/html" } });
}});
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 600, height: 300 } });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(`http://127.0.0.1:${server.port}`);
await page.waitForFunction(() => (window as any).ready);
await page.evaluate(() => {
  const s = (window as any).createSlider({ value: 30, size: "XL", ticks: true, step: 10 });
  document.querySelector("#host")!.append(s.element);
});
await page.waitForTimeout(300);
const box = await page.evaluate(() => { const c = document.querySelector(".mtrl-slider__container")!.getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height }; });
const dump = async (label: string) => {
  console.log(label, JSON.stringify(await page.evaluate(() => {
    const host = document.querySelector("#host")!.getBoundingClientRect();
    const handle = document.querySelector('[role="slider"]')!.getBoundingClientRect();
    const segs = [...document.querySelectorAll(".mtrl-slider__segment")].slice(1).map((el) => {
      const r = el.getBoundingClientRect();
      return { l: +(r.left - host.left).toFixed(1), r: +(r.right - host.left).toFixed(1), shadow: getComputedStyle(el).boxShadow.slice(0, 48) };
    });
    return { handle: +(handle.left + handle.width / 2 - host.left).toFixed(1), pressed: !!document.querySelector(".mtrl-slider__handle--pressed"), segs };
  })));
};
await dump("rest");
await page.mouse.move(box.x + box.w * 0.7, box.y + box.h / 2);
await page.mouse.down();
await page.waitForTimeout(250);
await dump("held");
await page.mouse.up();
await browser.close(); server.stop(true);
