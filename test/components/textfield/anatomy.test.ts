// test/components/textfield/anatomy.test.ts
//
// FLO-300: the root holds the field (the container every slot is drawn in)
// and, under it, the supporting text row with the helper and the counter.

import { describe, test, expect, beforeEach, afterAll } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const g = globalThis as any;
for (const key of [
  "window", "document", "navigator", "HTMLElement", "HTMLInputElement",
  "HTMLTextAreaElement", "Element", "Node", "Event", "MouseEvent",
  "KeyboardEvent", "FocusEvent", "CustomEvent", "MutationObserver",
]) {
  g[key] = (dom.window as any)[key];
}
g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
g.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0);
g.cancelAnimationFrame = () => {};
g.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };

import createTextField from "../../../src/components/textfield";

const ICON = '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>';
const mount = (config: Record<string, unknown> = {}) => {
  const field = createTextField({ label: "Name", ...config } as never);
  document.body.append(field.element);
  return field;
};
const names = (el: Element) => [...el.children].map((child) => child.className.split(" ")[0].replace("mtrl-textfield__", ""));
const type = (input: HTMLInputElement, text: string) => {
  input.value = text;
  input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
};

beforeEach(() => { document.body.innerHTML = ""; });
afterAll(() => dom.window.close());

describe("text field anatomy (FLO-300)", () => {
  test("the root holds the field, then the supporting text row", () => {
    const field = mount({ variant: "outlined", leadingIcon: ICON, trailingIcon: ICON, prefixText: "$", supportingText: "Help" });
    expect(names(field.element)).toEqual(["field", "supporting"]);
    expect(field.field.className).toBe("mtrl-textfield__field");
    expect(names(field.field)).toEqual(["label", "input", "outline", "leading-icon", "trailing-icon", "prefix"]);
    expect(names(field.element.querySelector(".mtrl-textfield__supporting")!)).toEqual(["helper"]);
  });

  test("the public element and input are unchanged: the root and the input", () => {
    const field = mount();
    expect(field.element.classList.contains("mtrl-textfield")).toBe(true);
    expect(field.input.parentElement).toBe(field.field);
    expect(field.field.parentElement).toBe(field.element);
  });

  test("the row exists only while it holds something", () => {
    const field = mount();
    expect(names(field.element)).toEqual(["field"]);
    field.setSupportingText("Help");
    expect(names(field.element)).toEqual(["field", "supporting"]);
    expect(field.supportingTextElement?.parentElement?.className).toBe("mtrl-textfield__supporting");
    field.removeSupportingText();
    expect(names(field.element)).toEqual(["field"]);
  });

  test("slots set later go into the field", () => {
    const field = mount();
    field.setLeadingIcon(ICON).setSuffixText("kg");
    expect(field.field.querySelector(".mtrl-textfield__leading-icon")).not.toBeNull();
    expect(field.element.querySelector(":scope > .mtrl-textfield__leading-icon, :scope > .mtrl-textfield__suffix")).toBeNull();
  });
});

describe("text field character counter (FLO-300)", () => {
  const counter = (field: { element: HTMLElement }) => field.element.querySelector<HTMLElement>(".mtrl-textfield__counter");

  test("no maxlength, no counter", () => {
    expect(counter(mount())).toBeNull();
  });

  test("shows count/max at the end of the row, after the helper", () => {
    const field = mount({ maxLength: 20, value: "Ada", supportingText: "Help" });
    expect(names(field.element.querySelector(".mtrl-textfield__supporting")!)).toEqual(["helper", "counter"]);
    expect(counter(field)?.textContent).toBe("3/20");
    // A helper set after the counter still comes first.
    field.setSupportingText("Other");
    expect(names(field.element.querySelector(".mtrl-textfield__supporting")!)).toEqual(["helper", "counter"]);
  });

  test("follows typing and setValue", () => {
    const field = mount({ maxLength: 10 });
    expect(counter(field)?.textContent).toBe("0/10");
    type(field.input as HTMLInputElement, "Grace");
    expect(counter(field)?.textContent).toBe("5/10");
    field.setValue("Ada");
    expect(counter(field)?.textContent).toBe("3/10");
  });

  test("describes the input, alongside the helper", () => {
    const field = mount({ maxLength: 10, supportingText: "Help" });
    const ids = field.input.getAttribute("aria-describedby")!.split(" ");
    expect(ids).toContain(counter(field)!.id);
    expect(ids).toContain(field.supportingTextElement!.id);
  });

  test("a maxlength set or removed later adds or removes it", async () => {
    const field = mount();
    field.input.setAttribute("maxlength", "8");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(counter(field)?.textContent).toBe("0/8");
    field.input.removeAttribute("maxlength");
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(counter(field)).toBeNull();
    expect(field.input.hasAttribute("aria-describedby")).toBe(false);
    expect(names(field.element)).toEqual(["field"]);
  });

  test("error is the field's: the counter only follows the root class", () => {
    const field = mount({ maxLength: 10 });
    field.setError(true);
    expect(counter(field)!.className).toBe("mtrl-textfield__counter");
    expect(field.element.classList.contains("mtrl-textfield--error")).toBe(true);
  });
});
