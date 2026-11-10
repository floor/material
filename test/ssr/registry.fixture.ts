// test/ssr/registry.fixture.ts
// Public renderElement scope only: the server reads the icon registry the same
// way the browser does, and falls back to the built-in glyph after a clear.
import { expect, test } from "bun:test";
import "./css.fixture";
import { renderElement } from "../../src/ssr";
import { setIcons } from "../../src/core/icons/registry";

// The same exact glyph strings the client-side pin tests hold, so the server
// renders what the browser renders.
const MENU_PATH = 'd="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"';
const MENU_OPEN_PATH = 'd="M120-240v-80h520v80H120Zm664-40L584-480l200-200 56 56-144 144 144 144-56 56ZM120-440v-80h400v80H120Zm0-200v-80h520v80H120Z"';
const CLOSE_PATH = 'd="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"';

test("the server renders the registry's glyph", () => {
  setIcons({ menu: "<i>server-menu</i>", "menu-open": "<i>server-open</i>", close: "<i>server-close</i>" });

  const rail = renderElement("m-navigation-rail", { "aria-label": "Main" }, "");
  expect(rail).toContain("<i>server-menu</i>");
  expect(rail).not.toContain(MENU_PATH);

  const expanded = renderElement("m-navigation-rail", { "aria-label": "Main", expanded: true }, "");
  expect(expanded).toContain("<i>server-open</i>");
  expect(expanded).not.toContain(MENU_OPEN_PATH);

  const sheet = renderElement("m-side-sheet", { headline: "Filters" }, "Content");
  expect(sheet).toContain("<i>server-close</i>");
  expect(sheet).not.toContain(CLOSE_PATH);
});

test("after a clear the server renders the built-in glyphs", () => {
  setIcons({ menu: null, "menu-open": null, close: null });

  const rail = renderElement("m-navigation-rail", { "aria-label": "Main" }, "");
  expect(rail).toContain(MENU_PATH);

  const expanded = renderElement("m-navigation-rail", { "aria-label": "Main", expanded: true }, "");
  expect(expanded).toContain(MENU_OPEN_PATH);

  const sheet = renderElement("m-side-sheet", { headline: "Filters" }, "Content");
  expect(sheet).toContain(CLOSE_PATH);
});
