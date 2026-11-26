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
 */
import type { Page } from "playwright";

const ANIMATION_CAP_MS = 2_000;
const READ_CAP_MS = 1_000;

export interface SettleOptions<T> {
  /** A selector to settle; the whole document when omitted. */
  target?: string;
  /** The value that must stop changing, read once per frame. */
  read?: () => Promise<T>;
  /** How long the animations may take before the check fails. */
  animationCapMs?: number;
  /** How long the reading may keep changing before the check fails. */
  readCapMs?: number;
}

/**
 * Waits for the page to be at rest, throws when it never is.
 *
 * @param page - The Playwright page
 * @param options - The target, the reading, and the two caps
 * @returns The last reading, when one was asked for
 */
export const settle = async <T = void>(page: Page, options: SettleOptions<T> = {}): Promise<T | undefined> => {
  const { target, read, animationCapMs = ANIMATION_CAP_MS, readCapMs = READ_CAP_MS } = options;

  const animations = await page.evaluate(
    async ({ target: selector, cap }) => {
      const root = selector ? document.querySelector(selector) : document;
      if (!root) return "missing" as const;
      const running = root instanceof Document ? root.getAnimations() : root.getAnimations({ subtree: true });
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

  const frame = (): Promise<void> => page.evaluate(() => new Promise<void>((done) => requestAnimationFrame(() => done())));
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
