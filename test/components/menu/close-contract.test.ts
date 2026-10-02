// test/components/menu/close-contract.test.ts
//
// FLO-548, the overlays' open / close contract, for the menu and the two
// components that hold one (select, split button): when open() or close()
// returns, isOpen() has changed and the event has been emitted. The class,
// the fade and the removal follow. Open on an open menu and close on a closed
// one do nothing and emit nothing; the later call wins. An open menu can be
// dismissed at once, but never by the event that opened it.
import { describe, expect, test } from "bun:test";
import createMenu from "../../../src/components/menu";
import createSelect from "../../../src/components/select";
import createSplitButton from "../../../src/components/split-button";
import { callbacksFixture, wait } from "../callbacks.fixture";

const mount = callbacksFixture();

const ITEMS = [{ id: "copy", text: "Copy" }, { id: "paste", text: "Paste" }];
const VISIBLE = "mtrl-menu--visible";
/** Past the 20ms the surface waits for and the 100ms its focus waits for */
const SHOWN = 160;
/** Past the 50ms the class waits for and the 300ms the removal waits for */
const GONE = 420;
const LAYERS = [undefined, "top"] as const;
const named = (layer: typeof LAYERS[number]): string => (layer ? "top layer" : "default layer");

/** A menu on a button, and the names of the events it has emitted, in order */
const make = (config: Record<string, unknown> = {}) => {
  const opener = document.createElement("button");
  opener.textContent = "More";
  document.body.append(opener);
  const menu = mount(createMenu({ opener, items: ITEMS, ...config } as never));
  const seen: string[] = [];
  menu.on("open", () => { seen.push("open"); });
  menu.on("close", () => { seen.push("close"); });
  return { menu, opener, seen };
};

/** A key press or a click made after `open()` ran: events are stamped in milliseconds here */
const later = (): Promise<void> => wait(3);

