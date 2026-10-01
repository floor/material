// src/elements/lifecycle.ts
// Internal only: detached server hosts reuse the browser's complete lifecycle.
export const MOUNT = Symbol();
export const DISPOSE = Symbol();

type LifecycleHost = HTMLElement & {
  [MOUNT]?: () => void;
  [DISPOSE]?: () => void;
};

export const mountElement = (host: HTMLElement): void => {
  const element = host as LifecycleHost;
  if (typeof element[MOUNT] !== "function") throw new TypeError("Not a renderable mtrl element");
  element[MOUNT]();
};

export const disposeElement = (host: HTMLElement): void => {
  const element = host as LifecycleHost;
  if (typeof element[DISPOSE] !== "function") throw new TypeError("Not a renderable mtrl element");
  element[DISPOSE]();
};
