#!/usr/bin/env bun
/**
 * Carousel block padding and the opening small preview, against the specs.
 * https://m3.material.io/components/carousel/specs (2026-11-27):
 * multi-browse, uncontained, hero and centred hero have 8dp at the top and
 * bottom; full-screen has none. A small item is 40–56dp.
 *
 * On main the block padding is 0px, and the opening preview is 32px on hero
 * and 34.67px on centred hero. The inline padding stays 16px, the gap stays
 * 8px, and the hero's two opening items still fill the container minus the
 * leading padding.
 *
 * At 900px, six multi-browse slides share a final focal group. The three
 * slides in that group are separately selectable by keyboard at the same
 * reachable scroll position.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { webkit, type Browser, type Page } from "playwright";
import { compileString } from "sass";

import type { CarouselComponent, CarouselConfig } from "../src/components/carousel/types";
import { launchChromium } from "./browser-profile";

const repoRoot = resolve(import.meta.dir, "..");
const css = compileString(`@use "themes/baseline"; @use "base/reset"; @use "components/carousel";`, {
  loadPaths: [resolve(repoRoot, "src/styles")],
  style: "expanded",
}).css;

const bundle = await Bun.build({
  entrypoints: ["carousel-reference-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^carousel-reference-entry\.ts$/ }, () => ({ path: "carousel-reference-entry.ts", namespace: "carousel-reference" }));
      build.onLoad({ filter: /.*/, namespace: "carousel-reference" }, () => ({
        contents: `import { createCarousel } from ${JSON.stringify(resolve(repoRoot, "src/components/carousel/index.ts"))};
window.createCarousel = createCarousel;`,
        loader: "ts",
      }));
    },
  }],
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0]!.text();

type Reading = {
  variant: string;
  block: number;
  inline: number;
  gap: number;
  second: number;
  firstWidth: number;
  height: number;
  container: number;
  clip: string;
};

type FixtureWindow = {
  createCarousel: (config: CarouselConfig) => CarouselComponent;
  multiBrowse: CarouselComponent;
  changes: number[];
};

const mount = () => {
  const fixture = window as unknown as FixtureWindow;
  document.body.replaceChildren();
  document.body.style.cssText = "margin:0";
  for (const variant of ["multi-browse", "uncontained", "hero", "hero-center", "full-screen"] as const) {
    const host = document.createElement("div");
    host.dataset.case = variant;
    host.style.cssText = "width:682px;height:240px";
    const slides = Array.from({ length: 6 }, (_, i) => {
      const content = document.createElement("div");
      content.style.cssText = `width:100%;height:100%;background:hsl(${i * 55} 60% 70%)`;
      return { content, title: `Slide ${i + 1}` };
    });
    const carousel = fixture.createCarousel({ variant, slides });
    if (variant === "multi-browse") fixture.multiBrowse = carousel;
    host.append(carousel.element);
    document.body.append(host);
  }
};

const read = (): Reading[] => {
  const insetOf = (clip: string): number | null => {
    if (!clip || clip === "none") return 0;
    const match = /^inset\(0px ([\d.]+)px(?:[\s)]| round)/.exec(clip);
    return match ? Number(match[1]) : null;
  };
  return ["multi-browse", "uncontained", "hero", "hero-center", "full-screen"].map((variant) => {
    const host = document.querySelector(`[data-case="${variant}"]`)!;
    const root = host.querySelector(".mtrl-carousel")!;
    const scroller = root.querySelector(".mtrl-carousel__scroller")!;
    const item = (label: string) => root.querySelector<HTMLElement>(`.mtrl-carousel__item[aria-label="${label}"]`)!;
    const first = item("Slide 1");
    const second = item("Slide 2");
    const box = (el: HTMLElement) => {
      const rect = el.getBoundingClientRect();
      const clip = getComputedStyle(el).clipPath;
      const cut = insetOf(clip);
      return { left: rect.left + (cut ?? 0), top: rect.top, width: cut === null ? Number.NaN : rect.width - 2 * cut, clip };
    };
    const a = box(first);
    const b = box(second);
    const rootBox = root.getBoundingClientRect();
    return {
      variant,
      block: a.top - rootBox.top,
      inline: a.left - rootBox.left,
      gap: b.left - (a.left + a.width),
      second: b.width,
      firstWidth: a.width,
      height: rootBox.height,
      container: scroller.clientWidth,
      clip: b.clip,
    };
  });
};

const near = (actual: number, expected: number, label: string) => {
  assert.ok(Math.abs(actual - expected) < 1.5, `${label}: ${actual}px, expected ${expected}px`);
};

