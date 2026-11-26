/**
 * The opt-in bottom app bar keeps the legacy bar's high-contrast edge and
 * the icon button's own shape morphs. The docked toolbar still draws its
 * four-sided outline and keeps a round item round.
 *
 * Loads dist/styles/bottom-app-bar-toolbar.css, which `bun run build` emits.
 */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createBottomAppBar from "../src/components/bottom-app-bar";
import type createBottomAppBarToolbar from "../src/components/bottom-app-bar-toolbar";
import type createIconButton from "../src/components/icon-button";
import type createToolbar from "../src/components/toolbar";
import { settle } from "./browser-settle";

type ContrastWindow = Window & {
  mtrl: {
    createBottomAppBar: typeof createBottomAppBar;
    createBottomAppBarToolbar: typeof createBottomAppBarToolbar;
    createIconButton: typeof createIconButton;
    createToolbar: typeof createToolbar;
  };
};

const frameOf = (page: Page, id: string): Promise<{ outlineStyle: string; outlineWidth: string; borderTopWidth: string; borderTopStyle: string; borderRightWidth: string; borderBottomWidth: string; borderLeftWidth: string }> =>
  page.evaluate((id) => {
    const css = getComputedStyle(document.getElementById(id)!);
    return {
      outlineStyle: css.outlineStyle,
      outlineWidth: css.outlineWidth,
      borderTopWidth: css.borderTopWidth,
      borderTopStyle: css.borderTopStyle,
      borderRightWidth: css.borderRightWidth,
      borderBottomWidth: css.borderBottomWidth,
      borderLeftWidth: css.borderLeftWidth,
    };
  }, id);

const radiusOf = (page: Page, id: string): Promise<string> =>
  page.evaluate((id) => getComputedStyle(document.getElementById(id)!).borderTopLeftRadius, id);

/** The radius while the pointer is down, after the shape transition settles. */
const pressedRadiusOf = async (page: Page, id: string): Promise<string> => {
  const handle = page.locator(`#${id}`);
  await handle.scrollIntoViewIfNeeded();
  const box = await handle.boundingBox();
  assert(box, `${id} has no box`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await settle(page, { target: `#${id}` });
  const radius = await radiusOf(page, id);
  await page.mouse.up();
  await page.mouse.move(0, 0);
  return radius;
};

export async function checkBottomAppBarToolbarContrast(page: Page, check: (name: string) => void): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve, reject) => {
    if (document.getElementById("bottom-app-bar-toolbar-css")) { resolve(); return; }
    const link = document.createElement("link");
    link.id = "bottom-app-bar-toolbar-css";
    link.rel = "stylesheet";
    link.href = "/bottom-app-bar-toolbar.css";
    link.onload = () => resolve();
    link.onerror = () => reject(new Error("bottom-app-bar-toolbar.css failed to load"));
    document.head.append(link);
  }));

  const icon = '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z"/></svg>';
  await page.evaluate((icon) => {
    const w = window as unknown as ContrastWindow;
    const stage = document.createElement("div");
    stage.id = "bab-contrast";
    stage.style.cssText = "position:relative;z-index:100000";
    const probe = (id: string): HTMLElement => {
      const section = document.createElement("section");
      section.style.cssText = "position:relative;height:120px;overflow:hidden";
      section.id = `${id}-probe`;
      stage.append(section);
      return section;
    };
    const action = (id: string, selected: boolean): HTMLElement => {
      const button = w.mtrl.createIconButton({ icon, ariaLabel: id, toggle: true, selected });
      button.element.id = id;
      return button.element;
    };
    const legacy = w.mtrl.createBottomAppBar();
    legacy.element.id = "bab-legacy";
    legacy.addAction(action("bab-legacy-selected", true)).addAction(action("bab-legacy-press", false));
    probe("bab-legacy").append(legacy.element);
    const compat = w.mtrl.createBottomAppBarToolbar();
    compat.element.id = "bab-compat";
    compat.addAction(action("bab-compat-selected", true)).addAction(action("bab-compat-press", false));
    probe("bab-compat").append(compat.element);
    const toolbar = w.mtrl.createToolbar({
      variant: "docked",
      placement: "bottom",
      ariaLabel: "Docked",
      items: [action("bab-toolbar-selected", true), action("bab-toolbar-press", false)],
    });
    toolbar.element.id = "bab-toolbar";
    probe("bab-toolbar").append(toolbar.element);
    document.body.append(stage);
  }, icon);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve(null))));

  await page.emulateMedia({ forcedColors: "active" });
  try {
    const legacy = await frameOf(page, "bab-legacy");
    const compat = await frameOf(page, "bab-compat");
    const toolbar = await frameOf(page, "bab-toolbar");
    assert.deepEqual(compat, legacy, "the compatibility bar matches the legacy bar in forced colors");
    assert.equal(compat.outlineStyle, "none", "forced colors leaves the compatibility bar without an outline");
    assert.equal(compat.borderTopWidth, "1px", "forced colors keeps the top border");
    assert.equal(compat.borderTopStyle, "solid", "the top border is solid");
    assert.equal(compat.borderRightWidth, "0px", "the right border stays clear");
    assert.equal(compat.borderBottomWidth, "0px", "the bottom border stays clear");
    assert.equal(compat.borderLeftWidth, "0px", "the left border stays clear");
    assert.equal(toolbar.outlineStyle, "solid", "a docked toolbar keeps its forced-colors outline");
    assert.equal(toolbar.outlineWidth, "1px", "the docked toolbar outline is one pixel on every side");
    check("bottom app bar toolbar: forced colors draws only the top border");

    assert.equal(await radiusOf(page, "bab-compat-selected"), "12px", "a selected action morphs to the square radius");
    assert.equal(await radiusOf(page, "bab-legacy-selected"), "12px", "the legacy bar's selected action is the same square");
    assert.equal(await radiusOf(page, "bab-toolbar-selected"), "20px", "a docked toolbar keeps a selected round item round");
    check("bottom app bar toolbar: a selected action keeps the square morph");

    assert.equal(await pressedRadiusOf(page, "bab-compat-press"), "8px", "a pressed action morphs to the pressed radius");
    assert.equal(await pressedRadiusOf(page, "bab-legacy-press"), "8px", "the legacy bar's pressed action is the same");
    assert.equal(await pressedRadiusOf(page, "bab-toolbar-press"), "20px", "a docked toolbar keeps a pressed round item round");
    check("bottom app bar toolbar: a pressed action keeps the pressed morph");
  } finally {
    await page.emulateMedia({ forcedColors: "none" });
    await page.mouse.up();
  }
}
