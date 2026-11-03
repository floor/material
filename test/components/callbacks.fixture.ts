import { afterEach, beforeEach } from "bun:test";
import { JSDOM } from "jsdom";
import { innerMenu } from "../../src/components/menu/inner";

export const wait = (ms = 30): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Waits for the menu a select or split button loads on demand to exist, so a
 * test can start with the real surface. Until the chunk arrives, innerMenu is
 * the stand-in and its element holds no items.
 */
export const menuReady = async (component: object, timeout = 2000): Promise<void> => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const element = innerMenu(component)?.element;
    if (element?.querySelector('[role="menuitem"], [role="option"]')) return;
    await wait(5);
  }
  throw new Error("the menu chunk did not arrive");
};

/** Isolate the real components and their DOM from other suites. */
export const callbacksFixture = (): (<T extends { element: HTMLElement; destroy(): void }>(component: T) => T) => {
  let dom: JSDOM;
  let cleanup: (() => void)[];
  let restore: (() => void)[];
  beforeEach(() => {
    dom = new JSDOM("<!doctype html><body></body>", { url: "http://localhost", pretendToBeVisual: true });
    cleanup = [];
    restore = [];
    const replace = (name: string, value: unknown): void => {
      const previous = Object.getOwnPropertyDescriptor(globalThis, name);
      Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
      restore.push(() => {
        if (previous) Object.defineProperty(globalThis, name, previous);
        else Reflect.deleteProperty(globalThis, name);
      });
    };
    for (const name of ["window", "document", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "Element", "Node", "Event", "MouseEvent", "KeyboardEvent", "FocusEvent", "CustomEvent", "MutationObserver"]) {
      replace(name, name === "window" ? dom.window : Reflect.get(dom.window, name));
    }
    replace("getComputedStyle", dom.window.getComputedStyle.bind(dom.window));
    replace("requestAnimationFrame", dom.window.requestAnimationFrame.bind(dom.window));
    replace("cancelAnimationFrame", dom.window.cancelAnimationFrame.bind(dom.window));
  });
  afterEach(async () => {
    // Some components finish setting up their DOM listeners on the next task.
    await wait();
    cleanup.reverse().forEach(destroy => destroy());
    await wait();
    dom.window.close();
    restore.reverse().forEach(reset => reset());
  });
  return component => {
    cleanup.push(() => component.destroy());
    if (!component.element.isConnected) document.body.append(component.element);
    return component;
  };
};
