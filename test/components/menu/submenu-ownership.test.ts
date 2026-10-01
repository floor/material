// test/components/menu/submenu-ownership.test.ts
//
// A submenu is appended to document.body rather than to the menu that opened
// it, so it cannot be found by walking down from that menu. Keyboard navigation
// used to find a parent submenu by level alone — which returns the first one on
// the page, belonging to whichever menu opened first. With two menus open, one
// of them navigated the other's submenu.
//
// Each submenu now records the menu that owns it. These tests pin that, since
// it is the only thing tying a portaled submenu back to its menu.

import { describe, test, expect, beforeEach } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.MouseEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.FocusEvent = dom.window.FocusEvent;
g.CustomEvent = dom.window.CustomEvent;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = () => {};
g.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };

import createMenu from "../../../src/components/menu";

const after = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ITEMS = [
  { id: "share", text: "Share", hasSubmenu: true, submenu: [{ id: "link", text: "Copy link" }] },
  { id: "copy", text: "Copy" },
];

/** A menu with its opener in the document, opened and settled. */
const openMenu = async () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  const menu = createMenu({ opener, items: ITEMS } as never);
  menu.open();
  // The menu positions and focuses itself on a timer.
  await after(200);
  return menu;
};

const itemsOf = (menu: { element: HTMLElement }) =>
  [...menu.element.querySelectorAll(".mtrl-menu__item")] as HTMLElement[];

const submenus = () => [...document.querySelectorAll(".mtrl-menu--submenu")] as HTMLElement[];

beforeEach(() => { document.body.innerHTML = ""; });

describe("a submenu knows which menu owns it", () => {
  test.each(['quote"id', 'slash\\id', 'bracket]id', 'space id', 'line\nid'])(
    "returns to a parent with a literal id (%j)", async (id) => {
      const opener = document.createElement("button");
      document.body.append(opener);
      const menu = createMenu({ opener, items: [
        { id, text: "Parent", hasSubmenu: true, submenu: [{ id: "child", text: "Child" }] },
      ] });
      menu.element.id = 'owner"\\] id\n';
      menu.open(new dom.window.KeyboardEvent("keydown", { key: "Enter" }));
      await after(200);
      const parent = itemsOf(menu)[0]!;
      expect(document.activeElement).toBe(parent);
      expect(parent.getAttribute("data-id")).toBe(id);
      parent.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      await after(400);
      const submenu = submenus()[0]!;
      expect(submenu.getAttribute("data-parent-item")).toBe(id);
      expect(submenu.getAttribute("data-owner")).toBe(menu.element.id);
      const child = submenu.querySelector<HTMLElement>(".mtrl-menu__item")!;
      expect(document.activeElement).toBe(child);
      child.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
      expect(document.activeElement).toBe(parent);
      menu.destroy();
    },
  );

  test("a nested submenu resolves its parent with a literal owner and item id", async () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    const id = 'nested"\\] id\n';
    const menu = createMenu({ opener, items: [
      { id: "root", text: "Root", hasSubmenu: true, submenu: [
        { id, text: "Nested", hasSubmenu: true, submenu: [{ id: "leaf", text: "Leaf" }] },
      ] },
    ] });
    menu.element.id = 'owner"\\] id\n';
    menu.open(new dom.window.KeyboardEvent("keydown", { key: "Enter" }));
    await after(200);
    itemsOf(menu)[0]!.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await after(400);
    const nested = submenus()[0]!.querySelector<HTMLElement>(".mtrl-menu__item")!;
    expect(nested.getAttribute("data-id")).toBe(id);
    nested.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    await after(400);
    const leaf = submenus().find((el) => el.getAttribute("data-level") === "2")!;
    expect(leaf.getAttribute("data-owner")).toBe(menu.element.id);
    expect(leaf.getAttribute("data-parent-item")).toBe(id);
    const leafItem = leaf.querySelector<HTMLElement>(".mtrl-menu__item")!;
    expect(document.activeElement).toBe(leafItem);
    leafItem.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect(document.activeElement).toBe(nested);
    menu.destroy();
  });
  test("it records its owner, and the owner is that menu's id", async () => {
    const menu = await openMenu();
    itemsOf(menu)[0]!.click();
    await after(400);

    const [submenu] = submenus();
    expect(submenu).toBeDefined();

    const owner = submenu!.getAttribute("data-owner");
    expect(owner).toBeTruthy();
    expect(owner).toBe(menu.element.id);
  });

  test("the menu is given an id when it has none, so there is always an owner", async () => {
    const menu = await openMenu();
    expect(menu.element.id).toBeTruthy();

    itemsOf(menu)[0]!.click();
    await after(400);

    expect(submenus()[0]!.getAttribute("data-owner")).toBe(menu.element.id);
  });

  // The defect: two menus open at once, and a lookup by level alone finds the
  // first submenu on the page rather than the right one.
  test("two menus open at once own their own submenus", async () => {
    const first = await openMenu();
    const second = await openMenu();

    expect(first.element.id).not.toBe(second.element.id);

    itemsOf(first)[0]!.click();
    await after(400);
    itemsOf(second)[0]!.click();
    await after(400);

    const owners = submenus().map((el) => el.getAttribute("data-owner"));
    expect(owners.length).toBeGreaterThanOrEqual(2);
    // Every submenu names a real menu, and both menus are represented.
    expect(owners).toContain(first.element.id);
    expect(owners).toContain(second.element.id);
    // And no submenu is left without an owner, which is what made the
    // level-only lookup ambiguous.
    expect(owners.every((owner) => Boolean(owner))).toBe(true);
  });
});
