// test/core/utils.theme-page.test.ts
//
// The theme observer (core/utils/theme) across the page's own life: a page
// restored from the back/forward cache keeps running, so the observer must
// still be there; and importing the module must do nothing, as its package
// entry declares.
import { afterAll, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
const g = globalThis as Record<string, unknown>;
const previous = new Map<string, unknown>(["window", "document", "MutationObserver"].map((key) => [key, g[key]]));
g.window = dom.window;
g.document = dom.window.document;
g.MutationObserver = dom.window.MutationObserver;

// Count what an import registers on the page, on a copy of the module of its
// own: another test file may have imported the shared one already.
const added: string[] = [];
const addEventListener = dom.window.addEventListener;
dom.window.addEventListener = function (this: Window, type: string, ...rest: unknown[]) {
  added.push(type);
  return (addEventListener as (...args: unknown[]) => void).call(this, type, ...rest);
} as typeof addEventListener;

const { onThemeChange } = await import("../../src/core/utils/theme?page-life") as typeof import("../../src/core/utils/theme");
const addedByImport = [...added];

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const pageEvent = (type: "pagehide" | "pageshow", persisted: boolean): void => {
  const event = new dom.window.Event(type);
  Object.defineProperty(event, "persisted", { value: persisted });
  dom.window.dispatchEvent(event);
};

afterAll(() => {
  dom.window.addEventListener = addEventListener;
  for (const [key, value] of previous) g[key] = value;
  dom.window.close();
});

describe("the theme observer and the page's life", () => {
  test("importing the module registers no listener", () => {
    expect(addedByImport).toEqual([]);
  });

  test("a page restored from the back/forward cache still hears a theme change", async () => {
    let calls = 0;
    const off = onThemeChange(() => calls++);
    document.documentElement.setAttribute("data-theme", "ocean");
    await tick();
    expect(calls).toBe(1);

    pageEvent("pagehide", true);
    pageEvent("pageshow", true);
    document.documentElement.setAttribute("data-theme", "forest");
    await tick();
    expect(calls).toBe(2);

    // The removal still works, and subscribing never touched the page.
    off();
    document.documentElement.setAttribute("data-theme", "desert");
    await tick();
    expect(calls).toBe(2);
    expect(added).toEqual([]);
  });

  test("a callback registered before the page was hidden is still the one that is called", async () => {
    const seen: string[] = [];
    const offFirst = onThemeChange(() => seen.push("first"));
    pageEvent("pagehide", true);
    pageEvent("pageshow", true);
    const offSecond = onThemeChange(() => seen.push("second"));

    document.body.setAttribute("data-theme-mode", "dark");
    await tick();
    expect(seen).toEqual(["first", "second"]);
    offFirst();
    offSecond();
  });
});