const failures: string[] = [];
const checkWideSnap = async (page: Page, engine: string) => {
  const track = page.locator("[data-case='multi-browse'] .mtrl-carousel__track");
  const previousWidth = await track.evaluate(el => (el as HTMLElement).style.width);
  await page.locator("[data-case='multi-browse']").evaluate(el => { (el as HTMLElement).style.width = "900px"; });
  await page.waitForFunction(width => {
    const track = document.querySelector<HTMLElement>("[data-case='multi-browse'] .mtrl-carousel__track");
    return track && track.style.width !== width;
  }, previousWidth);

  const readPosition = async () => page.evaluate(async () => {
    const fixture = window as unknown as FixtureWindow;
    const carousel = fixture.multiBrowse;
    const scroller = carousel.element.querySelector<HTMLElement>(".mtrl-carousel__scroller")!;
    let last = scroller.scrollLeft;
    let quietSince = performance.now();
    const start = quietSince;
    await new Promise<void>((resolve, reject) => {
      const sample = (now: number) => {
        if (scroller.scrollLeft !== last) {
          last = scroller.scrollLeft;
          quietSince = now;
        }
        if (now - quietSince >= 180) resolve();
        else if (now - start >= 3000) reject(new Error("Carousel scroll did not settle"));
        else requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    // A scroll update at the current position must retain the chosen member
    // of the focal group after the pending navigation has settled.
    scroller.dispatchEvent(new Event("scroll"));
    scroller.dispatchEvent(new Event("scroll"));
    return {
      left: scroller.scrollLeft,
      selection: carousel.getCurrentSlide() + 1,
      focus: document.activeElement?.getAttribute("aria-label"),
    };
  });

  const { targets, extent } = await page.evaluate(() => {
    const fixture = window as unknown as FixtureWindow;
    const carousel = fixture.multiBrowse;
    const scroller = carousel.element.querySelector<HTMLElement>(".mtrl-carousel__scroller")!;
    fixture.changes = [];
    carousel.on("change", ({ value }) => fixture.changes.push(value + 1));
    carousel.slides.getElements()[2]!.focus({ preventScroll: true });
    return {
      targets: [...scroller.querySelectorAll<HTMLElement>(".mtrl-carousel__snap")].map(point => Number.parseFloat(point.style.left)),
      extent: scroller.scrollWidth - scroller.clientWidth,
    };
  });
  const positions = [await readPosition()];
  for (const key of ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowLeft", "ArrowLeft", "ArrowLeft"]) {
    await page.keyboard.press(key);
    positions.push(await readPosition());
  }
  const changes = await page.evaluate(() => (window as unknown as FixtureWindow).changes);
  const selected = [3, 4, 5, 6, 5, 4, 3];
  const stops = positions.map(position => position.left);
  const checks: [boolean, string][] = [
    [targets.every((target, i) => target >= 0 && target <= extent + 0.5 && (i === 0 || target >= targets[i - 1]!)),
      `snap targets must be reachable and nondecreasing in the ${extent}px range: ${targets.join(", ")}`],
    [targets.slice(3).every(target => Math.abs(target - extent) < 0.5),
      `slides 4–6 must share the end target: ${targets.slice(3).join(", ")}`],
    [stops[0]! < extent && stops[6]! === stops[0] && stops.slice(1, 6).every(stop => stop === extent),
      `forward/back scroll positions: ${stops.join(", ")}`],
    [positions.every((position, i) => position.selection === selected[i] && position.focus === `Slide ${selected[i]}`),
      `keyboard selections and focus: ${JSON.stringify(positions)}`],
    [changes.join(",") === selected.join(","), `change events: ${changes.join(", ")}`],
  ];
  for (const [passed, message] of checks) {
    if (!passed) failures.push(`${engine}: ${message}`);
  }
  console.log(`${engine}: wide multi-browse targets [${targets.map(value => value.toFixed(2)).join(", ")}], positions [${stops.join(", ")}], changes [${changes.join(", ")}]`);
};

const run = async (page: Page, engine: string) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!doctype html><html lang="en" data-theme="baseline" data-theme-mode="light"><head><meta charset="utf-8"></head><body></body></html>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: js });
  await page.evaluate(mount);
  await page.waitForFunction(() => {
    const item = document.querySelector("[data-case='hero'] .mtrl-carousel__item");
    return !!item && item.getBoundingClientRect().width > 0;
  });
  const readings = await page.evaluate(read);
  for (const reading of readings) {
    const row = reading.variant === "hero-center" ? "centered-hero" : reading.variant;
    const fullScreen = reading.variant === "full-screen";
    near(reading.block, fullScreen ? 0 : 8, `${engine}: carousel/block-padding/${row}/rest`);
    near(reading.height, 240, `${engine}: ${reading.variant} container height`);
    if (fullScreen) continue;
    near(reading.inline, 16, `${engine}: carousel/inline-padding/${row}/rest`);
    near(reading.gap, 8, `${engine}: carousel/item-gap/${row}/rest`);
  }
  const hero = readings.find((reading) => reading.variant === "hero")!;
  const centered = readings.find((reading) => reading.variant === "hero-center")!;
  assert.ok(hero.second >= 39.5, `${engine}: carousel/small-item-width/hero/opening is ${hero.second}px (clip ${hero.clip})`);
  assert.ok(centered.second >= 39.5, `${engine}: carousel/small-item-width/centered-hero/opening is ${centered.second}px (clip ${centered.clip})`);
  near(hero.firstWidth + hero.gap + hero.second, hero.container - 16, `${engine}: hero opening still fills the container`);
  await checkWideSnap(page, engine);
  assert.deepEqual(errors, [], `${engine}: ${errors.join("\n")}`);
  console.log(`${engine}: block padding 8 (full-screen 0), opening preview at least 40`);
};

const pageOptions = { viewport: { width: 900, height: 1400 }, reducedMotion: "no-preference" as const };

const chromiumContext = await launchChromium({ headless: true, ...pageOptions });
try {
  const page = await chromiumContext.newPage();
  await run(page, "chromium");
  await page.close();
} finally {
  await chromiumContext.close();
}

const webkitBrowser: Browser = await webkit.launch({ headless: true });
const webkitContext = await webkitBrowser.newContext(pageOptions);
try {
  const page = await webkitContext.newPage();
  await run(page, "webkit");
  await page.close();
} finally {
  await webkitBrowser.close();
}

assert.equal(failures.length, 0, failures.join("\n"));
console.log("Carousel block padding, opening previews and wide multi-browse snapping passed.");
