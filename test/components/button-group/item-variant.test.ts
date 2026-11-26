// An item's variant overrides the group's, and an icon-only item takes the
// icon button's width. m3.material.io button groups and icon buttons, specs,
// read 2026-11-26.
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { JSDOM } from "jsdom";

let dom: JSDOM;

beforeEach(() => {
  dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost" });
  (global as unknown as { document: Document }).document = dom.window.document;
  (global as unknown as { window: Window }).window = dom.window;
  (global as unknown as { HTMLElement: typeof HTMLElement }).HTMLElement = dom.window.HTMLElement;
  (global as unknown as { Element: typeof Element }).Element = dom.window.Element;
  (global as unknown as { Node: typeof Node }).Node = dom.window.Node;
  (global as unknown as { Event: typeof Event }).Event = dom.window.Event;
  (global as unknown as { MouseEvent: typeof MouseEvent }).MouseEvent = dom.window.MouseEvent;
  (global as unknown as { customElements: CustomElementRegistry }).customElements = dom.window.customElements;
});

afterEach(() => {
  dom.window.close();
});

import createButtonGroup from "../../../src/components/button-group/button-group";
import { defineButtonGroup } from "../../../src/elements/button-group";

const ICON = '<svg viewBox="0 0 24 24"></svg>';

describe("button group item variant and width", () => {
  it("uses the group's variant unless the item sets its own, and keeps that on setVariant", () => {
    const group = createButtonGroup({
      variant: "tonal",
      size: "xl",
      buttons: [
        { icon: ICON, ariaLabel: "Accessibility", variant: "tonal", width: "narrow" },
        { text: "Get started", variant: "filled" },
        { icon: ICON, ariaLabel: "Language", width: "narrow" },
      ],
    });

    expect(group.buttons[0].getVariant()).toBe("tonal");
    expect(group.buttons[1].getVariant()).toBe("filled");
    expect(group.buttons[2].getVariant()).toBe("tonal");
    expect(group.buttons[0].element.classList.contains("mtrl-icon-button--narrow")).toBe(true);
    expect(group.buttons[2].element.classList.contains("mtrl-icon-button--narrow")).toBe(true);
    expect(group.buttons[0].element.classList.contains("mtrl-icon-button--xl")).toBe(true);
    expect(group.buttons[1].element.classList.contains("mtrl-button--xl")).toBe(true);

    group.setVariant("outlined");
    expect(group.buttons[0].getVariant()).toBe("tonal");
    expect(group.buttons[1].getVariant()).toBe("filled");
    expect(group.buttons[2].getVariant()).toBe("outlined");
  });

  it("reads variant and width from the item element", async () => {
    defineButtonGroup();
    const host = document.createElement("m-button-group");
    host.setAttribute("variant", "tonal");
    host.setAttribute("size", "xl");
    const add = (attributes: Record<string, string>, text?: string) => {
      const item = document.createElement("m-button-group-item");
      for (const [name, value] of Object.entries(attributes)) item.setAttribute(name, value);
      if (text) item.textContent = text;
      host.append(item);
    };
    add({ icon: ICON, "aria-label": "Accessibility", variant: "tonal", width: "narrow" });
    add({ variant: "filled" }, "Get started");
    add({ icon: ICON, "aria-label": "Language", width: "narrow" });
    document.body.append(host);
    await Promise.resolve();

    const root = host.shadowRoot!.querySelector(".mtrl-button-group")!;
    const [left, centre, right] = [...root.children];
    expect(left.classList.contains("mtrl-icon-button--tonal")).toBe(true);
    expect(left.classList.contains("mtrl-icon-button--narrow")).toBe(true);
    expect(centre.classList.contains("mtrl-button--filled")).toBe(true);
    expect(right.classList.contains("mtrl-icon-button--tonal")).toBe(true);
    expect(right.classList.contains("mtrl-icon-button--narrow")).toBe(true);
  });
});
