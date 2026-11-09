import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";
import createDeferredMenu from "../../../src/components/menu/deferred";
import createMenu from "../../../src/components/menu";
import { currentlyOpenMenu } from "../../../src/components/menu/features/registry";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element, Node: dom.window.Node, Event: dom.window.Event,
  MouseEvent: dom.window.MouseEvent, KeyboardEvent: dom.window.KeyboardEvent,
  CustomEvent: dom.window.CustomEvent, MutationObserver: dom.window.MutationObserver,
  DOMException: dom.window.DOMException, customElements: dom.window.customElements,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
  requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window),
  cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window),
  ResizeObserver: class { observe() {} disconnect() {} unobserve() {} },
});
let opener: HTMLButtonElement;
const items = [{ id: "one", text: "One" }, { id: "two", text: "Two" }];
const handles: { destroy(): void }[] = [];
const make = (config: Partial<Parameters<typeof createDeferredMenu>[0]> = {}) => {
  const menu = createDeferredMenu({ opener, items, ...config });
  handles.push(menu);
  return menu;
};
beforeEach(() => {
  document.body.innerHTML = '<button id="opener">Open</button><button id="other">Other</button>';
  opener = document.querySelector("#opener")!;
});
afterEach(() => { for (const handle of handles.splice(0)) handle.destroy(); });

