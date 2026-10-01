// src/ssr/resources.ts
/** Inert library scheduling: no native task is queued and no callback is retained. */
export const createServerResources = () => {
  let next = 0;
  let disposed = false;
  const tasks = new Set<number>();
  const observers = new Set<number>();
  type Listener = {
    target: EventTarget;
    type: string;
    callback: EventListenerOrEventListenerObject;
    capture: boolean;
  };
  const listeners: Listener[] = [];
  let remove: EventTarget["removeEventListener"];
  const allocate = (set: Set<number>): number => {
    const id = ++next;
    if (!disposed) set.add(id);
    return id;
  };
  const schedule = (): number => allocate(tasks);
  const cancel = (id: number): void => {
    tasks.delete(id);
  };
  class Observer {
    #id: number | undefined;
    observe(): void {
      this.#id ??= allocate(observers);
    }
    unobserve(): void {
      this.disconnect();
    }
    disconnect(): void {
      if (this.#id !== undefined) observers.delete(this.#id);
      this.#id = undefined;
    }
    takeRecords(): never[] {
      return [];
    }
  }
  return {
    globals: {
      setTimeout: schedule,
      clearTimeout: cancel,
      setInterval: schedule,
      clearInterval: cancel,
      requestAnimationFrame: schedule,
      cancelAnimationFrame: cancel,
      queueMicrotask: schedule,
      MutationObserver: Observer,
      ResizeObserver: Observer,
      IntersectionObserver: Observer,
    },
    /** Patch only the server realm's EventTarget, retaining synchronous dispatch. */
    listenerMethods(prototype: EventTarget) {
      const add = prototype.addEventListener;
      remove = prototype.removeEventListener;
      const captureOf = (options?: boolean | EventListenerOptions): boolean =>
        typeof options === "boolean" ? options : !!options?.capture;
      return {
        addEventListener(this: EventTarget, type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
          if (!callback || disposed) return;
          const capture = captureOf(options);
          if (!listeners.some((entry) => entry.target === this && entry.type === type && entry.callback === callback && entry.capture === capture)) {
            listeners.push({ target: this, type, callback, capture });
          }
          add.call(this, type, callback, options);
        },
        removeEventListener(this: EventTarget, type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
          if (!callback) return;
          const capture = captureOf(options);
          const index = listeners.findIndex((entry) => entry.target === this && entry.type === type && entry.callback === callback && entry.capture === capture);
          if (index !== -1) listeners.splice(index, 1);
          remove.call(this, type, callback, options);
        },
      };
    },
    snapshot() {
      return { tasks: tasks.size, observers: observers.size, listeners: listeners.length };
    },
    dispose(): void {
      disposed = true;
      tasks.clear();
      observers.clear();
      let failed = false;
      let failure: unknown;
      for (const { target, type, callback, capture } of listeners.splice(0)) {
        try {
          remove.call(target, type, callback, capture);
        } catch (error) {
          if (!failed) failure = error;
          failed = true;
        }
      }
      if (failed) throw failure;
    },
  };
};

export type ServerResources = ReturnType<typeof createServerResources>;