for (const layer of LAYERS) {
  describe(`menu close(), ${named(layer)}: the state and the event are there when it returns`, () => {
    test("isOpen() is false and close has been emitted", async () => {
      const { menu, seen } = make({ layer });
      await wait();
      menu.open();
      await wait(SHOWN);
      expect(menu.isOpen()).toBe(true);
      expect(menu.close()).toBe(menu);
      expect(menu.isOpen()).toBe(false);
      expect(seen).toEqual(["open", "close"]);
    });

    test("a close listener reads the menu as closed", async () => {
      const { menu } = make({ layer });
      await wait();
      const read: boolean[] = [];
      menu.on("close", () => { read.push(menu.isOpen()); });
      menu.open();
      menu.close();
      expect(read).toEqual([false]);
    });

    test("the surface follows: the class goes after the close, the element after the fade", async () => {
      const { menu } = make({ layer });
      await wait();
      menu.open();
      await wait(SHOWN);
      expect(menu.element.classList.contains(VISIBLE)).toBe(true);
      menu.close();
      expect(menu.element.isConnected).toBe(true);
      await wait(GONE);
      expect(menu.element.classList.contains(VISIBLE)).toBe(false);
      expect(menu.element.getAttribute("aria-hidden")).toBe("true");
      expect(menu.element.isConnected).toBe(false);
    });

    test("repeat calls do nothing and emit nothing", async () => {
      const { menu, seen } = make({ layer });
      await wait();
      menu.close();
      expect(seen).toEqual([]);
      menu.open();
      menu.open();
      expect(seen).toEqual(["open"]);
      await wait(SHOWN);
      menu.open();
      expect(seen).toEqual(["open"]);
      menu.close();
      menu.close();
      expect(seen).toEqual(["open", "close"]);
      await wait(GONE);
      menu.close();
      expect(seen).toEqual(["open", "close"]);
    });

    test("toggle() follows the state at once", async () => {
      const { menu, seen } = make({ layer });
      await wait();
      menu.toggle();
      expect(menu.isOpen()).toBe(true);
      menu.toggle();
      expect(menu.isOpen()).toBe(false);
      menu.toggle();
      expect(menu.isOpen()).toBe(true);
      expect(seen).toEqual(["open", "close", "open"]);
    });
  });

  describe(`menu open and close in one task, ${named(layer)}: the later call wins`, () => {
    test("close() then open() ends open: one close and one open, shown, still in the document", async () => {
      const { menu, seen } = make({ layer });
      await wait();
      menu.open();
      await wait(SHOWN);
      menu.close();
      menu.open();
      expect(menu.isOpen()).toBe(true);
      expect(seen).toEqual(["open", "close", "open"]);
      await wait(GONE);
      expect(menu.isOpen()).toBe(true);
      expect(menu.element.isConnected).toBe(true);
      expect(menu.element.classList.contains(VISIBLE)).toBe(true);
      expect(menu.element.getAttribute("aria-hidden")).toBe("false");
      expect(seen).toEqual(["open", "close", "open"]);
    });

    test("open() then close() ends closed: one open and one close, never shown, out of the document", async () => {
      const { menu, seen } = make({ layer });
      await wait();
      menu.open();
      menu.close();
      expect(menu.isOpen()).toBe(false);
      expect(seen).toEqual(["open", "close"]);
      await wait(SHOWN);
      expect(menu.element.classList.contains(VISIBLE)).toBe(false);
      expect(menu.element.getAttribute("aria-hidden")).toBe("true");
      await wait(GONE);
      expect(menu.isOpen()).toBe(false);
      expect(menu.element.isConnected).toBe(false);
      expect(seen).toEqual(["open", "close"]);
    });

    test("a close listener that opens it again: it ends open", async () => {
      const { menu, seen } = make({ layer });
      await wait();
      let once = true;
      menu.on("close", () => { if (once) { once = false; menu.open(); } });
      menu.open();
      await wait(SHOWN);
      menu.close();
      expect(menu.isOpen()).toBe(true);
      await wait(GONE);
      expect(menu.isOpen()).toBe(true);
      expect(menu.element.isConnected).toBe(true);
      expect(menu.element.classList.contains(VISIBLE)).toBe(true);
      expect(seen).toEqual(["open", "close", "open"]);
    });
  });

  describe(`menu, ${named(layer)}: open means it can be dismissed, but not by the event that opened it`, () => {
    const escape = () => new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    const click = () => new MouseEvent("click", { bubbles: true, cancelable: true });

    test("a click outside before the surface is shown closes it", async () => {
      const { menu, seen } = make({ layer });
      await wait();
      menu.open();
      await later();
      expect(menu.element.classList.contains(VISIBLE)).toBe(false);
      document.body.dispatchEvent(click());
      expect(menu.isOpen()).toBe(false);
      expect(seen).toEqual(["open", "close"]);
      await wait(SHOWN);
      expect(menu.element.classList.contains(VISIBLE)).toBe(false);
    });

    test("Escape before the surface is shown closes it", async () => {
      const { menu, seen } = make({ layer });
      await wait();
      menu.open();
      await later();
      document.body.dispatchEvent(escape());
      expect(menu.isOpen()).toBe(false);
      expect(seen).toEqual(["open", "close"]);
    });

    test("the click that opened it does not close it; the next one outside does", async () => {
      const { menu, seen } = make({ layer });
      await wait();
      // Not the menu's opener: a button of the page that opens it by code
      const other = document.createElement("button");
      document.body.append(other);
      other.addEventListener("click", () => { menu.open(); });
      other.dispatchEvent(click());
      expect(menu.isOpen()).toBe(true);
      expect(seen).toEqual(["open"]);
      await wait(SHOWN);
      expect(menu.isOpen()).toBe(true);
      other.dispatchEvent(click());
      expect(menu.isOpen()).toBe(false);
      expect(seen).toEqual(["open", "close"]);
    });

    test("the key press that opened it is not handled by it: Escape does not close, Enter does not select", async () => {
      const { menu, seen } = make({ layer });
      await wait();
      const selected: string[] = [];
      menu.on("select", () => { selected.push("select"); });
      const other = document.createElement("button");
      document.body.append(other);
      other.addEventListener("keydown", (event) => { menu.open(event); });
      other.dispatchEvent(escape());
      expect(menu.isOpen()).toBe(true);
      menu.close();
      await wait(GONE);
      other.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      expect(menu.isOpen()).toBe(true);
      await wait(SHOWN);
      expect(menu.isOpen()).toBe(true);
      expect(selected).toEqual([]);
      expect(seen).toEqual(["open", "close", "open"]);
    });

    test("close() and destroy() before the surface is shown leave no document listener behind", async () => {
      const held = new Map<string, Set<unknown>>();
      const add = document.addEventListener.bind(document);
      const remove = document.removeEventListener.bind(document);
      document.addEventListener = ((type: string, listener: EventListener, options?: AddEventListenerOptions) => {
        if (!held.has(type)) held.set(type, new Set());
        held.get(type)!.add(listener);
        add(type, listener, options);
      }) as typeof document.addEventListener;
      document.removeEventListener = ((type: string, listener: EventListener, options?: EventListenerOptions) => {
        held.get(type)?.delete(listener);
        remove(type, listener, options);
      }) as typeof document.removeEventListener;
      const count = (type: string): number => held.get(type)?.size ?? 0;
      try {
        const closed = make({ layer }).menu;
        await wait();
        held.clear();
        closed.open();
        expect([count("click"), count("keydown")]).toEqual([1, 1]);
        closed.close();
        expect([count("click"), count("keydown")]).toEqual([0, 0]);
        await wait(SHOWN);
        expect([count("click"), count("keydown")]).toEqual([0, 0]);

        const destroyed = createMenu({ items: ITEMS, layer } as never);
        document.body.append(destroyed.element);
        await wait();
        held.clear();
        destroyed.open();
        expect([count("click"), count("keydown")]).toEqual([1, 1]);
        destroyed.destroy();
        expect([count("click"), count("keydown")]).toEqual([0, 0]);
        await wait(SHOWN);
        expect([count("click"), count("keydown")]).toEqual([0, 0]);
      } finally {
        document.addEventListener = add;
        document.removeEventListener = remove;
      }
    });
  });
}

