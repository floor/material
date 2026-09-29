// test/components/search/behaviour.test.ts
//
// FLO-291, found by the elements session building <m-search>: Enter on a
// suggestion, reopening, clearing, trailing items, the avatar and two-line
// suggestions.

import { expect, test } from "bun:test";
import createSearch from "../../../src/components/search";
import type { SearchConfig } from "../../../src/components/search/types";
import { callbacksFixture, wait } from "../callbacks.fixture";

const mount = callbacksFixture();

const setup = async (config: SearchConfig = {}) => {
  const log: string[] = [];
  const search = mount(createSearch({ suggestions: ["Apple", "Banana"], collapseOnBlur: false, ...config }));
  for (const name of ["input", "submit", "clear", "suggestionSelect", "expand", "collapse"] as const) {
    search.on(name, event => log.push(`${name}:${event.suggestion?.text ?? event.value ?? ""}`));
  }
  await wait();
  const input = search.element.querySelector<HTMLInputElement>("input")!;
  const key = (k: string) => input.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  const type = (text: string) => { input.value = text; input.dispatchEvent(new Event("input", { bubbles: true })); };
  return { search, log, input, key, type };
};

test("Enter on the suggestion the arrows reached selects it, without submitting the typed text", async () => {
  const p = await setup();
  p.search.expand();
  p.type("an");
  p.log.length = 0;
  p.key("ArrowDown");
  p.key("Enter");
  expect(p.log.filter(entry => !entry.startsWith("input:") && !entry.startsWith("collapse"))).toEqual(["suggestionSelect:Apple"]);
  expect(p.search.getValue()).toBe("Apple");
});

test("Enter with no suggestion reached submits the query", async () => {
  const p = await setup();
  p.search.expand();
  p.type("an");
  p.log.length = 0;
  p.key("Enter");
  expect(p.log).toEqual(["submit:an"]);
});

test("a click in the focused input, or typing, reopens a closed view", async () => {
  const p = await setup();
  p.input.focus();
  p.search.collapse();
  p.input.click();
  expect(p.search.isExpanded()).toBe(true);
  p.search.collapse();
  p.type("b");
  expect(p.search.isExpanded()).toBe(true);
});

test("emptying the query emits input, then clear: the clear button and Escape", async () => {
  const p = await setup();
  p.type("apple");
  p.log.length = 0;
  p.search.element.querySelector<HTMLButtonElement>(".mtrl-search__clear-button")!.click();
  expect(p.log).toEqual(["input:", "clear:"]);
  p.type("pear");
  p.log.length = 0;
  p.key("Escape");
  expect(p.log).toEqual(["input:", "clear:"]);
});

test("trailing items: onClick is wired, and they can be set, added and removed", async () => {
  const clicks: string[] = [];
  const p = await setup({ trailingItems: [{ id: "mic", type: "icon", content: "<svg></svg>", ariaLabel: "Voice", onClick: () => clicks.push("mic") }] });
  const trailing = () => Array.from(p.search.element.querySelectorAll<HTMLElement>("[data-trailing-id]")).map(element => element.dataset.trailingId);
  p.search.element.querySelector<HTMLElement>('[data-trailing-id="mic"]')!.click();
  expect(clicks).toEqual(["mic"]);
  expect(p.search.addTrailingItem({ id: "more", type: "icon", content: "<svg></svg>", ariaLabel: "More" })).toBe(p.search);
  expect(trailing()).toEqual(["mic", "more"]);
  p.search.removeTrailingItem("mic");
  expect(trailing()).toEqual(["more"]);
  p.search.setTrailingItems([{ id: "a", type: "icon", content: "<svg></svg>" }, { id: "b", type: "icon", content: "<svg></svg>" }]);
  expect(trailing()).toEqual(["a", "b"]);
});

test("setLeadingIcon changes the bar's icon, and the view keeps its back arrow", async () => {
  const p = await setup();
  const leading = () => p.search.element.querySelector(".mtrl-search__leading-icon")!.innerHTML;
  p.search.setLeadingIcon('<svg data-icon="menu"></svg>');
  expect(leading()).toContain('data-icon="menu"');
  p.search.expand();
  expect(leading()).not.toContain('data-icon="menu"');
  p.search.collapse();
  expect(leading()).toContain('data-icon="menu"');
});

test("an avatar is an image out of the tab order, or a button when it does something", async () => {
  const clicks: string[] = [];
  const p = await setup({ trailingItems: [
    { id: "me", type: "avatar", content: '<img alt="">' },
    { id: "account", type: "avatar", content: '<img alt="">', ariaLabel: "Account", onClick: () => clicks.push("account") },
  ] });
  const me = p.search.element.querySelector<HTMLElement>('[data-trailing-id="me"]')!;
  const account = p.search.element.querySelector<HTMLElement>('[data-trailing-id="account"]')!;
  expect([me.tagName, me.hasAttribute("tabindex"), me.getAttribute("aria-hidden")]).toEqual(["DIV", false, "true"]);
  expect([account.tagName, account.getAttribute("aria-label")]).toEqual(["BUTTON", "Account"]);
  account.click();
  expect(clicks).toEqual(["account"]);
});

test("a suggestion with supporting text is a two-line item", async () => {
  const p = await setup({ suggestions: [{ text: "Lisbon", supportingText: "Portugal" }] });
  p.search.expand();
  const item = p.search.element.querySelector<HTMLElement>('[role="option"]')!;
  expect(item.classList.contains("mtrl-search__suggestion-item--two-line")).toBe(true);
  expect(item.querySelector(".mtrl-search__suggestion-supporting")!.textContent).toBe("Portugal");
});
