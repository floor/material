// scripts/browser-settle.ts
/**
 * One settle for every browser check: wait for the animations to end, then for
 * the value that is read to stop changing.
 *
 * A check that reads a shadow, a size or an opacity after a fixed timeout races
 * the transition it is waiting on, and loses that race on a loaded CI machine —
 * a Linux WebKit run read a pressed card shadow at 0.298 of its resting value.
 * This helper has three steps and never returns a mid-flight value:
 *
 * 1. every finite animation and transition running on the target (or the
 *    document, or the element's subtree) has finished. A transition that
 *    starts on a later frame — a child that inherits a colour which is itself
 *    transitioning, and has its own colour transition — is not in the first
 *    snapshot, so the step reads `getAnimations()` again after each set, for
 *    the target subtree, its open shadow roots, and the document when there
 *    is no target, until none are running. The whole step shares one cap of
 *    2 s;
 * 2. every scroller has stopped — a `scrollTo({behavior: "smooth"})` or a fling
 *    is no Web Animations animation, so the document's scroller and every
 *    scroll container in the target's subtree, open shadow roots included, are
 *    read once per frame until two consecutive frames agree, capped at 2 s;
 * 3. the reading passed as `read` is taken once per frame until two consecutive
 *    frames agree, capped at 1 s.
 *
 * A motion the Web Animations API cannot see — a `scrollTo({behavior: "smooth"})`,
 * a rAF spring — starts on a later task, so step 1 would find nothing running
 * and step 3 would read the value at rest before the motion began. For those,
 * pass `until`: the state the motion ends in. It is awaited first, capped like
 * the animations, and then the steps above run from there. It is semantic
 * readiness only; it is not a second scan of the animations.
 *
 * A cap that runs out is an error naming what never settled, not a value.
 *
 *   import { settle } from "./browser-settle";
 *
 *   await page.click(".mtrl-button");
 *   const shadow = await settle(page, { target: ".mtrl-button", read: () => page.evaluate(() =>
 *     getComputedStyle(document.querySelector(".mtrl-button")!).boxShadow) });
 *
 * Waits that are not about animation — a debounce, a show delay, a timer under
 * test — are not this helper's business: keep them, and say in a comment why.
 * Nor is a wait that runs inside `page.evaluate`: that is the page's own task
 * turn, for a MutationObserver or a render, not a wait on a Playwright clock.
 */
import type { Page } from "playwright";

const ANIMATION_CAP_MS = 2_000;
const READ_CAP_MS = 1_000;

export interface SettleOptions<T> {
  /** A selector to settle; the whole document when omitted. */
  target?: string;
  /** The value that must stop changing, read once per frame. */
  read?: () => Promise<T>;
  /**
   * The state a motion ends in, for a motion the Web Animations API cannot
   * see: a smooth scroll, a rAF spring. It is polled once per frame before
   * the animation step, so the motion is awaited rather than read at zero.
   * A colour transition that starts late is the animation step's own rescan,
   * not this.
   */
  until?: () => Promise<boolean>;
  /** How long the animations may take before the check fails. */
  animationCapMs?: number;
  /** How long the reading may keep changing before the check fails. */
  readCapMs?: number;
  /** How long the awaited state may take to arrive before the check fails. */
  untilCapMs?: number;
}

/**
 * Waits for the page to be at rest, throws when it never is.
 *
 * @param page - The Playwright page
 * @param options - The target, the reading, the awaited state, and the caps
 * @returns The last reading, when one was asked for
 */
