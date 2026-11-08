// test/styles/base-lite.test.ts
// The opt-in theme-only base: the baseline roles in light and dark (including
// the selectable copy), the typeface, shape and body typescale tokens, the body
// theme and the global reduced-motion switch, and none of the groups the full
// base carries for the page: the contrast modes, the reset and the ripple.
import { describe, expect, test } from "bun:test";
import { compileThemeSources } from "../../scripts/build-styles";
import { baseLiteStyles } from "../../scripts/style-manifest";

const css = compileThemeSources(baseLiteStyles, "none");

describe("material/styles/base-lite holds the theme and the tokens", () => {
  test("every kept selector is emitted", () => {
    for (const kept of [
      ":where(:root)",
      "prefers-color-scheme: dark",
      ":where(.dark-theme)",
      "[data-theme=baseline]",
      "[data-theme=baseline][data-theme-mode=dark]",
      ":root{",
      "body{",
      "prefers-reduced-motion: reduce",
    ]) {
      expect(css).toContain(kept);
    }
  });

  test("the typeface, shape and body typescale tokens are emitted", () => {
    for (const token of [
      "--mtrl-ref-typeface-brand",
      "--mtrl-ref-typeface-plain",
      "--mtrl-sys-shape-corner-medium",
      "--mtrl-sys-typescale-body-medium-font",
    ]) {
      expect(css).toContain(token);
    }
  });

  test("the global reduced-motion switch keeps the base's rule", () => {
    expect(css).toContain("animation-duration:.01ms");
    expect(css).toContain("animation-iteration-count:1");
    expect(css).toContain("transition-property:opacity,color,background-color,border-color,box-shadow,visibility");
    expect(css).toContain("scroll-behavior:auto");
  });

  test("nothing the full base adds for the page is included", () => {
    for (const dropped of [
      "prefers-contrast",
      "data-theme-contrast",
      ".mtrl-ripple",
      "[data-ripple]",
      "box-sizing",
      "list-style",
      "scroll-behavior: smooth",
      "scroll-behavior:smooth",
      "min-height:100vh",
      "text-rendering",
    ]) {
      expect(css).not.toContain(dropped);
    }
  });
});
