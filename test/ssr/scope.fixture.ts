// test/ssr/scope.fixture.ts
import { expect, test } from "bun:test";
import * as dom from "linkedom";
import { JSDOM } from "jsdom";
import { elements } from "../../src/elements";
import { createElementClass, hostStyleText, type ElementSpec, type ElementComponent } from "../../src/elements/define";
import { disposeElement, mountElement } from "../../src/elements/lifecycle";
import { isFallbackStyle, registerStyles, styleText } from "../../src/elements/styles";
import { withServerScope, removeEmptyStyles, type ServerScope } from "../../src/ssr/server-dom";
import type { ServerResources } from "../../src/ssr/resources";
import { setHTML } from "../../src/core/dom/html";
import { cases } from "../../scripts/fixtures/preupgrade-cases";
import createTextfield from "../../src/components/textfield";

const nativeTimeout = setTimeout;
const nativeMicrotask = queueMicrotask;
const baseline = Object.getOwnPropertyDescriptors(globalThis);
const prototypes = [dom.HTMLElement.prototype, dom.Element.prototype, dom.EventTarget.prototype, dom.HTMLInputElement.prototype,
  dom.HTMLTextAreaElement.prototype, dom.HTMLLabelElement.prototype, dom.HTMLCanvasElement.prototype, dom.DocumentFragment.prototype,
  dom.ShadowRoot.prototype];
const beforePrototypes = prototypes.map((prototype) => Object.getOwnPropertyDescriptors(prototype));
const restored = () => {
  for (const key of new Set([...Object.keys(baseline), ...Object.getOwnPropertyNames(globalThis)])) {
    expect(Object.getOwnPropertyDescriptor(globalThis, key), key).toEqual(baseline[key]);
  }
  prototypes.forEach((prototype, index) => expect(Object.getOwnPropertyDescriptors(prototype)).toEqual(beforePrototypes[index]));
};
const empty = (resources: ServerResources) => expect(resources.snapshot()).toEqual({ tasks: 0, observers: 0, listeners: 0 });
const spec: ElementSpec<ElementComponent> = {
  name: "probe", styles: [],
  create: () => ({ element: document.createElement("div"), destroy() {} }),
};
const hostFor = (scope: ServerScope, definition = spec): HTMLElement => {
  const tag = `test-${definition.name}`;
  customElements.define(tag, createElementClass(definition));
  return scope.document.createElement(tag);
};

test("importing the server seam does not install a DOM", () => {
  expect(typeof document).toBe("undefined");
  expect(typeof window).toBe("undefined");
});

test("fresh detached registries, exact descriptors, consistent window facade and reentry rejection", () => {
  let first: Document;
  for (let i = 0; i < 2; i++) {
    withServerScope((scope) => {
      expect(document).not.toBe(first);
      first = document;
      expect(window).toBe(self);
      expect(document.defaultView).toBe(window);
      for (const key of ["setTimeout", "setInterval", "queueMicrotask", "requestAnimationFrame", "MutationObserver", "HTMLElement", "customElements", "CSSStyleSheet"]) {
        expect(Reflect.get(window, key)).toBe(Reflect.get(globalThis, key));
      }
      expect(Reflect.get(window, "process")).toBeUndefined();
      expect(() => withServerScope(() => {})).toThrow("reentered");
      const host = hostFor(scope);
      expect(host.isConnected).toBe(false);
      scope.mount(host);
      expect(host.isConnected).toBe(false);
      expect(document.body.childNodes.length).toBe(0);
    });
    restored();
  }
});

