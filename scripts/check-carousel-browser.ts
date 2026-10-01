// scripts/check-carousel-browser.ts
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import type { Page } from "playwright";
import type { CarouselComponent, CarouselConfig } from "../src/components/carousel";

type CarouselWindow = Window & {
  createCarousel: (config: CarouselConfig) => CarouselComponent;
  wheelCarousel: CarouselComponent;
};

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
      await page.waitForFunction(() => document.querySelector(".mtrl-carousel__scroller")!.scrollWidth > 760);
      if (variant !== "uncontained") {
        assert.equal(await scroller.evaluate(el => getComputedStyle(el).scrollSnapType), "x mandatory");
      }
      for (const momentum of [false, true]) {
        await scroller.evaluate(el => el.scrollTo({ left: 0, behavior: "instant" }));
        await page.waitForTimeout(150);
        const trace = await scroller.evaluate(async (element, momentum) => {
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
        traces.push({ variant, ...trace });
        const positions = trace.samples.map(sample => sample.left);
        const first = positions.findIndex(left => left > 0);
        const last = positions.findIndex(left => Math.abs(left - trace.target) <= 0.5);
        const label = `${variant} ${momentum ? "30-event decay" : "100px notch"}`;
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
      await page.waitForFunction(() => {
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
      await page.waitForFunction(() => window.scrollY > 0);
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