export const settle = async <T = void>(page: Page, options: SettleOptions<T> = {}): Promise<T | undefined> => {
  const { target, read, until, animationCapMs = ANIMATION_CAP_MS, readCapMs = READ_CAP_MS, untilCapMs = ANIMATION_CAP_MS } = options;

  const frame = (): Promise<void> => page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));

  if (until) {
    const started = Date.now();
    while (!(await until())) {
      if (Date.now() - started > untilCapMs) {
        const last = read ? JSON.stringify(await read().catch(() => null)) : null;
        throw new Error(
          `settle: ${target ?? "the page"} never reached the awaited state after ${untilCapMs} ms${last === null ? "" : ` (last read: ${last})`}`,
        );
      }
      await frame();
    }
  }

  const animations = await page.evaluate(
    async ({ target: selector, cap }) => {
      const root = selector ? document.querySelector(selector) : document;
      if (!root) return "missing" as const;
      // `document.getAnimations()` does not reach a shadow tree's transitions on
      // an element's own render; every open shadow root is asked too, so an
      // element's fade is awaited like the page's. With a target, only its
      // subtree and the shadow roots inside it are asked. The list is built
      // again after each set: a child that inherits a transitioning colour
      // starts its own colour transition on a later frame.
      const scopesOf = (): Array<Element | Document | ShadowRoot> => {
        const scopes: Array<Element | Document | ShadowRoot> = [root];
        const collect = (scope: Element | Document | ShadowRoot): void => {
          for (const element of scope.querySelectorAll("*")) {
            if (!element.shadowRoot) continue;
            scopes.push(element.shadowRoot);
            collect(element.shadowRoot);
          }
        };
        collect(root);
        // The target may itself be a shadow host: its own root is not a
        // descendant, and the element's transitions live in it.
        if (root instanceof Element && root.shadowRoot) {
          scopes.push(root.shadowRoot);
          collect(root.shadowRoot);
        }
        return scopes;
      };
      // A running animation with no end — an indeterminate progress bar, a
      // pulsing badge — never finishes, and a paused one is not moving, so
      // neither is awaited: only what will end is what "settled" means.
      const running = (): Animation[] => scopesOf()
        .flatMap((scope) => (scope instanceof Element ? scope.getAnimations({ subtree: true }) : scope.getAnimations()))
        .filter((animation) => {
          if (animation.playState !== "running") return false;
          return Number.isFinite(animation.effect?.getComputedTiming().iterations ?? 0);
        });
      const started = performance.now();
      const left = (): number => cap - (performance.now() - started);
      const nextFrame = (remaining: number): Promise<"done" | "timeout"> => new Promise((resolve) => {
        const timer = setTimeout(() => resolve("timeout"), remaining);
        requestAnimationFrame(() => {
          clearTimeout(timer);
          resolve("done");
        });
      });
      for (;;) {
        if (left() <= 0) return "timeout" as const;
        const current = running();
        if (current.length === 0) {
          // Nothing this frame. A transition that begins on the next one is
          // still unseen, so one frame decides whether the step is done.
          const remaining = left();
          if (remaining <= 0) return "timeout" as const;
          if ((await nextFrame(remaining)) === "timeout") return "timeout" as const;
          if (left() <= 0) return "timeout" as const;
          if (running().length === 0) return "finished" as const;
          continue;
        }
        const remaining = left();
        if (remaining <= 0) return "timeout" as const;
        let timer: ReturnType<typeof setTimeout> | undefined;
        const outcome = await Promise.race([
          Promise.all(current.map((animation) => animation.finished.catch(() => undefined))).then(() => "done" as const),
          new Promise<"timeout">((resolve) => {
            timer = setTimeout(() => resolve("timeout"), remaining);
          }),
        ]);
        clearTimeout(timer);
        if (outcome === "timeout") return "timeout" as const;
      }
    },
    { target: target ?? null, cap: animationCapMs },
  );
  if (animations === "missing") throw new Error(`settle: ${target} is not in the page`);
  if (animations === "timeout") throw new Error(`settle: ${target ?? "the document"} was still animating after ${animationCapMs} ms`);

  // A smooth scroll is invisible to the animation step above: the scrollers are
  // read until two frames agree, so a bare settle() after a goTo is correct by
  // construction.
  const scrolled = await page.evaluate(
    async ({ target: selector, cap }) => {
      const root = selector ? document.querySelector(selector) : document;
      if (!root) return "missing" as const;
      const scopes: Array<Element | Document | ShadowRoot> = [root];
      const collect = (scope: Element | Document | ShadowRoot): void => {
        for (const element of scope.querySelectorAll("*")) {
          if (!element.shadowRoot) continue;
          scopes.push(element.shadowRoot);
          collect(element.shadowRoot);
        }
      };
      collect(root);
      // The target may itself be a shadow host: its own root is not a descendant.
      if (root instanceof Element && root.shadowRoot) {
        scopes.push(root.shadowRoot);
        collect(root.shadowRoot);
      }
      const read = (): string => {
        const positions: string[] = [];
        const scroller = document.scrollingElement;
        if (scroller) positions.push(`${scroller.scrollLeft},${scroller.scrollTop}`);
        for (const scope of scopes) {
          const elements = scope instanceof Element ? [scope, ...scope.querySelectorAll("*")] : [...scope.querySelectorAll("*")];
          for (const element of elements) {
            if (!(element instanceof HTMLElement)) continue;
            if (element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight) continue;
            const style = getComputedStyle(element);
            if (!/auto|scroll/.test(style.overflowX) && !/auto|scroll/.test(style.overflowY)) continue;
            positions.push(`${element.scrollLeft},${element.scrollTop}`);
          }
        }
        return positions.join("|");
      };
      // WebKit scrolls smooth scrolls on the compositor, so its JS-visible
      // position can repeat mid-flight: a scroll event counts as motion too.
      let events = 0;
      const onScroll = (): void => {
        events += 1;
      };
      document.addEventListener("scroll", onScroll, { capture: true, passive: true });
      const sample = (): Promise<{ position: string; events: number }> =>
        new Promise((done) => requestAnimationFrame(() => done({ position: read(), events })));
      const started = Date.now();
      let previous = await sample();
      let stable = 0;
      try {
        for (;;) {
          const next = await sample();
          const quiet = next.position === previous.position && next.events === previous.events;
          stable = quiet ? stable + 1 : 0;
          // Three quiet frames: a scroll that has not begun yet starts within
          // the first, and a compositor-driven one keeps firing events.
          if (stable >= 3) return "settled";
          if (Date.now() - started > cap) return `scrolling:${next.position}`;
          previous = next;
        }
      } finally {
        document.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
      }
    },
    { target: target ?? null, cap: animationCapMs },
  );
  if (scrolled === "missing") throw new Error(`settle: ${target} is not in the page`);
  if (scrolled !== "settled") {
    throw new Error(`settle: ${target ?? "the document"} was still scrolling after ${animationCapMs} ms (${scrolled.slice("scrolling:".length)})`);
  }
  await frame();
  if (!read) return undefined;

  const started = Date.now();
  let previous = JSON.stringify(await read());
  for (;;) {
    await frame();
    const next = JSON.stringify(await read());
    if (next === previous) return JSON.parse(next) as T;
    if (Date.now() - started > readCapMs) {
      throw new Error(`settle: ${target ?? "the document"} kept changing after ${readCapMs} ms (${next})`);
    }
    previous = next;
  }
};
