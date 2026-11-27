#!/usr/bin/env bun
/**
 * Input chips inside a text field, in Chromium and WebKit, against the design's
 * test plan (briefs/material/chip-field-design.md, §6).
 *
 * The sources are cited in the module's own subjects: m3.material.io chips
 * (specs, guidelines, accessibility; read 2026-11-27 through r.jina.ai) and
 * Compose 1.5.0 `InputChipTokens.kt` (anchors and padding), `Chip.kt`
 * (`inputChipPadding`).
 *
 * Every read that follows a motion goes through `settle()`; nothing here waits
 * on a clock.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";

import { chromium, webkit, type Browser, type Page } from "playwright";

import { settle } from "./browser-settle";

const factoryBundle = await Bun.build({ entrypoints: [resolve("src/index.ts")], target: "browser", format: "esm", minify: false });
assert(factoryBundle.success, String(factoryBundle.logs));
const factories = await factoryBundle.outputs[0]!.text();

// The chips enhancer is the opt-in entry: the field itself carries no chip code.
const enhancerBundle = await Bun.build({ entrypoints: [resolve("src/components/text-field-chips/index.ts")], target: "browser", format: "esm", minify: false });
assert(enhancerBundle.success, String(enhancerBundle.logs));
const enhancer = await enhancerBundle.outputs[0]!.text();

const elementBundle = await Bun.build({ entrypoints: [resolve("src/elements/index.ts")], target: "browser", format: "esm", minify: false });
assert(elementBundle.success, String(elementBundle.logs));
const elements = await elementBundle.outputs[0]!.text();

const css = await Bun.file("dist/styles.css").text();
const chipsCss = await Bun.file("dist/styles/text-field-chips.css").text();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/factories.js") return new Response(factories, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/elements.js") return new Response(elements, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
    if (path === "/text-field-chips.css") return new Response(chipsCss, { headers: { "Content-Type": "text/css" } });
    if (path === "/chips.js") return new Response(enhancer, { headers: { "Content-Type": "text/javascript" } });
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/text-field-chips.css">
<style>body{margin:0;padding:24px;font:16px system-ui}#host{width:400px}</style></head>
<body><button id="before" type="button">Before</button><button id="outside" type="button">Outside</button>
<form id="form"><main id="host"></main></form>
<script type="module">
import * as api from "/factories.js";
import * as elements from "/elements.js";
import { textFieldChips } from "/chips.js";
elements.defineAll();
window.api = api;
window.elements = elements;
window.textFieldChips = textFieldChips;
document.getElementById("form").addEventListener("submit", (event) => event.preventDefault());
window.ready = true;
</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

type Engine = "chromium" | "webkit";

const open = async (browser: Browser): Promise<Page> => {
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  (page as Page & { errors: string[] }).errors = errors;
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
  return page;
};

/** A fresh factory field, in the host, with the config given. */
const mountFactory = (page: Page, config: Record<string, unknown>): Promise<void> =>
  page.evaluate((config) => {
    const window_ = window as unknown as {
      api: { createTextField: (c: Record<string, unknown>) => { element: HTMLElement } };
      textFieldChips: (options: Record<string, unknown>) => unknown;
    };
    const host = document.getElementById("host")!;
    host.replaceChildren();
    // `chips` in the spec is the options; the enhancer carries them.
    const { chips, ...rest } = config as { chips?: Record<string, unknown> | true };
    const field = window_.api.createTextField(chips ? { ...rest, chips: window_.textFieldChips(chips === true ? {} : chips) } : rest);
    field.element.id = "field";
    host.append(field.element);
    (window as unknown as { field: unknown }).field = field;
  }, config);

const mountElement = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const host = document.getElementById("host")!;
    host.replaceChildren();
    const field = document.createElement("m-text-field");
    field.setAttribute("label", "To");
    field.setAttribute("name", "to");
    field.setAttribute("chips", "");
    field.id = "field";
    (window as unknown as { chipField: unknown }).chipField = field;
    host.append(field);
  });

