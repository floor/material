// src/ssr/server-dom.ts
// Load the graph before any global installation (adapter.ts caches isBrowser).
import "../elements";
import * as dom from "linkedom";
import { disposeElement, mountElement } from "../elements/lifecycle";
import { createServerResources, type ServerResources } from "./resources";

/** Every changed descriptor is captured before the first write, including prototypes. */
class Descriptors {
  #changes: Array<{
    target: object;
    key: string;
    before?: PropertyDescriptor;
    after: PropertyDescriptor;
  }> = [];
  #installed = 0;
  define(target: object, key: string, after: PropertyDescriptor): void {
    const before = Object.getOwnPropertyDescriptor(target, key);
    if (before && !before.configurable) throw new TypeError(`SSR cannot replace ${key}`);
    if (!before && !Object.isExtensible(target)) throw new TypeError(`SSR cannot install ${key}`);
    this.#changes.push({ target, key, before, after: { configurable: true, ...after } });
  }
  value(target: object, key: string, value: unknown): void {
    this.define(target, key, { writable: true, value });
  }
  install(): void {
    for (const { target, key, after } of this.#changes) {
      Object.defineProperty(target, key, after);
      this.#installed++;
    }
  }
  restore(): void {
    let failed = false;
    let failure: unknown;
    for (const { target, key, before } of this.#changes.slice(0, this.#installed).reverse()) {
      try {
        if (before) Object.defineProperty(target, key, before);
        else if (!Reflect.deleteProperty(target, key)) throw new TypeError(`SSR cannot restore ${key}`);
      } catch (error) {
        if (!failed) failure = error;
        failed = true;
      }
    }
    if (failed) throw failure;
  }
}

// Explicit allowlist: never copy linkedom's exports or its global-forwarding window.
const constructors = [
  "Node", "Element", "HTMLElement", "Document", "DocumentFragment", "ShadowRoot", "Text", "Comment",
  "SVGElement", "EventTarget", "Event", "CustomEvent", "HTMLInputElement", "HTMLTextAreaElement",
  "HTMLButtonElement", "HTMLSelectElement", "HTMLLabelElement", "HTMLSlotElement", "HTMLTemplateElement",
  "HTMLStyleElement", "HTMLCanvasElement",
] as const;
const eventNames = [
  "MouseEvent", "PointerEvent", "KeyboardEvent", "FocusEvent", "TouchEvent", "WheelEvent",
  "AnimationEvent", "TransitionEvent",
];

/** Closed popovers never match. Preserve lists, negation, quoted strings and escapes. */
const closedSelector = (selector: string): string => {
  let result = "";
  let quote = "";
  let brackets = 0;
  for (let i = 0; i < selector.length; i++) {
    const char = selector[i];
    if (char === "\\") {
      result += char + (selector[++i] ?? "");
      continue;
    }
    if (quote) {
      if (char === quote) quote = "";
    }
    else if (char === '"' || char === "'") quote = char;
    else if (char === "[") brackets++;
    else if (char === "]") brackets--;
    else if (!brackets && /^:popover-open\b/i.test(selector.slice(i))) {
      result += ":not(*)";
      i += ":popover-open".length - 1;
      continue;
    }
    result += char;
  }
  return result;
};

const fidelity = (patches: Descriptors, document: Document): void => {
  const html = dom.HTMLElement.prototype;
  const reflect = (prototype: object, property: string, attribute: string, boolean = false): void => {
    patches.define(prototype, property, {
      get(this: Element) {
        return boolean ? this.hasAttribute(attribute) : this.getAttribute(attribute) ?? "";
      },
      set(this: Element, value: unknown) {
        if (boolean) this.toggleAttribute(attribute, !!value);
        else this.setAttribute(attribute, String(value));
      },
    });
  };
  reflect(html, "inert", "inert", true);
  reflect(html, "popover", "popover");
  // linkedom uses HTMLElement rather than HTMLLabelElement for parsed labels.
  reflect(html, "htmlFor", "for");
  patches.define(html, "draggable", {
    get(this: Element) { return this.getAttribute("draggable") === "true"; },
    set(this: Element, value: unknown) { this.setAttribute("draggable", String(!!value)); },
  });
  for (const constructor of [dom.HTMLInputElement, dom.HTMLTextAreaElement]) {
    reflect(constructor.prototype, "autocomplete", "autocomplete");
    const values = new WeakMap<object, string>();
    patches.define(constructor.prototype, "value", {
      get(this: Element) {
        return values.get(this) ?? (this.localName === "textarea" ? this.textContent ?? "" : this.getAttribute("value") ?? "");
      },
      set(this: Element, value: unknown) {
        values.set(this, String(value));
      },
    });
    patches.define(constructor.prototype, "defaultValue", {
      get(this: Element) {
        return this.localName === "textarea" ? this.textContent ?? "" : this.getAttribute("value") ?? "";
      },
      set(this: Element, value: unknown) {
        if (this.localName === "textarea") this.textContent = String(value);
        else this.setAttribute("value", String(value));
      },
    });
  }
  const checked = new WeakMap<object, boolean>();
  reflect(dom.HTMLInputElement.prototype, "defaultChecked", "checked", true);
  patches.define(dom.HTMLInputElement.prototype, "checked", {
    get(this: Element) { return checked.get(this) ?? this.hasAttribute("checked"); },
    set(this: Element, value: unknown) { checked.set(this, !!value); },
  });
  // Feature detection succeeds, but server controls never dispatch focus/click/animation work.
  for (const name of [
    "showPopover", "hidePopover", "togglePopover", "showModal", "show", "close",
    "focus", "blur", "click", "scrollIntoView", "scrollTo",
  ]) {
    patches.value(html, name, () => {});
  }
  reflect(html, "open", "open", true);
  for (const name of [
    "offsetWidth", "offsetHeight", "offsetLeft", "offsetTop", "clientWidth", "clientHeight", "scrollWidth", "scrollHeight",
  ]) {
    patches.define(html, name, { get: () => 0 });
  }
  patches.value(dom.Element.prototype, "getBoundingClientRect", () => ({
    x: 0, y: 0, top: 0, right: 0, bottom: 0, left: 0, width: 0, height: 0,
    toJSON() { return {}; },
  }));
  patches.value(dom.Element.prototype, "getClientRects", () => []);
  patches.value(dom.HTMLCanvasElement.prototype, "getContext", () => null);
  for (const prototype of [
    dom.Element.prototype, Object.getPrototypeOf(document), dom.DocumentFragment.prototype, dom.ShadowRoot.prototype,
  ]) {
    for (const name of ["matches", "closest", "querySelector", "querySelectorAll"] as const) {
      const method = Reflect.get(prototype, name);
      if (typeof method === "function") {
        patches.value(prototype, name, function (this: Element, selector: string) {
          return method.call(this, closedSelector(selector));
        });
      }
    }
  }
};

