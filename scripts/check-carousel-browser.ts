// scripts/check-carousel-browser.ts
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type { CarouselComponent, CarouselConfig } from "../src/components/carousel";

type CarouselWindow = Window & {
  createCarousel: (config: CarouselConfig) => CarouselComponent;
  wheelCarousel: CarouselComponent;
};

/** Packed carousel wheel input, including trusted wheel events that scroll the page. */
export async function checkCarouselWheel(page: Page): Promise<void> {
  const viewport = page.viewportSize();
  const reduced = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  await page.setViewportSize({ width: 800, height: 600 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const failures: string[] = [];
  for (const variant of ["multi-browse", "hero"] as const) {
    try {
      await page.evaluate(variant => {
        const state = window as unknown as CarouselWindow;
        document.body.replaceChildren();
        document.body.style.cssText = "display:block;margin:0;padding:0;height:3000px";
        window.scrollTo(0, 0);
        const carousel = state.createCarousel({
          variant, wheel: true, itemWidth: 200,
          slides: Array.from({ length: 8 }, (_, i) => ({ title: `Slide ${i}` })),
        });
        carousel.element.id = "wheel-carousel";
        carousel.element.style.cssText = "width:600px;height:240px";
        document.body.append(carousel.element);
        state.wheelCarousel = carousel;
      }, variant);
      const scroller = page.locator("#wheel-carousel .mtrl-carousel__scroller");
      await page.waitForFunction(() => document.querySelector(".mtrl-carousel__scroller")!.scrollWidth > 600);
      assert.equal(await scroller.evaluate(element => {
        const event = new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      }), true, `${variant}: vertical wheel is consumed`);
      await page.waitForTimeout(50);
      await scroller.evaluate(element => {
        for (let i = 0; i < 3; i++) element.dispatchEvent(new WheelEvent("wheel", { deltaY: 120, bubbles: true, cancelable: true }));
      });
      await page.waitForTimeout(700);
      assert((await scroller.evaluate(element => element.scrollLeft)) > 0, `${variant}: wheel moves horizontally`);
      assert.equal(await page.evaluate(() => window.scrollY), 0);
      if (variant === "hero") {
        assert.equal(await page.evaluate(() => (window as unknown as CarouselWindow).wheelCarousel.getCurrentSlide()), 1, "hero: one slide per burst during smooth navigation");
        await scroller.evaluate(element => element.dispatchEvent(new WheelEvent("wheel", { deltaY: 120, cancelable: true })));
        await page.waitForTimeout(700);
        assert.equal(await page.evaluate(() => (window as unknown as CarouselWindow).wheelCarousel.getCurrentSlide()), 2, "hero: a new gesture advances");
      }
      // Go to the actual end, then verify both cancellation and native default action.
      await page.evaluate(() => (window as unknown as CarouselWindow).wheelCarousel.goTo(7));
      await page.waitForFunction(() => {
        const el = document.querySelector(".mtrl-carousel__scroller")!;
        return Math.abs(el.scrollWidth - el.clientWidth - el.scrollLeft) <= 1;
      });
      assert.equal(await scroller.evaluate(element => {
        const event = new WheelEvent("wheel", { deltaY: 160, cancelable: true });
        element.dispatchEvent(event);
        return event.defaultPrevented;
      }), false, `${variant}: end wheel is not prevented`);
      await scroller.hover();
      await page.mouse.wheel(0, 180);
      await page.waitForFunction(() => window.scrollY > 0);
      console.log(`Passed carousel ${variant}: WheelEvent movement, burst handling and trusted edge wheel scrolls the page.`);
    } catch (error) {
      failures.push(`${variant}: ${String(error)}`);
    } finally {
      await page.evaluate(() => (window as unknown as CarouselWindow).wheelCarousel?.destroy());
    }
  }
  await page.evaluate(() => { document.body.style.cssText = ""; window.scrollTo(0, 0); });
  if (viewport) await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
  assert.deepEqual(failures, [], "carousel wheel browser regressions");
}
