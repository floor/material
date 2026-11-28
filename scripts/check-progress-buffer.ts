#!/usr/bin/env bun
// scripts/check-progress-buffer.ts
/**
 * The linear progress buffer is visible: the colour painted over the track
 * reads as its own band between the active indicator and the track.
 *
 * The buffer was painted in primary-container over a secondary-container
 * track: both roles sit at the same lightness, so the band measured 1.00:1 in
 * both schemes and could not be seen. It is now the on-surface role at 17%
 * over the track (this library's extension, not an M3 role), lightened by the
 * owner's decision of 2026-11-25 so that the sunset theme's light scheme keeps
 * the buffer 3:1 from the active indicator: at 22% that pair measured 2.74:1.
 *
 * The two bars cannot both reach their old values in sunset light: with its
 * primary (#b34700, luminance .141) and track (#ffdbd0, .765), a solid buffer
 * needs luminance between .523 (3:1 from the active) and .493 (1.5:1 from the
 * track), an empty window. The owner's 3:1 floor therefore holds everywhere
 * and the visibility bar stays at what the 17% tint reaches: 1.35:1, the
 * light schemes' 1.38-1.40, the dark schemes' 1.50-1.52.
 *
 * The check compiles the three theme sheets, paints the indicator in each
 * theme and both schemes, flat and wavy, samples the canvas, and holds the two
 * bars. It also checks that nothing else moved: with no buffer the linear
 * indicator paints exactly the theme's primary and secondary-container, and
 * the circular variant paints primary.
 *
 *   bun run scripts/check-progress-buffer.ts
 */
import assert from "node:assert/strict";
import { compileString } from "sass";

import { launchChromium } from "./browser-profile";

const themes = ["baseline", "sunset", "monochrome"] as const;
const css = themes
  .map((theme) => compileString(`@use "themes/${theme}";`, {
    loadPaths: ["src/styles"],
    style: "compressed",
    logger: { warn() {}, debug() {} },
  }).css)
  .join("\n");

const bundle = await Bun.build({
  entrypoints: ["src/components/progress/index.ts"],
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
      `<!doctype html><html><head><style>${css}body{margin:0;padding:20px}</style></head><body>
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

// The owner's floor: the active indicator and the buffer stay apart. The
// visibility bar is what the 17% tint reaches; see the header.
const ACTIVE_BUFFER_FLOOR = 3;
const BUFFER_TRACK_FLOOR = 1.35;

const browser = await launchChromium({ headless: true });
try {
  const page = await browser.browser()!.newPage({ viewport: { width: 900, height: 700 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);

  for (const theme of themes) {
    for (const mode of ["light", "dark"] as const) {
      for (const shape of ["flat", "wavy"] as const) {
        const sample = await page.evaluate(async ({ theme, mode, shape }) => {
          document.documentElement.setAttribute("data-theme", theme);
          document.documentElement.setAttribute("data-theme-mode", mode);
          document.body.replaceChildren();
          const indicator = (window as unknown as { createProgress: (config: Record<string, unknown>) => { element: HTMLElement } }).createProgress({
            variant: "linear", shape, value: 30, buffer: 70,
          });
          indicator.element.style.width = "600px";
          document.body.append(indicator.element);
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
        }, { theme, mode, shape });
        const bufferTrack = contrast(sample.buffer, sample.track);
        const activeBuffer = contrast(sample.active, sample.buffer);
        assert.ok(
          activeBuffer >= ACTIVE_BUFFER_FLOOR,
          `${theme}/${mode}/${shape}: the buffer reads against the active indicator (${activeBuffer.toFixed(2)}:1, active ${sample.active} buffer ${sample.buffer})`,
        );
        assert.ok(
          bufferTrack >= BUFFER_TRACK_FLOOR,
          `${theme}/${mode}/${shape}: the buffer reads against the track (${bufferTrack.toFixed(2)}:1, buffer ${sample.buffer} track ${sample.track})`,
        );
        console.log(`progress buffer ${theme}/${mode}/${shape}: buffer/track ${bufferTrack.toFixed(2)}:1, active/buffer ${activeBuffer.toFixed(2)}:1`);
      }

      // Nothing else moved: with no buffer, the linear indicator paints the
      // theme's own primary and secondary-container, and the circular variant
      // paints primary.
      const base = await page.evaluate(async ({ theme, mode }) => {
        document.documentElement.setAttribute("data-theme", theme);
        document.documentElement.setAttribute("data-theme-mode", mode);
        document.body.replaceChildren();
        const probe = (role: string): string => {
          const span = document.createElement("span");
          span.style.color = `var(--mtrl-sys-color-${role})`;
          document.body.append(span);
          const match = /^rgba?\(([\d.]+), ([\d.]+), ([\d.]+)/.exec(getComputedStyle(span).color)!;
          span.remove();
          return `#${[1, 2, 3].map((i) => Number(match[i]).toString(16).padStart(2, "0")).join("")}`;
        };
        const create = (window as unknown as { createProgress: (config: Record<string, unknown>) => { element: HTMLElement } }).createProgress;
        const sample = (element: HTMLElement, fractions: number[]): string[] => {
          const canvas = element.querySelector("canvas")!;
          const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
          const row = Math.floor(canvas.height / 2);
          return fractions.map((fraction) => {
            const x = Math.round(canvas.width * fraction);
            const i = (row * canvas.width + x) * 4;
            return `#${[data[i]!, data[i + 1]!, data[i + 2]!].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
          });
        };
        const linear = create({ variant: "linear", value: 30 });
        linear.element.style.width = "600px";
        const circular = create({ variant: "circular", value: 30 });
        circular.element.style.width = "80px";
        document.body.append(linear.element, circular.element);
        await new Promise((done) => setTimeout(done, 500));
        const [active, track] = sample(linear.element, [0.1, 0.95]);
        const canvas = circular.element.querySelector("canvas")!;
        const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
        const row = Math.floor(canvas.height / 2);
        const painted = new Set<string>();
        for (let x = 0; x < canvas.width; x += 1) {
          const i = (row * canvas.width + x) * 4;
          if ((data[i + 3] ?? 0) > 0) painted.add(`#${[data[i]!, data[i + 1]!, data[i + 2]!].map((v) => v.toString(16).padStart(2, "0")).join("")}`);
        }
        return { active, track, painted: [...painted], primary: probe("primary"), secondaryContainer: probe("secondary-container") };
      }, { theme, mode });
      assert.equal(base.active, base.primary, `${theme}/${mode}: the active indicator colour moved (expected the theme primary)`);
      assert.equal(base.track, base.secondaryContainer, `${theme}/${mode}: the track colour moved (expected secondary-container)`);
      assert.ok(base.painted.includes(base.primary), `${theme}/${mode}: the circular ring no longer paints the theme primary (painted ${base.painted.join(", ")})`);
      console.log(`progress buffer ${theme}/${mode}: no-buffer active=${base.active} track=${base.track}; circular paints ${base.painted.join(", ")}`);
    }
  }
  assert.deepEqual(errors, [], `page errors: ${errors.join("; ")}`);
  console.log("Progress buffer check passed (3 themes x 2 schemes x 2 shapes, and the base colours unchanged).");
} finally {
  await browser.close();
  server.stop(true);
}