describe("deferred menu", () => {
  test("validates the opener synchronously and resolves typed forms", () => {
    expect(() => make({ opener: "#missing" })).toThrow("resolvable selector");
    expect(() => make({ opener: undefined as never })).toThrow();
    expect(make({ opener: "#opener" }).getOpener()).toBe(opener);
    expect(make({ opener: { element: opener } }).getOpener()).toBe(opener);
  });
  test("starts unloaded with no fake DOM or dangling controls", () => {
    const menu = make();
    expect(menu.element).toBeNull();
    expect(menu.isReady()).toBe(false);
    expect(menu.isOpen()).toBe(false);
    expect(menu.getPosition()).toBe("bottom-start");
    expect(opener.getAttribute("aria-expanded")).toBe("false");
    expect(opener.hasAttribute("aria-controls")).toBe(false);
    expect(document.querySelector('[role="menu"]')).toBeNull();
  });
  test("requests open synchronously once and keeps cold ARIA honest", async () => {
    const events: unknown[] = [];
    const menu = make({ on: { open: event => events.push(event.menu), close: event => events.push(event.menu) } });
    opener.focus();
    expect(menu.open()).toBe(menu);
    expect(menu.isOpen()).toBe(true);
    expect(events).toEqual([menu]);
    expect(menu.open()).toBe(menu);
    expect(events).toEqual([menu]);
    expect(menu.element).toBeNull();
    expect(opener.getAttribute("aria-expanded")).toBe("false");
    expect(opener.getAttribute("aria-busy")).toBe("true");
    expect(opener.hasAttribute("aria-controls")).toBe(false);
    expect(document.activeElement).toBe(opener);
    menu.close(); menu.close();
    expect(events).toEqual([menu, menu]);
    await menu.preload();
    expect(menu.isOpen()).toBe(false);
    expect(menu.element?.isConnected).toBe(false);
    expect(opener.hasAttribute("aria-busy")).toBe(false);
    expect(opener.hasAttribute("aria-controls")).toBe(false);
  });
  test("preload coalesces, creates once, stays closed and never focuses", async () => {
    const menu = make();
    opener.focus();
    const first = menu.preload();
    expect(menu.preload()).toBe(first);
    await first;
    const element = menu.element;
    expect(element).toBeInstanceOf(HTMLElement);
    expect(menu.isReady()).toBe(true);
    expect(menu.isOpen()).toBe(false);
    expect(document.activeElement).toBe(opener);
    await menu.preload();
    expect(menu.element).toBe(element);
  });
  test("uses latest queued values and preserves fluent identity after readiness", async () => {
    const menu = make();
    const replacement = [{ id: "next", text: "Next" }];
    expect(menu.setItems(replacement).setPosition("top-end").setSelected("next")).toBe(menu);
    expect(menu.getItems()).toBe(replacement);
    expect(menu.getPosition()).toBe("top-end");
    expect(menu.getSelected()).toBe("next");
    await menu.preload();
    expect(menu.element?.textContent).toBe("Next");
    expect(menu.getSelected()).toBe("next");
    expect(menu.open().close().toggle().toggle()).toBe(menu);
    expect(menu.setItems(items).setPosition("bottom").setSelected("two")).toBe(menu);
    expect(menu.getItems()).toBe(items);
    expect(menu.getPosition()).toBe("bottom");
    expect(menu.getSelected()).toBe("two");
  });
  test("loaded select uses facade identity with live cancellation; off survives handoff", async () => {
    const menu = make();
    const seen: unknown[] = [];
    const removed = () => { throw new Error("removed handler ran"); };
    menu.on("select", removed).off("select", removed);
    menu.on("select", event => { seen.push(event.menu); event.preventDefault(); });
    menu.on("select", event => { seen.push(event.defaultPrevented); });
    menu.open();
    await menu.preload();
    menu.element!.querySelector<HTMLElement>('[data-id="one"]')!.click();
    expect(seen).toEqual([menu, true]);
    expect(menu.isOpen()).toBe(true);
    expect(menu.getSelected()).toBeNull();
  });
  test("loaded noncancelled select closes once and forwards arbitrary events", async () => {
    const events: string[] = [];
    const menu = make({ on: { open: () => events.push("open"), select: () => events.push("select"), close: () => events.push("close") } });
    menu.on("menu-closing", () => events.push("menu-closing"));
    menu.open(); await menu.preload();
    menu.element!.querySelector<HTMLElement>('[data-id="one"]')!.click();
    expect(events).toEqual(["open", "select", "menu-closing", "close"]);
    expect(menu.isOpen()).toBe(false);
  });
  for (const trigger of ["Escape", "Tab", "outside", "toggle", "removed", "disabled"] as const) {
    test(`cold ${trigger} cancels before a late load can display`, async () => {
      const menu = make();
      menu.open();
      if (trigger === "Escape" || trigger === "Tab") document.dispatchEvent(new KeyboardEvent("keydown", { key: trigger, bubbles: true }));
      else if (trigger === "outside") document.querySelector<HTMLButtonElement>("#other")!.click();
      else if (trigger === "toggle") menu.toggle();
      else if (trigger === "removed") opener.remove();
      else opener.disabled = true;
      await menu.preload();
      expect(menu.isOpen()).toBe(false);
      expect(menu.element?.isConnected).toBe(false);
      expect(opener.getAttribute("aria-expanded")).toBe("false");
    });
  }
  test("the triggering click is ignored but the first following click dismisses", async () => {
    const menu = make();
    opener.click();
    expect(menu.isOpen()).toBe(true);
    document.querySelector<HTMLButtonElement>("#other")!.click();
    expect(menu.isOpen()).toBe(false);
    await menu.preload();
    expect(menu.element?.isConnected).toBe(false);
  });
  test("manualOpen never installs opener activation", async () => {
    const menu = make({ manualOpen: true, listbox: true });
    opener.click();
    expect(menu.isOpen()).toBe(false);
    expect(menu.isReady()).toBe(false);
    expect(opener.hasAttribute("aria-haspopup")).toBe(false);
    menu.open(); await menu.preload();
    expect(menu.element!.getAttribute("role")).toBe("presentation");
    expect(opener.hasAttribute("aria-expanded")).toBe(false);
  });
  test("open-close-open hands off the latest keyboard event once", async () => {
    const seen: unknown[] = [];
    const menu = make({ on: { open: event => seen.push(event.originalEvent), close: () => seen.push("close") } });
    const first = new KeyboardEvent("keydown", { key: "ArrowDown" });
    const last = new KeyboardEvent("keydown", { key: "ArrowUp" });
    menu.open(first).close(undefined, false).open(last);
    await menu.preload();
    expect(seen).toEqual([first, "close", last]);
    expect(menu.isOpen()).toBe(true);
    expect(menu.element?.isConnected).toBe(true);
  });
  test("reentrant handlers may close or destroy without starting a load", async () => {
    const closed = make({ on: { open: event => event.menu.close() } });
    closed.open();
    expect(closed.isOpen()).toBe(false);
    expect(closed.element).toBeNull();
    const destroyed = make({ on: { open: event => event.menu.destroy() } });
    destroyed.open();
    expect(destroyed.isOpen()).toBe(false);
    expect(destroyed.element).toBeNull();
    await expect(destroyed.preload()).rejects.toHaveProperty("name", "AbortError");
  });
  test("destroy rejects pending callers immediately and prevents late creation", async () => {
    const menu = make();
    const pending = menu.preload();
    menu.destroy();
    await expect(pending).rejects.toHaveProperty("name", "AbortError");
    await expect(menu.preload()).rejects.toHaveProperty("name", "AbortError");
    expect(menu.open().setItems([]).setSelected("other").setPosition("top")).toBe(menu);
    expect(menu.getItems()).toBe(items);
    expect(menu.getPosition()).toBe("bottom-start");
    expect(menu.isOpen()).toBe(false);
    expect(menu.isReady()).toBe(false);
    expect(menu.element).toBeNull();
  });
  test("new root requests close pending and eager menus, with no state sharing", async () => {
    const first = make();
    const second = make({ opener: document.querySelector<HTMLButtonElement>("#other")!, items: [{ id: "x", text: "X" }] });
    first.open(); second.open();
    expect(first.isOpen()).toBe(false);
    expect(second.isOpen()).toBe(true);
    await Promise.all([first.preload(), second.preload()]);
    expect(first.element?.isConnected).toBe(false);
    expect(second.element?.isConnected).toBe(true);
    const eager = createMenu({ opener, items }); handles.push(eager);
    eager.open();
    expect(second.isOpen()).toBe(false);
    expect(eager.isOpen()).toBe(true);
    first.open();
    expect(eager.isOpen()).toBe(false);
    first.destroy();
    expect(currentlyOpenMenu()).toBeNull();
  });
  test("opener replacement cancels and retargets immediate activation", async () => {
    const menu = make();
    menu.open();
    const other = document.querySelector<HTMLButtonElement>("#other")!;
    expect(menu.setOpener("#other")).toBe(menu);
    expect(menu.getOpener()).toBe(other);
    expect(menu.isOpen()).toBe(false);
    expect(opener.hasAttribute("aria-haspopup")).toBe(false);
    opener.click(); expect(menu.isOpen()).toBe(false);
    await menu.preload();
    other.click(); expect(menu.isOpen()).toBe(true);
  });
  test("restores authored ARIA and preserves an author busy edit during loading", async () => {
    opener.setAttribute("aria-haspopup", "menu");
    opener.setAttribute("aria-expanded", "mixed");
    opener.setAttribute("aria-busy", "false");
    const menu = make();
    menu.open();
    menu.close();
    expect(opener.getAttribute("aria-busy")).toBe("false");
    menu.open();
    opener.setAttribute("aria-busy", "author");
    await menu.preload();
    expect(opener.getAttribute("aria-busy")).toBe("author");
    menu.destroy();
    expect(opener.getAttribute("aria-haspopup")).toBe("menu");
    expect(opener.getAttribute("aria-expanded")).toBe("mixed");
    expect(opener.hasAttribute("aria-controls")).toBe(false);
  });
  test("visible starts only after config handlers are installed", async () => {
    const seen: unknown[] = [];
    const menu = make({ visible: true, on: { open: event => seen.push(event.menu) } });
    expect(seen).toEqual([menu]);
    await menu.preload();
    expect(menu.isOpen()).toBe(true);
  });
  test("author ARIA edits survive ready destroy and retarget", async () => {
    const menu = make();
    await menu.preload();
    opener.setAttribute("aria-expanded", "author");
    opener.setAttribute("aria-controls", "author-panel");
    const other = document.querySelector<HTMLButtonElement>("#other")!;
    other.setAttribute("aria-haspopup", "menu");
    other.setAttribute("aria-expanded", "original");
    other.setAttribute("aria-controls", "authored-other");
    menu.setOpener(other);
    expect(opener.getAttribute("aria-expanded")).toBe("author");
    expect(opener.getAttribute("aria-controls")).toBe("author-panel");
    menu.destroy();
    expect(other.getAttribute("aria-haspopup")).toBe("menu");
    expect(other.getAttribute("aria-expanded")).toBe("original");
    expect(other.getAttribute("aria-controls")).toBe("authored-other");
  });
  test("a cold request in a closed containing dialog cannot show", async () => {
    const dialog = document.createElement("dialog");
    dialog.setAttribute("open", "");
    opener.replaceWith(dialog); dialog.append(opener);
    const menu = make();
    menu.open();
    dialog.removeAttribute("open");
    dialog.dispatchEvent(new Event("close"));
    await menu.preload();
    expect(menu.isOpen()).toBe(false);
    expect(menu.element?.isConnected).toBe(false);
  });
  test("a close handler reopening the menu keeps the later request", async () => {
    const menu = make();
    let closes = 0;
    menu.on("close", () => { if (++closes === 1) menu.open(); });
    menu.open(); await menu.preload();
    menu.close();
    expect(menu.isOpen()).toBe(true);
    expect(opener.getAttribute("aria-expanded")).toBe("true");
    expect(closes).toBe(1);
  });
  test("an older request cannot supersede a reentrant newer registry owner", async () => {
    const first = make();
    const second = make({ opener: document.querySelector<HTMLButtonElement>("#other")! });
    first.on("close", () => first.open());
    first.open(); second.open();
    await Promise.all([first.preload(), second.preload()]);
    expect(first.isOpen()).toBe(true);
    expect(second.isOpen()).toBe(false);
    expect(second.element?.isConnected).toBe(false);
  });

  test("construction failure rejects the joined promise with the emitted error, then retries explicitly", async () => {
    const events: unknown[] = [];
    const menu = make({ items: [{ get id(): string { throw new Error("synthetic constructor failure"); }, text: "Broken" }],
      on: { open: () => events.push("open"), close: () => events.push("close"), loaderror: event => events.push(event.error) } });
    menu.open();
    const failure = await menu.preload().catch(error => error);
    expect(events).toEqual(["open", "close", failure]);
    expect(failure).toBeInstanceOf(Error);
    expect(menu.isOpen()).toBe(false);
    expect(menu.isReady()).toBe(false);
    expect(opener.getAttribute("aria-expanded")).toBe("false");
    expect(opener.getAttribute("aria-haspopup")).toBe("true");
    expect(opener.hasAttribute("aria-busy")).toBe(false);
    menu.setItems(items);
    await menu.preload();
    expect(menu.isReady()).toBe(true);
    expect(menu.isOpen()).toBe(false);
    menu.open(); expect(menu.isOpen()).toBe(true);
  });
  test("ready opener disable cancels the controller before its delayed focus", async () => {
    const menu = make();
    await menu.preload();
    menu.open(new KeyboardEvent("keydown", { key: "ArrowUp" }));
    opener.disabled = true;
    await Promise.resolve();
    expect(menu.isOpen()).toBe(false);
  });
  test("setOpener stops after a close callback destroys the handle", async () => {
    const menu = make({ on: { close: event => event.menu.destroy() } });
    menu.open();
    const pending = menu.preload().catch(error => error);
    menu.setOpener("#other");
    expect((await pending).name).toBe("AbortError");
    expect(menu.getOpener()).toBe(opener);
    expect(opener.hasAttribute("aria-haspopup")).toBe(false);
    expect(document.querySelector("#other")!.hasAttribute("aria-haspopup")).toBe(false);
  });

  test("ready close removes the library IDREF and component openers keep their active hook", async () => {
    const active: boolean[] = [];
    const component = { element: opener, setActive: (value: boolean) => active.push(value) };
    const menu = make({ opener: component });
    await menu.preload();
    menu.open();
    expect(active).toEqual([true]);
    expect(opener.getAttribute("aria-controls")).toBe(menu.element!.id);
    menu.close();
    expect(active).toEqual([true, false]);
    expect(opener.hasAttribute("aria-controls")).toBe(false);
  });

  test("a shadow-root opener becoming disabled cancels before delayed focus", async () => {
    const host = document.createElement("div");
    opener.replaceWith(host);
    host.attachShadow({ mode: "open" }).append(opener);
    const menu = make();
    await menu.preload();
    menu.open(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    await Promise.resolve();
    opener.disabled = true;
    await Promise.resolve();
    expect(menu.isOpen()).toBe(false);
  });

  test("mutating the caller's configuration cannot prevent opener cleanup", () => {
    const config = { opener, items, manualOpen: false };
    const menu = createDeferredMenu(config); handles.push(menu);
    config.manualOpen = true;
    menu.destroy();
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    opener.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });

});
