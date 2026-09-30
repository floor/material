// test/core/utils.theme.test.ts
import { describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
(globalThis as any).window = dom.window;
(globalThis as any).document = dom.window.document;
(globalThis as any).MutationObserver = dom.window.MutationObserver;
(globalThis as any).getComputedStyle = dom.window.getComputedStyle.bind(dom.window);

const { onThemeChange, getThemeColor } = await import("../../src/core/utils/theme");

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("theme utils", () => {
  test("onThemeChange fires for data-theme set on <html> and on <body>", async () => {
    let calls = 0;
    const off = onThemeChange(() => calls++);
    document.documentElement.setAttribute("data-theme", "ocean");
    await tick();
    expect(calls).toBe(1);
    document.body.setAttribute("data-theme-mode", "dark");
    await tick();
    expect(calls).toBe(2);
    off();
    document.documentElement.setAttribute("data-theme", "forest");
    await tick();
    expect(calls).toBe(2);
  });

  test("getThemeColor falls back when the variable is not defined", () => {
    expect(getThemeColor("sys-color-nope", { fallback: "#123456" })).toBe("#123456");
  });

  test("getThemeColor reads a colour role and turns a hex into rgba with alpha", () => {
    document.documentElement.style.setProperty("--mtrl-sys-color-primary", "#6750a4");
    expect(getThemeColor("sys-color-primary")).toBe("#6750a4");
    expect(getThemeColor("sys-color-primary", { alpha: 0.5 })).toBe("rgba(103, 80, 164, 0.5)");
  });

  // FLO-311: the themes no longer declare --mtrl-sys-color-*-rgb. The deprecated
  // '-rgb' names still answer, derived from the colour role.
  test("getThemeColor derives a deprecated -rgb twin from its colour role", () => {
    document.documentElement.style.setProperty("--mtrl-sys-color-on-primary", "#fff");
    expect(getThemeColor("sys-color-on-primary-rgb")).toBe("255, 255, 255");
    expect(getThemeColor("sys-color-on-primary-rgb", { alpha: 0.1 })).toBe("rgba(255, 255, 255, 0.1)");
    expect(getThemeColor("sys-color-nope-rgb", { fallback: "0, 0, 0" })).toBe("0, 0, 0");
  });
});
