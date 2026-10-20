/** Enter on a focused day accepts a single date and returns focus to the field. */
import assert from "node:assert/strict";
import { chromium, type Page } from "playwright";
import type createDatePicker from "../src/components/datepicker";
import type { DatePickerVariant } from "../src/components/datepicker";

type EnterWindow = Window & {
  core: { createDatePicker: typeof createDatePicker };
  enterPicker: ReturnType<typeof createDatePicker>;
  enterHost: HTMLElement;
  enterEvents: string[];
};

const mount = async (page: Page, variant: DatePickerVariant, shadow: boolean, closeOnSelect: boolean, range = false) => {
  await page.evaluate(({ variant, shadow, closeOnSelect, range }) => {
    const state = window as unknown as EnterWindow;
    const host = document.createElement("div"); host.dir = "ltr";
    document.body.append(host);
    const root = shadow ? host.attachShadow({ mode: "open" }) : host;
    if (shadow) for (const style of document.querySelectorAll("style")) root.append(style.cloneNode(true));
    state.enterHost = host; state.enterEvents = [];
    state.enterPicker = state.core.createDatePicker({
      variant, closeOnSelect, animate: false,
      selectionMode: range ? "range" : "single",
      value: range ? ["2026-09-10", "2026-09-15"] : "2026-09-15",
    });
    state.enterPicker.element.id = "enter-picker";
    root.append(state.enterPicker.element);
    state.enterPicker.on("change", value => state.enterEvents.push(`change:${value.iso}`));
    state.enterPicker.on("close", () => state.enterEvents.push("close"));
    state.enterPicker.input.focus();
  }, { variant, shadow, closeOnSelect, range });
  await page.keyboard.press("ArrowDown");
  if (variant === "modal-input") await page.locator('#enter-picker [data-action="toggle-mode"]').click();
};
const snapshot = (page: Page) => page.evaluate(() => {
  const { enterPicker: picker, enterEvents: events } = window as unknown as EnterWindow;
  const root = picker.element.getRootNode() as Document | ShadowRoot;
  const active = root.activeElement as HTMLElement | null;
  return {
    open: picker.isOpen(), nativeOpen: picker.element.querySelector("dialog")!.open,
    value: picker.getFormattedValue(), focusedDay: active?.dataset.date ?? null,
    fieldFocused: active === picker.input, expanded: picker.element.querySelector('[data-action="open"]')!.getAttribute("aria-expanded"),
    events: [...events],
  };
});
const cleanup = (page: Page) => page.evaluate(() => {
  const state = window as unknown as EnterWindow;
  state.enterPicker.destroy(); state.enterHost.remove();
});

/** Runs in core:check against the packed factory, or directly against source below. */
export async function checkDatePickerEnter(page: Page): Promise<void> {
  const results: { name: string; before: Awaited<ReturnType<typeof snapshot>>; after: Awaited<ReturnType<typeof snapshot>> }[] = [];
  for (const variant of ["docked", "modal", "modal-input", "fullscreen"] as const) {
    for (const shadow of [false, true]) {
      for (const closeOnSelect of [false, true]) {
        const name = `${variant}; ${shadow ? "shadow" : "document"}; closeOnSelect=${closeOnSelect}`;
        await mount(page, variant, shadow, closeOnSelect);
        try {
          await page.keyboard.press("ArrowRight");
          const before = await snapshot(page);
          assert.equal(before.focusedDay, "2026-09-16", `${name}: a day really has keyboard focus`);
          assert.equal(before.open, true);
          await page.keyboard.press("Enter");
          const after = await snapshot(page);
          console.log(`datepicker Enter ${name}: ${JSON.stringify(after)}`);
          results.push({ name, before, after });
        } finally { await cleanup(page); }
      }
    }
  }
  // Report every variant on main before failing, so both failing default
  // settings and the working closeOnSelect controls are measured together.
  const failed = results.filter(({ after }) => after.open || after.nativeOpen || !after.fieldFocused || after.value !== "09/16/2026" || after.expanded !== "false" || after.events.join(",") !== "change:2026-09-16,close");
  assert.deepEqual(failed.map(result => result.name), [], "Enter must commit once, close the calendar and restore field focus");

  // Enter still selects range endpoints as a button activation. It must not
  // accept an incomplete range; default modal ranges retain their OK boundary.
  for (const variant of ["docked", "modal"] as const) {
    for (const closeOnSelect of [false, true]) {
      await mount(page, variant, false, closeOnSelect, true);
      try {
        await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
        const start = await snapshot(page);
        assert.equal(start.open, true, "the first range endpoint keeps the calendar open");
        assert.deepEqual(start.events, [], "an incomplete range is never committed");
        await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
        const end = await snapshot(page);
        assert.equal(end.open, !closeOnSelect, `${variant}: range closeOnSelect is preserved`);
        if (!closeOnSelect) {
          if (variant === "modal") {
            assert.deepEqual(end.events, [], "the complete modal range is a draft until OK");
            await page.locator('#enter-picker [data-action="confirm"]').click();
          } else await page.keyboard.press("Escape");
        }
        const accepted = await snapshot(page);
        assert.deepEqual(accepted.events, ["change:2026-09-11/2026-09-12", "close"]);
        assert.equal(accepted.fieldFocused, true);
        assert.equal(accepted.value, "09/11/2026 - 09/12/2026");
      } finally { await cleanup(page); }
    }
  }
  console.log("Passed datepicker Enter: 16 single-date cases save once, close and restore field focus; four range controls preserve endpoint selection and confirmation.");
}

// Build first for CSS, then: bun run scripts/check-datepicker-enter.ts
if (import.meta.main) {
  const bundle = await Bun.build({ entrypoints: ["src/components/datepicker/index.ts"], target: "browser" });
  assert(bundle.success, String(bundle.logs));
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 800, height: 850 } });
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addStyleTag({ content: await Bun.file("dist/styles.css").text() });
    await page.evaluate(async entry => {
      (window as unknown as EnterWindow).core = { createDatePicker: (await import(entry)).default };
    }, `data:text/javascript;base64,${Buffer.from(await bundle.outputs[0].text()).toString("base64")}`);
    await checkDatePickerEnter(page);
    assert.deepEqual(errors, [], "datepicker page errors");
  } finally { await browser.close(); }
}