test("attribute mapping, slot, setup parts, event bridge and exact fallback styles", () => {
  registerStyles({ ripple: "/* ripple */", probe: "/* first */" });
  registerStyles({ probe: "/* override */" });
  expect(styleText("probe")).toBe("/* override */");
  expect(styleText("absent")).toBeUndefined();
  expect(hostStyleText({ hostStyles: "x{}" })).toEndWith("x{}");
  let disposed = 0;
  let off = 0;
  withServerScope((scope) => {
    const host = hostFor(scope, {
      ...spec, styles: ["probe"],
      attributes: { count: { type: "number", config: "count" }, disabled: { type: "boolean", config: "disabled" } },
      slot: { attribute: "label", config: "text" },
      config: () => ({ extra: 7 }),
      events: { change: {} },
      create(config) {
        expect(config.count).toBe(3);
        expect(config.disabled).toBe(true);
        expect(config.extra).toBe(7);
        const element = document.createElement("div");
        element.append(config.text as Node);
        return { element, destroy() { disposed++; }, on(_name: string, fn: (payload: unknown) => void) { fn(4); }, off() { off++; } };
      },
      setup(_host, component) {
        const part = document.createElement("span");
        part.className = "mtrl-probe__late";
        component.element.append(part, document.createElement("style"));
      },
    });
    host.setAttribute("count", "3"); host.setAttribute("disabled", ""); host.setAttribute("label", "Fallback");
    let detail: unknown;
    host.addEventListener("change", (event) => { detail = (event as CustomEvent).detail; });
    scope.mount(host);
    expect(detail).toBe(4);
    expect(host.shadowRoot!.querySelector("slot")!.textContent).toBe("Fallback");
    expect(host.shadowRoot!.querySelector("span")!.getAttribute("part")).toBe("late");
    const styles = Array.from(host.shadowRoot!.querySelectorAll("style"));
    expect(styles.map(isFallbackStyle)).toEqual([true, true, false]);
    expect(styles.slice(0, 2).map((style) => style.textContent)).toEqual(["/* ripple */", "/* override */"]);
    disposeElement(host); disposeElement(host);
  });
  expect(disposed).toBe(1); expect(off).toBe(1); restored();
});

test("cleanup attempts every step after setup, unsubscription, cleanup or destroy failures", () => {
  for (const stage of ["create", "setup", "off", "cleanup", "destroy"]) {
    const calls: string[] = [];
    let resources: ServerResources;
    let element: HTMLElement;
    expect(() => withServerScope((scope) => {
      resources = scope.resources;
      scope.mount(hostFor(scope, {
        ...spec, events: { first: {}, second: {} },
        create() {
          document.addEventListener("leak", () => {});
          setTimeout(() => { throw new Error("late"); }, 0);
          new MutationObserver(() => {}).observe(document, { childList: true });
          if (stage === "create") throw new Error(stage);
          element = document.createElement("div");
          return {
            element,
            on() {},
            off(name: string) { calls.push(name); if (stage === "off") throw new Error(stage); },
            destroy() { calls.push("destroy"); setTimeout(() => {}, 0); if (stage === "destroy") throw new Error(stage); },
          };
        },
        setup() {
          if (stage === "setup") throw new Error(stage);
          return () => { calls.push("cleanup"); if (stage === "cleanup") throw new Error(stage); };
        },
      }));
    })).toThrow(stage);
    if (stage !== "create") {
      expect(calls).toContain("first"); expect(calls).toContain("second"); expect(calls).toContain("destroy");
      expect(element!.parentNode).toBeNull();
    }
    empty(resources!); restored();
  }
});

test("reverse construction order and callback errors still dispose everything", () => {
  const order: number[] = [];
  expect(() => withServerScope((scope) => {
    for (let i = 0; i < 3; i++) scope.mount(hostFor(scope, {
      ...spec, name: `probe-${i}`,
      create: () => ({ element: document.createElement("div"), destroy() { order.push(i); } }),
    }));
    throw new Error("policy/serialization failed");
  })).toThrow("policy/serialization failed");
  expect(order).toEqual([2, 1, 0]); restored();
});

test("scheduler cancellation, observer disposal and leftover listener removal", () => {
  let savedDocument: Document;
  let savedWindow: Window;
  let resources: ServerResources;
  let callbacks = 0;
  withServerScope((scope) => {
    savedDocument = document; savedWindow = window; resources = scope.resources;
    const timeout = setTimeout(() => { callbacks++; }, 0);
    const interval = setInterval(() => { callbacks++; }, 0);
    const frame = requestAnimationFrame(() => { callbacks++; });
    expect(resources.snapshot().tasks).toBe(3);
    clearTimeout(timeout); clearInterval(interval); cancelAnimationFrame(frame);
    expect(resources.snapshot().tasks).toBe(0);
    const observer = new MutationObserver(() => { callbacks++; });
    observer.observe(document, { childList: true });
    expect(resources.snapshot().observers).toBe(1);
    expect(observer.takeRecords()).toEqual([]);
    observer.disconnect(); expect(resources.snapshot().observers).toBe(0);
    const callback = () => { callbacks++; };
    document.addEventListener("probe", callback); document.addEventListener("probe", callback);
    window.addEventListener("probe", callback);
    expect(resources.snapshot().listeners).toBe(2);
  });
  savedDocument!.dispatchEvent(new dom.Event("probe") as unknown as Event);
  savedWindow!.dispatchEvent(new dom.Event("probe") as unknown as Event);
  expect(callbacks).toBe(0); empty(resources!); restored();
});

