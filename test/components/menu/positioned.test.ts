import { expect, test } from "bun:test";
import createMenu from "../../../src/components/menu";
import { callbacksFixture, wait } from "../callbacks.fixture";

const mount = callbacksFixture();

test("open is synchronous and positioned follows the placement", async () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  const order: string[] = [];
  const menu = mount(createMenu({
    opener,
    items: [{ id: "one", text: "One" }, { id: "two", text: "Two" }],
  }));
  menu.on("open", () => { order.push("open"); });
  menu.on("positioned", () => { order.push("positioned"); });
  await wait();
  menu.open();
  expect(order).toEqual(["open"]);
  await wait(40);
  expect(order).toEqual(["open", "positioned"]);
});

test("closing before the menu is placed emits no positioned", async () => {
  const opener = document.createElement("button");
  document.body.append(opener);
  const order: string[] = [];
  const menu = mount(createMenu({
    opener,
    items: [{ id: "one", text: "One" }],
  }));
  menu.on("positioned", () => { order.push("positioned"); });
  await wait();
  menu.open();
  menu.close();
  await wait(40);
  expect(order).toEqual([]);
});
