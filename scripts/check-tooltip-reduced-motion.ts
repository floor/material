#!/usr/bin/env bun
// scripts/check-tooltip-reduced-motion.ts
/**
 * A shown tooltip fades in 100ms under prefers-reduced-motion, not the 150ms
 * scale-and-fade it uses otherwise.
 *
 * The show transition is opacity and transform, both 150ms. With reduced
 * motion on, that duration was still 150ms. Material replaces scaling with a
 * subtle fade, and the tooltip follows the menu: the scale is dropped and the
 * fade is duration-short2 (100ms).
 *
 * The check shows a tooltip with Playwright's reduced-motion emulation and
 * reads the computed transition-duration. On main it is 150ms. On the fix it
 * is 100ms.
 *
 *   bun run scripts/check-tooltip-reduced-motion.ts
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import * as sass from "sass";
import { chromium } from "playwright";

import { directionArmsPrelude, sassOptions } from "./build-styles";

const entry = resolve("scripts/tooltip-reduced-motion-entry.ts");
const bundle = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
assert(bundle.success, String(bundle.logs));
const js = (await bundle.outputs[0]!.text()).replaceAll("\u0000", "\\u0000");
const css = sass.compileString(directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()), sassOptions()).css;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/tooltip.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head>
<body><script type="module">import "/tooltip.js";</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

const milliseconds = (part: string): number => {
  const trimmed = part.trim();
  const value = parseFloat(trimmed);
  return trimmed.endsWith("ms") ? value : value * 1000;
};

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
  const measured = await page.evaluate(() => {
    const host = document.body;
    const target = document.createElement("button");
    target.textContent = "Save";
    host.append(target);
    const create = (window as unknown as {
      createTooltip: (config: { text: string; target: HTMLElement }) => {
        element: HTMLElement;
        show: (immediate?: boolean) => void;
      };
    }).createTooltip;
    const tooltip = create({ text: "Save changes", target });
    host.append(tooltip.element);
    tooltip.show(true);
    return {
      duration: getComputedStyle(tooltip.element).transitionDuration,
      visible: tooltip.element.classList.contains("mtrl-tooltip--visible"),
    };
  });
  const parts = measured.duration.split(",").map(milliseconds);
  assert(measured.visible, "the tooltip is shown");
  assert(
    parts.length > 0 && parts.every((ms) => Math.abs(ms - 100) < 0.5),
    `shown tooltip transition-duration is 100ms under reduced motion, measured ${measured.duration}`,
  );
  console.log(`tooltip reduced motion: shown transition-duration ${measured.duration}`);
} finally {
  await browser.close();
  server.stop(true);
}

console.log("Tooltip reduced motion check passed.");
