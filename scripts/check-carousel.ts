#!/usr/bin/env bun
/** Build first. Browser conformance check for carousel (uncontained layout and wheel interaction). */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { launchChromium } from "./browser-profile";
import { checkCarouselWheel, checkCarouselUncontained, checkCarouselDragRelease, checkCarouselViewportLayer, checkCarouselUncontainedSpace, checkCarouselOutsideRelease, checkCarouselMixedPointers } from "./check-carousel-browser";
import * as sass from "sass";

const bundle = await Bun.build({
  entrypoints: [resolve("src/components/carousel/index.ts")],
  target: "browser",
  minify: false,
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();

// The element route: defineCarousel plus its registry sheet, since a shadow
// root does not inherit the document stylesheet.
const elementBundle = await Bun.build({
  entrypoints: ["carousel-check-entry.ts"],
  target: "browser",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^carousel-check-entry\.ts$/ }, () => ({ path: resolve("carousel-check-entry.ts") }));
      build.onLoad({ filter: /carousel-check-entry\.ts$/ }, () => ({
        contents: `export { defineCarousel } from ${JSON.stringify(resolve("src/elements/carousel.ts"))};
export { registerStyles } from ${JSON.stringify(resolve("src/elements/styles.ts"))};`,
        loader: "ts",
      }));
    },
  }],
});
assert(elementBundle.success, String(elementBundle.logs));
const elementJs = await elementBundle.outputs[0].text();
const carouselCss = sass.compileString('@use "components/carousel";', {
  loadPaths: [resolve("src/styles")], style: "compressed", logger: sass.Logger.silent,
}).css;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/carousel.js") {
      return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    }
    if (url.pathname === "/elements.js") {
      return new Response(elementJs, { headers: { "Content-Type": "text/javascript" } });
    }
    if (url.pathname === "/carousel-css.js") {
      return new Response(`window.__CAROUSEL_CSS__ = ${JSON.stringify(carouselCss)};`, { headers: { "Content-Type": "text/javascript" } });
    }
    if (url.pathname === "/styles.css") {
      return new Response(Bun.file("dist/styles.css"));
    }
    return new Response(
      `<!doctype html><html><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;padding:24px;font-family:sans-serif;}</style></head><body>
<script src="/carousel-css.js"></script>
<script type="module">
import { createCarousel } from '/carousel.js';
window.createCarousel = createCarousel;
import { defineCarousel, registerStyles } from '/elements.js';
registerStyles({ carousel: window.__CAROUSEL_CSS__ });
defineCarousel();
window.ready = true;
</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  },
});

const browser = await launchChromium({ headless: true });
try {
  const page = await browser.browser()!.newPage({ viewport: { width: 1000, height: 700 } });
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

  console.log("Checking carousel viewport layer...");
  await checkCarouselViewportLayer(page);
  console.log("Carousel viewport layer checks passed.");

  console.log("Checking carousel uncontained space...");
  await checkCarouselUncontainedSpace(page);
  console.log("Carousel uncontained space check passed.");

  console.log("Checking carousel outside release...");
  await checkCarouselOutsideRelease(page);
  console.log("Carousel outside release check passed.");

  console.log("Checking carousel mixed pointers...");
  await checkCarouselMixedPointers(page);
  console.log("Carousel mixed pointers check passed.");

  console.log("Checking carousel drag release...");
  await checkCarouselDragRelease(page);
  console.log("Carousel drag release checks passed.");

  console.log("All carousel browser checks passed.");
} finally {
  await browser.close();
  server.stop();
}
