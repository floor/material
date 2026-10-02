// test/components/menu-member.test.ts
//
// FLO-543: the menu inside a select or a split button is not a member of
// either. A leftover `.menu` in JavaScript reads undefined; what a caller did
// through it has a method on the component.
import { expect, test } from "bun:test";
import createSelect from "../../src/components/select";
import createSplitButton from "../../src/components/split-button";
import { innerMenu } from "../../src/components/menu/inner";
import { callbacksFixture, wait } from "./callbacks.fixture";

const mount = callbacksFixture();
const leftover = (component: object): unknown => (component as { menu?: unknown }).menu;

test("select.menu and splitButton.menu are not there; the menu is behind the internal handle", () => {
  const select = mount(createSelect({ options: [{ id: "a", text: "Alpha" }] }));
  const split = mount(createSplitButton({ text: "Export", items: [{ id: "pdf", text: "PDF" }] }));
  const plain = mount(createSplitButton({ text: "Export" }));
  expect(leftover(select)).toBeUndefined();
  expect(leftover(split)).toBeUndefined();
  expect("menu" in select).toBe(false);
  expect("menu" in split).toBe(false);
  expect(Object.keys(select)).not.toContain("menu");
  expect(typeof innerMenu(select)?.setPosition).toBe("function");
  expect(typeof innerMenu(split)?.setItems).toBe("function");
  expect(innerMenu(plain)).toBeUndefined();
});

test("a placement set on a closed select is applied to its menu, as <m-select placement> sets it", async () => {
  const select = mount(createSelect({ options: [{ id: "a", text: "Alpha" }] }));
  await wait();
  innerMenu(select)!.setPosition("top-start");
  expect(innerMenu(select)!.getPosition()).toBe("top-start");
  expect(select.isOpen()).toBe(false);
});

test("split button setItems replaces the menu's items and getItems reads them", async () => {
  const split = mount(createSplitButton({ text: "Export", items: [{ id: "pdf", text: "PDF" }] }));
  await wait();
  expect(split.getItems().map(item => "id" in item ? item.id : null)).toEqual(["pdf"]);
  expect(split.setItems([{ id: "csv", text: "CSV" }, { id: "json", text: "JSON" }])).toBe(split);
  expect(split.getItems().map(item => "id" in item ? item.id : null)).toEqual(["csv", "json"]);
  const selected: unknown[] = [];
  split.on("select", event => { selected.push(event.value); });
  split.expand();
  await wait();
  innerMenu(split)!.element.querySelector<HTMLElement>('[data-id="json"]')!.click();
  await wait();
  expect(selected).toEqual(["json"]);
});

test("a split button created without items has no menu: setItems does nothing and getItems is empty", () => {
  const split = mount(createSplitButton({ text: "Export" }));
  expect(split.getItems()).toEqual([]);
  expect(split.setItems([{ id: "csv", text: "CSV" }])).toBe(split);
  expect(split.getItems()).toEqual([]);
});
