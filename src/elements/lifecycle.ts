// src/elements/lifecycle.ts
// Internal only: detached server hosts reuse the browser's complete lifecycle.
const lifecycles = new WeakMap<HTMLElement, { mount(): void; dispose(): void }>();

export const registerLifecycle = (host: HTMLElement, mount: () => void, dispose: () => void): void => {
  lifecycles.set(host, { mount, dispose });
};

export const mountElement = (host: HTMLElement): void => {
  const lifecycle = lifecycles.get(host);
  if (!lifecycle) throw new TypeError("Not a renderable mtrl element");
  lifecycle.mount();
};

export const disposeElement = (host: HTMLElement): void => {
  lifecycles.get(host)?.dispose();
};
