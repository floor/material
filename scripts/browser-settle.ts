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
 * 1. every animation and transition running on the target (or the document, or
 *    the element's subtree) has finished, capped at 2 s;
 * 2. one animation frame, so the final style has been laid out;
 * 3. the reading passed as `read` is taken once per frame until two consecutive
 *    frames agree, capped at 1 s.
 *
 * A motion the Web Animations API cannot see — a `scrollTo({behavior: "smooth"})`,
 * a rAF spring — starts on a later task, so step 1 would find nothing running
 * and step 3 would read the value at rest before the motion began. For those,
 * pass `until`: the state the motion ends in. It is awaited first, capped like
 * the animations, and then the steps above run from there.
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
      // subtree and the shadow roots inside it are asked.
      const scopes: Array<Element | Document | ShadowRoot> = [root];
      const collect = (scope: Element | Document | ShadowRoot): void => {
        for (const element of scope.querySelectorAll("*")) {
          if (!element.shadowRoot) continue;
          scopes.push(element.shadowRoot);
          collect(element.shadowRoot);
        }
      };
      collect(root);
      // A running animation with no end — an indeterminate progress bar, a
      // pulsing badge — never finishes, and a paused one is not moving, so
      // neither is awaited: only what will end is what "settled" means.
      const running = scopes
        .flatMap((scope) => (scope instanceof Element ? scope.getAnimations({ subtree: true }) : scope.getAnimations()))
        .filter((animation) => {
          if (animation.playState !== "running") return false;
          return Number.isFinite(animation.effect?.getComputedTiming().iterations ?? 0);
        });
      const finished = Promise.all(running.map((animation) => animation.finished.catch(() => undefined)));
      const outcome = await Promise.race([
        finished.then(() => "finished" as const),
        new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), cap)),
      ]);
      return outcome;
    },
    { target: target ?? null, cap: animationCapMs },
  );
  if (animations === "missing") throw new Error(`settle: ${target} is not in the page`);
  if (animations === "timeout") throw new Error(`settle: ${target ?? "the document"} was still animating after ${animationCapMs} ms`);

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
