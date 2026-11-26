// An item's variant overrides the group's, and an icon-only item takes the
// icon button's width. m3.material.io button groups and icon buttons, specs,
// read 2026-11-26.
import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { JSDOM } from "jsdom";
import { clearGlobalDefaults, setComponentDefaults } from "../../../src/core/config/global";

let dom: JSDOM;

beforeEach(() => {
  dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost" });
  const g = globalThis as unknown as Record<string, unknown>;
  g.document = dom.window.document;
  g.window = dom.window;
  g.HTMLElement = dom.window.HTMLElement;
  g.Element = dom.window.Element;
  g.Node = dom.window.Node;
  g.Event = dom.window.Event;
  g.MouseEvent = dom.window.MouseEvent;
  g.MutationObserver = dom.window.MutationObserver;
  g.customElements = dom.window.customElements;
});

afterEach(() => {
  clearGlobalDefaults();
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

    // The group's own text stays on an icon that did not set a variant.
    // Drawing it as standard recolors a selected icon.
    group.setVariant("text");
    expect(group.buttons[2].element.classList.contains("mtrl-icon-button--text")).toBe(true);
    expect(group.buttons[2].element.classList.contains("mtrl-icon-button--standard")).toBe(false);
    expect(group.buttons[0].getVariant()).toBe("tonal");
  });

  it("keeps an inherited icon-button width, and marks only an item that sets width", () => {
    (setComponentDefaults as (name: string, config: { width: string }) => void)("icon-button", { width: "narrow" });
    const group = createButtonGroup({
      size: "xl",
      buttons: [
        { icon: ICON, ariaLabel: "Inherited" },
        { icon: ICON, ariaLabel: "Chosen", width: "wide" },
        { icon: ICON, ariaLabel: "Classed", class: "mtrl-icon-button--wide" },
      ],
    });
    const [inherited, chosen, classed] = group.buttons.map((button) => button.element);
    expect(inherited.classList.contains("mtrl-icon-button--narrow")).toBe(true);
    expect(inherited.classList.contains("mtrl-button-group__width")).toBe(false);
    expect(chosen.classList.contains("mtrl-icon-button--wide")).toBe(true);
    expect(chosen.classList.contains("mtrl-button-group__width")).toBe(true);
    expect(classed.classList.contains("mtrl-icon-button--wide")).toBe(true);
    expect(classed.classList.contains("mtrl-button-group__width")).toBe(false);
  });

  it("reads variant and width from the item element", async () => {
    (setComponentDefaults as (name: string, config: { width: string }) => void)("icon-button", { width: "narrow" });
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
    add({ icon: ICON, "aria-label": "Inherited" });
    add({ icon: ICON, "aria-label": "Raised", variant: "elevated" });
    document.body.append(host);
    await Promise.resolve();

    const root = host.shadowRoot!.querySelector(".mtrl-button-group")!;
    const [left, centre, right, inheritedAtStart, raised] = [...root.children];
    expect(left.classList.contains("mtrl-icon-button--tonal")).toBe(true);
    expect(left.classList.contains("mtrl-icon-button--narrow")).toBe(true);
    expect(centre.classList.contains("mtrl-button--filled")).toBe(true);
    expect(right.classList.contains("mtrl-icon-button--tonal")).toBe(true);
    expect(right.classList.contains("mtrl-icon-button--narrow")).toBe(true);
    expect(inheritedAtStart.classList.contains("mtrl-icon-button--narrow")).toBe(true);
    // `elevated` is not an icon-button variant, so the item keeps the group's.
    expect(raised.classList.contains("mtrl-icon-button--tonal")).toBe(true);
    expect(raised.classList.contains("mtrl-icon-button--elevated")).toBe(false);

    // Adding a variant and removing one, then changing the host, follows the
    // overrides that are there now. The first item's new filled stays. The
    // cleared centre takes the host's outlined, and so does the item that
    // never set one. A stale creation override would leave the centre filled.
    const items = [...host.children];
    items[0].setAttribute("variant", "filled");
    items[1].removeAttribute("variant");
    host.setAttribute("variant", "outlined");
    await Promise.resolve();
    const again = [...root.children];
    expect(again[0].classList.contains("mtrl-icon-button--filled")).toBe(true);
    expect(again[1].classList.contains("mtrl-button--outlined")).toBe(true);
    expect(again[2].classList.contains("mtrl-icon-button--outlined")).toBe(true);

    // An icon with no width inherits the icon button's narrow. Setting wide
    // and clearing it returns to that narrow, not the icon button's default.
    const inherited = again[3];
    expect(inherited.classList.contains("mtrl-icon-button--narrow")).toBe(true);
    expect(inherited.classList.contains("mtrl-button-group__width")).toBe(false);
    items[3].setAttribute("width", "wide");
    await Promise.resolve();
    expect(inherited.classList.contains("mtrl-icon-button--wide")).toBe(true);
    expect(inherited.classList.contains("mtrl-button-group__width")).toBe(true);
    items[3].removeAttribute("width");
    await Promise.resolve();
    expect(inherited.classList.contains("mtrl-icon-button--narrow")).toBe(true);
    expect(inherited.classList.contains("mtrl-icon-button--default")).toBe(false);
    expect(inherited.classList.contains("mtrl-button-group__width")).toBe(false);

    // Clearing an item variant follows the variant the group has now, even
    // when the attribute still says something else.
    (host as HTMLElement & { component: { setVariant: (variant: string) => void } }).component.setVariant("tonal");
    items[0].removeAttribute("variant");
    await Promise.resolve();
    expect(again[0].classList.contains("mtrl-icon-button--tonal")).toBe(true);
    expect(again[0].classList.contains("mtrl-icon-button--outlined")).toBe(false);
  });
});
