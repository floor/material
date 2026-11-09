/** Locale and accessible-name integration, on the packed picker in a browser. */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createDatePicker from "../src/components/datepicker";

type PickerWindow = Window & { core: { createDatePicker: typeof createDatePicker }; picker: ReturnType<typeof createDatePicker> };

export async function checkDatePickerLocale(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = window as unknown as PickerWindow;
    state.picker?.destroy();
    document.body.replaceChildren();
    state.picker = state.core.createDatePicker({ variant: "modal", locale: "fr-FR", label: "Départ", ariaLabel: "Choisir le jour", value: "2026-09-15" });
    document.body.append(state.picker.element);
    state.picker.open();
  });
  const dialog = page.getByRole("dialog", { name: "Choisir le jour", exact: true });
  assert.equal(await dialog.count(), 1);
  const grid = dialog.getByRole("grid", { name: "septembre 2026", exact: true });
  assert.equal(await grid.getByRole("columnheader", { name: "lundi", exact: true }).textContent(), "L");
  assert.equal(await grid.locator("[data-date]").first().getAttribute("data-date"), "2026-08-31");
  const name = await page.evaluate(() => new Intl.DateTimeFormat("fr-FR", { weekday: "long", year: "numeric", month: "long", day: "numeric", calendar: "gregory", numberingSystem: "latn" }).format(new Date(2026, 8, 15)));
  const selected = grid.getByRole("gridcell", { name, exact: true });
  assert.equal(await selected.count(), 1);
  assert.equal(await selected.getAttribute("aria-selected"), "true");
  assert.equal(await selected.getAttribute("aria-pressed"), null);
  assert.equal(await selected.locator("..").getAttribute("role"), null);
  assert.equal(await grid.getByRole("button", { name, exact: true }).count(), 0);
  assert.equal(await page.evaluate(() => (window as unknown as PickerWindow).picker.getFormattedValue()), "15/09/2026");
  await grid.locator('[data-date="2026-09-16"]').focus();
  await page.keyboard.press("Home");
  assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.date), "2026-09-14");
  await grid.locator('[data-date="2026-09-16"]').focus();
  await page.keyboard.press("End");
  assert.equal(await page.evaluate(() => (document.activeElement as HTMLElement).dataset.date), "2026-09-20");
  assert.equal(await grid.locator('[data-date="2026-09-20"]').getAttribute("aria-selected"), "false");
  assert.equal(await selected.getAttribute("aria-selected"), "true");
  assert.equal(await page.evaluate(() => {
    const state = window as unknown as PickerWindow;
    const focused = document.activeElement;
    const dialog = state.picker.element.querySelector("dialog");
    state.picker.setAriaLabel("Nouveau nom");
    return document.activeElement === focused && state.picker.element.querySelector("dialog") === dialog;
  }), true);
  assert.equal(await page.getByRole("dialog", { name: "Nouveau nom", exact: true }).count(), 1);
  await page.evaluate(() => { (window as unknown as PickerWindow).picker.setAriaLabel(""); });
  assert.equal(await page.getByRole("dialog", { name: "Départ", exact: true }).count(), 1);
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    const state = window as unknown as PickerWindow;
    state.picker.destroy();
    state.picker = state.core.createDatePicker({ variant: "modal", locale: "fr-FR", selectionMode: "range", value: ["2026-09-10", "2026-09-15"] });
    document.body.append(state.picker.element);
    state.picker.open();
  });
  const middle = page.locator('[role="grid"]:not([aria-hidden]) [data-date="2026-09-12"]');
  assert.equal(await middle.getAttribute("role"), "gridcell");
  assert.equal(await middle.getAttribute("aria-selected"), "true");
  assert.equal(await middle.getAttribute("aria-pressed"), null);
  assert.equal(await page.evaluate(() => (window as unknown as PickerWindow).picker.getFormattedValue()), "10/09/2026 - 15/09/2026");
  await page.evaluate(() => (window as unknown as PickerWindow).picker.destroy());
  console.log("Passed packed localized date picker: French names and Monday-first keyboard navigation, selected day/range gridcells, no duplicate pressed button, in-place dialog naming and focus retention.");
}
