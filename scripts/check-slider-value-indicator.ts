import assert from "node:assert/strict";
import { resolve } from "node:path";

import { chromium, webkit, type Page } from "playwright";
import * as sass from "sass";

import { settle } from "./browser-settle";
import { directionArmsPrelude, sassOptions } from "./build-styles";

// Serve the owner's fixture with source JS and CSS so the same check runs on
// the base and candidate without a production build.
const fixture = "/test/pages/components/slider/";
const html = await Bun.file(`.${fixture}index.html`).text();
const css = sass.compileString(directionArmsPrelude() + await Bun.file("src/styles/main.scss").text(), sassOptions()).css;
const bundle = await Bun.build({ entrypoints: [resolve("src/components/slider/index.ts")], target: "browser", format: "esm" });
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0]!.text();
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    switch (new URL(request.url).pathname) {
      case "/dist/index.js": return new Response(js, { headers: { "Content-Type": "text/javascript" } });
      case "/dist/styles.css": return new Response(css, { headers: { "Content-Type": "text/css" } });
      case fixture: return new Response(html, { headers: { "Content-Type": "text/html" } });
      default: return new Response(null, { status: 404 });
    }
  },
});

const handle = ".mtrl-slider__handle";
const value = ".mtrl-slider__value";
const media = "#media-slider";
const alarm = "#alarm-slider";
const near = (error: number) => error <= 0.5;
const format = (error: number) => `${error.toFixed(2)} px`;
const failures: string[] = [];
const check = (condition: boolean, message: string) => { if (!condition) failures.push(message); };

const mount = async (page: Page, rtl = false) => {
  const direction = rtl ? "?dir=rtl" : "";
  await page.goto(`http://127.0.0.1:${server.port}${fixture}${direction}`);
  await page.locator(`${alarm} ${handle}`).waitFor();
  await settle(page);
};

const box = async (page: Page, selector: string) => {
  const bounds = await page.locator(selector).boundingBox();
  assert(bounds, `${selector} has no box`);
  return bounds;
};

interface Frame {
  handleX: number;
  valueX: number;
  bottom: number;
  opacity: number;
}

const sampleEntry = async (page: Page, onTrack: boolean) => {
  const initial = await box(page, `${media} ${handle}`);
  const track = await box(page, `${media} .mtrl-slider__container`);
  await page.evaluate(({ media, handle, value }) => {
    const root = document.querySelector(media)!;
    const thumb = root.querySelector(handle)!;
    const indicator = root.querySelector(value)!;
    const samples: Frame[] = [];
    const state = window as Window & { valueFrames?: Frame[]; stopValueFrames?: boolean };
    state.valueFrames = samples;
    state.stopValueFrames = false;
    const frame = () => {
      if (state.stopValueFrames) return;
      const a = thumb.getBoundingClientRect();
      const b = indicator.getBoundingClientRect();
      samples.push({
        handleX: a.x + a.width / 2,
        valueX: b.x + b.width / 2,
        bottom: b.bottom,
        opacity: Number(getComputedStyle(indicator).opacity),
      });
      requestAnimationFrame(frame);
    };
    root.addEventListener("pointerdown", () => requestAnimationFrame(frame), { once: true });
  }, { media, handle, value });
  await page.mouse.move(onTrack ? track.x + track.width * 0.7 : initial.x + initial.width / 2, initial.y + initial.height / 2);
  await page.mouse.down();
  await settle(page, {
    target: media,
    until: () => page.locator(`${media} ${value}--visible`).count().then(count => count === 1),
  });
  const samples = await page.evaluate(() => {
    const state = window as Window & { valueFrames?: Frame[]; stopValueFrames?: boolean };
    state.stopValueFrames = true;
    return state.valueFrames ?? [];
  });
  await page.mouse.up();
  const rest = samples.at(-1);
  assert(rest && samples.length >= 3 && rest.opacity >= 0.99, "indicator did not finish entering");
  const worst = (difference: (frame: Frame) => number) => Math.max(...samples.map(frame => Math.abs(difference(frame))));
  return {
    frames: samples.length,
    moved: Math.abs(rest.handleX - initial.x - initial.width / 2),
    alignment: worst(frame => frame.valueX - frame.handleX),
    lateral: worst(frame => frame.valueX - rest.valueX),
    vertical: worst(frame => frame.bottom - rest.bottom),
  };
};