const values = (page: Page): Promise<string[]> =>
  page.evaluate(() => (window as unknown as { field: { getValues: () => string[] } }).field.getValues());

const draftInput = (page: Page) => page.locator("#field .mtrl-text-field__input");

const typeInto = async (page: Page, text: string): Promise<void> => {
  await draftInput(page).click();
  await draftInput(page).fill(text);
};

const chips = (page: Page) => page.locator("#field .mtrl-chip--input");

const snapshot = (page: Page): Promise<string> => page.locator("#field").ariaSnapshot();

/** The focus, as the page sees it: the shadow root's active element when there is one. */
const focusOf = (page: Page): Promise<{ tag: string; className: string; name: string | null; checked: string | null }> =>
  page.evaluate(() => {
    const host = document.getElementById("field")!;
    const root = (host as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot ?? document;
    const active = (root.activeElement ?? document.activeElement) as HTMLElement | null;
    const chip = active?.closest(".mtrl-chip");
    return {
      tag: active?.localName ?? "",
      className: (active?.className ?? "").toString(),
      name: chip?.getAttribute("aria-label") ?? active?.textContent?.trim() ?? null,
      checked: active?.getAttribute("aria-checked") ?? null,
    };
  });

const SECTIONS: Array<{ name: string; run: (page: Page, engine: Engine) => Promise<void> }> = [];
const section = (name: string, run: (page: Page, engine: Engine) => Promise<void>) => SECTIONS.push({ name, run });

// ---------------------------------------------------------------------------
// Entry: a labelled textbox beside a named group of chips, one action each
section("entry and aria snapshot", async (page) => {
  await mountFactory(page, { label: "To", name: "to", chips: { items: ["alice@example.com", "bob@example.com"] } });
  await settle(page, { target: "#field" });
  assert.deepEqual(await values(page), ["alice@example.com", "bob@example.com"]);
  assert.equal(await chips(page).count(), 2);
  const tree = await snapshot(page);
  assert.match(tree, /group "To":/);
  assert.match(tree, /group "alice@example\.com":/);
  assert.match(tree, /checkbox "alice@example\.com"/);
  assert.match(tree, /button "Remove alice@example\.com"/);
  assert.match(tree, /textbox "To"/);
  // The chips keep the label floated and the field non-empty.
  assert.equal(await page.locator("#field").evaluate((el) => el.classList.contains("mtrl-text-field--empty")), false);
});

section("Enter and a separator commit, and the draft clears", async (page) => {
  await mountFactory(page, { label: "To", name: "to", chips: true });
  await typeInto(page, "alice@example.com");
  await page.keyboard.press("Enter");
  await typeInto(page, "bob@example.com");
  await page.keyboard.type(",");
  assert.deepEqual(await values(page), ["alice@example.com", "bob@example.com"]);
  assert.equal(await draftInput(page).inputValue(), "");
  assert.equal(await page.evaluate(() => (window as unknown as { field: { getValue: () => string } }).field.getValue()), "");
  // One form entry per chip under the field's name.
  const formData = await page.evaluate(() => [...new FormData(document.getElementById("form") as HTMLFormElement).getAll("to")]);
  assert.deepEqual(formData, ["alice@example.com", "bob@example.com"]);
});

// ---------------------------------------------------------------------------
// Backspace: select, then delete, with the repeat guard
section("two-step Backspace with the auto-repeat guard", async (page) => {
  await mountFactory(page, { label: "To", chips: { items: ["a@b.com", "c@d.com"] } });
  await settle(page, { target: "#field" });
  await draftInput(page).click();
  // A held Backspace that erases draft text never selects or deletes a chip.
  await page.evaluate(() => {
    const input = document.querySelector<HTMLInputElement>("#field .mtrl-text-field__input")!;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", repeat: true, bubbles: true, cancelable: true }));
  });
  assert.equal(await page.evaluate(() => document.querySelectorAll("#field .mtrl-chip__action[aria-checked=\"true\"]").length), 0);
  // First press: the last chip is selected and its action holds focus.
  await page.keyboard.press("Backspace");
  const focus = await focusOf(page);
  assert.match(focus.className, /mtrl-chip__action/);
  assert.equal(focus.checked, "true");
  assert.equal(focus.name, "c@d.com");
  // A repeat on the chip deletes nothing; the next real press removes it.
  await page.evaluate(() => {
    (document.activeElement as HTMLElement).dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", repeat: true, bubbles: true, cancelable: true }));
  });
  assert.deepEqual(await values(page), ["a@b.com", "c@d.com"]);
  await page.keyboard.press("Backspace");
  await settle(page, { target: "#field" });
  assert.deepEqual(await values(page), ["a@b.com"]);
  assert.match((await focusOf(page)).className, /mtrl-text-field__input/);
});

// ---------------------------------------------------------------------------
// Arrows, Home, End, Tab and Shift+Tab
section("arrows reach both chip actions and Tab stays native", async (page) => {
  await mountFactory(page, { label: "To", chips: { items: ["a@b.com", "c@d.com"] } });
  await settle(page, { target: "#field" });
  await draftInput(page).click();
  await page.keyboard.press("ArrowLeft");
  assert.match((await focusOf(page)).className, /mtrl-chip__remove/);
  await page.keyboard.press("ArrowLeft");
  assert.match((await focusOf(page)).className, /mtrl-chip__action/);
  await page.keyboard.press("ArrowRight");
  assert.match((await focusOf(page)).className, /mtrl-chip__remove/);
  await page.keyboard.press("ArrowRight");
  assert.match((await focusOf(page)).className, /mtrl-text-field__input/);
  // Home and End.
  await page.locator("#field .mtrl-chip__action").first().focus();
  await page.keyboard.press("End");
  assert.match((await focusOf(page)).className, /mtrl-text-field__input/);
  await page.locator("#field .mtrl-chip__action").last().focus();
  await page.keyboard.press("Home");
  assert.match((await focusOf(page)).className, /mtrl-chip__action/);
  // Tab from a chip reaches the input; Shift+Tab leaves the field.
  await page.locator("#field .mtrl-chip__action").first().focus();
  await page.keyboard.press("Tab");
  assert.match((await focusOf(page)).className, /mtrl-text-field__input/);
  await page.locator("#field .mtrl-chip__action").first().focus();
  await page.keyboard.press("Shift+Tab");
  const left = await page.evaluate(() => {
    const field = document.getElementById("field")!;
    return !field.contains(document.activeElement) && !(field.shadowRoot?.contains(document.activeElement) ?? false);
  });
  assert.equal(left, true, "Shift+Tab leaves the text field");
});

// ---------------------------------------------------------------------------
// Editing: second activation, Escape, and a blur that never pulls focus back
section("a second activation edits, Escape cancels, blur commits without refocus", async (page) => {
  await mountFactory(page, { label: "To", chips: { items: ["alice@example.com"] } });
  await settle(page, { target: "#field" });
  const action = page.locator("#field .mtrl-chip__action").first();
  await action.click();
  await action.click();
  assert.equal(await page.locator("#field .mtrl-chip--input").first().isHidden(), true);
  assert.equal(await draftInput(page).inputValue(), "alice@example.com");
  const editing = await snapshot(page);
  assert.match(editing, /textbox "To"/);
  // Escape puts the chip back and returns focus to its action.
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("#field .mtrl-chip--input").first().isHidden(), false);
  assert.match((await focusOf(page)).className, /mtrl-chip__action/);
  // A blur commits the edit and leaves focus where the person moved it.
  await action.click();
  await action.click();
  await draftInput(page).fill("edited@example.com");
  await page.locator("#outside").click();
  await settle(page, { target: "#field" });
  assert.deepEqual(await values(page), ["edited@example.com"]);
  assert.equal(await page.evaluate(() => { const field = document.getElementById("field")!; return field.contains(document.activeElement) || (field.shadowRoot?.contains(document.activeElement) ?? false); }), false, "a blur never pulls focus back into the field");
});

