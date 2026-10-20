// scripts/check-carousel-rtl.ts
//
// #115: the multi-browse carousel's layout and scroll position must mirror on
// a right-to-left page. Chromium reports an RTL scroller's scrollLeft from 0
// at the inline-start (right) edge down to negative values towards the left,
// so LTR scroll arithmetic starts an RTL carousel at the wrong end and its
// items land mid-container. Every box measured in the RTL page must be the
// mirror of its LTR box about the viewport, the settled scrollLeft must sit at
// the same logical end (0), a step forward must move the RTL scroller negative
// by the LTR amount, and ArrowLeft must walk forward through the items.
//
// Called by rtl:check against the built package; opens its own pages at full
// motion so the multi-browse keyline strategy (not the reduced-motion capped
// one) is what runs.
import assert from "node:assert/strict";
import type { Browser } from "playwright";

const WIDTH = 600;

interface ItemBox { x: number; width: number; clip: string }
interface CarouselMeasure { scrollLeft: number; items: ItemBox[]; focus: string }

/** Renders a fresh carousel in the given direction and measures it settled. */
async function measure(browser: Browser, base: string, direction: "ltr" | "rtl", navigate: boolean): Promise<CarouselMeasure> {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(`${base}?dir=${direction}`);
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    return await page.evaluate(async (go) => {
      type Carousel = { element: HTMLElement; goTo(index: number): void };
      const { createCarousel } = (window as unknown as { mtrl: { createCarousel(config: unknown): Carousel } }).mtrl;
      const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
      const host = document.getElementById("host") as HTMLElement;
      host.replaceChildren();
      const carousel = createCarousel({ slides: ["Alpha", "Beta", "Gamma", "Delta"].map((title) => ({ title })) });
      carousel.element.style.cssText = "width:600px;height:400px";
      host.append(carousel.element);
      await frame(); await frame();
      const scroller = carousel.element.querySelector(".mtrl-carousel__scroller") as HTMLElement;
      const items = () => Array.from(carousel.element.querySelectorAll<HTMLElement>(".mtrl-carousel__item")).map((item) => {
        const rect = item.getBoundingClientRect();
        return { x: rect.x, width: rect.width, clip: item.style.clipPath || "none" };
      });
      const settled = (): Promise<void> => new Promise((done) => {
        let last = scroller.scrollLeft;
        let stable = 0;
        const tick = (): void => {
          if (scroller.scrollLeft === last) {
            if (++stable > 12) return done();
          } else {
            last = scroller.scrollLeft;
            stable = 0;
          }
          requestAnimationFrame(tick);
        };
        tick();
      });
      let focus = "";
      if (go) {
        carousel.goTo(1);
        await settled();
        // Keyboard: focus the current item and press the physical key that
        // must walk forward (ArrowRight in LTR, ArrowLeft in RTL).
        const current = carousel.element.querySelectorAll<HTMLElement>(".mtrl-carousel__item")[1]!;
        current.focus();
        const key = document.documentElement.dir === "rtl" ? "ArrowLeft" : "ArrowRight";
        current.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
        await settled();
        focus = String((document.activeElement as HTMLElement)?.dataset.index ?? "");
      }
      const result: CarouselMeasure = { scrollLeft: scroller.scrollLeft, items: items(), focus };
      carousel.element.remove();
      return result;
    }, navigate);
  } finally {
    await context.close();
  }
}

/** The mirror of a box about the 600px viewport. */
const mirrored = (box: ItemBox): number => WIDTH - box.x - box.width;

/** The element case: <m-carousel> keeps its factory in a shadow root, where no [dir] attribute reaches. */
async function measureElement(browser: Browser, base: string, direction: "ltr" | "rtl"): Promise<CarouselMeasure> {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(`${base}?dir=${direction}`);
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    return await page.evaluate(async () => {
      const frame = (): Promise<void> => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
      const host = document.getElementById("host") as HTMLElement;
      host.replaceChildren();
      const el = document.createElement("m-carousel");
      el.style.cssText = "display:block;width:600px;height:400px";
      for (const label of ["Alpha", "Beta", "Gamma", "Delta"]) {
        const item = document.createElement("m-carousel-item");
        item.setAttribute("label", label);
        el.append(item);
      }
      host.append(el);
      await customElements.whenDefined("m-carousel");
      await frame(); await frame(); await frame();
      const root = el.shadowRoot!;
      const scroller = root.querySelector(".mtrl-carousel__scroller") as HTMLElement;
      const items = Array.from(root.querySelectorAll<HTMLElement>(".mtrl-carousel__item")).map((item) => {
        const rect = item.getBoundingClientRect();
        return { x: rect.x, width: rect.width, clip: item.style.clipPath || "none" };
      });
      const result: CarouselMeasure = { scrollLeft: scroller.scrollLeft, items, focus: "" };
      el.remove();
      return result;
    });
  } finally {
    await context.close();
  }
}

