// <m-datepicker> and <m-timepicker> in a real browser, for scripts/check-elements.ts.
//
// Each picker is checked inside another shadow root that holds its form, its
// opener and a <label for>, with a button on the page outside: the modal
// surface is :modal and styled with the page outside inert, the keyboard
// moves through the calendar and the dial, `change` fires once on confirm
// and never on cancel, focus returns to the trigger, the model's attribute is
// a default, the form sees the value, reset, restore and `required`, the
// limits and steps hold, and the field and surface match the factory's in
// light DOM.

import assert from "node:assert/strict";
import type { Browser, Page } from "playwright";

export interface PickerCheckContext {
  page: Page;
  browser: Browser;
  /** The fixture bundle, served again by the restore page. */
  js: string;
  fresh: (page: Page, html: string) => Promise<void>;
  check: (name: string) => void;
}

type Logged = Array<[string, unknown]>;
type PickerWin = Window & {
  __log: Logged;
  mtrl: Record<string, (config: object) => { element: HTMLElement; open: () => unknown; close: () => unknown; destroy: () => void }>;
};

export const checkPickers = async ({ page, browser, js, fresh, check }: PickerCheckContext): Promise<void> => {
  const wait = (ms: number): Promise<unknown> => page.evaluate((ms) => new Promise((r) => setTimeout(r, ms)), ms);

  /** The page: a button outside, and a shadow root with the markup, whose `#x` logs its events. */
  const stage = async (markup: string): Promise<void> => {
    await fresh(page, `<button id="outside" type="button" style="position:fixed;top:8px;left:700px">Outside</button>
      <div id="wrap"></div><section id="light" style="position:absolute;top:400px;left:0"></section>`);
    await page.evaluate((markup) => {
      const w = window as unknown as PickerWin;
      w.__log = [];
      const root = (document.getElementById("wrap") as HTMLElement).attachShadow({ mode: "open" });
      root.innerHTML = markup;
      const host = root.getElementById("x") as HTMLElement & { show: () => void };
      for (const type of ["change", "input", "open", "close"]) {
        host.addEventListener(type, (event) => void w.__log.push([type, (event as CustomEvent).detail]));
      }
      root.getElementById("opener")?.addEventListener("click", () => host.show());
    }, markup);
    await page.waitForFunction(() => {
      const host = document.getElementById("wrap")?.shadowRoot?.getElementById("x") as (HTMLElement & { component: unknown }) | null;
      return !!host?.component;
    });
  };

  /** The element's state: value, surface, reflected `open`, form value, events and the focused node. */
  const state = (): Promise<{
    value: string; open: boolean; modal: boolean; reflected: boolean; form: string | null; log: Logged; focus: string;
  }> =>
    page.evaluate(() => {
      const root = document.getElementById("wrap")?.shadowRoot as ShadowRoot;
      const host = root.getElementById("x") as HTMLElement & { value: string };
      const dialog = host.shadowRoot?.querySelector("dialog") as HTMLDialogElement;
      const form = root.getElementById("f") as HTMLFormElement | null;
      let active = document.activeElement;
      while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
      const node = active as HTMLElement | null;
      return {
        value: host.value,
        open: dialog.open,
        modal: dialog.matches(":modal"),
        reflected: host.hasAttribute("open"),
        form: form ? (new FormData(form).get("x") as string | null) : null,
        log: (window as unknown as PickerWin).__log.splice(0),
        focus: node?.dataset.date ?? node?.dataset.action ?? (node?.id || node?.className || node?.localName || ""),
      };
    });

  /** The page outside cannot take focus while a modal surface is open. */
  const outsideInert = (): Promise<boolean> =>
    page.evaluate(() => {
      const outside = document.getElementById("outside") as HTMLElement;
      outside.focus();
      return document.activeElement !== outside;
    });

  /** Size, colours and corner of a node, for the parity checks. */
  const metrics = (selector: string, inElement: boolean): Promise<Record<string, string | number>> =>
    page.evaluate(
      ({ selector, inElement }) => {
        const scope: ParentNode = inElement
          ? ((document.getElementById("wrap")?.shadowRoot?.getElementById("x") as HTMLElement).shadowRoot as ShadowRoot)
          : (document.getElementById("light") as HTMLElement);
        const node = scope.querySelector(selector) as HTMLElement;
        const box = node.getBoundingClientRect();
        const style = getComputedStyle(node);
        return {
          width: Math.round(box.width),
          height: Math.round(box.height),
          color: style.color,
          background: style.backgroundColor,
          radius: style.borderRadius,
          font: style.fontSize,
        };
      },
      { selector, inElement }
    );

  // ================================================================ <m-datepicker>
  const DATE_FORM = `<form id="f"><label for="x" id="lab">Date of birth</label>
    <m-datepicker id="x" name="x" variant="modal" label="Birthday" value="2026-09-10" min="2026-09-05" max="2026-10-20"></m-datepicker></form>`;
  const dateTrigger = (): ReturnType<Page["locator"]> => page.locator('#wrap #x [data-action="open"]').first();
  const dateAction = (action: string): ReturnType<Page["locator"]> => page.locator(`#wrap #x dialog [data-action="${action}"]`).first();

  await stage(DATE_FORM);
  {
    await dateTrigger().click();
    await wait(300);
    const opened = await state();
    const inert = await outsideInert();
    const styled = await page.evaluate(() => {
      const host = document.getElementById("wrap")?.shadowRoot?.getElementById("x") as HTMLElement;
      const dialog = host.shadowRoot?.querySelector("dialog") as HTMLDialogElement;
      const style = getComputedStyle(dialog);
      return { painted: style.backgroundColor !== "rgba(0, 0, 0, 0)", rounded: parseFloat(style.borderTopLeftRadius) > 0 };
    });
    assert.deepEqual(
      { ...opened, inert, styled },
      {
        value: "2026-09-10", open: true, modal: true, reflected: true, form: "2026-09-10",
        log: [["open", null]], focus: "2026-09-10", inert: true, styled: { painted: true, rounded: true },
      }
    );
    check("datepicker: the trigger opens the modal calendar as :modal, styled, with the page outside inert, on the selected day");

    const moves: string[] = [];
    for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End", "PageDown", "PageUp"]) {
      await page.keyboard.press(key);
      moves.push((await state()).focus);
    }
    assert.deepEqual(moves, [
      "2026-09-11", "2026-09-18", "2026-09-17", "2026-09-10", "2026-09-06", "2026-09-12", "2026-10-12", "2026-09-12",
    ]);
    check("datepicker: arrows, Home and End, Page Up and Page Down move through the calendar");

    const limits: string[] = [];
    for (const key of ["Home", "ArrowUp", "PageDown", "PageDown"]) {
      await page.keyboard.press(key);
      limits.push((await state()).focus);
    }
    const disabled = await page.evaluate(() => {
      const root = (document.getElementById("wrap")?.shadowRoot?.getElementById("x") as HTMLElement).shadowRoot as ShadowRoot;
      return (root.querySelector('[data-date="2026-10-21"]') as HTMLButtonElement | null)?.disabled;
    });
    assert.deepEqual({ limits, disabled }, { limits: ["2026-09-06", "2026-09-05", "2026-10-05", "2026-10-20"], disabled: true });
    check("datepicker: min and max hold the keyboard and disable the days beyond them");

    // A day chosen, then Cancel: nothing is committed.
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("Enter");
    await dateAction("cancel").click();
    await wait(200);
    const cancelled = await state();
    assert.deepEqual(cancelled, {
      value: "2026-09-10", open: false, modal: false, reflected: false, form: "2026-09-10", log: [["close", null]], focus: "open",
    });
    check("datepicker: Cancel commits nothing, dispatches no change, and focus returns to the trigger");

    await dateTrigger().click();
    await wait(200);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await wait(200);
    const escaped = await state();
    assert.deepEqual({ value: escaped.value, log: escaped.log, focus: escaped.focus }, {
      value: "2026-09-10", log: [["open", null], ["close", null]], focus: "open",
    });
    check("datepicker: Escape commits nothing");

    await dateTrigger().click();
    await wait(200);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await dateAction("confirm").click();
    await wait(200);
    const confirmed = await state();
    assert.deepEqual(confirmed, {
      value: "2026-09-11", open: false, modal: false, reflected: false, form: "2026-09-11",
      log: [["open", null], ["change", { value: "2026-09-11" }], ["close", null]], focus: "open",
    });
    check("datepicker: OK commits once: one change with the ISO date, the form value, focus back on the trigger");

    // The `open` attribute and the methods open and close it without dispatching.
    const attribute = await page.evaluate(() => {
      const host = document.getElementById("wrap")?.shadowRoot?.getElementById("x") as HTMLElement & { close: () => void };
      const dialog = host.shadowRoot?.querySelector("dialog") as HTMLDialogElement;
      host.setAttribute("open", "");
      const opened = dialog.matches(":modal");
      host.close();
      return { opened, closed: !dialog.open, reflected: host.hasAttribute("open") };
    });
    assert.deepEqual({ ...attribute, log: (await state()).log }, {
      opened: true, closed: true, reflected: false, log: [["close", null]],
    });
    check("datepicker: the open attribute opens it, close() closes it and removes the attribute");
  }

  // Model rule, form value, reset, validity and <label for>.
  await stage(DATE_FORM);
  {
    const run = (script: string): Promise<unknown> =>
      page.evaluate((script) => {
        const root = document.getElementById("wrap")?.shadowRoot as ShadowRoot;
        const host = root.getElementById("x") as HTMLElement & { value: string };
        const form = root.getElementById("f") as HTMLFormElement;
        return new Function("host", "form", script)(host, form);
      }, script);
    const clean = await run(`host.setAttribute("value", "2026-09-12"); return host.value;`);
    await dateTrigger().click();
    await wait(200);
    await page.locator('#wrap #x dialog [data-date="2026-09-15"]').first().click();
    await dateAction("confirm").click();
    await wait(200);
    const dirty = await run(`host.setAttribute("value", "2026-09-20"); return host.value;`);
    const reset = await run(`form.reset(); const after = host.value; host.setAttribute("value", "2026-09-21"); return [after, host.value];`);
    const scripted = await run(`host.value = "2026-09-08"; host.setAttribute("value", "2026-09-25"); return host.value;`);
    assert.deepEqual({ clean, dirty, reset, scripted }, {
      clean: "2026-09-12", dirty: "2026-09-15", reset: ["2026-09-20", "2026-09-21"], scripted: "2026-09-08",
    });
    check("datepicker: the value attribute moves a clean picker, not after a choice or a property set; reset returns to it");
    await page.evaluate(() => void (window as unknown as PickerWin).__log.splice(0));

    const values = await run(`
      const out = [];
      for (const v of ["2026-10-01", "2026-08-01", "2026-13-01", "10/01/2026", "2026-09-06/2026-09-07", ""]) { host.value = v; out.push(host.value); }
      return out;`);
    assert.deepEqual(values, ["2026-10-01", "", "", "", "", ""]);
    assert.deepEqual((await state()).log, []);
    check("datepicker: a property set dispatches nothing; a date outside min and max, or not an ISO date, empties it");

    const validity = await run(`
      host.value = "";
      host.setAttribute("required", "");
      const missing = [host.matches(":invalid"), form.checkValidity(), new FormData(form).get("x")];
      host.value = "2026-09-08";
      return [missing, host.matches(":invalid"), form.checkValidity(), new FormData(form).get("x")];`);
    assert.deepEqual(validity, [[true, false, ""], false, true, "2026-09-08"]);
    check("datepicker: required reports valueMissing while empty; the form submits the ISO date");

    await page.locator("#wrap #lab").click();
    const labelled = await state();
    assert.match(labelled.focus, /-datepicker-\d+-input$/);
    check("datepicker: a <label for> focuses its field");

    const disabled = await run(`
      host.setAttribute("disabled", "");
      const field = host.shadowRoot.querySelector("input");
      const trigger = host.shadowRoot.querySelector('[data-action="open"]');
      const off = [field.disabled, trigger.disabled];
      host.show();
      const opened = host.shadowRoot.querySelector("dialog").open;
      host.removeAttribute("disabled");
      const fieldset = document.createElement("fieldset");
      form.append(fieldset);
      fieldset.append(host);
      fieldset.disabled = true;
      return [off, opened, field.disabled || host.shadowRoot.querySelector("input").disabled];`);
    assert.deepEqual(disabled, [[true, true], false, true]);
    check("datepicker: disabled, and a disabled fieldset, disable the field and keep it closed");
  }

  // readonly
  await stage(`<form id="f"><m-datepicker id="x" name="x" variant="modal" label="Fixed" value="2026-09-10" readonly></m-datepicker></form>`);
  {
    /** Whether the calendar is open, closing it for the next attempt. */
    const opened = async (): Promise<boolean> => {
      const open = (await state()).open;
      if (open) await page.keyboard.press("Escape");
      return open;
    };
    const attempts: boolean[] = [];
    await dateTrigger().click();
    attempts.push(await opened());
    await page.locator("#wrap #x input").first().click();
    attempts.push(await opened());
    await page.keyboard.press("ArrowDown");
    attempts.push(await opened());
    const blocked = await page.evaluate(() => {
      const host = document.getElementById("wrap")?.shadowRoot?.getElementById("x") as HTMLElement & { show: () => void };
      host.show();
      host.setAttribute("open", "");
      return { open: !!host.shadowRoot?.querySelector("dialog")?.open, reflected: host.hasAttribute("open") };
    });
    const after = await state();
    assert.deepEqual({ attempts, ...blocked, value: after.value }, {
      attempts: [false, false, false], open: false, reflected: false, value: "2026-09-10",
    });
    check("datepicker: readonly keeps the calendar closed, from the trigger, the field, show() and the attribute");
  }

  // Docked: beside the field, not modal, each date committed.
  await stage(`<form id="f"><m-datepicker id="x" name="x" label="Docked" value="2026-09-10"></m-datepicker></form>`);
  {
    await dateTrigger().click();
    await wait(200);
    const docked = await page.evaluate(() => {
      const host = document.getElementById("wrap")?.shadowRoot?.getElementById("x") as HTMLElement;
      const root = host.shadowRoot as ShadowRoot;
      const dialog = root.querySelector("dialog") as HTMLDialogElement;
      const field = (root.querySelector("input") as HTMLElement).getBoundingClientRect();
      const box = dialog.getBoundingClientRect();
      return { open: dialog.open, modal: dialog.matches(":modal"), below: box.top >= field.bottom, shown: box.height > 200 };
    });
    await page.locator('#wrap #x dialog [data-date="2026-09-12"]').first().click();
    const chosen = await state();
    assert.deepEqual({ ...docked, value: chosen.value, form: chosen.form, log: chosen.log }, {
      open: true, modal: false, below: true, shown: true, value: "2026-09-12", form: "2026-09-12",
      log: [["open", null], ["change", { value: "2026-09-12" }]],
    });
    check("datepicker: the docked calendar opens below its field, not modal, and commits the date chosen");
  }

  // Range: an ISO interval.
  await stage(`<form id="f"><m-datepicker id="x" name="x" variant="modal" selection-mode="range" label="Stay"
    value="2026-09-10/2026-09-12"></m-datepicker></form>`);
  {
    const initial = await state();
    await dateTrigger().click();
    await wait(200);
    await page.locator('#wrap #x dialog [data-date="2026-09-14"]').first().click();
    await page.locator('#wrap #x dialog [data-date="2026-09-16"]').first().click();
    await dateAction("confirm").click();
    await wait(200);
    const chosen = await state();
    assert.deepEqual({ initial: [initial.value, initial.form], value: chosen.value, form: chosen.form, log: chosen.log }, {
      initial: ["2026-09-10/2026-09-12", "2026-09-10/2026-09-12"], value: "2026-09-14/2026-09-16", form: "2026-09-14/2026-09-16",
      log: [["open", null], ["change", { value: "2026-09-14/2026-09-16" }], ["close", null]],
    });
    check("datepicker: a range is a start/end interval, in the value, the form and change");
  }

  // Parity with the factory in light DOM: the field, then the open surface.
  await stage(`<form id="f"><m-datepicker id="x" name="x" variant="modal" label="Birthday" value="2026-09-10"></m-datepicker></form>`);
  {
    await page.evaluate(() => {
      const w = window as unknown as PickerWin;
      const picker = w.mtrl.createDatePicker({ variant: "modal", label: "Birthday", value: "2026-09-10" });
      (document.getElementById("light") as HTMLElement).append(picker.element);
      (window as unknown as Record<string, unknown>).__factory = picker;
    });
    const field = [await metrics('[class~="mtrl-datepicker__input"]', true), await metrics('[class~="mtrl-datepicker__input"]', false)];
    const label = [await metrics('[class~="mtrl-datepicker__label"]', true), await metrics('[class~="mtrl-datepicker__label"]', false)];
    await dateTrigger().click();
    await wait(400);
    const surface = await metrics("dialog", true);
    await page.keyboard.press("Escape");
    await page.evaluate(() => void ((window as unknown as Record<string, { open: () => void }>).__factory.open()));
    await wait(400);
    const factory = await metrics("dialog", false);
    await page.keyboard.press("Escape");
    assert.deepEqual([field[0], label[0], surface], [field[1], label[1], factory]);
    check("datepicker: the field and the open calendar render as the factory's in light DOM");
    await page.evaluate(() => (window as unknown as Record<string, { destroy: () => void }>).__factory.destroy());
  }

  // ================================================================ <m-timepicker>
  const TIME_FORM = `<form id="f"><button id="opener" type="button">Pick</button><label for="x" id="lab">Alarm time</label>
    <m-timepicker id="x" name="x" label="Alarm" format="24h" value="09:30" min="08:00" max="18:00" step="900"></m-timepicker></form>`;
  const timeButton = (name: string): ReturnType<Page["locator"]> => page.locator(`#wrap #x dialog [class~="mtrl-time-picker__${name}"]`).first();
  /** The dial's tab stop, focused. */
  const focusDial = (): Promise<void> =>
    page.evaluate(() => {
      const root = (document.getElementById("wrap")?.shadowRoot?.getElementById("x") as HTMLElement).shadowRoot as ShadowRoot;
      (root.querySelector('[role="option"][tabindex="0"]') as HTMLElement).focus();
    });
  const dial = (): Promise<{ draft: string; focused: string; disabled: string[] }> =>
    page.evaluate(() => {
      const host = document.getElementById("wrap")?.shadowRoot?.getElementById("x") as HTMLElement;
      const root = host.shadowRoot as ShadowRoot;
      // The draft, as the hour and minute boxes show it.
      const box = (name: string): string =>
        (root.querySelector(`[class~="mtrl-time-picker__${name}"]`)?.textContent ?? "").trim().padStart(2, "0");
      return {
        draft: `${box("hours")}:${box("minutes")}`,
        focused: root.activeElement?.textContent ?? "",
        disabled: [...root.querySelectorAll('[role="option"][aria-disabled="true"]')].map((o) => o.textContent ?? ""),
      };
    });

  await stage(TIME_FORM);
  {
    await page.locator("#wrap #opener").click();
    await wait(300);
    const opened = await state();
    const inert = await outsideInert();
    const styled = await page.evaluate(() => {
      const host = document.getElementById("wrap")?.shadowRoot?.getElementById("x") as HTMLElement;
      const style = getComputedStyle(host.shadowRoot?.querySelector("dialog") as HTMLDialogElement);
      return { painted: style.backgroundColor !== "rgba(0, 0, 0, 0)", rounded: parseFloat(style.borderTopLeftRadius) > 0 };
    });
    assert.deepEqual({ ...opened, focus: "", inert, styled }, {
      value: "09:30", open: true, modal: true, reflected: true, form: "09:30", log: [["open", null]], focus: "",
      inert: true, styled: { painted: true, rounded: true },
    });
    check("timepicker: show() opens the dialog as :modal, styled, with the page outside inert");

    await focusDial();
    const hours = [(await dial()).focused];
    for (const key of ["ArrowRight", "ArrowRight", "ArrowLeft"]) {
      await page.keyboard.press(key);
      hours.push((await dial()).focused);
    }
    const hourLimits = (await dial()).disabled;
    await page.keyboard.press("Enter");
    await wait(100);
    const afterHour = await dial();
    assert.deepEqual({ hours, hourLimits, draft: afterHour.draft }, {
      hours: ["9", "10", "11", "10"],
      hourLimits: ["00", "1", "2", "3", "4", "5", "6", "7", "19", "20", "21", "22", "23"],
      draft: "10:30",
    });
    check("timepicker: the dial's arrows move between hours and Enter picks one; hours outside min and max are disabled");

    await page.locator('#wrap #x dialog [class~="mtrl-time-picker__minutes"]').first().click();
    await wait(100);
    const minuteLimits = (await dial()).disabled;
    assert.deepEqual(minuteLimits, ["05", "10", "20", "25", "35", "40", "50", "55"]);
    check("timepicker: step 900 leaves the quarter hours on the minute dial");

    await timeButton("cancel").click();
    await wait(200);
    const cancelled = await state();
    assert.deepEqual({ ...cancelled, draft: (await dial()).draft }, {
      value: "09:30", open: false, modal: false, reflected: false, form: "09:30",
      log: [["input", { value: "10:30" }], ["close", null]], focus: "opener", draft: "09:30",
    });
    check("timepicker: Cancel commits nothing, dispatches no change, puts the dial back and returns focus to the opener");

    await page.locator("#wrap #opener").click();
    await wait(200);
    await focusDial();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await wait(200);
    const escaped = await state();
    assert.deepEqual({ value: escaped.value, log: escaped.log, draft: (await dial()).draft }, {
      value: "09:30", log: [["open", null], ["input", { value: "10:30" }], ["close", null]], draft: "09:30",
    });
    check("timepicker: Escape commits nothing and puts the dial back");

    await page.locator("#wrap #opener").click();
    await wait(200);
    await focusDial();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    const drafted = await state();
    assert.deepEqual({ value: drafted.value, form: drafted.form, log: drafted.log }, {
      value: "09:30", form: "09:30", log: [["open", null], ["input", { value: "10:30" }]],
    });
    check("timepicker: input carries the draft as the dial moves; change waits for OK");
    await timeButton("confirm").click();
    await wait(200);
    const confirmed = await state();
    assert.deepEqual(confirmed, {
      value: "10:30", open: false, modal: false, reflected: false, form: "10:30",
      log: [["change", { value: "10:30" }], ["close", null]], focus: "opener",
    });
    check("timepicker: OK commits once: one change with the 24-hour time, the form value, focus back on the opener");

    await page.locator("#wrap #opener").click();
    await wait(200);
    await timeButton("confirm").click();
    await wait(200);
    assert.deepEqual((await state()).log, [["open", null], ["close", null]]);
    check("timepicker: OK on the same time dispatches no change");

    // `format` changes in place and is not a change of value (FLO-281).
    const format = await page.evaluate(() => {
      const host = document.getElementById("wrap")?.shadowRoot?.getElementById("x") as HTMLElement & { component: unknown; value: string };
      const before = host.component;
      host.setAttribute("format", "12h");
      return { same: host.component === before, value: host.value };
    });
    assert.deepEqual({ ...format, log: (await state()).log }, { same: true, value: "10:30", log: [] });
    check("timepicker: format changes in place and dispatches nothing");
  }

  // Input mode typing, and seconds from a step under a minute.
  await stage(`<form id="f"><button id="opener" type="button">Pick</button>
    <m-timepicker id="x" name="x" type="input" format="24h" value="09:30:00" step="15"></m-timepicker></form>`);
  {
    const initial = await state();
    await page.locator("#wrap #opener").click();
    await wait(200);
    const field = (name: string): ReturnType<Page["locator"]> => page.locator(`#wrap #x dialog input[class~="mtrl-time-picker__${name}"]`).first();
    await field("hours").fill("11");
    await field("minutes").fill("45");
    await field("seconds").fill("20");
    await field("seconds").press("Enter");
    await timeButton("confirm").click();
    await wait(200);
    const typed = await state();
    const committed = typed.log.filter(([type]) => type !== "input");
    assert.deepEqual({ initial: initial.value, value: typed.value, form: typed.form, log: committed }, {
      initial: "09:30:00", value: "11:45:15", form: "11:45:15",
      log: [["open", null], ["change", { value: "11:45:15" }], ["close", null]],
    });
    check("timepicker: input mode takes typing; step 15 shows seconds and rounds them to the step");
  }

  // An empty picker: the first OK fills it, with a change, even on the time the dial opened on.
  await stage(`<form id="f"><button id="opener" type="button">Pick</button>
    <m-timepicker id="x" name="x" format="24h" required></m-timepicker></form>`);
  {
    const before = await state();
    const invalid = await page.evaluate(() => (document.getElementById("wrap")?.shadowRoot?.getElementById("x") as HTMLElement).matches(":invalid"));
    await page.locator("#wrap #opener").click();
    await wait(200);
    await timeButton("confirm").click();
    await wait(200);
    const after = await state();
    const valid = await page.evaluate(() => (document.getElementById("wrap")?.shadowRoot?.getElementById("x") as HTMLElement).matches(":valid"));
    const change = after.log.find(([type]) => type === "change");
    assert.deepEqual(
      { before: [before.value, before.form, invalid], filled: /^\d\d:\d\d$/.test(after.value), form: after.form === after.value, change, valid },
      { before: ["", "", true], filled: true, form: true, change: ["change", { value: after.value }], valid: true }
    );
    check("timepicker: an empty picker is valueMissing until OK fills it, with one change");
  }

  // Model rule, form value, reset, validity and <label for>.
  await stage(TIME_FORM);
  {
    const run = (script: string): Promise<unknown> =>
      page.evaluate((script) => {
        const root = document.getElementById("wrap")?.shadowRoot as ShadowRoot;
        const host = root.getElementById("x") as HTMLElement & { value: string };
        const form = root.getElementById("f") as HTMLFormElement;
        return new Function("host", "form", script)(host, form);
      }, script);
    const clean = await run(`host.setAttribute("value", "10:00"); return host.value;`);
    await page.locator("#wrap #opener").click();
    await wait(200);
    await focusDial();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await timeButton("confirm").click();
    await wait(200);
    const dirty = await run(`host.setAttribute("value", "12:00"); return host.value;`);
    const reset = await run(`form.reset(); const after = host.value; host.setAttribute("value", "13:00"); return [after, host.value];`);
    const scripted = await run(`host.value = "14:15"; host.setAttribute("value", "15:00"); return host.value;`);
    assert.deepEqual({ clean, dirty, reset, scripted }, {
      clean: "10:00", dirty: "11:00", reset: ["12:00", "13:00"], scripted: "14:15",
    });
    check("timepicker: the value attribute moves a clean picker, not after a choice or a property set; reset returns to it");
    await page.evaluate(() => void (window as unknown as PickerWin).__log.splice(0));

    const values = await run(`
      const out = [];
      for (const v of ["16:45", "25:00", "9:30", ""]) { host.value = v; out.push(host.value); }
      return out;`);
    assert.deepEqual({ values, log: (await state()).log }, { values: ["16:45", "", "", ""], log: [] });
    check("timepicker: a property set dispatches nothing; a value that is not HH:MM empties it");

    const validity = await run(`
      host.setAttribute("required", "");
      const missing = [host.matches(":invalid"), form.checkValidity(), new FormData(form).get("x")];
      host.value = "08:15";
      return [missing, host.matches(":invalid"), form.checkValidity(), new FormData(form).get("x")];`);
    assert.deepEqual(validity, [[true, false, ""], false, true, "08:15"]);
    check("timepicker: required reports valueMissing while empty; the form submits the time");

    await page.locator("#wrap #lab").click();
    await wait(200);
    const labelled = await state();
    await page.keyboard.press("Escape");
    await wait(200);
    assert.deepEqual({ open: labelled.open, modal: labelled.modal }, { open: true, modal: true });
    check("timepicker: a <label for> opens it");

    const disabled = await run(`
      host.setAttribute("disabled", "");
      host.show();
      const opened = host.shadowRoot.querySelector("dialog").open;
      host.setAttribute("open", "");
      return [opened, host.hasAttribute("open")];`);
    assert.deepEqual(disabled, [false, false]);
    check("timepicker: disabled keeps it closed, from show() and the attribute");
  }

  // Parity with the factory in light DOM: the open surface.
  await stage(`<form id="f"><button id="opener" type="button">Pick</button>
    <m-timepicker id="x" name="x" label="Alarm" format="24h" value="09:30"></m-timepicker></form>`);
  {
    await page.evaluate(() => {
      const w = window as unknown as PickerWin;
      const light = document.getElementById("light") as HTMLElement;
      const picker = w.mtrl.createTimePicker({ title: "Alarm", format: "24h", value: "09:30", container: light });
      light.append(picker.element);
      (window as unknown as Record<string, unknown>).__factory = picker;
    });
    await page.locator("#wrap #opener").click();
    await wait(400);
    const surface = await metrics("dialog", true);
    const face = await metrics('[class~="mtrl-time-picker__dial-face"]', true);
    await page.keyboard.press("Escape");
    await page.evaluate(() => void ((window as unknown as Record<string, { open: () => void }>).__factory.open()));
    await wait(400);
    const factory = await metrics("dialog", false);
    const factoryFace = await metrics('[class~="mtrl-time-picker__dial-face"]', false);
    await page.keyboard.press("Escape");
    assert.deepEqual([surface, face], [factory, factoryFace]);
    check("timepicker: the open dialog renders as the factory's in light DOM");
    await page.evaluate(() => (window as unknown as Record<string, { destroy: () => void }>).__factory.destroy());
  }

  // ================================================================ form restore
  // A page of its own, served no-store so going back reloads it and the browser
  // restores the form's state into it.
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      const path = new URL(request.url).pathname;
      if (path === "/elements.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
      if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"));
      if (path === "/away") return new Response("<!doctype html><p>away</p>", { headers: { "Content-Type": "text/html" } });
      return new Response(
        `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head>
<body><form><m-datepicker id="rd" name="rd" variant="modal" label="Restored date" value="2026-09-10"></m-datepicker>
<m-timepicker id="rt" name="rt" format="24h" value="09:30"></m-timepicker></form>
<a id="go" href="/away">away</a><script type="module" src="/elements.js"></script></body></html>`,
        { headers: { "Content-Type": "text/html", "Cache-Control": "no-store" } }
      );
    },
  });
  try {
    const restorePage = await browser.newPage();
    await restorePage.goto(`http://127.0.0.1:${server.port}/restore`);
    await restorePage.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    await restorePage.locator('#rd [data-action="open"]').click();
    await restorePage.locator('#rd dialog [data-date="2026-09-17"]').first().click();
    await restorePage.locator('#rd dialog [data-action="confirm"]').click();
    await restorePage.evaluate(() => {
      const time = document.getElementById("rt") as HTMLElement & { show: () => void };
      time.show();
    });
    await restorePage.locator('#rt dialog [role="option"][tabindex="0"]').focus();
    await restorePage.keyboard.press("ArrowRight");
    await restorePage.keyboard.press("Enter");
    await restorePage.locator('#rt dialog [class~="mtrl-time-picker__confirm"]').click();
    await restorePage.click("#go");
    await restorePage.waitForURL(/\/away$/);
    await restorePage.goBack();
    await restorePage.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);
    const read = (): string[] => ["rd", "rt"].map((id) => (document.getElementById(id) as HTMLElement & { value: string }).value);
    await restorePage.waitForFunction(() => {
      const date = document.getElementById("rd") as HTMLElement & { value: string };
      return date.value === "2026-09-17";
    }, undefined, { timeout: 5_000 }).catch(() => undefined);
    const restored = await restorePage.evaluate(read);
    await restorePage.close();
    assert.deepEqual(restored, ["2026-09-17", "10:30"], "going back restores the date and the time the user chose over their attributes");
    check("pickers: going back restores the date and the time chosen");
  } finally {
    server.stop(true);
  }
};