test("observer cleanup failures do not prevent component cleanup or realm restoration", () => {
  let destroyed = false;
  let resources: ServerResources;
  expect(() => withServerScope((scope) => {
    resources = scope.resources;
    scope.mount(hostFor(scope, {
      ...spec, observeChildren: true,
      create: () => ({ element: document.createElement("div"), destroy() { destroyed = true; } }),
    }));
    MutationObserver.prototype.disconnect = () => { throw new Error("disconnect failed"); };
  })).toThrow("disconnect failed");
  expect(destroyed).toBe(true); empty(resources!); restored();
});

test("nested detached hosts run the real toolbar setup and child lifecycle", () => {
  withServerScope((scope) => {
    const toolbar = hostFor(scope, elements.toolbar.spec);
    const button = hostFor(scope, elements.button.spec);
    toolbar.setAttribute("aria-label", "Editing");
    button.setAttribute("label", "Save");
    toolbar.append(button);
    scope.mount(toolbar); scope.mount(button);
    expect(toolbar.shadowRoot!.querySelector('[aria-label="Editing"]')).not.toBeNull();
    expect(button.shadowRoot!.querySelector("slot")!.textContent).toBe("Save");
    expect(toolbar.isConnected).toBe(false); expect(button.isConnected).toBe(false);
  }); restored();
});

test("preflight and partial global/prototype installation failures restore every descriptor", () => {
  const define = Object.defineProperty;
  for (const failAt of ["setInterval", "getBoundingClientRect"]) {
    Object.defineProperty = ((target: object, key: PropertyKey, descriptor: PropertyDescriptor) => {
      if (key === failAt) throw new Error(`install ${failAt}`);
      return define(target, key, descriptor);
    }) as typeof Object.defineProperty;
    try { expect(() => withServerScope(() => {})).toThrow(`install ${failAt}`); }
    finally { Object.defineProperty = define; }
    restored();
  }
  const descriptor = Object.getOwnPropertyDescriptor;
  Object.getOwnPropertyDescriptor = ((target: object, key: PropertyKey) =>
    target === globalThis && key === "window" ? { configurable: false, value: 1 } : descriptor(target, key)) as typeof Object.getOwnPropertyDescriptor;
  try { expect(() => withServerScope(() => {})).toThrow("cannot replace window"); }
  finally { Object.getOwnPropertyDescriptor = descriptor; }
  restored();
});

test("reflections, live control state, selector lists, inert canvas and CSS property cleanup", () => {
  withServerScope(() => {
    const label = document.createElement("label"); label.htmlFor = "input";
    expect(label.getAttribute("for")).toBe("input");
    label.inert = true; expect(label.hasAttribute("inert")).toBe(true);
    label.draggable = false; expect(label.getAttribute("draggable")).toBe("false");
    const input = document.createElement("input");
    input.setAttribute("value", "default"); input.setAttribute("checked", "");
    expect(input.value).toBe("default"); expect(input.checked).toBe(true);
    input.value = "live"; input.checked = false; input.autocomplete = "off";
    expect(input.defaultValue).toBe("default"); expect(input.defaultChecked).toBe(true);
    expect(input.value).toBe("live"); expect(input.checked).toBe(false);
    expect(input.getAttribute("autocomplete")).toBe("off");
    const textarea = document.createElement("textarea"); textarea.textContent = "default"; textarea.value = "live";
    expect(textarea.value).toBe("live"); expect(textarea.defaultValue).toBe("default");
    const container = document.createElement("div");
    setHTML(container, '<span class="keep" data-value=":popover-open"></span><div popover></div>');
    expect(container.querySelectorAll(":popover-open, .keep").length).toBe(1);
    expect(container.querySelectorAll(":not(:popover-open)").length).toBe(2);
    expect(container.querySelector('[data-value=":popover-open"]')).not.toBeNull();
    expect(container.querySelector("div")!.matches(":popover-open")).toBe(false);
    const root = container.attachShadow({ mode: "open" });
    root.append(document.createElement("span"));
    expect(root.querySelectorAll(":popover-open, span").length).toBe(1);
    const dialog = document.createElement("dialog"); expect(dialog instanceof HTMLDialogElement).toBe(true);
    expect(typeof dialog.showModal).toBe("function");
    expect(typeof HTMLDialogElement.prototype.showModal).toBe("function");
    expect(document.createElement("canvas").getContext("2d")).toBeNull();
    expect(getComputedStyle(label).getPropertyValue("color")).toBe("");
    expect(label.getBoundingClientRect().width).toBe(0);
    expect(window.innerWidth).toBe(1024); expect(matchMedia("(min-width: 1px)").matches).toBe(false);
    label.style.setProperty("--quoted", '"a;b"'); label.style.setProperty("background-image", 'url("data:image/svg+xml;a;b")');
    label.style.setProperty("width", ""); removeEmptyStyles(label);
    expect(label.style.getPropertyValue("--quoted")).toBe('"a;b"');
    expect(label.style.getPropertyValue("background-image")).toBe('url("data:image/svg+xml;a;b")');
  }); restored();
});

