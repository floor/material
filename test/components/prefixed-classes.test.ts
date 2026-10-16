// test/components/prefixed-classes.test.ts
//
// From md3.io's docs audit: since `class` stopped being prefixed
// Two components passed their own class names through it bare. The
// select's menu carried `select__menu`, so `.mtrl-select__menu` matched
// nothing, and progress roots carried `progress progress--linear` beside the
// prefixed copies.

import { expect, test } from "bun:test";
import { createProgress, createSelect } from "../../src";
import { callbacksFixture, wait } from "./callbacks.fixture";

const mount = callbacksFixture();
const bare = (element: Element) => Array.from(element.classList).filter(name => !name.startsWith("mtrl-"));

test("the select's menu carries the prefixed class", async () => {
  const select = mount(createSelect({ options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] }));
  await wait();
  select.element.querySelector<HTMLElement>("input")!.click();
  await wait(50);
  const menu = select.element.querySelector(".mtrl-select__menu");
  expect(menu).not.toBeNull();
  expect(select.element.querySelector(".select__menu")).toBeNull();
});

test("progress roots carry only prefixed classes", () => {
  for (const config of [{}, { variant: "circular" }, { shape: "wavy" }, { indeterminate: true }] as const) {
    const progress = mount(createProgress(config as Parameters<typeof createProgress>[0]));
    expect(bare(progress.element)).toEqual([]);
    expect(progress.element.classList.contains("mtrl-progress")).toBe(true);
  }
});

test("a caller's own class stays as given", () => {
  const progress = mount(createProgress({ class: "upload-progress" }));
  expect(bare(progress.element)).toEqual(["upload-progress"]);
});
