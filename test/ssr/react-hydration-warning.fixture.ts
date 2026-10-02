// Client vnodes. Window is installed before any mtrl import, so `isBrowser`
// is true and `shadow()` returns null: this is the client, not the server.
import type { ButtonElement, ButtonSpec, CarouselElement, CarouselSpec, FabMenuElement, FabMenuSpec, MenuElement, MenuSpec } from "../../src/elements";
import { JSDOM } from "jsdom";
import { expect, test } from "bun:test";

const dom = new JSDOM("<!doctype html><html><body><div id='button'></div><div id='carousel'></div><div id='menu'></div><div id='fab'></div></body></html>", {
  url: "https://example.test/",
  pretendToBeVisual: true,
});
const { window } = dom;
Object.assign(globalThis, {
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  Element: window.Element,
  Node: window.Node,
  DocumentFragment: window.DocumentFragment,
  navigator: window.navigator,
  MutationObserver: window.MutationObserver,
  getComputedStyle: window.getComputedStyle.bind(window),
  requestAnimationFrame: window.requestAnimationFrame.bind(window),
  cancelAnimationFrame: window.cancelAnimationFrame.bind(window),
  IS_REACT_ACT_ENVIRONMENT: true,
});

const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
const { createComponent } = await import("../../src/react/create");
const {
  buttonElement, carouselElement, fabMenuElement, menuElement,
} = await import("../../src/elements");

const propsOf = async (id: string, node: React.ReactElement): Promise<Record<string, unknown>> => {
  const root = createRoot(document.getElementById(id) as HTMLElement);
  await act(async () => { root.render(node); });
  const el = document.querySelector(`#${id} > *`);
  expect(el, id).not.toBeNull();
  const key = Object.keys(el as object).find((name) => name.startsWith("__reactFiber$") || name.startsWith("__reactInternalInstance$"));
  expect(key, `${id} keys ${Object.keys(el as object).join(" ")}`).toBeDefined();
  const fiber = (el as unknown as Record<string, { memoizedProps?: Record<string, unknown> }>)[key as string];
  return fiber?.memoizedProps ?? {};
};

test("a carousel client vnode has no suppressHydrationWarning; a button's has it", async () => {
  const Button = createComponent<ButtonSpec, ButtonElement>(buttonElement.spec, () => "m-button", "MButton");
  const Carousel = createComponent<CarouselSpec, CarouselElement>(carouselElement.spec, () => "m-carousel", "MCarousel");
  const Menu = createComponent<MenuSpec, MenuElement>(menuElement.spec, () => "m-menu", "MMenu");
  const FabMenu = createComponent<FabMenuSpec, FabMenuElement>(fabMenuElement.spec, () => "m-fab-menu", "MFabMenu");
  const button = await propsOf("button", React.createElement(Button, { label: "Save" }, "Save"));
  const carousel = await propsOf("carousel", React.createElement(Carousel, { ariaLabel: "Photos" }));
  const menu = await propsOf("menu", React.createElement(Menu));
  const fab = await propsOf("fab", React.createElement(FabMenu));
  expect(button.suppressHydrationWarning).toBe(true);
  expect(carousel.suppressHydrationWarning).toBeUndefined();
  expect(menu.suppressHydrationWarning).toBe(true);
  expect(fab.suppressHydrationWarning).toBeUndefined();
});
