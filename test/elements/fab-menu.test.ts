// test/elements/fab-menu.test.ts
// Closing <m-fab-menu> while a list item has focus must leave that inert list.
// The list is in the open shadow root. document.activeElement stops at the
// host, so the close used to leave focus on the item.
import { afterEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element, Node: dom.window.Node, Event: dom.window.Event,
  MouseEvent: dom.window.MouseEvent, KeyboardEvent: dom.window.KeyboardEvent,
  FocusEvent: dom.window.FocusEvent, CustomEvent: dom.window.CustomEvent,
  MutationObserver: dom.window.MutationObserver, customElements: dom.window.customElements,
  getComputedStyle: dom.window.getComputedStyle.bind(dom.window),
});

import { defineFabMenu, type FabMenuElement } from "../../src/elements/fab-menu";
import { registerStyles } from "../../src/elements/styles";

registerStyles({ ripple: "", button: "", fab: "", menu: "", "fab-menu": "" });
defineFabMenu();

afterEach(() => {
  document.body.replaceChildren();
});

describe("<m-fab-menu>", () => {
  test("closing while an item has focus moves focus out of the inert list", () => {
    const host = document.createElement("m-fab-menu") as FabMenuElement;
    host.setAttribute("presentation", "list");
    host.setAttribute("aria-label", "Actions");
    for (const label of ["Reply", "Forward"]) {
      const declared = document.createElement("m-fab-menu-item");
      declared.textContent = label;
      host.append(declared);
    }
    document.body.append(host);

    host.show();
    const root = host.shadowRoot!;
    const item = root.querySelector<HTMLButtonElement>("[role=menuitem]")!;
    const button = root.querySelector<HTMLButtonElement>("[aria-haspopup=menu]")!;
    const list = root.querySelector<HTMLElement>("[role=menu]")!;
    expect(list.hasAttribute("inert")).toBe(false);
    item.focus();
    // The host is what document.activeElement reports. The item is focused in the shadow root.
    expect(document.activeElement).toBe(host);
    expect(root.activeElement).toBe(item);

    host.hide();
    expect(list.hasAttribute("inert")).toBe(true);
    expect(list.contains(root.activeElement)).toBe(false);
    expect(root.activeElement).toBe(button);
  });
});
