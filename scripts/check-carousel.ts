#!/usr/bin/env bun
/** Build first. Browser conformance check for carousel (uncontained layout and wheel interaction). */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { checkCarouselWheel, checkCarouselUncontained } from "./check-carousel-browser";

const bundle = await Bun.build({
  entrypoints: [resolve("src/components/carousel/index.ts")],
  target: "browser",
  minify: false,
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/carousel.js") {
      return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    }
    if (url.pathname === "/styles.css") {
      return new Response(Bun.file("dist/styles.css"));
    }
    return new Response(
      `<!doctype html><html><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;padding:24px;font-family:sans-serif;}</style></head><body>
<script type="module">
import { createCarousel } from '/carousel.js';
window.createCarousel = createCarousel;
window.ready = true;
</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  },
});

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);

  console.log("Checking carousel uncontained layout...");
  await checkCarouselUncontained(page, {
    screenshotDir: process.env.CI ? undefined : resolve("briefs/previews/carousel-uncontained-fix"),
  });
  console.log("Carousel uncontained layout check passed.");

  console.log("Checking carousel wheel interaction...");
  await checkCarouselWheel(page);
  console.log("Carousel wheel checks passed.");

  console.log("All carousel browser checks passed.");
} finally {
  await browser.close();
  server.stop();
}
