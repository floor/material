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

import { describe, test, expect, beforeEach, afterEach, jest } from "bun:test";
import { advanceTimersByTime } from "../../utils/fake-clock";
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
// `tasks.requestAnimationFrame` goes through `window.requestAnimationFrame`,
// and jsdom's own keeps a counter of outstanding frames per window that
// outlives a test: a frame left outstanding when the real clock comes back
// stops the 60 Hz interval jsdom runs, and every later frame is never run.
// The same stub on the window puts frames on the test's own clock, run by an
// advance like every other wait; its cancel clears the fake timeout.
dom.window.requestAnimationFrame = g.requestAnimationFrame;
dom.window.cancelAnimationFrame = (frame: number) => clearTimeout(frame);
g.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };

import createMenu from "../../../src/components/menu";

// The clock is the tests' own. A menu is placed 20 ms after open()
// and focuses itself 100 ms after that; a submenu opens on a frame and focuses
// itself 300 ms later. Waiting for those on the wall clock raced a busy
// runner: each timer starts only when the one before it has run, so a late
// first timer moves everything after it.
const after = async (ms: number): Promise<void> => {
  advanceTimersByTime(ms);
};

/**
 * The submenu feature is a chunk of its own, loaded on first use
 * (features/loader.ts). The fake clock drives timers, not module loading, and
 * under it a real turn cannot be waited for either: Bun's fake timers fake
 * Date, performance, hrtime, `Bun.sleep`, and even a `setTimeout` captured
 * before the clock went fake. So a test that opens a submenu awaits the same
 * module its loader does.
 *
 * That returns once the module is evaluated, which is not the same as the
 * loader having installed the feature: on a cold chunk -- nothing before this
 * file has used it -- the loader's own reaction can still be pending on a turn
 * the fake clock's waits never take, so the interaction would be queued and
 * never replayed. A test acting on a submenu waits for the element itself
 * (`until`), which covers the load and the menu's own timers alike.
 */
const submenuFeatureLoaded = async (): Promise<void> => {
  await import("../../../src/components/menu/features/submenu");
};

/**
 * Advances the clock in 10 ms steps until `ready()` is true, for 5 s of clock
 * time at most, taking a real turn each step. The menu's own waits are on the
 * fake clock and are exact; a cold submenu chunk's load is not, so each step
 * also lets the loop turn -- where a pending import, and the loader's install
 * queued behind it, settles. `setImmediate` stays real under Bun's fake timers.
 * Wait on the element the test needs, not a duration.
 */
const until = async (what: string, ready: () => boolean, found: () => unknown = () => undefined): Promise<void> => {
  for (let elapsed = 0; elapsed <= 5000; elapsed += 10) {
    if (ready()) return;
    await after(10);
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error(`still waiting after 5s for ${what}; found ${JSON.stringify(found())}`);
};

const ITEMS = [
  { id: "share", text: "Share", hasSubmenu: true, submenu: [{ id: "link", text: "Copy link" }] },
  { id: "copy", text: "Copy" },
];

/** A menu with its opener in the document, opened and settled. */
const openMenu = async () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  const menu = createMenu({ opener, items: ITEMS } as never);
  await submenuFeatureLoaded();
  menu.open();
  // The menu positions and focuses itself on a timer.
  await after(200);
  return menu;
};

const itemsOf = (menu: { element: HTMLElement }) =>
  [...menu.element.querySelectorAll(".mtrl-menu__item")] as HTMLElement[];

const submenus = () => [...document.querySelectorAll(".mtrl-menu--submenu")] as HTMLElement[];

beforeEach(() => {
  jest.useFakeTimers();
  document.body.innerHTML = "";
});

afterEach(() => {
  // The real clock comes back even if clearing the document throws: a fake
  // clock left installed makes the next file's real waits time out
  try {
    document.body.innerHTML = "";
  } finally {
    jest.useRealTimers();
  }
});

describe("a submenu knows which menu owns it", () => {
  test.each(['quote"id', 'slash\\id', 'bracket]id', 'space id', 'line\nid'])(
    "returns to a parent with a literal id (%j)", async (id) => {
      const opener = document.createElement("button");
      document.body.append(opener);
      const menu = createMenu({ opener, items: [
        { id, text: "Parent", hasSubmenu: true, submenu: [{ id: "child", text: "Child" }] },
      ] });
      menu.element.id = 'owner"\\] id\n';
      await submenuFeatureLoaded();
      menu.open(new dom.window.KeyboardEvent("keydown", { key: "Enter" }));
      await after(200);
      const parent = itemsOf(menu)[0]!;
      expect(document.activeElement).toBe(parent);
      expect(parent.getAttribute("data-id")).toBe(id);
      parent.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
      // The chunk's first, cold load can still be settling: wait for the
      // submenu itself, then let its focus timer run.
      await until("the submenu to open", () => submenus().length > 0, () => ({ submenus: submenus().length }));
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
    await submenuFeatureLoaded();
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