section("editing a chip shows one chip and the textbox in the snapshot", async (page) => {
  await mountFactory(page, { label: "To", chips: { items: ["alice@example.com", "bob@example.com"] } });
  await settle(page, { target: "#field" });
  const action = page.locator("#field .mtrl-chip__action").first();
  await action.click();
  await action.click();
  const tree = await snapshot(page);
  console.log("DEBUG edit:", JSON.stringify(await page.evaluate(() => ({ sheets: [...document.styleSheets].map((sheet) => sheet.href), rules: [...document.styleSheets].flatMap((sheet) => { try { return [...sheet.cssRules].map((rule) => (rule as CSSStyleRule).selectorText ?? "").filter((text) => text.includes("chip[hidden]")); } catch { return []; } }), parent: document.querySelector("#field .mtrl-chip")!.parentElement!.className }))));
  assert.match(tree, /textbox "To"/);
  assert.equal((tree.match(/checkbox /g) ?? []).length, 1, tree);
});

// ---------------------------------------------------------------------------
// IME: a candidate's Enter commits nothing; the next Enter does (add and edit)
section("IME confirmation creates no chip, in both engines' event orders", async (page, engine) => {
  await mountFactory(page, { label: "To", chips: true });
  await draftInput(page).click();
  await draftInput(page).fill("東京");
  if (engine === "webkit") {
    // WebKit Bug 165004 comment 4 and Bug 324380: compositionend precedes the
    // confirming keydown, which carries keyCode 229 with isComposing false.
    await page.evaluate(() => {
      const input = document.querySelector("#field .mtrl-text-field__input") as HTMLInputElement;
      input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "東京" }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 229, bubbles: true, cancelable: true }));
    });
  } else {
    await page.evaluate(() => {
      const input = document.querySelector("#field .mtrl-text-field__input") as HTMLInputElement;
      input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", isComposing: true, bubbles: true, cancelable: true }));
      input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "東京" }));
    });
  }
  assert.deepEqual(await values(page), []);
  assert.equal(await draftInput(page).inputValue(), "東京");
  // The next, ordinary Enter commits it.
  await page.evaluate(() => {
    const input = document.querySelector("#field .mtrl-text-field__input") as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true, cancelable: true }));
  });
  assert.deepEqual(await values(page), ["東京"]);
  assert.equal(await draftInput(page).inputValue(), "");
});

