// test/components/menu/synchronous-content.test.ts
import { expect, test } from "bun:test";
import createMenu from "../../../src/components/menu";
import { callbacksFixture, wait } from "../callbacks.fixture";

const mount = callbacksFixture();

test("menu content and tab stops exist at construction, including groups and separators", async () => {
  const menu = mount(createMenu({ opener: document.createElement("button"), items: [
    { id: "disabled", text: "Unavailable", disabled: true },
    { id: "copy", text: "Copy", shortcut: "Ctrl+C" },
    { type: "divider" },
    { type: "gap" },
    { id: "paste", text: "Paste", supportingText: "From clipboard" },
  ] }));
  const items = Array.from(menu.element.querySelectorAll<HTMLElement>('[role="menuitem"]'));
  expect(items.map(item => item.dataset.id)).toEqual(["disabled", "copy", "paste"]);
  expect(items.map(item => item.tabIndex)).toEqual([-1, 0, -1]);
  expect(menu.element.querySelectorAll('[role="separator"]')).toHaveLength(1);
  expect(menu.element.querySelectorAll(".mtrl-menu__group")).toHaveLength(2);
  expect(menu.element.textContent).toContain("From clipboard");
  await wait();
  expect(menu.element.querySelector('[data-id="copy"]')).toBe(items[1]);
});

test("listbox content is synchronous and leaves all options outside the tab order", () => {
  const menu = mount(createMenu({ opener: document.createElement("button"), listbox: true, items: [{ id: "one", text: "One" }] }));
  const option = menu.element.querySelector<HTMLElement>('[role="option"]');
  expect(option?.textContent).toBe("One");
  expect(option?.tabIndex).toBe(-1);
  expect(option?.id).toBeTruthy();
});
