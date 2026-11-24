// scripts/check-carousel-browser.ts
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import type { Page } from "playwright";
import type { CarouselComponent, CarouselConfig } from "../src/components/carousel";

type CarouselWindow = Window & {
  createCarousel: (config: CarouselConfig) => CarouselComponent;
  wheelCarousel: CarouselComponent;
};

// The recordings below dispatch one wheel event per animation frame and read the
// position on every frame, so they describe the carousel only while the browser
// delivers frames steadily. A stalled frame changes the input: events more than
// 120ms apart (WHEEL_QUIET) are two gestures, the second measured from wherever
// the first had glided to, and a velocity read across the stall is an average.
// A CI runner stalled once for 283ms and the carousel, correctly, went one slide
// further than the recording expected. Such a recording is taken again, never
// judged; three in a row fail the check.
const STEADY_FRAME = 50;
const RECORDINGS = 3;

/**
 * `page.waitForFunction`, with a failure that says which wait it was and where the
 * carousel and the page stood. A bare "Timeout 30000ms exceeded" from this check
 * (seen once, under load, after the uncontained traces) names neither.
 */
function waitFor(page: Page, what: string, ready: () => unknown): Promise<void>;
function waitFor<T>(page: Page, what: string, ready: (arg: T) => unknown, arg: T): Promise<void>;
async function waitFor<T>(
  page: Page,
  what: string,
  ready: (arg: T) => unknown,
  arg?: T,
): Promise<void> {
  try {
    await page.waitForFunction(ready as Parameters<Page["waitForFunction"]>[0], arg);
  } catch (error) {
    const state = await page.evaluate(() => {
      const scroller = document.querySelector<HTMLElement>(".mtrl-carousel__scroller");
      return scroller && {
        scrollLeft: scroller.scrollLeft, end: scroller.scrollWidth - scroller.clientWidth,
        snap: scroller.style.scrollSnapType || "(none set)", slide: (window as unknown as CarouselWindow).wheelCarousel?.getCurrentSlide(),
        pageScrollY: window.scrollY, hovered: scroller.matches(":hover"),
      };
    }).catch(() => "the page could not be read");
    throw new Error(`waiting for ${what}: ${String(error).split("\n")[0]} ${JSON.stringify(state)}`);
  }
}

