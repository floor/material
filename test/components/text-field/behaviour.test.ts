// test/components/text-field/behaviour.test.ts
//
// FLO-303: the supporting text and error state stayed in step only when the
// error feature and the API happened to hold the same copy of the component,
// and density ran before the input it styles existed.

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

import createTextField from "../../../src/components/text-field";

const mount = (config: Record<string, unknown> = {}) => {
  const field = createTextField({ label: "Name", ...config } as never);
  document.body.append(field.element);
  return field;
};
const helper = (field: { element: HTMLElement }) => field.element.querySelector<HTMLElement>(".mtrl-text-field__helper");
const hasError = (field: { element: HTMLElement }) => field.element.classList.contains("mtrl-text-field--error");

beforeEach(() => { document.body.innerHTML = ""; });
afterAll(() => dom.window.close());

describe("text field supporting text and error state (FLO-303)", () => {
  test("ending an error restores helper text set through the API", () => {
    const field = mount();
    field.setSupportingText("Helper");
    field.setError(true, "Bad");
    expect(helper(field)?.textContent).toBe("Bad");
    field.setError(false);
    expect(helper(field)?.textContent).toBe("Helper");
    expect(helper(field)?.classList.contains("mtrl-text-field__helper--error")).toBe(false);
  });

  test("supportingTextElement is the element on screen, not a snapshot", () => {
    const field = mount();
    expect(field.supportingTextElement).toBeNull();
    field.setSupportingText("First");
    expect(field.supportingTextElement).toBe(helper(field));
    field.setSupportingText("Second");
    expect(field.supportingTextElement?.textContent).toBe("Second");
    field.removeSupportingText();
    expect(field.supportingTextElement).toBeNull();
  });

  test("replacing or removing the supporting text leaves the error state alone", () => {
    const field = mount({ supportingText: "Helper" });
    field.setError(true);
    field.setSupportingText("Other");
    expect([hasError(field), field.isError(), field.input.getAttribute("aria-invalid")]).toEqual([true, true, "true"]);
    field.removeSupportingText();
    expect([hasError(field), field.isError(), field.input.getAttribute("aria-invalid")]).toEqual([true, true, "true"]);
    field.setError(false);
    expect([hasError(field), field.isError(), field.input.hasAttribute("aria-invalid")]).toEqual([false, false, false]);
  });

  test("error text passed to setSupportingText colours the helper, not the field", () => {
    const field = mount();
    field.setSupportingText("Check this", true);
    expect(helper(field)?.classList.contains("mtrl-text-field__helper--error")).toBe(true);
    expect(hasError(field)).toBe(false);
  });

  test("a configured error shows on the field and its helper", () => {
    const field = mount({ error: true, supportingText: "Required" });
    expect(hasError(field)).toBe(true);
    expect(helper(field)?.classList.contains("mtrl-text-field__helper--error")).toBe(true);
  });
});

describe("text field density reaches the input (FLO-303)", () => {
  test("data-density is set on the input as well as the root", () => {
    const field = mount({ density: "compact" });
    expect(field.element.getAttribute("data-density")).toBe("compact");
    expect(field.input.getAttribute("data-density")).toBe("compact");
  });
});