section("IME confirmation in edit mode keeps editing", async (page, engine) => {
  await mountFactory(page, { label: "To", chips: { items: ["alice@example.com"] } });
  await settle(page, { target: "#field" });
  const action = page.locator("#field .mtrl-chip__action").first();
  await action.click();
  await action.click();
  await draftInput(page).fill("東京");
  await page.evaluate((engine) => {
    const input = document.querySelector("#field .mtrl-text-field__input") as HTMLInputElement;
    input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    if (engine === "webkit") input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "東京" }));
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: engine === "webkit" ? 229 : 13, isComposing: engine !== "webkit", bubbles: true, cancelable: true }));
    if (engine !== "webkit") input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "東京" }));
  }, engine);
  assert.deepEqual(await values(page), ["alice@example.com"]);
  // Still editing, text in the input; a normal Enter commits the edit.
  assert.equal(await draftInput(page).inputValue(), "東京");
  await page.evaluate(() => {
    const input = document.querySelector("#field .mtrl-text-field__input") as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", keyCode: 13, bubbles: true, cancelable: true }));
  });
  await settle(page, { target: "#field" });
  assert.deepEqual(await values(page), ["東京"]);
});

// ---------------------------------------------------------------------------
// Paste: accepted tokens become chips, the rest stays in the input
section("paste splits on separators and keeps rejected and excess text", async (page) => {
  // The validator is a function: it is written in the page, not serialized.
  await page.evaluate(() => {
    const api = (window as unknown as { api: { createTextField: (c: Record<string, unknown>) => { element: HTMLElement } } }).api;
    const host = document.getElementById("host")!;
    host.replaceChildren();
    const build = (window as unknown as { textFieldChips: (o: Record<string, unknown>) => unknown }).textFieldChips;
    const field = api.createTextField({
      label: "To",
      chips: build({ maxChips: 2, validate: (text: string) => (text.includes("@") ? true : "Invalid email") }),
    });
    field.element.id = "field";
    host.append(field.element);
    (window as unknown as { field: unknown }).field = field;
  });
  await draftInput(page).click();
  await page.evaluate(() => {
    const input = document.querySelector("#field .mtrl-text-field__input") as HTMLInputElement;
    const data = new DataTransfer();
    data.setData("text/plain", "a@b.com, bad-email, c@d.com, extra@e.com");
    input.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
  });
  await settle(page, { target: "#field" });
  assert.deepEqual(await values(page), ["a@b.com", "c@d.com"]);
  assert.equal(await draftInput(page).inputValue(), "bad-email, extra@e.com");
  assert.equal(await page.locator("#field").evaluate((el) => el.classList.contains("mtrl-text-field--error")), true);
});

