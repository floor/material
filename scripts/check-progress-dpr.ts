#!/usr/bin/env bun
/**
 * A progress canvas follows a devicePixelRatio change.
 *
 * A page created at DPR 1 that moves to DPR 2 (browser zoom, or a window
 * moved between a 1x display and a Retina one) keeps the same CSS width. The
 * canvas backing store, though, is sized in physical pixels: the linear wave
 * is 2048 x height at DPR 1 and needs 4096 x (height x 2) at DPR 2. The
 * shared resize path watched the element's width only, so a DPR-only change
 * left the old bitmap in place and the wave was drawn twice its intended
 * size: soft and blocky. This check creates each indicator at DPR 1, changes
 * only the ratio through CDP, and reads the backing store back.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { chromium } from "playwright";

interface ProgressHandle {
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  destroy: () => void;
}

declare global {
  interface Window {
    createProgress: (config: Record<string, unknown>) => ProgressHandle;
    progress: ProgressHandle;
    ready: boolean;
  }
}

const bundle = await Bun.build({
  entrypoints: [resolve("src/components/progress/index.ts")],
  target: "browser",
  format: "esm",
  minify: true,
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/progress.js") {
      return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    }
    return new Response(`<!doctype html><html><body style="margin:0"><div id="host" style="width:360px"></div>
<script type="module">import { createProgress } from "/progress.js"; window.createProgress = createProgress; window.ready = true;</script></body></html>`, {
      headers: { "Content-Type": "text/html" },
    });
  },
});

const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 900, height: 300 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.waitForFunction(() => window.ready === true);
  const cdp = await context.newCDPSession(page);

  let width = 900;
  const setDpr = async (ratio: number): Promise<void> => {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 300,
      deviceScaleFactor: ratio,
      mobile: false,
    });
    // Chromium 153 dispatches no media query or resize event for a device
    // metrics override that changes only the ratio, though its matchMedia
    // state has already changed; a real ratio change arrives with a viewport
    // signal (zoom changes the layout viewport). A 1 px viewport change is
    // that signal: the indicator's own 360 px width does not move, and 1 px
    // is under the width observer's 2 px threshold, so only a ratio watcher
    // can repaint here.
    width = width === 900 ? 901 : 900;
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 300,
      deviceScaleFactor: ratio,
      mobile: false,
    });
    await page.waitForFunction((ratio: number) => devicePixelRatio === ratio, ratio);
  };

  /**
   * Waits past the resize observer's 100 ms debounce. Mounting schedules one
   * (the element enters the document with a width), and a DPR change while it
   * is pending would measure at the new ratio and hide the defect.
   */
  const settle = async (): Promise<void> => {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.waitForTimeout(250);
  };

  /** Mounts a fresh indicator at the current ratio and reads its bitmap. */
  const create = async (config: Record<string, unknown>) => {
    await page.evaluate((config) => {
      document.querySelector("#host")!.replaceChildren();
      const progress = window.createProgress(config);
      document.querySelector("#host")!.append(progress.element);
      window.progress = progress;
    }, config);
    // initialize() may defer to the next frame; measure there would read the
    // ratio the document has by then, so settle before the ratio changes.
    await settle();
    return read();
  };

  /** The live bitmap, and the CSS height the drawing transform is scaled to. */
  const read = async () =>
    page.evaluate(() => ({
      ratio: devicePixelRatio,
      width: window.progress.canvas.width,
      height: window.progress.canvas.height,
      cssHeight: window.progress.canvas.style.height,
    }));

  // The linear wave: a 10 CSS px tall canvas, a 2048-wide bitmap at DPR 1.
  const linear1 = await create({ variant: "linear", shape: "wavy", indeterminate: true });
  assert.deepEqual(
    { ratio: linear1.ratio, width: linear1.width, height: linear1.height },
    { ratio: 1, width: 2048, height: 10 },
    `the linear canvas starts at DPR 1 size: ${JSON.stringify(linear1)}`,
  );
  await setDpr(2);
  // The width observer debounces by 100 ms; the ratio change has to land the same way.
  await page.waitForTimeout(250);
  const linear2 = await read();
  assert.deepEqual(
    { ratio: linear2.ratio, width: linear2.width, height: linear2.height },
    { ratio: 2, width: 4096, height: 20 },
    `the linear canvas keeps its DPR 1 backing store after the DPR change: ${JSON.stringify(linear2)}`,
  );

  // The circular wave shares the same canvas path: 48 CSS px, both ways.
  const circular1 = await create({ variant: "circular", shape: "wavy", indeterminate: true });
  assert.deepEqual(
    { ratio: circular1.ratio, width: circular1.width, height: circular1.height },
    { ratio: 2, width: 96, height: 96 },
    `the circular canvas starts at DPR 2 size: ${JSON.stringify(circular1)}`,
  );
  await setDpr(3);
  await page.waitForTimeout(250);
  const circular3 = await read();
  assert.deepEqual(
    { ratio: circular3.ratio, width: circular3.width, height: circular3.height },
    { ratio: 3, width: 144, height: 144 },
    `the circular canvas keeps its DPR 2 backing store after the DPR change: ${JSON.stringify(circular3)}`,
  );

  // A destroyed indicator stops watching the ratio: no leak past destroy().
  await page.evaluate(() => window.progress.destroy());
  const destroyed = await read();
  await setDpr(1);
  await page.waitForTimeout(250);
  const afterDestroy = await read();
  assert.deepEqual(
    { width: afterDestroy.width, height: afterDestroy.height },
    { width: destroyed.width, height: destroyed.height },
    `a destroyed indicator repaints on a DPR change: ${JSON.stringify({ before: destroyed, after: afterDestroy })}`,
  );

  console.log("progress DPR change: linear and circular canvases resize; destroy() stops the watcher");
} finally {
  await browser.close();
  server.stop(true);
}