describe("one menu open at a time", () => {
  test("opening a second menu closes the first in that call: its close comes before the second's open", async () => {
    const first = make();
    const second = make();
    await wait();
    const order: string[] = [];
    first.menu.on("close", () => { order.push("first closed"); });
    second.menu.on("open", () => { order.push("second opened"); });
    first.menu.open();
    await wait(SHOWN);
    second.menu.open();
    expect(first.menu.isOpen()).toBe(false);
    expect(second.menu.isOpen()).toBe(true);
    expect(order).toEqual(["first closed", "second opened"]);
  });
});

describe("select follows the menu", () => {
  const options = [{ id: "s", text: "Small" }, { id: "m", text: "Medium" }];
  const select = () => {
    const component = mount(createSelect({ label: "Size", options, value: "s" }));
    const seen: string[] = [];
    component.on("open", () => { seen.push("open"); });
    component.on("close", () => { seen.push("close"); });
    return { component, seen, input: component.element.querySelector("input")! };
  };

  test("isOpen(), aria-expanded and the close event are there when close() returns", async () => {
    const { component, seen, input } = select();
    await wait();
    component.open();
    await wait(SHOWN);
    expect(component.close()).toBe(component);
    expect(component.isOpen()).toBe(false);
    expect(input.getAttribute("aria-expanded")).toBe("false");
    expect(seen).toEqual(["open", "close"]);
    component.close();
    expect(seen).toEqual(["open", "close"]);
  });

  test("close() then open() at once reopens it", async () => {
    const { component, seen, input } = select();
    await wait();
    component.open();
    await wait(SHOWN);
    component.close();
    component.open();
    expect(component.isOpen()).toBe(true);
    await wait(GONE);
    expect(component.isOpen()).toBe(true);
    expect(input.getAttribute("aria-expanded")).toBe("true");
    expect(seen).toEqual(["open", "close", "open"]);
  });

  test("Escape on the field closes it in that key press", async () => {
    const { component, seen, input } = select();
    await wait();
    component.open();
    await wait(SHOWN);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    expect(component.isOpen()).toBe(false);
    expect(seen).toEqual(["open", "close"]);
  });
});

describe("split button follows the menu", () => {
  const items = [{ id: "pdf", text: "PDF" }, { id: "csv", text: "CSV" }];
  const split = () => {
    const component = mount(createSplitButton({ text: "Export", items }));
    const seen: string[] = [];
    for (const name of ["expand", "collapse"] as const) component.on(name, () => { seen.push(name); });
    return { component, seen };
  };

  test("dismissed by the user: isExpanded() is false and collapse is emitted in the same task", async () => {
    const { component, seen } = split();
    await wait();
    component.expand();
    await wait(SHOWN);
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(component.isExpanded()).toBe(false);
    expect(component.trailingElement.getAttribute("aria-expanded")).toBe("false");
    expect(seen).toEqual(["expand", "collapse"]);
  });

  test("collapse() then expand() at once ends expanded, and stays so", async () => {
    const { component, seen } = split();
    await wait();
    component.expand();
    await wait(SHOWN);
    component.collapse();
    component.expand();
    expect(component.isExpanded()).toBe(true);
    await wait(GONE);
    expect(component.isExpanded()).toBe(true);
    expect(component.trailingElement.getAttribute("aria-expanded")).toBe("true");
    expect(seen).toEqual(["expand", "collapse", "expand"]);
  });
});
