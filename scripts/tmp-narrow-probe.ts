import assert from "node:assert/strict";
import { resolve } from "node:path";
import { launchChromium } from "./browser-profile";
const root = resolve(import.meta.dir, "..");
const bundle = await Bun.build({ entrypoints: [resolve(root, "src/components/carousel/index.ts")], target: "browser", minify: true, define: { "process.env.NODE_ENV": '"production"' } });
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();
const css = await Bun.file(resolve(root, "dist/styles.css")).text();
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === "/carousel.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
  if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
  return new Response(`<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"><style>body{margin:0}#mount{width:180px;height:400px}</style></head><body><div id="mount"></div>
  <script type="module">import createCarousel from '/carousel.js';
  const slides = Array.from({ length: 24 }, (_, i) => ({ content: 'Slide ' + (i + 1) }));
  window.carousel = createCarousel({ variant: 'uncontained', itemWidth: 280, slides });
  document.getElementById('mount').append(window.carousel.element);
  window.ready = true;</script></body></html>`, { headers: { "Content-Type": "text/html" } });
} });
const browser = await launchChromium({ headless: true });
try {
  const page = await browser.browser()!.newPage({ viewport: { width: 800, height: 700 } });
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.waitForFunction(() => (window as { ready?: boolean }).ready === true);
  await page.waitForTimeout(400);
  const paths = await page.evaluate(async () => {
    const carousel = (window as { carousel: { element: HTMLElement; goTo(i: number): void } }).carousel;
    const el = carousel.element;
    const scroller = el.querySelector(".mtrl-carousel__scroller") as HTMLElement;
    const items = [...el.querySelectorAll(".mtrl-carousel__item")] as HTMLElement[];
    const last = items[items.length - 1]!;
    const sb = scroller.getBoundingClientRect();
    const readState = () => {
      const lb = last.getBoundingClientRect();
      // Painted end edge vs the scroller's end edge; negative = the item is clipped.
      return { scroll: +scroller.scrollLeft.toFixed(1), clipRight: +(sb.right - lb.right).toFixed(1) };
    };
    const out: Record<string, unknown> = {};
    // Path 1: goTo(last)
    carousel.goTo(23);
    await new Promise(r => setTimeout(r, 1500));
    out.goTo = readState();
    // Path 2: End key
    (document.querySelector('[data-id]') as HTMLElement)?.focus();
    last.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 1500));
    out.end = readState();
    // Path 3: wheel toward the end
    for (let i = 0; i < 40; i++) {
      scroller.dispatchEvent(new WheelEvent("wheel", { deltaY: 240, bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 20));
    }
    await new Promise(r => setTimeout(r, 1200));
    out.wheel = readState();
    return out;
  });
  console.log(JSON.stringify(paths, null, 1));
} finally { await browser.close(); server.stop(true); }