/** Packed carousel wheel input and per-frame velocity and snap restoration. */
export async function checkCarouselWheel(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  await page.setViewportSize({ width: 800, height: 600 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const failures: string[] = [];
  const traces: unknown[] = [];
  for (const variant of ["multi-browse", "uncontained", "hero", "hero-center"] as const) {
    try {
      await page.evaluate(variant => {
        const state = window as unknown as CarouselWindow;
        document.body.replaceChildren();
        document.body.style.cssText = "display:block;margin:0;padding:0;height:3000px";
        window.scrollTo(0, 0);
        const carousel = state.createCarousel({
          variant, wheel: true, ...(variant.includes("hero") ? {} : { itemWidth: 200 }),
          slides: Array.from({ length: 20 }, (_, i) => ({ title: `Slide ${i}` })),
        });
        carousel.element.id = "wheel-carousel";
        carousel.element.style.cssText = "width:760px;height:240px";
        document.body.append(carousel.element);
        state.wheelCarousel = carousel;
      }, variant);
      const scroller = page.locator("#wheel-carousel .mtrl-carousel__scroller");
      await waitFor(page, "the carousel to lay its slides out", () => document.querySelector(".mtrl-carousel__scroller")!.scrollWidth > 760);
      if (variant !== "uncontained") {
        assert.equal(await scroller.evaluate(el => getComputedStyle(el).scrollSnapType), "x mandatory");
      }
      for (const momentum of [false, true]) {
        const label = `${variant} ${momentum ? "30-event decay" : "100px notch"}`;
        const record = async () => {
          await scroller.evaluate(el => el.scrollTo({ left: 0, behavior: "instant" }));
          await page.waitForTimeout(150);
          return scroller.evaluate(async (element, momentum) => {
            const snaps = Array.from(element.querySelectorAll<HTMLElement>(".mtrl-carousel__snap"), el => parseFloat(el.style.left));
            const deltas = momentum ? Array.from({ length: 30 }, (_, i) => 300 * 0.9 ** i) : [100];
            const target = snaps.find(position => position >= deltas.reduce((sum, delta) => sum + delta, 0))!;
            const samples: { ms: number; left: number; snap: string }[] = [];
            const prevented: boolean[] = [];
            const targets: { frame: number; left: number }[] = [];
            const snapBefore = element.style.scrollSnapType;
            const start = performance.now();
            await new Promise<void>(resolve => {
              let frame = 0;
              const sample = (now: number) => {
                samples.push({ ms: now - start, left: element.scrollLeft, snap: element.style.scrollSnapType });
                if (frame < deltas.length) {
                  const event = new WheelEvent("wheel", { deltaY: deltas[frame], bubbles: true, cancelable: true });
                  element.dispatchEvent(event);
                  prevented.push(event.defaultPrevented);
                  const left = snaps[(window as unknown as CarouselWindow).wheelCarousel.getCurrentSlide()]!;
                  if (targets.at(-1)?.left !== left) targets.push({ frame, left });
                }
                frame++;
                if (now - start < 2200) requestAnimationFrame(sample);
                else resolve();
              };
              requestAnimationFrame(sample);
            });
            // px/ms from actual frame intervals, independent of display refresh rate.
            const velocities = samples.slice(1).map((sample, i) =>
              (sample.left - samples[i]!.left) / (sample.ms - samples[i]!.ms));
            return { momentum, snaps, target, samples, velocities, prevented, targets, snapBefore };
          }, momentum);
        };
        let trace = await record();
        let longestFrame = 0;
        for (let recording = 1; ; recording++) {
          longestFrame = Math.max(...trace.samples.slice(1).map((sample, i) => sample.ms - trace.samples[i]!.ms));
          traces.push({ variant, recording, longestFrame, ...trace });
          if (longestFrame <= STEADY_FRAME || recording === RECORDINGS) break;
          console.log(`${label}: a frame took ${longestFrame.toFixed(1)}ms, recording again (${recording} of ${RECORDINGS} discarded)`);
          // A stalled glide may outlast its recording; the next one starts from rest.
          await waitFor(page, "the glide of a discarded recording to end", () => document.querySelector<HTMLElement>(".mtrl-carousel__scroller")!.style.scrollSnapType !== "none");
          trace = await record();
        }
        if (longestFrame > STEADY_FRAME) {
          failures.push(`${label}: no steady recording in ${RECORDINGS} attempts (a frame took ${longestFrame.toFixed(1)}ms, the limit is ${STEADY_FRAME}ms)`);
          continue;
        }
        const positions = trace.samples.map(sample => sample.left);
        const first = positions.findIndex(left => left > 0);
        const last = positions.findIndex(left => Math.abs(left - trace.target) <= 0.5);
        const restored = trace.samples.findIndex((sample, i) => i > first && sample.snap === trace.snapBefore);
        const lastExtension = trace.targets.at(-1)!.frame;
        // Include the next two frames to catch a delayed native-scroll restart.
        const extendingVelocities = trace.velocities.slice(first - 1, lastExtension + 2);
        console.log(`${label}: ${JSON.stringify({ target: trace.target, targets: trace.targets, restored, positions: positions.slice(0, last + 1), velocities: trace.velocities.slice(0, last).map(v => +v.toFixed(3)), extendingVelocities: extendingVelocities.map(v => +v.toFixed(3)) })}`);
        try {
          assert(trace.prevented.every(Boolean), `${label}: wheel consumed`);
          assert(positions.every((left, i) => i === 0 || left >= positions[i - 1]!), `${label}: no reversal`);
          assert(first >= 0 && last > first, `${label}: animated motion reaches target`);
          if (momentum) {
            assert(extendingVelocities.every((velocity, i) => i === 0 || velocity >= extendingVelocities[i - 1]! * 0.7), `${label}: velocity drops at most 30% while extending the target`);
          }
          assert(trace.samples.some(sample => sample.snap === "none"), `${label}: CSS snap suspended`);
          assert(restored > first, `${label}: CSS snap restored at rest`);
          assert(trace.samples.slice(first, restored).every(sample => sample.snap === "none"), `${label}: snap stays suspended throughout glide`);
          assert(positions.slice(restored).every(left => left === positions[restored]), `${label}: no movement after snap restoration`);
          assert(Math.abs(positions.at(-1)! - trace.target) <= 0.5, `${label}: exact snap landing`);
          assert(Math.abs(trace.targets[0]!.left - trace.snaps.find(position => position >= (momentum ? 300 : 100))!) < 0.01, `${label}: immediate directional snap`);
          assert(trace.targets.every((call, i) => i === 0 || call.left > trace.targets[i - 1]!.left), `${label}: only forward retargets`);
          if (momentum) assert(trace.target > trace.snaps[3]!, `${label}: momentum passes several items`);
          else assert.equal(trace.target, trace.snaps[1], `${label}: exactly one item`);
          assert.equal(await page.evaluate(() => window.scrollY), 0);
        } catch (error) {
          failures.push(`${label}: ${String(error)}`);
        }
      }
      // Go to the actual end, then verify both cancellation and native default action.
      await page.evaluate(() => (window as unknown as CarouselWindow).wheelCarousel.goTo(19));
      await waitFor(page, "goTo(19) to reach the end", () => {
        const el = document.querySelector(".mtrl-carousel__scroller")!;
        return Math.abs(el.scrollWidth - el.clientWidth - el.scrollLeft) < 0.5;
      });
      assert.equal(await scroller.evaluate(element => {
        const event = new WheelEvent("wheel", { deltaY: 160, cancelable: true });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      }), false, `${variant}: end wheel is not prevented`);
      await scroller.hover();
      await page.mouse.wheel(0, 180);
      await waitFor(page, "the trusted wheel at the end to scroll the page", () => window.scrollY > 0);
      console.log(`Checked carousel ${variant}: frame traces recorded; trusted edge wheel scrolls the page.`);
    } catch (error) {
      failures.push(`${variant}: ${String(error)}`);
    } finally {
      await page.evaluate(() => (window as unknown as CarouselWindow).wheelCarousel?.destroy());
    }
  }
  await mkdir("analysis/core", { recursive: true });
  await writeFile("analysis/core/carousel-wheel-frames.json", JSON.stringify(traces, null, 2) + "\n");
  await page.evaluate(() => { document.body.style.cssText = ""; window.scrollTo(0, 0); });
  if (viewport) await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  assert.deepEqual(failures, [], "carousel wheel browser regressions");
}

/** Packed carousel: a fresh wheel notch just short of a snap lands on that snap. */
export async function checkCarouselWheelSubPixelSnap(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  await page.setViewportSize({ width: 800, height: 600 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const failures: string[] = [];
  for (const variant of ["multi-browse", "uncontained", "hero", "hero-center"] as const) {
    try {
      await page.evaluate(variant => {
        const state = window as unknown as CarouselWindow;
        document.body.replaceChildren();
        document.body.style.cssText = "display:block;margin:0;padding:0;height:3000px";
        window.scrollTo(0, 0);
        const carousel = state.createCarousel({
          variant, wheel: true, ...(variant.includes("hero") ? {} : { itemWidth: 200 }),
          slides: Array.from({ length: 20 }, (_, i) => ({ title: `Slide ${i}` })),
        });
        carousel.element.id = "wheel-carousel";
        carousel.element.style.cssText = "width:760px;height:240px";
        document.body.append(carousel.element);
        state.wheelCarousel = carousel;
      }, variant);
      const scroller = page.locator("#wheel-carousel .mtrl-carousel__scroller");
      await waitFor(page, "the carousel to lay its slides out", () => document.querySelector(".mtrl-carousel__scroller")!.scrollWidth > 760);
      const landing = await scroller.evaluate(async element => {
        const snaps = Array.from(element.querySelectorAll<HTMLElement>(".mtrl-carousel__snap"), el => parseFloat(el.style.left));
        // Stand one pixel short of a snap. Chromium rounds scrollLeft to whole
        // pixels, so the sub-pixel case is built from a fractional wheel delta,
        // as trackpads deliver: a 1.5px notch crosses the snap by half a pixel,
        // and the landing must be that snap, not the next one.
        // The saved snap declaration never snaps this horizontal scroller and
        // differs from the "none" a glide suspends it to, so its restoration
        // marks the spring at rest (stopWheel), not merely a scroll that ended.
        const saved = "y mandatory";
        const snap = snaps[4]!;
        element.style.scrollSnapType = saved;
        element.scrollLeft = snap - 1;
        await new Promise(requestAnimationFrame);
        const event = new WheelEvent("wheel", { deltaY: 1.5, bubbles: true, cancelable: true });
        element.dispatchEvent(event);
        const start = element.scrollLeft;
        const suspended = element.style.scrollSnapType === "none";
        const began = performance.now();
        const settled = await new Promise<boolean>(resolve => {
          const poll = () => {
            if (element.style.scrollSnapType === saved) resolve(true);
            else if (performance.now() - began > 3000) resolve(false);
            else requestAnimationFrame(poll);
          };
          requestAnimationFrame(poll);
        });
        // One more frame, so the restored position is the one painted.
        await new Promise(requestAnimationFrame);
        return {
          snap, next: snaps[5]!, start, end: element.scrollLeft, prevented: event.defaultPrevented,
          suspended, settled, ms: Math.round(performance.now() - began),
        };
      });
      console.log(`${variant} fresh notch half a pixel past a snap: start=${landing.start} snap=${landing.snap} next=${landing.next} landed=${landing.end} (${landing.settled ? "glide at rest after" : "no rest within"} ${landing.ms}ms)`);
      try {
        assert.ok(landing.prevented, `${variant}: wheel consumed`);
        assert.ok(Math.abs(landing.start - (landing.snap - 1)) <= 0.51, `${variant}: stood one pixel short of the snap (at ${landing.start})`);
        assert.ok(landing.suspended, `${variant}: the notch started a glide (snap suspended)`);
        assert.ok(landing.settled, `${variant}: the glide did not come to rest within 3s (at ${landing.end})`);
        assert.notEqual(landing.end, landing.start, `${variant}: the notch did not move from ${landing.start}`);
        assert.ok(Math.abs(landing.end - landing.snap) <= 0.5, `${variant}: landed ${landing.end}, not the snap the notch crossed by half a pixel (${landing.snap}; the next is ${landing.next})`);
      } catch (error) {
        failures.push(`${variant}: ${String(error)}`);
      }
    } catch (error) {
      failures.push(`${variant}: ${String(error)}`);
    } finally {
      await page.evaluate(() => (window as unknown as CarouselWindow).wheelCarousel?.destroy());
    }
  }
  await page.evaluate(() => { document.body.style.cssText = ""; window.scrollTo(0, 0); });
  if (viewport) await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  assert.deepEqual(failures, [], "carousel sub-pixel fresh-notch browser regressions");
}

/**
 * Uncontained carousel layout conformance check.
 *
 * Verifies that under the owner's exact settings (item width 280, gap 8, padding 16,
 * captions on, snap on, 24 slides, 760 px container):
 * - At slide 0 and slide 10, every item's visible width is the configured width (280)
 *   or cut by the container edge (>= 50% visible where Material's figure shows > 50%);
 * - No item is a sliver (< 50% visible while fully inside the container);
 * - Consecutive visible items step by item + gap (288 px, tolerance 0.5 px);
 * - The row does not terminate before the container's right edge;
 * - No per-item clipPath shrinks an item's visible width below the above.
 */
export async function checkCarouselUncontained(
  page: Page,
  options: { screenshotDir?: string } = {},
): Promise<void> {
  const failures: string[] = [];
  const viewport = page.viewportSize();
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.emulateMedia({ reducedMotion: "no-preference" });

  try {
    await page.evaluate(() => {
      const state = window as unknown as CarouselWindow & { uncontainedCarousel?: CarouselComponent };
      state.uncontainedCarousel?.destroy?.();
      document.body.replaceChildren();
      document.body.style.cssText = "display:block;margin:0;padding:24px;background:#fdfcf4;";
      window.scrollTo(0, 0);

      const host = document.createElement("div");
      host.id = "uncontained-carousel-host";
      host.style.cssText = "width:760px;height:400px;position:relative;margin:0 auto;";
      document.body.append(host);

      const carousel = state.createCarousel({
        variant: "uncontained",
        itemWidth: 280,
        gap: 8,
        padding: 16,
        snap: true,
        slides: Array.from({ length: 24 }, (_, i) => ({
          title: `Slide ${i + 1}`,
          description: `Description ${i + 1}`,
        })),
      });
      carousel.element.id = "uncontained-carousel";
      carousel.element.style.cssText = "width:100%;height:100%;";
      host.append(carousel.element);
      state.uncontainedCarousel = carousel;
    });

    await waitFor(page, "uncontained carousel to lay its slides out", () => {
      const el = document.querySelector<HTMLElement>("#uncontained-carousel .mtrl-carousel__scroller");
      return el && el.scrollWidth > 760;
    });

    type MeasuredSlide = {
      index: number;
      left: number;
      right: number;
      width: number;
      clipPath: string;
      clippedWidth: number;
      visibleWidth: number;
      visibility: string;
      isFullyInside: boolean;
      cutsRightEdge: boolean;
    };

    const measureLayout = async (): Promise<{
      containerWidth: number;
      scrollLeft: number;
      scrollWidth: number;
      visibleItems: MeasuredSlide[];
    }> => {
      return page.evaluate(() => {
        const scrollerEl = document.querySelector<HTMLElement>("#uncontained-carousel .mtrl-carousel__scroller")!;
        const scrollerRect = scrollerEl.getBoundingClientRect();
        const containerWidth = scrollerEl.clientWidth;
        const scrollLeft = scrollerEl.scrollLeft;
        const scrollWidth = scrollerEl.scrollWidth;

        const items = Array.from(document.querySelectorAll<HTMLElement>("#uncontained-carousel .mtrl-carousel__item"));
        const measured: MeasuredSlide[] = [];

        items.forEach((el, index) => {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const visibility = style.visibility;
          const clipPath = style.clipPath;
          const left = rect.left - scrollerRect.left;
          const right = rect.right - scrollerRect.left;
          const width = rect.width;

          let insetX = 0;
          if (clipPath && clipPath.includes("inset(")) {
            const match = clipPath.match(/inset\(([^)]+)\)/);
            if (match) {
              const parts = match[1]!.trim().split(/\s+/);
              if (parts.length >= 2) {
                insetX = parseFloat(parts[1]!) || 0;
              }
            }
          }
          const clippedWidth = Math.max(0, width - 2 * insetX);
          const visibleLeft = Math.max(0, left + insetX);
          const visibleRight = Math.min(containerWidth, right - insetX);
          const visibleWidth = Math.max(0, visibleRight - visibleLeft);

          const isVisible = visibility !== "hidden" && right > 0 && left < containerWidth;
          if (isVisible) {
            measured.push({
              index,
              left,
              right,
              width,
              clipPath,
              clippedWidth,
              visibleWidth,
              visibility,
              isFullyInside: left >= 0 && right <= containerWidth,
              cutsRightEdge: right >= containerWidth && left < containerWidth,
            });
          }
        });

        return { containerWidth, scrollLeft, scrollWidth, visibleItems: measured };
      });
    };

    if (options.screenshotDir) {
      await mkdir(options.screenshotDir, { recursive: true });
    }

    // --- Slide 0 check ---
    const slide0 = await measureLayout();
    console.log(`[uncontained check] Slide 0: containerWidth=${slide0.containerWidth}, scrollLeft=${slide0.scrollLeft}, scrollWidth=${slide0.scrollWidth}`);
    for (const item of slide0.visibleItems) {
      console.log(`  Item ${item.index}: left=${item.left.toFixed(2)}, right=${item.right.toFixed(2)}, width=${item.width.toFixed(2)}, clipPath=${item.clipPath}, clippedWidth=${item.clippedWidth.toFixed(2)}, visibleWidth=${item.visibleWidth.toFixed(2)}`);
    }

    if (options.screenshotDir) {
      await page.screenshot({ path: `${options.screenshotDir}/slide0-light.png` });
      await page.evaluate(() => {
        document.documentElement.dataset.theme = "baseline";
        document.documentElement.dataset.themeMode = "dark";
        document.documentElement.classList.add("dark-theme");
        document.body.style.background = "#141318";
      });
      await page.waitForTimeout(50);
      await page.screenshot({ path: `${options.screenshotDir}/slide0-dark.png` });
      await page.evaluate(() => {
        document.documentElement.dataset.themeMode = "light";
        document.documentElement.classList.remove("dark-theme");
        document.body.style.background = "#fdfcf4";
      });
      await page.waitForTimeout(50);
    }

    for (const item of slide0.visibleItems) {
      if (item.clipPath && item.clippedWidth < 279.5 && !item.cutsRightEdge) {
        failures.push(`Slide 0, item ${item.index}: clipPath (${item.clipPath}) shrunk item width to ${item.clippedWidth.toFixed(2)} px (expected 280 px)`);
      }
      if (item.isFullyInside && item.visibleWidth < 140) {
        failures.push(`Slide 0, item ${item.index}: sliver detected inside container: visible width ${item.visibleWidth.toFixed(2)} px (< 50% of 280)`);
      }
      if (item.cutsRightEdge && item.visibleWidth < 140) {
        failures.push(`Slide 0, item ${item.index}: cut-off item visible width ${item.visibleWidth.toFixed(2)} px (< 50% of 280 px)`);
      }
    }
    for (let i = 1; i < slide0.visibleItems.length; i++) {
      const step = slide0.visibleItems[i]!.left - slide0.visibleItems[i - 1]!.left;
      if (Math.abs(step - 288) > 0.5) {
        failures.push(`Slide 0: step between item ${slide0.visibleItems[i - 1]!.index} and ${slide0.visibleItems[i]!.index} is ${step.toFixed(2)} px (expected 288 ± 0.5 px)`);
      }
    }
    const rightmost0 = Math.max(...slide0.visibleItems.map(item => item.right));
    if (rightmost0 < slide0.containerWidth) {
      failures.push(`Slide 0: row terminates before container right edge: rightmost visible item right is ${rightmost0.toFixed(2)} px vs container ${slide0.containerWidth} px`);
    }

    // --- Slide 10 check ---
    await page.evaluate(() => {
      (window as unknown as { uncontainedCarousel: CarouselComponent }).uncontainedCarousel.goTo(10);
    });
    await waitFor(page, "scroll to reach slide 10 position", () => {
      const el = document.querySelector<HTMLElement>("#uncontained-carousel .mtrl-carousel__scroller");
      return el && Math.abs(el.scrollLeft - 2880) < 1;
    });
    await page.waitForTimeout(50);
    const slide10 = await measureLayout();
    console.log(`[uncontained check] Slide 10: containerWidth=${slide10.containerWidth}, scrollLeft=${slide10.scrollLeft}, scrollWidth=${slide10.scrollWidth}`);
    for (const item of slide10.visibleItems) {
      console.log(`  Item ${item.index}: left=${item.left.toFixed(2)}, right=${item.right.toFixed(2)}, width=${item.width.toFixed(2)}, clipPath=${item.clipPath}, clippedWidth=${item.clippedWidth.toFixed(2)}, visibleWidth=${item.visibleWidth.toFixed(2)}`);
    }

    if (options.screenshotDir) {
      await page.screenshot({ path: `${options.screenshotDir}/slide10-light.png` });
      await page.evaluate(() => {
        document.documentElement.dataset.theme = "baseline";
        document.documentElement.dataset.themeMode = "dark";
        document.documentElement.classList.add("dark-theme");
        document.body.style.background = "#141318";
      });
      await page.waitForTimeout(50);
      await page.screenshot({ path: `${options.screenshotDir}/slide10-dark.png` });
      await page.evaluate(() => {
        document.documentElement.dataset.themeMode = "light";
        document.documentElement.classList.remove("dark-theme");
        document.body.style.background = "#fdfcf4";
      });
      await page.waitForTimeout(50);
    }

    for (const item of slide10.visibleItems) {
      if (item.clipPath && item.clippedWidth < 279.5 && !item.cutsRightEdge) {
        failures.push(`Slide 10, item ${item.index}: clipPath (${item.clipPath}) shrunk item width to ${item.clippedWidth.toFixed(2)} px (expected 280 px)`);
      }
      if (item.isFullyInside && item.visibleWidth < 140) {
        failures.push(`Slide 10, item ${item.index}: sliver detected inside container: visible width ${item.visibleWidth.toFixed(2)} px (< 50% of 280)`);
      }
      if (item.cutsRightEdge && item.visibleWidth < 140) {
        failures.push(`Slide 10, item ${item.index}: cut-off item visible width ${item.visibleWidth.toFixed(2)} px (< 50% of 280 px)`);
      }
    }
    for (let i = 1; i < slide10.visibleItems.length; i++) {
      const step = slide10.visibleItems[i]!.left - slide10.visibleItems[i - 1]!.left;
      if (Math.abs(step - 288) > 0.5) {
        failures.push(`Slide 10: step between item ${slide10.visibleItems[i - 1]!.index} and ${slide10.visibleItems[i]!.index} is ${step.toFixed(2)} px (expected 288 ± 0.5 px)`);
      }
    }
    const rightmost10 = Math.max(...slide10.visibleItems.map(item => item.right));
    if (rightmost10 < slide10.containerWidth) {
      failures.push(`Slide 10: row terminates before container right edge: rightmost visible item right is ${rightmost10.toFixed(2)} px vs container ${slide10.containerWidth} px`);
    }

    // --- Keyboard navigation & focus reachability check ---
    await page.evaluate(() => {
      (window as unknown as { uncontainedCarousel: CarouselComponent }).uncontainedCarousel.goTo(0);
    });
    await waitFor(page, "scroll to return to slide 0", () => {
      const el = document.querySelector<HTMLElement>("#uncontained-carousel .mtrl-carousel__scroller");
      return el && el.scrollLeft === 0;
    });

    // Focus the last fully visible item at slide 0 (item 1: 304..584 px inside 760 px container)
    await page.evaluate(() => {
      const items = document.querySelectorAll<HTMLElement>("#uncontained-carousel .mtrl-carousel__item");
      items[1]!.focus();
    });

    for (let expected = 2; expected < 24; expected++) {
      await page.keyboard.press("ArrowRight");
      const activeIndex = await page.evaluate(() => {
        const active = document.activeElement;
        const items = Array.from(document.querySelectorAll("#uncontained-carousel .mtrl-carousel__item"));
        return items.indexOf(active as HTMLElement);
      });
      if (activeIndex !== expected) {
        failures.push(`Keyboard ArrowRight to item ${expected}: activeElement is item ${activeIndex}`);
        break;
      }
      await waitFor(page, `item ${expected} to scroll into view`, (idx: number) => {
        const scroller = document.querySelector<HTMLElement>("#uncontained-carousel .mtrl-carousel__scroller")!;
        const item = document.querySelectorAll<HTMLElement>("#uncontained-carousel .mtrl-carousel__item")[idx]!;
        const sRect = scroller.getBoundingClientRect();
        const iRect = item.getBoundingClientRect();
        return iRect.right > sRect.left && iRect.left < sRect.right;
      }, expected);
    }

    if (!failures.some(f => f.includes("Keyboard ArrowRight"))) {
      for (let expected = 22; expected >= 0; expected--) {
        await page.keyboard.press("ArrowLeft");
        const activeIndex = await page.evaluate(() => {
          const active = document.activeElement;
          const items = Array.from(document.querySelectorAll("#uncontained-carousel .mtrl-carousel__item"));
          return items.indexOf(active as HTMLElement);
        });
        if (activeIndex !== expected) {
          failures.push(`Keyboard ArrowLeft to item ${expected}: activeElement is item ${activeIndex}`);
          break;
        }
        await waitFor(page, `item ${expected} to scroll into view`, (idx: number) => {
          const scroller = document.querySelector<HTMLElement>("#uncontained-carousel .mtrl-carousel__scroller")!;
          const item = document.querySelectorAll<HTMLElement>("#uncontained-carousel .mtrl-carousel__item")[idx]!;
          const sRect = scroller.getBoundingClientRect();
          const iRect = item.getBoundingClientRect();
          return iRect.right > sRect.left && iRect.left < sRect.right;
        }, expected);
      }
    }

  } finally {
    await page.evaluate(() => {
      (window as unknown as { uncontainedCarousel?: CarouselComponent }).uncontainedCarousel?.destroy?.();
      document.body.replaceChildren();
    });
    if (viewport) await page.setViewportSize(viewport);
  }

  assert.deepEqual(failures, [], `uncontained carousel browser regressions:\n${failures.join("\n")}`);
}


/** The readouts every drag-release scenario asserts, read from one root. */
type DragState = { dragging: boolean; settling: boolean; snap: string; left: number; hash: string };

const image = "data:image/gif;base64,R0lGODlhAQABAIAAAP8AAAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

/**
 * Every way a mouse drag stops leaves the carousel working: moving the mouse
 * afterwards never scrolls it, the snap points are back, and the next click
 * works. The scenarios are the ways a release goes missing — a context menu
 * over a slide (which releases the pointer capture without any cancel event,
 * leaving the drag unanchored, so a release outside the scroller never
 * arrives), the window blurring mid-drag, and the plain drags over a slide's
 * image and over the slide's own link. LTR and RTL, factory and element.
 */
export async function checkCarouselDragRelease(page: Page): Promise<void> {
  await page.setViewportSize({ width: 800, height: 600 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // The Mac trackpad's elastic overscroll displaces the strip in the
  // compositor while scrollLeft stays clamped — the layout never knows. The
  // scroller refuses the displacement outright.
  await page.evaluate(({ dir, image }) => {
    document.documentElement.dir = dir;
    document.body.replaceChildren();
    const mark = (host: HTMLElement) => { host.id = "drag-carousel"; host.style.cssText = "width:760px;height:240px"; };
    const carousel = (window as unknown as CarouselWindow).createCarousel({
      variant: "multi-browse", itemWidth: 200,
      slides: Array.from({ length: 8 }, (_, i) => ({ title: `Slide ${i}`, image, width: 200, height: 160 })),
    });
    mark(carousel.element);
    document.body.append(carousel.element);
  }, { dir: "ltr", image });
  await page.waitForFunction(() => {
    const scroller = document.querySelector<HTMLElement>(".mtrl-carousel__scroller");
    return !!scroller && scroller.scrollWidth > 760;
  });
  const overscroll = await page.evaluate(() => {
    const scroller = document.querySelector(".mtrl-carousel__scroller")!;
    return { x: getComputedStyle(scroller).overscrollBehaviorX, y: getComputedStyle(scroller).overscrollBehaviorY };
  });
  assert.equal(overscroll.x, "none", "the horizontal scroller refuses elastic overscroll");

  for (const route of ["factory", "element"] as const) {
    for (const dir of ["ltr", "rtl"] as const) {
      const label = `drag release ${route}/${dir}`;
      await page.evaluate(({ route, dir, image }) => {
        document.documentElement.dir = dir;
        document.body.replaceChildren();
        const mark = (host: HTMLElement) => { host.id = "drag-carousel"; host.style.cssText = "width:760px;height:240px"; };
        if (route === "factory") {
          const state = window as unknown as CarouselWindow;
          const carousel = state.createCarousel({
            variant: "multi-browse", itemWidth: 200,
            slides: Array.from({ length: 8 }, (_, i) => ({
              title: `Slide ${i}`, image, width: 200, height: 160,
              ...(i === 0 ? { buttonUrl: "#go", buttonText: "Open" } : {}),
            })),
          });
          mark(carousel.element);
          document.body.append(carousel.element);
        } else {
          const host = document.createElement("m-carousel");
          host.setAttribute("variant", "multi-browse");
          host.setAttribute("item-width", "200");
          for (let i = 0; i < 8; i++) {
            const item = document.createElement("m-carousel-item");
            item.setAttribute("src", image);
            item.setAttribute("alt", `Slide ${i}`);
            item.setAttribute("width", "200");
            item.setAttribute("height", "160");
            if (i === 0) { item.setAttribute("button-text", "Open"); item.setAttribute("button-url", "#go"); }
            host.append(item);
          }
          mark(host);
          document.body.append(host);
        }
      }, { route, dir, image });
      await page.waitForFunction(() => {
        const host = document.querySelector("m-carousel");
        const scroller = (host?.shadowRoot ?? document).querySelector<HTMLElement>(".mtrl-carousel__scroller");
        return !!scroller && scroller.scrollWidth > 760;
      });
      const state = async (): Promise<DragState> => page.evaluate(() => {
        const host = document.querySelector("m-carousel");
        const scope: ParentNode = host?.shadowRoot ?? document;
        const root = scope.querySelector(".mtrl-carousel") as HTMLElement;
        const scroller = scope.querySelector(".mtrl-carousel__scroller") as HTMLElement;
        return {
          dragging: "dragging" in root.dataset,
          settling: "settling" in root.dataset,
          snap: scroller.style.scrollSnapType || getComputedStyle(scroller).scrollSnapType,
          left: scroller.scrollLeft,
          hash: window.location.hash,
        };
      });
      const links = (where: string, after: DragState): void => {
        assert.equal(after.dragging, false, `${label}, ${where}: data-dragging is cleared`);
        assert.equal(after.settling, false, `${label}, ${where}: the settle marker is cleared`);
        assert.equal(after.snap, "x mandatory", `${label}, ${where}: the snap points are back`);
        assert.equal(after.hash, "#go", `${label}, ${where}: the next click works`);
      };
      const clickLink = async (): Promise<void> => {
        await page.evaluate(() => { window.location.hash = ""; });
        await page.locator("#drag-carousel .mtrl-carousel__button").first().click();
      };
      const movesDontScroll = async (where: string, before: DragState): Promise<void> => {
        await page.mouse.move(380, 120);
        await page.mouse.move(500, 120, { steps: 4 });
        assert.equal((await state()).left, before.left, `${label}, ${where}: moving the mouse does not scroll`);
      };

      // A press without a drag moves nothing and keeps the slide's link
      // clickable: the capture only starts once the drag passes its
      // threshold, and press-focus never scrolls the carousel.
      await page.mouse.move(380, 120);
      const beforePress = await state();
      await page.mouse.down();
      await page.waitForTimeout(120);
      // The strip must not move while the pointer holds it — the jump bug
      // scrolled on the press itself. The release may navigate to the slide
      // (a click selects it); only the held press is asserted here.
      const duringPress = await state();
      await page.mouse.up();
      const afterPress = await state();
      assert.equal(duringPress.left, beforePress.left, `${label}: a held press does not scroll`);
      assert.equal(afterPress.dragging, false, `${label}: a press leaves no drag state`);
      await clickLink();
      assert.equal((await state()).hash, "#go", `${label}: a press keeps the link clickable`);

      // A context menu over a slide releases the capture without a cancel
      // event; the release outside the scroller then never reaches it.
      await page.mouse.move(380, 120);
      await page.mouse.down();
      await page.mouse.move(300, 120, { steps: 4 });
      await page.mouse.down({ button: "right" });
      await page.mouse.up({ button: "right" });
      await page.mouse.move(60, 560, { steps: 4 });
      await page.mouse.up();
      let after = await state();
      await clickLink();
      after = await state();
      links("context menu", after);
      await movesDontScroll("context menu", after);

      // The window blurring mid-drag ends it; the late release is inert.
      await page.mouse.move(380, 120);
      await page.mouse.down();
      await page.mouse.move(300, 120, { steps: 4 });
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await page.mouse.move(60, 560, { steps: 4 });
      await page.mouse.up();
      after = await state();
      await clickLink();
      after = await state();
      links("window blur", after);
      await movesDontScroll("window blur", after);

      // The plain drags release normally: over the slide's image the fling
      // settles and the snap returns; over the slide's link no native drag
      // takes the gesture, and the link is clickable again.
      for (const on of ["image", "link"] as const) {
        const slideXs = async (): Promise<number[]> => page.evaluate(() => {
          const host = document.querySelector("m-carousel");
          const scope: ParentNode = host?.shadowRoot ?? document;
          return Array.from(scope.querySelectorAll<HTMLElement>(".mtrl-carousel__item")).map((el) => el.getBoundingClientRect().x);
        });
        // The drag goes toward the strip's content: left in LTR, right in
        // RTL — the mirrored reading direction, which is where the pointer
        // has slides to reveal.
        const dragTo = dir === "ltr" ? 300 : 460;
        await page.mouse.move(380, 120);
        const before = await slideXs();
        const centreIndex = before.reduce((best, x, i) => (Math.abs(x + 100 - 450) < Math.abs(before[best]! + 100 - 450) ? i : best), 0);
        await page.mouse.down();
        await page.mouse.move(dragTo, 120, { steps: 4 });
        // The physical result, whatever the scrollLeft convention: the slide
        // under the pointer moves with it, the same distance, in both
        // directions. The centre slide carries no keyline transform, two
        // frames let its layout land.
        await page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
        const during = await slideXs();
        await page.mouse.up();
        const slideDelta = during[centreIndex]! - before[centreIndex]!;
        // Same direction as the pointer and within the keyline drift of its
        // distance: the centre slide carries the nearest keyline, whose
        // transform moves it a few pixels off the strip's exact delta.
        assert.ok(dir === "ltr" ? slideDelta < -60 : slideDelta > 60, `${label}, ${on}: the slide follows the pointer (${dir === "ltr" ? "-80" : "+80"} px, slide moved ${slideDelta.toFixed(1)})`);
        await page.waitForFunction(() => {
          const host = document.querySelector("m-carousel");
          const scope: ParentNode = host?.shadowRoot ?? document;
          return !((scope.querySelector(".mtrl-carousel") as HTMLElement).dataset.settling ?? "");
        }, undefined, { timeout: 2000 }).catch(() => {});
        after = await state();
        assert.equal(after.dragging, false, `${label}, ${on}: data-dragging is cleared`);
        assert.equal(after.snap, "x mandatory", `${label}, ${on}: the snap points are back`);
        await movesDontScroll(on, after);
        await clickLink();
        assert.equal((await state()).hash, "#go", `${label}, ${on}: the next click works`);
      }

      // A flick advances in the reading direction: the pointer flicks toward
      // the reading origin (left in LTR, right in RTL) and the carousel
      // leaves for the later slides — the first slide moves out of the way.
      const flickFrom = dir === "ltr" ? 500 : 300;
      const flickTo = dir === "ltr" ? 340 : 460;
      const firstSlideBefore = await slideBoxGlobal(page);
      await page.mouse.move(flickFrom, 120);
      await page.mouse.down();
      await page.mouse.move(flickTo, 120, { steps: 3 });
      await page.mouse.up();
      await page.waitForFunction(() => {
        const host = document.querySelector("m-carousel");
        const scope: ParentNode = host?.shadowRoot ?? document;
        return !((scope.querySelector(".mtrl-carousel") as HTMLElement).dataset.settling ?? "");
      }, undefined, { timeout: 2000 }).catch(() => {});
      const firstSlideAfter = await slideBoxGlobal(page);
      // Advancing scrolls the first slide out: its rect moves against the
      // reading direction (left in LTR, right in RTL).
      const flickDelta = firstSlideAfter - firstSlideBefore;
      assert.ok(dir === "ltr" ? flickDelta < -100 : flickDelta > 100, `${label}: the flick advances the reading direction (first slide moved ${flickDelta.toFixed(1)})`);
    }
  }
}

/** The first slide's screen x, resolved through the shadow root when hosted. */
const slideBoxGlobal = (page: Page): Promise<number> => page.evaluate(() => {
  const host = document.querySelector("m-carousel");
  const scope: ParentNode = host?.shadowRoot ?? document;
  return (scope.querySelector(".mtrl-carousel__item") as HTMLElement).getBoundingClientRect().x;
});

/**
 * The items live in a layer the stylesheet pins to the scroller's viewport, so
 * their transforms never carry the scroll offset: an offset the main thread has
 * not laid out yet moves nothing. An offset written synchronously, before the
 * scroll handler runs, leaves every item's box where it was — before the layer
 * it moved them by the offset, the displacement the painted strip showed on a
 * trackpad when the compositor ran ahead of the layout.
 */
export async function checkCarouselViewportLayer(page: Page): Promise<void> {
  await page.setViewportSize({ width: 800, height: 600 });
  for (const route of ["factory", "element"] as const) {
    for (const dir of ["ltr", "rtl"] as const) {
      const label = `viewport layer ${route}/${dir}`;
      await page.evaluate(({ route, dir }) => {
        document.documentElement.dir = dir;
        document.body.replaceChildren();
        if (route === "factory") {
          const carousel = (window as unknown as CarouselWindow).createCarousel({
            variant: "multi-browse", itemWidth: 200,
            slides: Array.from({ length: 8 }, (_, i) => ({ title: `Slide ${i}` })),
          });
          carousel.element.id = "layer-carousel";
          carousel.element.style.cssText = "width:760px;height:240px";
          document.body.append(carousel.element);
        } else {
          const host = document.createElement("m-carousel");
          host.id = "layer-carousel";
          host.setAttribute("variant", "multi-browse");
          host.setAttribute("item-width", "200");
          host.style.cssText = "width:760px;height:240px;display:block";
          for (let i = 0; i < 8; i++) {
            const item = document.createElement("m-carousel-item");
            item.setAttribute("alt", `Slide ${i}`);
            host.append(item);
          }
          document.body.append(host);
        }
      }, { route, dir });
      await waitFor(page, "the carousel to lay its slides out", () => {
        const host = document.querySelector("m-carousel");
        const scope: ParentNode = host?.shadowRoot ?? document;
        const scroller = scope.querySelector<HTMLElement>(".mtrl-carousel__scroller");
        return !!scroller && scroller.scrollWidth > 760;
      });
      const moved = await page.evaluate(() => {
        const host = document.querySelector("m-carousel");
        const scope: ParentNode = host?.shadowRoot ?? document;
        const scroller = scope.querySelector<HTMLElement>(".mtrl-carousel__scroller")!;
        const items = Array.from(scope.querySelectorAll<HTMLElement>(".mtrl-carousel__item"));
        const before = items.map((el) => el.getBoundingClientRect().x);
        const from = scroller.scrollLeft;
        // Synchronous, so the scroll handler (and its layout) has not run:
        // this is the offset the compositor paints while the DOM is behind.
        scroller.scrollLeft = from + 120;
        const after = items.map((el) => el.getBoundingClientRect().x);
        scroller.scrollLeft = from;
        return Math.max(...before.map((x, i) => Math.abs(after[i]! - x)));
      });
      // The layer is pinned, so the items stay put; before it they moved the
      // full 120 px with the offset.
      assert.ok(moved < 2, `${label}: items stay put when the offset moves (moved ${moved.toFixed(1)} px)`);
      await waitFor(page, "the restored offset to lay out", () => {
        const host = document.querySelector("m-carousel");
        const scope: ParentNode = host?.shadowRoot ?? document;
        const root = scope.querySelector<HTMLElement>(".mtrl-carousel");
        return !root?.hasAttribute("data-settling");
      });
    }
  }
}
