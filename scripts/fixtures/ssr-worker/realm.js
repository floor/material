// This dependency evaluates before the renderer and bridge imports. Capture
// actual workerd descriptors; do not simulate WorkerGlobalScope in Node.
export const keys = [
  "self", "window", "document", "customElements", "Event", "CustomEvent", "EventTarget",
  "Node", "Element", "HTMLElement", "Document", "DOMParser", "MutationObserver",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval", "queueMicrotask",
  "requestAnimationFrame", "cancelAnimationFrame", "ResizeObserver", "IntersectionObserver",
  "fetch", "Request", "Response", "Buffer", "process", "performance",
  "DocumentFragment", "ShadowRoot", "Text", "Comment", "SVGElement",
  "HTMLInputElement", "HTMLTextAreaElement", "HTMLButtonElement", "HTMLSelectElement", "HTMLLabelElement",
  "HTMLSlotElement", "HTMLTemplateElement", "HTMLStyleElement", "HTMLCanvasElement",
  "MouseEvent", "PointerEvent", "KeyboardEvent", "FocusEvent", "TouchEvent", "WheelEvent", "AnimationEvent", "TransitionEvent",
  "CSSStyleSheet", "innerWidth", "innerHeight", "getComputedStyle", "matchMedia",
  "addEventListener", "removeEventListener", "dispatchEvent",
];
export function assert(value, message) {
  if (!value) throw new Error(message);
}
export function capture() {
  const chain = [];
  for (let target = globalThis; target; target = Object.getPrototypeOf(target)) {
    chain.push({ target, descriptors: keys.map(key => Object.getOwnPropertyDescriptor(target, key)) });
  }
  return { chain, values: keys.map(key => Reflect.get(globalThis, key)) };
}
export function unchanged(before, phase) {
  const after = capture();
  assert(after.chain.length === before.chain.length, `${phase}: prototype depth`);
  for (let i = 0; i < before.chain.length; i++) {
    assert(before.chain[i].target === after.chain[i].target, `${phase}: prototype identity`);
    for (let j = 0; j < keys.length; j++) {
      const a = before.chain[i].descriptors[j], b = after.chain[i].descriptors[j];
      assert(!!a === !!b, `${phase}: ${keys[j]} own/prototype presence`);
      if (a) for (const field of ["value", "get", "set", "writable", "enumerable", "configurable"]) {
        assert(Object.is(a[field], b[field]), `${phase}: ${keys[j]}.${field}`);
      }
    }
  }
  before.values.forEach((value, i) => assert(Object.is(value, after.values[i]), `${phase}: ${keys[i]} identity`));
}
export const cold = capture();
export const nativeLayout = keys.map((name, i) => ({ name, type: typeof cold.values[i], descriptorLevels: cold.chain.flatMap((entry, level) => entry.descriptors[i] ? [level] : []) }));
assert(typeof window === "undefined" && typeof document === "undefined", "cold worker must have no DOM");
assert(Reflect.get(globalThis, "process") === undefined && Reflect.get(globalThis, "Buffer") === undefined,
  `worker globals must omit process/Buffer: ${typeof Reflect.get(globalThis, "process")}/${typeof Reflect.get(globalThis, "Buffer")}`);
assert(globalThis.self === globalThis, "native worker self");