export async function checkCarouselRtl(browser: Browser, base: string): Promise<void> {
  console.log("  carousel rtl: factory initial measures");
  const ltr = await measure(browser, base, "ltr", false);
  const rtl = await measure(browser, base, "rtl", false);
  assert.equal(ltr.items.length, 4, "four items rendered");
  assert.equal(ltr.scrollLeft, 0, `the LTR scroller starts at 0 (got ${ltr.scrollLeft})`);
  assert.equal(rtl.scrollLeft, 0, `the RTL scroller starts at its inline-start edge, scrollLeft 0 (got ${rtl.scrollLeft}; #115 measured -256)`);
  ltr.items.forEach((item, i) => {
    const other = rtl.items[i]!;
    assert.ok(Math.abs(item.width - other.width) < 0.51, `item ${i + 1}: width ${item.width} vs RTL ${other.width}`);
    assert.ok(
      Math.abs(other.x - mirrored(item)) < 0.51,
      `item ${i + 1}: RTL x=${other.x} is not the mirror of LTR x=${item.x} (expected ${mirrored(item)}); #115 measured 8.59/182.81/223.48 against mirrors 306.67/24/-136.67`,
    );
    // inset(0 x) is horizontally symmetric: the clip must be identical.
    assert.equal(other.clip, item.clip, `item ${i + 1}: RTL clip ${other.clip} != LTR clip ${item.clip} (#115 measured inset(0 111.111px) against inset(0 2.66667px))`);
  });

  // A step forward: the LTR scroller advances positive, the RTL scroller
  // negative by the same amount, and the layout stays mirrored.
  console.log("  carousel rtl: navigation measures");
  const ltrStep = await measure(browser, base, "ltr", true);
  const rtlStep = await measure(browser, base, "rtl", true);
  assert.ok(ltrStep.scrollLeft > 0, `LTR goTo(1) scrolls forward (got ${ltrStep.scrollLeft})`);
  assert.ok(
    Math.abs(rtlStep.scrollLeft + ltrStep.scrollLeft) < 1,
    `RTL goTo(1) should settle at ${-ltrStep.scrollLeft} (got ${rtlStep.scrollLeft})`,
  );
  ltrStep.items.forEach((item, i) => {
    const other = rtlStep.items[i]!;
    assert.ok(
      Math.abs(other.x - mirrored(item)) < 0.51,
      `after goTo(1), item ${i + 1}: RTL x=${other.x} is not the mirror of LTR x=${item.x} (expected ${mirrored(item)})`,
    );
  });
  assert.equal(ltrStep.focus, "2", `LTR ArrowRight walks to the next item (focused index ${ltrStep.focus})`);
  assert.equal(rtlStep.focus, "2", `RTL ArrowLeft walks to the next item (focused index ${rtlStep.focus})`);

  // The element keeps its factory in a shadow root: the direction arrives by
  // inheritance, not by attribute, and the layout must mirror the same way.
  console.log("  carousel rtl: element measures");
  const ltrEl = await measureElement(browser, base, "ltr");
  const rtlEl = await measureElement(browser, base, "rtl");
  assert.equal(rtlEl.scrollLeft, 0, `element: the RTL scroller starts at its inline-start edge (got ${rtlEl.scrollLeft})`);
  ltrEl.items.forEach((item, i) => {
    const other = rtlEl.items[i]!;
    assert.ok(
      Math.abs(other.x - mirrored(item)) < 0.51,
      `element item ${i + 1}: RTL x=${other.x} is not the mirror of LTR x=${item.x} (expected ${mirrored(item)})`,
    );
    assert.equal(other.clip, item.clip, `element item ${i + 1}: RTL clip ${other.clip} != LTR clip ${item.clip}`);
  });

  // The mouse drag: the gesture mirrors (left-drag advances in LTR, right-drag
  // in RTL) and the fling settles towards the same logical index, not away
  // from it (#126 review: the RTL fling read the pointer's velocity with the
  // LTR sign, so the mirrored gesture snapped back to 0 and the wrong one
  // advanced).
  console.log("  carousel rtl: drag measures");
  const dragBy = async (direction: "ltr" | "rtl", dx: number): Promise<number> => {
    const context = await browser.newContext({ viewport: { width: WIDTH, height: 800 } });
    const page = await context.newPage();
    try {
      await page.goto(`${base}?dir=${direction}`);
      await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
      const box = await page.evaluate(() => {
        const { createCarousel } = (window as unknown as { mtrl: { createCarousel(config: unknown): { element: HTMLElement } } }).mtrl;
        const host = document.getElementById("host") as HTMLElement;
        host.replaceChildren();
        const carousel = createCarousel({ slides: ["Alpha", "Beta", "Gamma", "Delta"].map((title) => ({ title })) });
        carousel.element.style.cssText = "width:600px;height:400px";
        host.append(carousel.element);
        const scroller = carousel.element.querySelector(".mtrl-carousel__scroller") as HTMLElement;
        return scroller.getBoundingClientRect().toJSON();
      });
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      for (let step = 1; step <= 6; step++) await page.mouse.move(x + (dx * step) / 6, y, { steps: 1 });
      await page.mouse.up();
      await page.waitForTimeout(700);
      return await page.evaluate(() => (document.querySelector(".mtrl-carousel__scroller") as HTMLElement).scrollLeft);
    } finally {
      await context.close();
    }
  };
  const ltrDrag = await dragBy("ltr", -180);
  assert.ok(ltrDrag > 100, `LTR: a left-drag of 180 advances (got scrollLeft ${ltrDrag})`);
  const rtlDrag = await dragBy("rtl", 180);
  assert.ok(rtlDrag < -100, `RTL: the mirrored right-drag advances negative (got scrollLeft ${rtlDrag})`);
  const rtlWrong = await dragBy("rtl", -180);
  assert.ok(
    Math.abs(rtlWrong) <= 1,
    `RTL: the backward gesture at rest does not advance (got scrollLeft ${rtlWrong})`,
  );

  // A runtime dir flip: the scroller re-anchors, and the next goTo() must move
  // with the flipped arithmetic instead of clamping to no motion at all
  // (#126 review: a stale direction left goTo(1) at scrollLeft 0).
  console.log("  carousel rtl: runtime flip measures");
  const flipContext = await browser.newContext({ viewport: { width: WIDTH, height: 800 } });
  const flipPage = await flipContext.newPage();
  try {
    await flipPage.goto(`${base}?dir=ltr`);
    await flipPage.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    await flipPage.evaluate(() => {
      type FlipCarousel = { element: HTMLElement; goTo(index: number): void };
      const { createCarousel } = (window as unknown as { mtrl: { createCarousel(config: unknown): FlipCarousel } }).mtrl;
      const host = document.getElementById("host") as HTMLElement;
      host.replaceChildren();
      const carousel = createCarousel({ slides: ["Alpha", "Beta", "Gamma", "Delta"].map((title) => ({ title })) });
      carousel.element.style.cssText = "width:600px;height:400px";
      host.append(carousel.element);
      (window as unknown as { __goTo(index: number): void }).__goTo = (i: number) => carousel.goTo(i);
    });
    const readScroll = (): Promise<number> => flipPage.evaluate(
      () => (document.querySelector(".mtrl-carousel__scroller") as HTMLElement).scrollLeft,
    );
    await flipPage.evaluate(() => (window as unknown as { __goTo(index: number): void }).__goTo(1));
    await flipPage.waitForTimeout(700);
    const ltrAtOne = await readScroll();
    assert.ok(ltrAtOne > 100, `before the flip, LTR goTo(1) advances (got ${ltrAtOne})`);
    await flipPage.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
    await flipPage.waitForTimeout(100);
    await flipPage.evaluate(() => (window as unknown as { __goTo(index: number): void }).__goTo(1));
    await flipPage.waitForTimeout(700);
    const rtlAtOne = await readScroll();
    assert.ok(
      Math.abs(rtlAtOne + ltrAtOne) < 1,
      `after the dir flip, goTo(1) settles at ${-ltrAtOne} (got ${rtlAtOne})`,
    );
    await flipPage.evaluate(() => {
      const { createCarousel } = (window as unknown as { mtrl: { createCarousel(config: unknown): { goTo(index: number): void; element: HTMLElement } } }).mtrl;
      const host = document.getElementById("host") as HTMLElement;
      host.replaceChildren();
      const carousel = createCarousel({ snap: false, slides: ["Alpha", "Beta", "Gamma", "Delta"].map((title) => ({ title })) });
      carousel.element.style.cssText = "width:600px;height:400px";
      host.append(carousel.element);
      (window as unknown as { __goTo(index: number): void }).__goTo = (i: number) => carousel.goTo(i);
    });
    await flipPage.waitForTimeout(200);
    await flipPage.evaluate(() => (window as unknown as { __goTo(index: number): void }).__goTo(1));
    await flipPage.waitForTimeout(700);
    const unsnapped = await readScroll();
    assert.ok(
      unsnapped <= -100,
      `after the flip, snap:false goTo(1) still moves negative (got ${unsnapped})`,
    );
  } finally {
    await flipContext.close();
  }
}
