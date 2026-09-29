// <m-search> in a real browser, for scripts/check-elements.ts: the combobox
// in its shadow root, the open view in the top layer (docked over a scrim,
// full screen as a modal), the suggestion declarations updated in place, the
// value model and form association, and parity with the factory in light DOM.

import assert from "node:assert/strict";
import type { Browser, Page } from "playwright";

interface Context {
  browser: Browser;
  page: Page;
  /** The check server's origin, which serves the elements and the stylesheet. */
  origin: string;
  check: (name: string) => void;
  fresh: (page: Page, html: string) => Promise<void>;
}

type Entry = { type: string; detail: unknown };
type SearchHost = HTMLElement & {
  component: (Record<string, unknown> & { element: HTMLElement; isExpanded: () => boolean }) | null;
  value: string;
  show: () => unknown;
  close: () => unknown;
  focus: () => void;
};
type LogWin = Window & { __log: Entry[] };

const ICON = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg>';
const COVER = `<div id="cover" style="position: relative; z-index: 9999; height: 300px; background: rgb(255, 0, 0)"></div>
  <button id="out" type="button">Outside</button>`;

export const checkSearch = async ({ browser, page, origin, check, fresh }: Context): Promise<void> => {
  const wait = (ms: number): Promise<unknown> => page.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), ms);
  // The surface moves in on a frame, then its transition
  const settle = (): Promise<unknown> => wait(400);
  const listen = (id: string): Promise<void> =>
    page.evaluate((id) => {
      const w = window as unknown as LogWin;
      w.__log = [];
      const el = document.getElementById(id) as HTMLElement;
      for (const type of ["input", "change", "select", "open", "close", "action"]) {
        el.addEventListener(type, (e) => w.__log.push({ type, detail: e instanceof CustomEvent ? e.detail : "native" }));
      }
    }, id);
  const log = (): Promise<Entry[]> => page.evaluate(() => (window as unknown as LogWin).__log.splice(0));
  /** The deepest focused element: the combobox, or its id or label. */
  const focused = (): Promise<string | null> =>
    page.evaluate(() => {
      let active = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      if (active?.getAttribute("role") === "combobox") return "combobox";
      return active ? active.id || active.getAttribute("aria-label") : null;
    });
  /** The search's state, as the page and the form see it. */
  const state = (id: string): Promise<Record<string, unknown>> =>
    page.evaluate((id) => {
      const el = document.getElementById(id) as SearchHost;
      const input = el.shadowRoot?.querySelector("input") as HTMLInputElement;
      const form = el.closest("form");
      return {
        value: el.value,
        text: input.value,
        form: form ? new FormData(form).get(el.getAttribute("name") ?? "") : undefined,
        open: el.component?.isExpanded() ?? null,
        attribute: el.hasAttribute("open"),
      };
    }, id);
  /** The open surface: where it is, how it looks, what it sits over. */
  const surface = (id: string): Promise<Record<string, unknown>> =>
    page.evaluate((id) => {
      const el = document.getElementById(id) as HTMLElement;
      const root = el.shadowRoot as ShadowRoot;
      const view = root.querySelector('[class*="search__surface"]') as HTMLElement;
      const r = view.getBoundingClientRect();
      const bar = (root.firstElementChild as HTMLElement).getBoundingClientRect();
      // The surface is only a box: the results and the scrim carry the look.
      const results = getComputedStyle(root.querySelector('[class*="search__content"]') as HTMLElement).backgroundColor;
      const scrim = getComputedStyle(view, "::backdrop").backgroundColor;
      const list = root.querySelector('[role="listbox"]') as HTMLElement;
      const l = list.getBoundingClientRect();
      const cover = (document.getElementById("cover") as HTMLElement).getBoundingClientRect();
      // Over the suggestions, where the cover is under the view.
      const hit = root.elementFromPoint(l.left + l.width / 2, l.top + Math.min(20, l.height / 2));
      return {
        inRoot: view.getRootNode() === root,
        popoverOpen: view.matches(":popover-open"),
        modal: view.matches(":modal"),
        styled: !["rgba(0, 0, 0, 0)", "rgb(255, 0, 0)"].includes(results) && scrim !== "rgba(0, 0, 0, 0)",
        overCover: l.bottom > cover.top && l.top < cover.bottom,
        above: !!hit && view.contains(hit),
        onBar: Math.abs(r.top - bar.top) < 1 && Math.abs(r.left - bar.left) < 1 && Math.abs(r.width - bar.width) < 1,
      };
    }, id);
  const DOCKED = { inRoot: true, popoverOpen: true, modal: false, styled: true, overCover: true, above: true, onBar: true };
  /** The option aria-activedescendant points at, by its value. */
  const active = (id: string): Promise<string | null> =>
    page.evaluate((id) => {
      const root = (document.getElementById(id) as HTMLElement).shadowRoot as ShadowRoot;
      const ref = root.querySelector("input")?.getAttribute("aria-activedescendant");
      return ref ? (root.getElementById(ref)?.getAttribute("data-value") ?? null) : null;
    }, id);
  /** The rendered suggestions' texts. */
  const options = (id: string): Promise<string[]> =>
    page.evaluate((id) => {
      const root = (document.getElementById(id) as HTMLElement).shadowRoot as ShadowRoot;
      return Array.from(root.querySelectorAll('[role="option"]')).map((o) => (o.textContent ?? "").trim());
    }, id);

  // ------------------------------------------------------------ docked
  await fresh(
    page,
    `<form id="qf"><fieldset id="qfs" style="border: 0; margin: 0; padding: 0"><label for="q" id="ql">Find</label>
       <div style="width: 480px"><m-search id="q" name="q" placeholder="Search fruit" aria-label="Find fruit" value="kiwi"
         trailing-icon='${ICON}' trailing-label="Voice">
         <m-search-suggestion value="apple" icon='${ICON}'>Apple</m-search-suggestion>
         <m-search-suggestion value="apricot">Apricot</m-search-suggestion>
         <m-search-suggestion value="banana" label="Banana"></m-search-suggestion>
       </m-search></div></fieldset></form>
     ${COVER}
     <div id="qfactory" style="width: 480px"></div>`
  );
  await listen("q");

  const semantics = await page.evaluate(() => {
    const el = document.getElementById("q") as SearchHost;
    const root = el.shadowRoot as ShadowRoot;
    const input = root.querySelector("input") as HTMLInputElement;
    const listbox = root.getElementById(input.getAttribute("aria-controls") ?? "");
    el.setAttribute("placeholder", "Fruit");
    const label = input.getAttribute("aria-label");
    return {
      role: input.getAttribute("role"),
      expanded: input.getAttribute("aria-expanded"),
      autocomplete: input.getAttribute("aria-autocomplete"),
      listbox: listbox?.getAttribute("role"),
      label,
      placeholder: input.placeholder,
    };
  });
  assert.deepEqual(semantics, {
    role: "combobox", expanded: "false", autocomplete: "list", listbox: "listbox", label: "Find fruit", placeholder: "Fruit",
  });
  assert.equal(await page.getByRole("combobox", { name: "Find fruit", exact: true }).count(), 1);
  check("search: a combobox named by aria-label, controlling its listbox in the shadow root; a new placeholder keeps the name");

  assert.deepEqual(await state("q"), { value: "kiwi", text: "kiwi", form: "kiwi", open: false, attribute: false });
  await page.evaluate(() => (document.getElementById("q") as HTMLElement).setAttribute("value", "fig"));
  const moved = await state("q");
  await page.evaluate(() => {
    (document.getElementById("q") as SearchHost).value = "";
    (document.getElementById("q") as HTMLElement).setAttribute("value", "plum");
  });
  assert.deepEqual({ moved: moved.value, dirty: (await state("q")).value, events: await log() }, { moved: "fig", dirty: "", events: [] });
  check("search: the value attribute is the default and the form value; set by script, the value stays; neither dispatches");

  const combobox = page.getByRole("combobox", { name: "Find fruit", exact: true });
  await combobox.click();
  await settle();
  assert.deepEqual(await surface("q"), DOCKED, "the docked view");
  assert.deepEqual(await log(), [{ type: "open", detail: null }]);
  assert.deepEqual(await state("q"), { value: "", text: "", form: "", open: true, attribute: true });
  check("search: the docked view opens in the top layer on the bar, :popover-open, styled, above z-index 9999; open once, reflected");

  await page.keyboard.type("ap");
  assert.deepEqual(await log(), [
    { type: "input", detail: { value: "a" } },
    { type: "input", detail: { value: "ap" } },
  ]);
  assert.equal((await state("q")).form, "ap");
  check("search: typing dispatches input per key, with the value, and the form value follows");

  await page.keyboard.press("ArrowDown");
  const path = [await active("q")];
  await page.keyboard.press("ArrowDown");
  path.push(await active("q"));
  await page.keyboard.press("ArrowDown");
  path.push(await active("q"));
  await page.keyboard.press("ArrowUp");
  path.push(await active("q"));
  assert.deepEqual(path, ["apple", "apricot", "banana", "apricot"]);
  await page.keyboard.press("Enter");
  await settle();
  // Enter on a highlighted suggestion is its selection, not a submit of "ap"
  assert.deepEqual(await log(), [{ type: "select", detail: { value: "apricot" } }, { type: "close", detail: null }]);
  assert.deepEqual(await state("q"), { value: "apricot", text: "apricot", form: "apricot", open: false, attribute: false });
  assert.equal(await focused(), "combobox", "focus stays on the combobox");
  check("search: arrows move aria-activedescendant through the suggestions; Enter selects one (select once, close once, no change); focus stays");

  await page.keyboard.press("Enter");
  assert.deepEqual(await log(), [{ type: "change", detail: { value: "apricot" } }]);
  check("search: Enter commits the query as change");

  await page.evaluate(() => void (document.getElementById("q") as SearchHost).show());
  await settle();
  await page.keyboard.press("Escape");
  await settle();
  const cleared = { events: await log(), state: await state("q") };
  await page.keyboard.press("Escape");
  await settle();
  assert.deepEqual(cleared, {
    events: [{ type: "open", detail: null }, { type: "input", detail: { value: "" } }],
    state: { value: "", text: "", form: "", open: true, attribute: true },
  });
  assert.deepEqual(await log(), [{ type: "close", detail: null }]);
  assert.equal(await focused(), "combobox", "focus stays on the combobox");
  check("search: show() opens it; Escape clears the query (input), then closes it once; focus stays on the combobox");

  await page.evaluate(() => void (document.getElementById("q") as SearchHost).show());
  await settle();
  await page.getByRole("button", { name: "Outside", exact: true }).click();
  await settle();
  assert.deepEqual(await log(), [{ type: "open", detail: null }, { type: "close", detail: null }]);
  assert.equal((await state("q")).attribute, false);
  check("search: a press outside closes the docked view once");

  // Declarations change under the open view: redrawn in place, once per batch
  await page.evaluate(() => void (document.getElementById("q") as SearchHost).show());
  await settle();
  await log();
  const before = await options("q");
  const edits = await page.evaluate(async () => {
    const el = document.getElementById("q") as SearchHost;
    const root = el.shadowRoot as ShadowRoot;
    const list = root.querySelector('[role="listbox"]') as HTMLElement;
    const component = el.component;
    const frame = (): Promise<unknown> => new Promise((r) => requestAnimationFrame(() => r(null)));
    const texts = (): string[] => Array.from(list.querySelectorAll('[role="option"]')).map((o) => (o.textContent ?? "").trim());
    let redraws = 0;
    new MutationObserver((records) => void (redraws += records.some((r) => r.removedNodes.length) ? 1 : 0))
      .observe(list, { childList: true });
    const suggestion = (value: string, text: string): HTMLElement => {
      const s = document.createElement("m-search-suggestion");
      s.setAttribute("value", value);
      s.textContent = text;
      return s;
    };
    el.append(suggestion("cherry", "Cherry"));
    await frame();
    const added = texts();
    // As an app filtering on each keystroke does: all replaced at once
    el.querySelectorAll("m-search-suggestion").forEach((s) => s.remove());
    el.append(suggestion("date", "Date"), suggestion("damson", "Damson"));
    await frame();
    const replaced = texts();
    const nodes = Array.from(list.children);
    // The same suggestions again: nothing to redraw
    el.querySelectorAll("m-search-suggestion").forEach((s) => s.remove());
    el.append(suggestion("date", "Date"), suggestion("damson", "Damson"));
    await frame();
    const kept = Array.from(list.children).every((node, i) => node === nodes[i]);
    el.querySelector('[value="date"]')?.remove();
    await frame();
    return {
      same: el.component === component,
      open: el.component?.isExpanded(),
      listbox: root.querySelector('[role="listbox"]') === list,
      added, replaced, kept, removed: texts(), redraws,
      status: root.querySelector('[role="status"]')?.textContent,
    };
  });
  assert.deepEqual(before, ["Apple", "Apricot", "Banana"]);
  assert.deepEqual(edits, {
    same: true, open: true, listbox: true,
    added: ["Apple", "Apricot", "Banana", "Cherry"],
    replaced: ["Date", "Damson"],
    kept: true,
    removed: ["Damson"],
    redraws: 3,
    status: "1 suggestion",
  });
  assert.deepEqual(await log(), [], "declarations changing dispatch nothing");
  check("search: suggestions added, replaced and removed while open update in place, one redraw per change, none when unchanged");

  await page.evaluate(() => void (document.getElementById("q") as SearchHost).close());
  await settle();
  await log();
  const model = await page.evaluate(() => {
    const el = document.getElementById("q") as SearchHost;
    const form = document.getElementById("qf") as HTMLFormElement;
    el.value = "melon";
    const set = new FormData(form).get("q");
    form.reset();
    const reset = el.value;
    el.setAttribute("value", "pear");
    return { set, reset, clean: el.value, form: new FormData(form).get("q") };
  });
  assert.deepEqual(model, { set: "melon", reset: "plum", clean: "pear", form: "pear" });
  assert.deepEqual(await log(), [], "a reset dispatches nothing");
  check("search: a reset returns to the value attribute, which moves the value again");

  await page.click("#ql");
  assert.equal(await focused(), "combobox", "a <label for> focuses the combobox");
  await settle();
  await page.evaluate(() => void (document.getElementById("q") as SearchHost).close());
  await settle();
  await page.focus("#out");
  await page.evaluate(() => (document.getElementById("q") as SearchHost).focus());
  assert.equal(await focused(), "combobox", "focus() focuses the combobox, not the leading button");
  await settle();
  await page.evaluate(() => void (document.getElementById("q") as SearchHost).close());
  await settle();
  const opens = (await log()).map((e) => e.type);
  assert.deepEqual(opens, ["open", "close", "open", "close"], "both open the view, as a click does");
  check("search: <label for> and focus() focus the combobox, which opens the view");

  const disabled = await page.evaluate(async () => {
    const el = document.getElementById("q") as SearchHost;
    const form = document.getElementById("qf") as HTMLFormElement;
    const input = el.shadowRoot?.querySelector("input") as HTMLInputElement;
    el.setAttribute("disabled", "");
    el.show();
    const own = { input: input.disabled, open: el.component?.isExpanded() };
    el.removeAttribute("disabled");
    (document.getElementById("qfs") as HTMLFieldSetElement).disabled = true;
    const fieldset = { input: input.disabled, form: new FormData(form).has("q"), matches: el.matches(":disabled") };
    (document.getElementById("qfs") as HTMLFieldSetElement).disabled = false;
    return { own, fieldset, after: input.disabled };
  });
  assert.deepEqual(disabled, {
    own: { input: true, open: false },
    fieldset: { input: true, form: false, matches: true },
    after: false,
  });
  check("search: disabled, by its attribute or a disabled fieldset, disables the input and does not open");

  const variant = await page.evaluate(() => {
    const el = document.getElementById("q") as SearchHost;
    const component = el.component;
    const root = component?.element as HTMLElement;
    el.setAttribute("variant", "divided");
    const divided = [root.className.includes("search--divided"), root.className.includes("search--contained")];
    el.setAttribute("full-width", "");
    const full = root.className.includes("search--full-width");
    el.removeAttribute("full-width");
    el.removeAttribute("variant");
    return { same: el.component === component, divided, full, contained: root.className.includes("search--contained") };
  });
  assert.deepEqual(variant, { same: true, divided: [true, false], full: true, contained: true });
  check("search: variant and full-width switch in place");

  const opened = await page.evaluate(() => {
    const el = document.getElementById("q") as HTMLElement;
    el.setAttribute("open", "");
    return (el as SearchHost).component?.isExpanded();
  });
  await settle();
  const byAttribute = await surface("q");
  await page.evaluate(() => (document.getElementById("q") as HTMLElement).removeAttribute("open"));
  await settle();
  assert.deepEqual({ opened, byAttribute, closed: (await state("q")).open }, { opened: true, byAttribute: DOCKED, closed: false });
  assert.deepEqual(await log(), [], "the attribute opening and closing it dispatches nothing");
  check("search: the open attribute opens and closes the view, silently");

  await page.getByRole("button", { name: "Voice", exact: true }).click();
  assert.deepEqual(await log(), [{ type: "action", detail: { value: "trailing-icon" } }]);
  check("search: a click on the trailing icon dispatches action");

  // The bar and the open view against the factory's, in light DOM
  const read = (id: string | null): Promise<Record<string, unknown>> =>
    page.evaluate((id) => {
      const w = window as unknown as { mtrl: { createSearch: (c: object) => Record<string, unknown> & { element: HTMLElement } }; __searchFactory?: { element: HTMLElement } };
      if (!id && !w.__searchFactory) {
        w.__searchFactory = w.mtrl.createSearch({
          placeholder: "Fruit", value: "pear",
          trailingItems: [{ id: "trailing-icon", type: "icon", content: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg>', ariaLabel: "Voice" }],
          suggestions: [{ text: "Damson", value: "damson" }],
        });
        (document.getElementById("qfactory") as HTMLElement).append(w.__searchFactory.element);
      }
      const root = id ? ((document.getElementById(id) as HTMLElement).shadowRoot?.firstElementChild as HTMLElement) : (w.__searchFactory as { element: HTMLElement }).element;
      const box = (selector: string): Record<string, unknown> => {
        const node = root.querySelector(selector) as HTMLElement;
        const r = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          width: Math.round(r.width), height: Math.round(r.height), background: style.backgroundColor,
          radius: style.borderRadius, font: style.font, color: style.color,
        };
      };
      return {
        surface: box('[class*="search__surface"]'),
        container: box('[class*="search__container"]'),
        input: box("input"),
        // Not its font: the global base gives buttons the page's, the shadow
        // root keeps the browser's, and the button holds only an icon.
        icon: { ...box('[class*="search__trailing-icon"]'), font: null },
        option: root.querySelector('[role="option"]') ? box('[role="option"]') : null,
      };
    }, id);
  await page.mouse.move(890, 690); // no hover state layer on either
  await settle();
  await read(null); // creates the factory, which draws its suggestions on a timer
  await wait(50);
  const barParity = { element: await read("q"), factory: await read(null) };
  assert.deepEqual(barParity.element, barParity.factory, "the bar");
  await page.evaluate(() => void (document.getElementById("q") as SearchHost).show());
  await settle();
  const elementView = await read("q");
  await page.evaluate(() => void (document.getElementById("q") as SearchHost).close());
  await settle();
  await page.evaluate(() => void ((window as unknown as { __searchFactory: { expand: () => unknown } }).__searchFactory.expand()));
  await settle();
  const factoryView = await read(null);
  await page.evaluate(() => void ((window as unknown as { __searchFactory: { collapse: () => unknown; destroy: () => void } }).__searchFactory.collapse()));
  await settle();
  assert.deepEqual(elementView, factoryView, "the open view");
  check("search: the bar and the open view render as the factory's in light DOM");

  // ------------------------------------------------------------ full screen
  await fresh(
    page,
    `<m-search id="qs" view-mode="fullscreen" aria-label="Search mail">
       <m-search-suggestion>Inbox</m-search-suggestion><m-search-suggestion>Drafts</m-search-suggestion>
     </m-search>
     ${COVER}`
  );
  await listen("qs");
  await page.getByRole("combobox", { name: "Search mail", exact: true }).click();
  await settle();
  const modal = await page.evaluate(() => {
    const root = (document.getElementById("qs") as HTMLElement).shadowRoot as ShadowRoot;
    const view = root.querySelector('[class*="search__surface"]') as HTMLElement;
    const out = document.getElementById("out") as HTMLButtonElement;
    out.focus();
    const r = view.getBoundingClientRect();
    return {
      modal: view.matches(":modal"),
      full: Math.round(r.width) === innerWidth && Math.round(r.height) === innerHeight,
      inert: document.activeElement !== out,
    };
  });
  assert.deepEqual(modal, { modal: true, full: true, inert: true });
  assert.equal(await focused(), "combobox", "the combobox keeps focus in the modal view");
  await page.keyboard.press("ArrowDown");
  assert.equal(await active("qs"), "Inbox");
  await page.keyboard.press("Escape");
  await settle();
  // Escape with a highlight but no query: the view closes
  assert.deepEqual(await log(), [{ type: "open", detail: null }, { type: "close", detail: null }]);
  const back = await page.evaluate(() => {
    const el = document.getElementById("qs") as SearchHost;
    const view = el.shadowRoot?.querySelector('[class*="search__surface"]') as HTMLElement;
    el.setAttribute("view-mode", "docked");
    return { modal: view.matches(":modal"), attribute: el.hasAttribute("open") };
  });
  assert.deepEqual(back, { modal: false, attribute: false });
  assert.equal(await focused(), "combobox", "focus returns to the combobox");
  await page.evaluate(() => void (document.getElementById("qs") as SearchHost).show());
  await settle();
  assert.deepEqual(await surface("qs"), DOCKED, "switched to docked in place");
  await page.evaluate(() => void (document.getElementById("qs") as SearchHost).close());
  await settle();
  check("search: full screen opens :modal over an inert page; Escape closes it once, focus back on the combobox; view-mode switches in place");

  // ------------------------------------------------------------ restore
  // Going back restores the query the user typed over the value attribute
  const [js, css] = await Promise.all([
    fetch(`${origin}/elements.js`).then((r) => r.text()),
    fetch(`${origin}/styles.css`).then((r) => r.text()),
  ]);
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/elements.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
      if (path === "/styles.css") return new Response(css, { headers: { "Content-Type": "text/css" } });
      if (path === "/away") return new Response("<!doctype html><p>away</p>", { headers: { "Content-Type": "text/html" } });
      return new Response(
        `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head>
<body><form><m-search id="rq" name="rq" value="kiwi" aria-label="Restored"></m-search></form><a id="go" href="/away">away</a>
<script type="module" src="/elements.js"></script></body></html>`,
        { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
      );
    },
  });
  try {
    const restorePage = await browser.newPage();
    await restorePage.goto(`http://127.0.0.1:${server.port}/`);
    await restorePage.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    await restorePage.evaluate(() => {
      const input = document.getElementById("rq")?.shadowRoot?.querySelector("input") as HTMLInputElement;
      input.value = "mango";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await restorePage.click("#go");
    await restorePage.waitForURL(/\/away$/);
    await restorePage.goBack();
    await restorePage.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    await restorePage
      .waitForFunction(() => (document.getElementById("rq") as SearchHost).value === "mango", undefined, { timeout: 5_000 })
      .catch(() => undefined);
    const restored = await restorePage.evaluate(() => (document.getElementById("rq") as SearchHost).value);
    await restorePage.close();
    assert.equal(restored, "mango", "going back restores the query over the value attribute");
    check("search: going back restores the query");
  } finally {
    server.stop(true);
  }
};
