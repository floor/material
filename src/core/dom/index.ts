// src/core/dom/index.ts

export { createElement, createSVGElement } from "./create";
export type { CreateElementOptions, ForwardedEventPayload } from "./create";

export {
  setAttributes,
  removeAttributes,
  batchAttributes,
  hasAttribute,
  getAttribute,
} from "./attributes";
export {
  addClass,
  removeClass,
  toggleClass,
  hasClass,
  normalizeClasses,
} from "./classes";

export { createEventManager } from "./events";
export type { EventManager } from "./events";

export { setHTML, configureHTML, getHTMLPolicy } from "./html";
export type { HTMLPolicy, HTMLInput, TrustedHTMLLike } from "./html";

export { activeElementOf, deepActiveElement } from "./focus";

export { createRoving, isTextEditable } from "./roving";
export type { Roving, RovingOptions } from "./roving";

export { effectiveZoom } from "./scale";

export {
  supportsTopLayer,
  showInTopLayer,
  hideFromTopLayer,
  onTopLayerClose,
  inertOutside,
} from "./layer";
export type { TopLayerKind, TopLayerOptions } from "./layer";