// ---------------------------------------------------------------------------
// Forms: submit, required, silent setters, name, disabled, reset, restore
section("forms: one entry per chip, required, name, disabled and reset (factory)", async (page) => {
  await mountFactory(page, { label: "To", name: "to", required: true, chips: { items: ["a@b.com", "c@d.com"] } });
  await settle(page, { target: "#field" });
  const data = await page.evaluate(() => [...new FormData(document.getElementById("form") as HTMLFormElement).getAll("to")]);
  assert.deepEqual(data, ["a@b.com", "c@d.com"]);
  // Required is satisfied by a committed chip, not by draft text.
  await page.evaluate(() => (window as unknown as { field: { setValues: (v: string[]) => void } }).field.setValues([]));
  await typeInto(page, "draft@b.com");
  assert.equal(await page.evaluate(() => (document.getElementById("form") as HTMLFormElement).checkValidity()), false);
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => (document.getElementById("form") as HTMLFormElement).checkValidity()), true);
  // A silent setter fills the form rows at once.
  await page.evaluate(() => (window as unknown as { field: { setValues: (v: string[]) => void } }).field.setValues(["x@y.com", "z@y.com"]));
  assert.deepEqual(await page.evaluate(() => [...new FormData(document.getElementById("form") as HTMLFormElement).getAll("to")]), ["x@y.com", "z@y.com"]);
  // The name moves the rows.
  await page.evaluate(() => (window as unknown as { field: { setAttribute: (n: string, v: string) => void } }).field.setAttribute("name", "cc"));
  assert.deepEqual(await page.evaluate(() => [...new FormData(document.getElementById("form") as HTMLFormElement).getAll("to")]), [], "the old name submits nothing after a rename");
  assert.deepEqual(await page.evaluate(() => [...new FormData(document.getElementById("form") as HTMLFormElement).getAll("cc")]), ["x@y.com", "z@y.com"], "the new name submits every chip");
  // Disabled submits nothing; enabled restores it.
  await page.evaluate(() => (window as unknown as { field: { disable: () => void } }).field.disable());
  assert.deepEqual(await page.evaluate(() => [...new FormData(document.getElementById("form") as HTMLFormElement).getAll("cc")]), [], "a disabled field submits nothing");
  await page.evaluate(() => (window as unknown as { field: { enable: () => void } }).field.enable());
  assert.deepEqual(await page.evaluate(() => [...new FormData(document.getElementById("form") as HTMLFormElement).getAll("cc")]), ["x@y.com", "z@y.com"], "an enabled field submits every chip");
  // A reset brings back the starting chips.
  await page.evaluate(() => (document.getElementById("form") as HTMLFormElement).reset());
  await settle(page, { target: "#field" });
  assert.deepEqual(await values(page), ["a@b.com", "c@d.com"], `a reset restores the starting chips (${JSON.stringify(await values(page))})`);
});

