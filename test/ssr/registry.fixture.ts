// test/ssr/registry.fixture.ts
// Public renderElement scope only: the server reads the icon registry the same
// way the browser does, and falls back to the built-in glyph after a clear.
import { afterEach, expect, test } from "bun:test";
import "./css.fixture";
import { renderElement } from "../../src/ssr";
import { setIcons } from "../../src/core/icons/registry";

// The same exact glyph strings the client-side pin tests hold, so the server
// renders what the browser renders.
const MENU_PATH = 'd="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"';
const MENU_OPEN_PATH = 'd="M120-240v-80h520v80H120Zm664-40L584-480l200-200 56 56-144 144 144 144-56 56ZM120-440v-80h400v80H120Zm0-200v-80h520v80H120Z"';
const CLOSE_PATH = 'd="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"';

afterEach(() => setIcons({ menu: null, "menu-open": null, close: null, "expand-more": null }));

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

test("dialog and input-chip server glyphs follow the registry and clear to their own built-ins", () => {
  const render = () => ({
    dialog: renderElement("m-dialog", { headline: "Dialog", "close-button": true }, "Content"),
    chips: renderElement("m-chips", {}, '<m-chip variant="input" value="ada">Ada</m-chip>'),
  });
  const builtin = render();
  expect(builtin.dialog).toContain('<line x1="18" y1="6" x2="6" y2="18"></line>');
  expect(builtin.chips).toContain('d="M19 6.41 17.59 5 12 10.59');
  setIcons({ close: '<i data-registry="close">Dismiss</i>' });
  const override = render();
  for (const html of Object.values(override)) expect(html).toContain('<i data-registry="close">Dismiss</i>');
  expect(override.dialog).toContain('aria-label="Close dialog"');
  expect(override.chips).toContain('aria-label="Remove Ada"');
  for (const clear of [null, undefined, ""] as const) {
    setIcons({ close: clear });
    const restored = render();
    expect(restored.dialog).not.toContain('data-registry="close"');
    expect(restored.chips).not.toContain('data-registry="close"');
    expect(restored.dialog).toContain('<line x1="18" y1="6" x2="6" y2="18"></line>');
    expect(restored.chips).toContain('d="M19 6.41 17.59 5 12 10.59');
    setIcons({ close: '<i data-registry="close">Dismiss</i>' });
  }
});

test("FAB-menu server opt-out is preserved with a close override", () => {
  const render = () => renderElement("m-fab-menu", { "aria-label": "Actions" }, '<m-fab-menu-item>One</m-fab-menu-item>');
  const builtin = render();
  setIcons({ close: "<i>not rendered on the server</i>" });
  expect(render()).toBe(builtin);
  expect(builtin).not.toContain("shadowrootmode");
});

test("the select field's expand-more glyph follows the registry and clears to its own built-in", () => {
  const render = () => renderElement("m-select", { label: "Fruit", "aria-label": "Fruit" }, '<m-select-option value="one">One</m-select-option>');
  const builtin = render();
  expect(builtin).toContain('M7 10l5 5 5-5H7z');
  setIcons({ "expand-more": '<i data-registry="expand-more">Open</i>' });
  const override = render();
  expect(override).toContain('<i data-registry="expand-more">Open</i>');
  expect(override).not.toContain('M7 10l5 5 5-5H7z');
  expect(override).toContain('aria-haspopup="listbox"');
  for (const clear of [null, undefined, ""] as const) {
    setIcons({ "expand-more": clear });
    const restored = render();
    expect(restored).not.toContain('data-registry="expand-more"');
    expect(restored).toContain('M7 10l5 5 5-5H7z');
  }
});
