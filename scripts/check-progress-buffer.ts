#!/usr/bin/env bun
// scripts/check-progress-buffer.ts
/**
 * The linear progress buffer is visible: the colour painted over the track
 * reads as its own band between the active indicator and the track.
 *
 * The buffer was painted in primary-container over a secondary-container
 * track: both roles sit at the same lightness, so the band measured 1.00:1 in
 * both schemes and could not be seen. It is now the on-surface role at 22%
 * over the track (this library's extension, not an M3 role). The check paints
 * the indicator in the light and the dark baseline scheme, flat and wavy, and
 * reads the canvas: the buffer band against the track must clear 1.5:1 and the
 * active indicator against the buffer 3:1.
 *
 *   bun run scripts/check-progress-buffer.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { launchChromium } from "./browser-profile";

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
    const path = new URL(request.url).pathname;
    if (path === "/progress.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    return new Response(
      `<!doctype html><html><head><style>body{margin:0;padding:20px}</style></head><body>
<script type="module">
import * as progress from "/progress.js";
window.createProgress = progress.createProgress ?? progress.default;
window.ready = true;
</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

/** WCAG relative luminance of #rrggbb. */
const luminance = (hex: string): number => {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const linear = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(channels[0]!) + 0.7152 * linear(channels[1]!) + 0.0722 * linear(channels[2]!);
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

const browser = await launchChromium({ headless: true });
try {
  const page = await browser.browser()!.newPage({ viewport: { width: 900, height: 400 } });
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);

  const schemes = {
    light: {
      "--mtrl-sys-color-primary": "#6750a4",
      "--mtrl-sys-color-secondary-container": "#e8def8",
      "--mtrl-sys-color-on-surface": "#1d1b20",
    },
    dark: {
      "--mtrl-sys-color-primary": "#d0bcff",
      "--mtrl-sys-color-secondary-container": "#4a4458",
      "--mtrl-sys-color-on-surface": "#e6e0e9",
    },
  };
  for (const [scheme, vars] of Object.entries(schemes)) {
    for (const shape of ["flat", "wavy"] as const) {
      const sample = await page.evaluate(async ({ vars, shape }) => {
        document.body.replaceChildren();
        const holder = document.createElement("div");
        for (const [name, value] of Object.entries(vars)) holder.style.setProperty(name, value);
        document.body.append(holder);
        const indicator = (window as unknown as { createProgress: (config: Record<string, unknown>) => { element: HTMLElement } }).createProgress({
          variant: "linear", shape, value: 30, buffer: 70,
        });
        indicator.element.style.width = "600px";
        holder.append(indicator.element);
        await new Promise((done) => setTimeout(done, 500));
        const canvas = indicator.element.querySelector("canvas")!;
        const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
        const row = Math.floor(canvas.height / 2);
        const at = (fraction: number): string => {
          const x = Math.round(canvas.width * fraction);
          const i = (row * canvas.width + x) * 4;
          return `#${[data[i]!, data[i + 1]!, data[i + 2]!].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
        };
        return { active: at(0.1), buffer: at(0.5), track: at(0.95) };
      }, { vars, shape });
      const bufferTrack = contrast(sample.buffer, sample.track);
      const activeBuffer = contrast(sample.active, sample.buffer);
      assert.ok(
        bufferTrack >= 1.5,
        `${scheme}/${shape}: the buffer reads against the track (${bufferTrack.toFixed(2)}:1, buffer ${sample.buffer} track ${sample.track})`,
      );
      assert.ok(
        activeBuffer >= 3,
        `${scheme}/${shape}: the buffer reads against the active indicator (${activeBuffer.toFixed(2)}:1, active ${sample.active} buffer ${sample.buffer})`,
      );
      console.log(`progress buffer ${scheme}/${shape}: buffer/track ${bufferTrack.toFixed(2)}:1, active/buffer ${activeBuffer.toFixed(2)}:1`);
    }
  }
  console.log("Progress buffer contrast check passed.");
} finally {
  await browser.close();
  server.stop(true);
}
