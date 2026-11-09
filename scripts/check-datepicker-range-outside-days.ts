/** Outside-month dates keep their range band, muted text and endpoint caps.
 * Regression reported 2026-11-09: Sep 28–Oct 9, 2025 while viewing October.
 * The owner requested a continuous band across visible adjacent-month dates.
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium, type Page } from "playwright";
import * as sass from "sass";
import type createDatePicker from "../src/components/datepicker";
import { baseStyles, componentStyles } from "./style-manifest";

type PickerWindow = Window & {
  core: { createDatePicker: typeof createDatePicker };
  picker: ReturnType<typeof createDatePicker>;
};

export async function checkDatePickerRangeOutsideDays(page: Page, artifacts?: string): Promise<void> {
  const failures: string[] = [];
  let checks = 0;
  const check = (name: string, pass: boolean) => { checks++; if (!pass) failures.push(name); };
  await page.setViewportSize({ width: 800, height: 850 });
  for (const variant of ["docked", "modal"] as const) {
    for (const side of ["start", "end", "single"] as const) {
      const name = `${variant}/${side}`;
      await page.evaluate(({ variant, side }) => {
        const state = window as unknown as PickerWindow;
        state.picker?.destroy();
        document.body.replaceChildren();
        state.picker = state.core.createDatePicker({
          variant, animate: false, locale: "en-US",
          selectionMode: side === "single" ? "single" : "range",
          value: side === "end" ? ["2025-10-24", "2025-11-02"]
            : side === "start" ? ["2025-09-28", "2025-10-09"] : "2025-09-28",
        });
        document.body.append(state.picker.element);
        state.picker.calendar.goToDate(new Date(2025, 9, 15));
        state.picker.open();
      }, { variant, side });
      const grid = page.getByRole("grid", { name: "October 2025", exact: true });
      await grid.waitFor({ state: "visible" });
      const report = await grid.evaluate((grid, side) => {
        const read = (date: string) => {
          const day = grid.querySelector<HTMLElement>(`[data-date="${date}"]`)!;
          const cell = day.parentElement!;
          const style = getComputedStyle(cell);
          return {
            date, band: cell.classList.contains("mtrl-datepicker__cell--range"),
            start: cell.classList.contains("mtrl-datepicker__cell--range-start"),
            end: cell.classList.contains("mtrl-datepicker__cell--range-end"),
            outside: day.classList.contains("mtrl-datepicker__day--outside"),
            selected: day.classList.contains("mtrl-datepicker__day--selected"),
            ariaSelected: day.getAttribute("aria-selected"), color: getComputedStyle(day).color,
            background: style.backgroundImage, size: style.backgroundSize,
            circle: getComputedStyle(day, "::before").backgroundColor,
          };
        };
        return {
          middle: (side === "end" ? ["2025-11-01"] : ["2025-09-29", "2025-09-30"]).map(read),
          cap: read(side === "end" ? "2025-11-02" : "2025-09-28"),
          outside: read(side === "end" ? "2025-11-03" : "2025-11-01"),
          inside: read(side === "end" ? "2025-10-31" : "2025-10-01"),
          rangeCount: grid.querySelectorAll(".mtrl-datepicker__cell--range").length,
        };
      }, side);
      console.log(`Outside range ${name}: ${JSON.stringify(report)}`);
      check(`${name}: outside control remains unbanded`, report.outside.outside && !report.outside.band && report.outside.background === "none");
      if (side === "single") {
        check(`${name}: single-date cells have no range classes`, report.rangeCount === 0 && !report.cap.start && !report.cap.end && report.cap.background === "none");
        check(`${name}: selected outside day retains its circle`, report.cap.outside && report.cap.selected && report.cap.ariaSelected === "true" && !["transparent", "rgba(0, 0, 0, 0)"].includes(report.cap.circle));
        check(`${name}: adjacent days stay unselected`, report.middle.every(day => day.ariaSelected === "false" && !day.band));
      } else {
        check(`${name}: in-month control has a painted band`, report.inside.band && report.inside.background !== "none");
        for (const day of report.middle) {
          check(`${name}/${day.date}: outside day is in range`, day.outside && day.band && day.ariaSelected === "true");
          check(`${name}/${day.date}: background continues the band`, day.background !== "none" && day.background === report.inside.background && day.size === "auto");
          check(`${name}/${day.date}: text stays muted`, day.color === report.outside.color && day.color !== report.inside.color);
        }
        check(`${name}: outside endpoint has the correct half-band cap`, report.cap.outside && report.cap.band && report.cap[side] && !report.cap[side === "start" ? "end" : "start"] && report.cap.background !== "none" && report.cap.size === "50% 100%");
        check(`${name}: endpoint circle stays selected`, report.cap.selected && report.cap.ariaSelected === "true" && !["transparent", "rgba(0, 0, 0, 0)"].includes(report.cap.circle));
      }
      if (artifacts) {
        await mkdir(artifacts, { recursive: true });
        await page.screenshot({ path: join(artifacts, `datepicker-outside-${variant}-${side}.png`), animations: "disabled" });
      }
    }
  }
  await page.evaluate(() => (window as unknown as PickerWindow).picker.destroy());
  console.log(`Outside-month range checks: ${checks}; failures: ${JSON.stringify(failures)}`);
  assert.deepEqual(failures, [], "Visible outside-month dates retain range styling and single-date behavior");
}

// One source entry and selective datepicker CSS; no library build required.
if (import.meta.main) {
  const built = await Bun.build({ entrypoints: ["src/components/datepicker/index.ts"], target: "browser" });
  assert(built.success, String(built.logs));
  const css = sass.compileString([...baseStyles, componentStyles.datepicker.source].map(source => `@use "${source}";`).join("\n"), {
    loadPaths: [resolve("src/styles")], logger: sass.Logger.silent,
  }).css;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setContent('<!doctype html><html data-theme="baseline" data-theme-mode="light"><head></head><body></body></html>');
    await page.addStyleTag({ content: css });
    await page.evaluate(async entry => {
      (window as unknown as PickerWindow).core = { createDatePicker: (await import(entry)).default };
    }, `data:text/javascript;base64,${Buffer.from(await built.outputs[0].text()).toString("base64")}`);
    await checkDatePickerRangeOutsideDays(page, resolve("tmp/datepicker-range-outside-days", process.env.RANGE_CHECK_LABEL ?? "run"));
    assert.deepEqual(errors, [], "datepicker browser errors");
  } finally { await browser.close(); }
}