test("all 37 defaults repeatedly mount detached and leave no late work, listeners or observers", async () => {
  const failures: unknown[] = [];
  let callbacks = 0;
  const onError = (...args: unknown[]) => { failures.push(args); };
  const error = console.error;
  console.error = onError;
  process.on("uncaughtException", onError); process.on("unhandledRejection", onError);
  try {
    expect(Object.keys(elements)).toHaveLength(37);
    for (let iteration = 0; iteration < 2; iteration++) {
      for (const { spec: definition } of Object.values(elements)) {
        let resources: ServerResources;
        withServerScope((scope) => {
          resources = scope.resources;
          const tag = `m-${definition.name}`;
          customElements.define(tag, createElementClass(definition as ElementSpec<ElementComponent>));
          const holder = document.createElement("div");
          const fixture = cases.find(({ element, variant }) => element === definition.name && variant === "default")!;
          setHTML(holder, fixture.html);
          const host = holder.firstElementChild as HTMLElement;
          scope.mount(host);
          expect(host.isConnected, tag).toBe(false);
          expect(document.body.childNodes.length, tag).toBe(0);
          expect(host.shadowRoot!.children.length, tag).toBeGreaterThan(0);
          const sentinel = () => { callbacks++; };
          for (const surface of [globalThis, window, document.defaultView!]) {
            surface.setTimeout(sentinel, 0); surface.setInterval(sentinel, 0);
            surface.requestAnimationFrame(sentinel); surface.queueMicrotask(sentinel);
          }
          for (const Observer of [MutationObserver, ResizeObserver, IntersectionObserver]) {
            new Observer(sentinel).observe(host);
          }
          document.addEventListener("sentinel", sentinel); window.addEventListener("sentinel", sentinel);
          document.dispatchEvent(new Event("sentinel")); window.dispatchEvent(new Event("sentinel"));
          callbacks -= 2; // Registration and dispatch remain real and synchronous.
        });
        empty(resources!);
      }
    }
    await new Promise<void>((resolve) => nativeMicrotask(resolve));
    await new Promise((resolve) => nativeTimeout(resolve, 1000));
    expect(callbacks).toBe(0); expect(failures).toEqual([]);
  } finally {
    console.error = error; process.off("uncaughtException", onError); process.off("unhandledRejection", onError);
  }
  restored();
});

test("textfield and select disposal reset the shared batch for a subsequent normal DOM lifecycle", async () => {
  for (const definition of [elements.textfield, elements.select, elements.textfield, elements.select]) {
    withServerScope((scope) => scope.mount(hostFor(scope, definition.spec as ElementSpec<ElementComponent>)));
  }
  const view = new JSDOM("<!doctype html><html><body></body></html>").window;
  const keys = ["window", "document", "HTMLElement", "Element", "Node", "MutationObserver", "getComputedStyle"];
  const previous = keys.map((key) => Object.getOwnPropertyDescriptor(globalThis, key));
  let field: ReturnType<typeof createTextfield>;
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: Reflect.get(view, key) });
    field = createTextfield({ label: "Label", variant: "outlined", value: "Value" });
    document.body.append(field.element);
    const label = field.element.querySelector(".mtrl-textfield__label")!;
    Object.defineProperty(label, "offsetWidth", { value: 100 });
    await new Promise((resolve) => nativeTimeout(resolve, 30));
    expect((field.element.querySelector(".mtrl-textfield__outline-notch") as HTMLElement).style.width).toBe("83px");
  } finally {
    field!?.destroy(); view.close();
    keys.forEach((key, index) => previous[index] ? Object.defineProperty(globalThis, key, previous[index]!) : Reflect.deleteProperty(globalThis, key));
  }
  restored();
});
