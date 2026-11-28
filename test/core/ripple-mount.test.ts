// test/core/ripple-mount.test.ts
//
// What mounting a ripple costs (core/compose/features/ripple). An element
// whose stylesheet positions it is mounted with no computed-style read: under
// a connected parent that read forces a style recalculation for each element.
// An element nobody vouches for keeps the check that makes a static one
// relative.
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
const g = globalThis as Record<string, unknown>;
const keys = ["window", "document", "HTMLElement", "Element", "Node", "Event", "CustomEvent", "MutationObserver", "navigator", "getComputedStyle"];
const previous = new Map(keys.map((key) => [key, g[key]]));

// Every style read goes through the window: the ripple asks its element's own
// view, the components ask the global.
let styleReads = 0;
const realGetComputedStyle = dom.window.getComputedStyle.bind(dom.window);
dom.window.getComputedStyle = ((element: Element, pseudo?: string | null) => {
  styleReads++;
  // jsdom computes no `position`; a browser reports `static` for an element
  // no rule positions.
  const style = realGetComputedStyle(element, pseudo);
  return new Proxy(style, {
    get: (target, key) => (key === "position" ? target.position || "static" : Reflect.get(target, key)),
  });
}) as typeof dom.window.getComputedStyle;
for (const key of keys) g[key] = (dom.window as unknown as Record<string, unknown>)[key];

const { createRipple, withRipple } = await import("../../src/core/compose/features/ripple");
const { PREFIX } = await import("../../src/core/config");
const { createBase, withElement } = await import("../../src/core/compose/component");
const { createButton } = await import("../../src/components/button");
const { createIconButton } = await import("../../src/components/icon-button");
const { createFab } = await import("../../src/components/fab");
const { createExtendedFab } = await import("../../src/components/extended-fab");

const host = (): HTMLElement => {
  const element = dom.window.document.createElement("div");
  dom.window.document.body.append(element);
  return element;
};

beforeEach(() => {
  dom.window.document.body.replaceChildren();
  styleReads = 0;
});

afterAll(() => {
  for (const [key, value] of previous) g[key] = value;
  dom.window.close();
});

describe("mounting a ripple", () => {
  test("an element given as positioned is mounted with no style read and left as it is", () => {
    const element = host();
    const ripple = createRipple({ positioned: true });
    ripple.mount(element);

    expect(styleReads).toBe(0);
    expect(element.style.position).toBe("");
    expect(element.querySelector(`.${PREFIX}-ripple`)).not.toBeNull();
    ripple.unmount(element);
    expect(element.querySelector(`.${PREFIX}-ripple`)).toBeNull();
  });

  test("an element nobody vouches for is still checked, and a static one made relative", () => {
    const element = host();
    const ripple = createRipple();
    ripple.mount(element);

    expect(styleReads).toBe(1);
    expect(element.style.position).toBe("relative");
    ripple.unmount(element);
  });

  test("withRipple takes the component's own settings under the caller's", () => {
    const component = () =>
      withElement({ tag: "div" })(createBase({ componentName: "probe", prefix: PREFIX, parent: host() }));

    withRipple({ ripple: true }, { positioned: true })(component());
    expect(styleReads).toBe(0);

    // The caller's rippleConfig wins over what the component passed.
    const checked = withRipple({ ripple: true, rippleConfig: { positioned: false } }, { positioned: true })(component());
    expect(styleReads).toBe(1);
    expect(checked.element.style.position).toBe("relative");

    // And without either, the check runs as it always did.
    styleReads = 0;
    withRipple({ ripple: true })(component());
    expect(styleReads).toBe(1);
  });

  test("a press, a release and an unmount work on an element that was never checked", async () => {
    const element = host();
    const ripple = createRipple({ positioned: true, duration: 10 });
    ripple.mount(element);
    // Unmounted before any press: there is no wave to dispose of.
    ripple.unmount(element);
    ripple.mount(element);

    element.dispatchEvent(new dom.window.Event("pointerdown", { bubbles: true }));
    const wave = element.querySelector(`.${PREFIX}-ripple-wave`);
    expect(wave).not.toBeNull();
    dom.window.document.dispatchEvent(new dom.window.Event("pointerup"));
    expect(wave?.classList.contains("fade-out")).toBe(true);

    element.dispatchEvent(new dom.window.Event("pointerdown", { bubbles: true }));
    ripple.unmount(element);
    expect(element.querySelector(`.${PREFIX}-ripple-wave`)).toBeNull();
    expect(element.querySelector(`.${PREFIX}-ripple`)).toBeNull();
  });
});

describe("the components whose stylesheet positions their root", () => {
  const factories: Record<string, (parent: HTMLElement) => { element: HTMLElement; destroy(): void }> = {
    button: (parent) => createButton({ text: "Save", parent }),
    "icon button": (parent) => createIconButton({ icon: "<svg></svg>", ariaLabel: "Add", parent }),
    fab: (parent) => createFab({ icon: "<svg></svg>", ariaLabel: "Add", parent }),
    "extended fab": (parent) => createExtendedFab({ icon: "<svg></svg>", text: "Create", parent }),
  };

  for (const [name, create] of Object.entries(factories)) {
    test(`a ${name} created under a connected parent reads no computed style`, () => {
      const parent = host();
      const component = create(parent);

      expect(component.element.isConnected).toBe(true);
      expect(component.element.querySelector(`.${PREFIX}-ripple`)).not.toBeNull();
      expect(styleReads).toBe(0);
      expect(component.element.style.position).toBe("");
      component.destroy();
    });
  }
});