section("forms: the element submits one entry per chip and restores its state", async (page) => {
  await mountElement(page);
  await settle(page, { target: "#field" });
  await typeInto(page, "a@b.com");
  await page.keyboard.press("Enter");
  const data = await page.evaluate(() => [...new FormData(document.getElementById("form") as HTMLFormElement).getAll("to")]);
  assert.deepEqual(data, ["a@b.com"]);
  const restored = await page.evaluate(() => {
    const field = document.querySelector("#field") as HTMLElement & { formStateRestoreCallback?: (state: string) => void; values: string[]; value: string };
    field.formStateRestoreCallback?.(JSON.stringify({ v: ["restored@y.com"], d: "draft" }));
    return { values: field.values, value: field.value };
  });
  assert.deepEqual(restored.values, ["restored@y.com"]);
  assert.equal(restored.value, "draft");
});

// ---------------------------------------------------------------------------
// The empty state: with a committed chip and an empty draft, nothing that
// writes --empty may let it stay on — the label keeps its floated place and
// the outlined notch stays open, with no frame in between.
section("the empty class never appears with a chip and an empty draft", async (page) => {
  await mountFactory(page, { label: "To", variant: "outlined", chips: { items: ["a@b.com"] } });
  await settle(page, { target: "#field" });
  // Sample the paint: the label's place every frame from the action to three
  // frames after it. A class toggled and put back within the tick never paints;
  // a label that lands at rest for one frame does.
  await page.evaluate(() => {
    const w = window as unknown as { frames: boolean[]; sampling: boolean };
    w.frames = [];
    w.sampling = true;
    const field = document.getElementById("field") as HTMLElement;
    const label = field.querySelector(".mtrl-text-field__label") as HTMLElement;
    const row = field.querySelector(".mtrl-text-field__chips") as HTMLElement;
    const tick = (): void => {
      if (!w.sampling) return;
      w.frames.push(label.getBoundingClientRect().top - field.getBoundingClientRect().top < 10);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  const inspect = async (label: string) => {
    const state = await page.evaluate(() => {
      const field = document.getElementById("field") as HTMLElement;
      const labelEl = field.querySelector(".mtrl-text-field__label") as HTMLElement;
      const row = field.querySelector(".mtrl-text-field__chips") as HTMLElement;
      const outline = field.querySelector(".mtrl-text-field__outline") as HTMLElement;
      const w = window as unknown as { frames: boolean[]; sampling: boolean };
      w.sampling = false;
      return {
        empty: field.classList.contains("mtrl-text-field--empty"),
        frames: [...w.frames],
        floated: labelEl.getBoundingClientRect().top - field.getBoundingClientRect().top < 10,
        notched: outline.classList.contains("mtrl-text-field__outline--notched"),
      };
    });
    assert.equal(state.empty, false, `${label}: --empty is not on the field`);
    assert.ok(state.frames.length >= 2, `${label}: frames were sampled (${state.frames.length})`);
    assert.equal(state.frames.every(Boolean), true, `${label}: the label stayed floated on every painted frame (${JSON.stringify(state.frames)})`);
    assert.equal(state.floated, true, `${label}: the label is floated above the chips`);
    assert.equal(state.notched, true, `${label}: the outlined notch is open`);
  };
  const paths: Array<[string, () => Promise<void>]> = [
    ["blur", async () => {
      await draftInput(page).click();
      await page.locator("#outside").click();
    }],
    ["focus", async () => {
      await draftInput(page).focus();
    }],
    ["input", async () => {
      await draftInput(page).fill("draft");
      await draftInput(page).fill("");
    }],
    ["setValue", async () => {
      await page.evaluate(() => (window as unknown as { field: { setValue: (v: string) => void } }).field.setValue(""));
    }],
    ["clear", async () => {
      await page.evaluate(() => (window as unknown as { field: { setValue: (v: string) => void } }).field.setValue("   "));
    }],
    ["reset", async () => {
      await page.evaluate(() => (document.getElementById("form") as HTMLFormElement).reset());
    }],
  ];
  for (const [label, run] of paths) {
    await page.evaluate(() => {
      const w = window as unknown as { frames: boolean[]; sampling: boolean };
      w.frames = [];
      w.sampling = true;
      const field = document.getElementById("field") as HTMLElement;
      const labelEl = field.querySelector(".mtrl-text-field__label") as HTMLElement;
      const row = field.querySelector(".mtrl-text-field__chips") as HTMLElement;
      const tick = (): void => {
        if (!w.sampling) return;
        w.frames.push(labelEl.getBoundingClientRect().top - field.getBoundingClientRect().top < 10);
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await run();
    await settle(page, { target: "#field" });
    await inspect(label);
  }
});

// ---------------------------------------------------------------------------
// The review round's blockers, each measured where it broke
section("email mode rejects an invalid address and keeps it as text", async (page) => {
  await mountFactory(page, { label: "To", type: "email", chips: true });
  await typeInto(page, "not-an-email");
  await page.keyboard.press("Enter");
  assert.deepEqual(await values(page), [], "an invalid address commits no chip");
  assert.equal(await draftInput(page).inputValue(), "not-an-email", "the rejected address stays editable");
  await draftInput(page).fill("alice@example.com");
  await page.keyboard.press("Enter");
  assert.deepEqual(await values(page), ["alice@example.com"]);
});

section("an inline edit submits the new value", async (page) => {
  await mountElement(page);
  await settle(page, { target: "#field" });
  await typeInto(page, "before@example.com");
  await page.keyboard.press("Enter");
  const action = page.locator("#field .mtrl-chip__action").first();
  await action.click();
  await action.click();
  await draftInput(page).fill("after@example.com");
  await page.keyboard.press("Enter");
  await settle(page, { target: "#field" });
  const submitted = await page.evaluate(() => {
    const form = document.getElementById("form") as HTMLFormElement;
    let entries: string[] = [];
    const read = (event: Event) => { event.preventDefault(); entries = [...new FormData(form).getAll("to")]; };
    form.addEventListener("submit", read, { once: true });
    form.requestSubmit();
    return entries;
  });
  assert.deepEqual(submitted, ["after@example.com"]);
});

section("Backspace in the element returns focus inside its shadow root", async (page) => {
  await mountElement(page);
  await settle(page, { target: "#field" });
  await typeInto(page, "a@b.com");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Backspace");
  await settle(page, { target: "#field" });
  const focus = await page.evaluate(() => {
    const field = document.getElementById("field") as HTMLElement;
    const root = (field.shadowRoot ?? document) as Document | ShadowRoot;
    const active = root.activeElement;
    return { tag: active?.localName ?? null, inside: !!active && field.shadowRoot?.contains(active) };
  });
  assert.equal(focus.tag, "input", "focus returns to the input, not to nothing");
  assert.equal(focus.inside, true);
});

section("restore keeps a plain draft that starts with a brace", async (page) => {
  await mountElement(page);
  await settle(page, { target: "#field" });
  const restored = await page.evaluate(() => {
    const field = document.querySelector("#field") as HTMLElement & { formStateRestoreCallback?: (state: string) => void; value: string };
    field.formStateRestoreCallback?.("{draft");
    return field.value;
  });
  assert.equal(restored, "{draft");
});

// ---------------------------------------------------------------------------
// Layout: wrapping, hit targets across rows, RTL, and the focus ring
section("wrapping keeps every chip inside the field and every target its own", async (page) => {
  await mountFactory(page, {
    label: "To",
    chips: { items: ["alice@example.com", "bob@example.com", "very-long-recipient-address-that-truncates@example.com", "d@e.com"] },
  });
  await page.setViewportSize({ width: 900, height: 700 });
  await page.evaluate(() => { (document.getElementById("host") as HTMLElement).style.width = "220px"; });
  await settle(page, { target: "#field" });
  const geometry = await page.evaluate(() => {
    const field = document.getElementById("field")!.getBoundingClientRect();
    const targets = [...document.querySelectorAll("#field .mtrl-chip__remove")].map((button) => {
      const style = getComputedStyle(button, "::before");
      const box = button.getBoundingClientRect();
      const width = parseFloat(style.width) || 0;
      const height = parseFloat(style.height) || 0;
      return { left: box.right - width, right: box.right, top: box.top + (box.height - height) / 2, bottom: box.top + (box.height + height) / 2 };
    });
    const chips = [...document.querySelectorAll("#field .mtrl-chip")].map((chip) => chip.getBoundingClientRect().right);
    return { fieldRight: field.right, targets, chips, rows: new Set([...document.querySelectorAll("#field .mtrl-chip")].map((chip) => Math.round(chip.getBoundingClientRect().top))).size };
  });
  assert.ok(geometry.rows >= 2, `the chips wrap onto rows (${geometry.rows})`);
  assert.ok(geometry.chips.every((right) => right <= geometry.fieldRight + 1), JSON.stringify(geometry.chips));
  for (let i = 0; i < geometry.targets.length; i++) {
    for (let j = i + 1; j < geometry.targets.length; j++) {
      const a = geometry.targets[i]!, b = geometry.targets[j]!;
      const overlap = a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
      assert.equal(overlap, false, `targets ${i} and ${j} overlap: ${JSON.stringify([a, b])}`);
    }
  }
});

section("RTL: the chips run right to left and the arrows follow the direction", async (page) => {
  await page.evaluate(() => { document.documentElement.dir = "rtl"; });
  await mountFactory(page, { label: "To", chips: { items: ["a@b.com", "c@d.com"] } });
  await settle(page, { target: "#field" });
  const first = await page.locator("#field .mtrl-chip").first().boundingBox();
  const last = await page.locator("#field .mtrl-chip").last().boundingBox();
  assert.ok(first!.x > last!.x, "the first chip sits at the inline start, on the right");
  await draftInput(page).click();
  await page.keyboard.press("ArrowRight");
  assert.match((await focusOf(page)).className, /mtrl-chip__remove/);
  await page.keyboard.press("ArrowLeft");
  assert.match((await focusOf(page)).className, /mtrl-text-field__input/);
  await page.evaluate(() => { document.documentElement.dir = "ltr"; });
});

section("the chip's focus ring is the M3 3px Secondary outline at +2", async (page) => {
  await mountFactory(page, { label: "To", chips: { items: ["a@b.com"] } });
  await settle(page, { target: "#field" });
  await draftInput(page).click();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  const ring = await page.evaluate(() => {
    const action = document.querySelector("#field .mtrl-chip__action") as HTMLElement;
    const style = getComputedStyle(action);
    return { width: style.outlineWidth, style: style.outlineStyle, offset: style.outlineOffset, visible: action.matches(":focus-visible") };
  });
  assert.deepEqual(ring, { width: "3px", style: "solid", offset: "2px", visible: true });
});

// ---------------------------------------------------------------------------
const failures: string[] = [];
const results: string[] = [];

const run = async (browser: Browser, engine: Engine): Promise<void> => {
  for (const { name, run } of SECTIONS) {
    const page = await open(browser);
    try {
      await run(page, engine);
      const errors = (page as Page & { errors: string[] }).errors;
      assert.deepEqual(errors, [], `${engine} ${name}: no page errors`);
      results.push(`${engine} ${name}`);
    } catch (error) {
      failures.push(`${engine} ${name}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      await page.close();
    }
  }
};

const chromiumBrowser = await chromium.launch({ headless: true });
try {
  await run(chromiumBrowser, "chromium");
} finally {
  await chromiumBrowser.close();
}

let webkitBrowser: Browser | null = null;
try {
  webkitBrowser = await webkit.launch({ headless: true });
} catch (error) {
  if (process.argv.includes("--skip-missing-webkit")) console.log("text field chips: WebKit is not installed here, skipped");
  else throw error;
}
if (webkitBrowser) {
  try {
    await run(webkitBrowser, "webkit");
  } finally {
    await webkitBrowser.close();
  }
}

server.stop(true);
for (const line of results) console.log(`ok ${line}`);
assert.deepEqual(failures, [], `text field chips:\n  ${failures.join("\n  ")}`);
console.log(`Passed text field chips: ${results.length} sections in Chromium${webkitBrowser ? " and WebKit" : ""}.`);