const overlap = async (page: Page, mode: "plain" | "dialog" | "scroll" | "rtl") => {
  await page.evaluate(mode => {
    const panel = document.querySelector<HTMLElement>("#sound-panel")!;
    if (mode === "dialog") {
      const dialog = document.createElement("dialog");
      document.body.append(dialog);
      dialog.append(panel);
      dialog.showModal();
    }
    if (mode === "scroll") {
      const scroller = document.createElement("div");
      scroller.style.cssText = "width:380px;height:250px;overflow:auto";
      document.body.append(scroller);
      const spacer = document.createElement("div");
      spacer.style.height = "120px";
      const end = spacer.cloneNode() as HTMLElement;
      scroller.append(spacer, panel, end);
      scroller.scrollTop = 100;
    }
  }, mode);
  await settle(page);
  const upper = await box(page, `${media} ${handle}`);
  const lower = await box(page, `${alarm} ${handle}`);
  if (mode === "rtl") {
    const track = await box(page, `${media} .mtrl-slider__container`);
    assert(upper.x + upper.width / 2 > track.x + track.width / 2, "25% is on the right of the RTL track");
  }
  const y = lower.y + lower.height / 2;
  await page.mouse.move(lower.x + lower.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(upper.x + upper.width / 2, y, { steps: 4 });
  await settle(page, { target: alarm });
  const hit = await page.evaluate(({ media, alarm, handle, value }) => {
    const upperHandle = document.querySelector(`${media} ${handle}`)!;
    const lowerValue = document.querySelector<HTMLElement>(`${alarm} ${value}--visible`)!;
    const a = upperHandle.getBoundingClientRect();
    const b = lowerValue.getBoundingClientRect();
    const left = Math.max(a.left, b.left);
    const right = Math.min(a.right, b.right);
    const top = Math.max(a.top, b.top);
    const bottom = Math.min(a.bottom, b.bottom);
    // The decorative value stays pointer-transparent in production. Enable
    // hit testing here only, to inspect its actual paint order.
    lowerValue.style.pointerEvents = "auto";
    const hit = document.elementFromPoint((left + right) / 2, (top + bottom) / 2);
    lowerValue.style.pointerEvents = "";
    return {
      width: right - left,
      height: bottom - top,
      winner: hit === lowerValue ? "indicator" : hit === upperHandle ? "other handle" : hit?.className,
    };
  }, { media, alarm, handle, value });
  await page.mouse.up();
  return hit;
};

try {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch(engine === chromium ? { args: ["--use-mock-keychain", "--password-store=basic"] } : {});
    try {
      const page = await browser.newPage({ viewport: { width: 800, height: 600 }, reducedMotion: "no-preference" });
      for (const onTrack of [false, true]) {
        await mount(page);
        const result = await sampleEntry(page, onTrack);
        const id = `${engine.name()} ${onTrack ? "track" : "handle"} press`;
        console.log(`${id}: ${result.frames} frames, alignment ${format(result.alignment)}, lateral ${format(result.lateral)}, bottom ${format(result.vertical)}`);
        check(!onTrack || result.moved > 50, `${id}: the track press did not move the handle`);
        check(near(result.alignment) && near(result.lateral) && near(result.vertical), `${id}: the entering indicator moved away from its anchor`);
      }
      for (const mode of ["plain", "dialog", "scroll", "rtl"] as const) {
        await mount(page, mode === "rtl");
        const hit = await overlap(page, mode);
        const id = `${engine.name()} ${mode}`;
        console.log(`${id}: ${format(hit.width)} × ${format(hit.height)} overlap, ${hit.winner} on top`);
        check(hit.width > 1 && hit.height > 1 && hit.winner === "indicator", `${id}: the indicator did not paint over the other handle`);
      }
    } finally {
      await browser.close();
    }
  }
  assert.deepEqual(failures, []);
  console.log("Slider value indicators stay anchored and paint over overlapping handles.");
} finally {
  server.stop(true);
}
