// test/elements/button-icon-position.test.ts
//
// `<m-button>`'s `icon-position` attribute: how it reaches the factory's
// `iconPosition`. With `end`, the icon is placed after the label and carries
// `mtrl-button__icon--end`. The unit tests here drive the real element in a
// JSDOM document, because the attribute has no setter: set at creation it is
// the creation config, and changed after upgrade it recreates the component
// from the attributes (as `icon-position` does on <m-extended-fab>).
import { describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const g = globalThis as any;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = dom.window.HTMLElement;
g.customElements = dom.window.customElements;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.Event = dom.window.Event;
g.CustomEvent = dom.window.CustomEvent;
g.MouseEvent = dom.window.MouseEvent;
g.PointerEvent = dom.window.MouseEvent;
g.KeyboardEvent = dom.window.KeyboardEvent;
g.MutationObserver = dom.window.MutationObserver;
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = () => {};
g.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
// JSDOM has no canvas; the loading indicator draws on one, and nothing here
// asserts what it draws.
dom.window.HTMLCanvasElement.prototype.getContext = function () {
  return new Proxy({}, { get: () => () => {} }) as unknown as CanvasRenderingContext2D;
} as any;
// JSDOM's ElementInternals reflects ARIA but has none of the form methods the
// element host calls (the browser's has). The form value is not what this test
// is about; the browser case covers the real internals.
const internals = dom.window.ElementInternals.prototype as unknown as Record<string, unknown>;
internals.setFormValue ??= () => {};
internals.setValidity ??= () => {};
if (!("validity" in internals)) Object.defineProperty(internals, "validity", { get: () => ({ valid: true }) });

import { buttonElement } from "../../src/elements/button";
import { registerStyles } from "../../src/elements/styles";

const ICON = "<svg viewBox='0 0 24 24'><path d='M0 0h24v24H0z'/></svg>";

registerStyles({ ripple: "/* ripple */", progress: "/* progress */", button: "/* button */" });
buttonElement.define();

const mount = (attributes: Record<string, string> = {}): HTMLElement => {
  const host = document.createElement("m-button");
  for (const [name, value] of Object.entries(attributes)) host.setAttribute(name, value);
  document.body.append(host);
  return host;
};

const buttonOf = (host: HTMLElement): HTMLElement => host.shadowRoot!.querySelector("button")!;
const iconOf = (host: HTMLElement): HTMLElement | null => buttonOf(host).querySelector(".mtrl-button__icon");
const labelOf = (host: HTMLElement): HTMLElement | null => buttonOf(host).querySelector(".mtrl-button__text");
const follows = (first: Element, second: Element): boolean =>
  (first.compareDocumentPosition(second) & dom.window.Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe("<m-button> icon-position", () => {
  test("set at creation: the icon follows the label and carries --end", () => {
    const host = mount({ icon: ICON, "icon-position": "end", label: "Save" });
    const icon = iconOf(host)!;
    expect(icon).not.toBeNull();
    expect(icon.classList.contains("mtrl-button__icon--end")).toBe(true);
    expect(follows(labelOf(host)!, icon)).toBe(true);
    expect((host as unknown as { iconPosition: string }).iconPosition).toBe("end");
  });

  test("changed after upgrade: the component is recreated in the new position", () => {
    const host = mount({ icon: ICON, label: "Save" });
    expect(iconOf(host)!.classList.contains("mtrl-button__icon--end")).toBe(false);
    expect(follows(iconOf(host)!, labelOf(host)!)).toBe(true);
    const before = buttonOf(host);

    host.setAttribute("icon-position", "end");
    const after = buttonOf(host);
    expect(after).not.toBe(before);
    expect(after.querySelector(".mtrl-button__icon")!.classList.contains("mtrl-button__icon--end")).toBe(true);
    expect(follows(labelOf(host)!, iconOf(host)!)).toBe(true);

    host.removeAttribute("icon-position");
    expect(buttonOf(host)).not.toBe(after);
    expect(iconOf(host)!.classList.contains("mtrl-button__icon--end")).toBe(false);
    expect(follows(iconOf(host)!, labelOf(host)!)).toBe(true);
  });
});
