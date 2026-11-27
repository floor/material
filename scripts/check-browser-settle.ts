#!/usr/bin/env bun
/**
 * The settle helper against the motion it exists for: a bare `settle()` after a
 * smooth scroll must return only once the scroll has ended — in the document,
 * in a scroll container, and in one inside a shadow root.
 *
 * Before the helper read scrollers, a bare settle() after
 * `scrollTo({behavior: "smooth"})` returned one frame in, and the carousel
 * RTL check read its strip at 0 on main.
 */
import assert from "node:assert/strict";

import { chromium, webkit, type Browser } from "playwright";

import { settle } from "./browser-settle";

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch() {
    return new Response(
      `<!doctype html><html><head><style>
        body { margin: 0; height: 4000px; }
        #box { width: 200px; height: 100px; overflow: auto; }
        #box div { height: 60px; }
        #host { display: block; width: 300px; height: 100px; }
      </style></head><body>
      <div id="box"><div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div></div>
      <div id="host"></div>
      <script type="module">
        const host = document.getElementById("host");
        const root = host.attachShadow({ mode: "open" });
        root.innerHTML = '<style>:host{display:block;width:300px;height:100px}</style>' +
          '<div id="scroller" style="overflow:auto;width:300px;height:100px"><div style="height:600px;width:900px"></div></div>';
        window.ready = true;
      </script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

const run = async (browser: Browser, engine: string): Promise<string[]> => {
  const lines: string[] = [];
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  try {
    await page.goto(`http://127.0.0.1:${server.port}`);
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);

    // The document's own smooth scroll.
    await page.evaluate(() => window.scrollTo({ top: 800, behavior: "smooth" }));
    await settle(page);
    const scrollY = await page.evaluate(() => window.scrollY);
    assert.equal(scrollY, 800, `${engine} document: a bare settle() waited for the smooth scroll (scrollY ${scrollY})`);
    lines.push(`${engine} document smooth scroll`);

    // A scroll container in the light DOM.
    await page.evaluate(() => (document.getElementById("box") as HTMLElement).scrollTo({ top: 120, behavior: "smooth" }));
    await settle(page);
    const boxTop = await page.evaluate(() => (document.getElementById("box") as HTMLElement).scrollTop);
    assert.equal(boxTop, 120, `${engine} container: a bare settle() waited for the smooth scroll (scrollTop ${boxTop})`);
    lines.push(`${engine} container smooth scroll`);

    // A scroll container inside a shadow root, reached through the target.
    await page.evaluate(() => {
      const scroller = document.getElementById("host")!.shadowRoot!.querySelector<HTMLElement>("#scroller")!;
      scroller.scrollTo({ left: 600, behavior: "smooth" });
    });
    await settle(page, { target: "#host" });
    const shadowLeft = await page.evaluate(() => document.getElementById("host")!.shadowRoot!.querySelector<HTMLElement>("#scroller")!.scrollLeft);
    assert.equal(shadowLeft, 600, `${engine} shadow root: a settle() on the target waited for its scroller (scrollLeft ${shadowLeft})`);
    lines.push(`${engine} shadow-root smooth scroll`);
    return lines;
  } finally {
    await page.close();
  }
};

const lines: string[] = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try {
  lines.push(...await run(chromiumBrowser, "chromium"));
} finally {
  await chromiumBrowser.close();
}

let webkitBrowser: Browser | null = null;
try {
  webkitBrowser = await webkit.launch({ headless: true });
} catch (error) {
  if (process.argv.includes("--skip-missing-webkit")) console.log("browser settle: WebKit is not installed here, skipped");
  else throw error;
}
if (webkitBrowser) {
  try {
    lines.push(...await run(webkitBrowser, "webkit"));
  } finally {
    await webkitBrowser.close();
  }
}

server.stop(true);
for (const line of lines) console.log(`ok ${line}`);
console.log(`Passed browser settle: ${lines.length} smooth-scroll cases.`);