/** Strip empty declarations through CSS APIs; quoted semicolons/data URLs remain intact. */
export const removeEmptyStyles = (element: HTMLElement): void => {
  const style = element.style;
  for (const name of Array.from({ length: style.length }, (_, index) => style[index])) {
    if (!style.getPropertyValue(name).trim()) style.removeProperty(name);
  }
  if (!style.cssText) element.removeAttribute("style");
};

export interface ServerScope {
  readonly document: Document;
  readonly window: Window;
  readonly resources: ServerResources;
  /** Own before mounting, so a failed factory/setup is cleaned up too. */
  mount(host: HTMLElement): void;
}

let active = false;
/**
 * Synchronous internal scope, never a scope around asynchronous consumer work.
 * No import-time DOM installation; each call has a fresh document and registry.
 * Library teardown and leftover resources are disposed before restoring the realm.
 * This is not an input validator: the renderer must reject asynchronous factory
 * branches before mounting (open/menu-presentation FAB menus and nested menus).
 * Native Promise reactions, dynamic imports and captured timers cannot be intercepted.
 */
export const withServerScope = <T>(run: (scope: ServerScope) => T extends PromiseLike<unknown> ? never : T): T => {
  if (active) throw new TypeError("SSR scopes cannot be reentered");
  active = true;
  const patches = new Descriptors();
  const resources = createServerResources();
  const hosts: HTMLElement[] = [];
  let result!: T;
  let failed = false;
  let failure: unknown;
  const attempt = (fn: () => void): void => {
    try {
      fn();
    } catch (error) {
      if (!failed) failure = error;
      failed = true;
    }
  };
  try {
    const native = dom.parseHTML("<!doctype html><html><head></head><body></body></html>");
    const document = native.document as unknown as Document;
    const target = new dom.EventTarget() as unknown as EventTarget;
    const window = Object.create(null) as Window;
    const globals: Record<string, unknown> = {
      window,
      self: window,
      document,
      customElements: native.customElements,
      ...resources.globals,
      CSSStyleSheet: undefined,
      innerWidth: 1024,
      innerHeight: 768,
      getComputedStyle: () => new Proxy(
        { getPropertyValue: () => "" },
        { get: (object, key) => Reflect.get(object, key) ?? "" },
      ),
      matchMedia: (media: string) => ({
        media, matches: false, onchange: null,
        addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {},
        dispatchEvent: () => true,
      }),
    };
    for (const name of constructors) globals[name] = dom[name];
    class ServerEvent extends dom.Event {
      constructor(type: string, init: EventInit = {}) {
        super(type, init);
        Object.assign(this, init);
      }
    }
    for (const name of eventNames) globals[name] = ServerEvent;
    // linkedom creates unknown dialog tags as HTMLElement; feature checks use instanceof.
    globals.HTMLDialogElement = class extends dom.HTMLElement {
      static [Symbol.hasInstance](node: Element) { return node?.localName === "dialog"; }
    };
    Object.assign(window, globals);
    for (const name of ["addEventListener", "removeEventListener", "dispatchEvent"] as const) {
      Object.defineProperty(window, name, { value: (...args: unknown[]) => Reflect.apply(target[name], target, args) });
    }
    patches.value(document, "defaultView", window);
    for (const [key, value] of Object.entries(globals)) patches.value(globalThis, key, value);
    fidelity(patches, document);
    for (const [key, value] of Object.entries(resources.listenerMethods(dom.EventTarget.prototype as unknown as EventTarget))) {
      patches.value(dom.EventTarget.prototype, key, value);
    }
    patches.install();
    result = run({
      document, window, resources,
      mount(host) {
        if (!hosts.includes(host)) hosts.push(host);
        mountElement(host);
      },
    });
    if (result && typeof Reflect.get(Object(result), "then") === "function") {
      throw new TypeError("SSR scope callback must be synchronous");
    }
  } catch (error) {
    failed = true;
    failure = error;
  } finally {
    for (const host of hosts.reverse()) attempt(() => disposeElement(host));
    hosts.length = 0;
    attempt(() => resources.dispose());
    attempt(() => patches.restore());
    active = false;
  }
  if (failed) throw failure;
  return result;
};
