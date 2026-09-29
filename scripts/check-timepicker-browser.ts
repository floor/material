/** Verify Time Picker's packed markup, selectors and BEM stylesheet together. */
import assert from "node:assert/strict";
import { join } from "node:path";
import type { Page } from "playwright";
import { TIME_FORMAT, TIME_PICKER_ORIENTATION } from "../src/components/timepicker/types";
import type createTimePicker from "../src/components/timepicker";

type TimePickerWindow = Window & {
  createTimePicker: typeof createTimePicker;
  timePicker: ReturnType<typeof createTimePicker>;
  confirmedTime: string | undefined;
  openingInput: HTMLInputElement;
  timeChanges: string[];
};

export async function checkTimePicker(page: Page, artifacts: string): Promise<void> {
  await page.setViewportSize({ width: 1000, height: 900 });
  await page.emulateMedia({ colorScheme: "light" });
  await page.evaluate(() => {
    const state = window as unknown as TimePickerWindow;
    document.body.replaceChildren();
    document.documentElement.setAttribute("data-theme", "material");
    document.documentElement.setAttribute("data-theme-mode", "light");
    state.confirmedTime = undefined;
    state.timePicker = state.createTimePicker({ title: "Appointment", value: "09:30", name: "appointment", type: "input" as never });
    const form = document.createElement("form");
    form.append(state.timePicker.element);
    document.body.append(form);
    state.timeChanges = [];
    state.timePicker.on("change", value => { state.timeChanges.push(value); });
    state.timePicker.on("confirm", value => { state.confirmedTime = value; });
    state.timePicker.open();
    // Edit in the same task as open(), before the former 50ms redraw.
    state.openingInput = state.timePicker.dialogElement.querySelector<HTMLInputElement>('[data-type="minute"]')!;
    state.openingInput.focus();
    state.openingInput.value = "35";
    state.openingInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
  // Cross the old redraw deadline and verify the actual input survives.
  await page.waitForTimeout(100);
  assert.deepEqual(await page.evaluate(() => {
    const state = window as unknown as TimePickerWindow;
    return {
      connected: state.openingInput.isConnected,
      focused: document.activeElement === state.openingInput,
      value: state.timePicker.getValue(),
      submitted: new FormData(document.querySelector("form")!).get("appointment"),
      changes: state.timeChanges,
    };
  }), { connected: true, focused: true, value: "09:35", submitted: "09:35", changes: ["09:35"] });
  const dialog = page.locator(".mtrl-time-picker__dialog");
  await dialog.waitFor();
  const styles = await dialog.evaluate(element => {
    const style = (selector: string) => getComputedStyle(element.querySelector(selector)!);
    return {
      dialog: getComputedStyle(element).display,
      radius: getComputedStyle(element).borderRadius,
      content: style(".mtrl-time-picker__content").display,
      inputs: style(".mtrl-time-picker__input-container").display,
      faceWidth: style(".mtrl-time-picker__dial-face").width,
      periodDirection: style(".mtrl-time-picker__period").flexDirection,
      actions: style(".mtrl-time-picker__actions").display,
      buttons: style(".mtrl-time-picker__action-buttons").gap,
    };
  });
  assert.deepEqual(styles, { dialog: "flex", radius: "28px", content: "flex", inputs: "flex", faceWidth: "256px", periodDirection: "column", actions: "flex", buttons: "8px" });
  // FLO-279: the DOM dial. Its hand, handle and on-primary labels sit where the
  // value is, the 24h rings are right at noon and midnight, the keyboard selects,
  // a drag picks and moves on to minutes, and the spring takes the short way.
  const hand = () => dialog.locator(".mtrl-time-picker__dial-face").evaluate(face => {
    const f = face.getBoundingClientRect(), h = face.querySelector(".mtrl-time-picker__dial-handle")!.getBoundingClientRect();
    const dx = h.left + h.width / 2 - (f.left + f.width / 2), dy = h.top + h.height / 2 - (f.top + f.height / 2);
    return { angle: Math.round((Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360), radius: Math.round(Math.hypot(dx, dy)), label: face.getAttribute("aria-label"), selected: face.querySelector('[aria-selected="true"]')?.getAttribute("aria-label") ?? null };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await dialog.locator(".mtrl-time-picker__toggle-type").click();
  await dialog.locator(".mtrl-time-picker__hours").click();
  assert.deepEqual(await hand(), { angle: 270, radius: 101, label: "Hour", selected: "9 o'clock" }, "9:35 puts the hand at nine, on the outer ring");
  // FLO-283: in dial mode the boxes are radios, filled primary-container when
  // checked; the arrows move the check, the focus and the dial.
  const selector = (unit: string) => dialog.locator(`.mtrl-time-picker__${unit}`).evaluate(element => {
    // Painted, so rgb() and color(srgb ...) serialisations compare equal.
    const pixel = (css: string) => { const context = document.createElement("canvas").getContext("2d")!; context.fillStyle = css; context.fillRect(0, 0, 1, 1); return context.getImageData(0, 0, 1, 1).data.join(); };
    const colour = (name: string) => { const probe = document.createElement("i"); probe.style.color = `var(--mtrl-sys-color-${name})`; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return pixel(c); };
    const style = getComputedStyle(element);
    const painted = pixel(style.backgroundColor);
    const fill = painted === colour("primary-container") ? "primary-container" : painted === colour("surface-container-highest") ? "surface-container-highest" : style.backgroundColor;
    return { tag: element.tagName, role: element.getAttribute("role"), checked: element.getAttribute("aria-checked"), name: element.getAttribute("aria-label"), fill, radius: style.borderRadius, ring: style.outlineStyle === "none" ? "none" : `${style.outlineWidth} ${style.outlineStyle}` };
  });
  await page.mouse.move(0, 0);
  assert.deepEqual(await selector("hours"), { tag: "BUTTON", role: "radio", checked: "true", name: "Select hour: 9 o'clock", fill: "primary-container", radius: "8px", ring: "none" }, "the hour box is a checked radio, filled, with no ring after a click");
  assert.deepEqual(await selector("minutes"), { tag: "BUTTON", role: "radio", checked: "false", name: "Select minutes: 35 minutes", fill: "surface-container-highest", radius: "8px", ring: "none" }, "the minute box is an unchecked radio");
  await dialog.locator(".mtrl-time-picker__minutes").hover();
  assert.ok(await dialog.locator(".mtrl-time-picker__minutes").evaluate(element => {
    const pixel = (css: string) => { const probe = document.createElement("i"); probe.style.color = css; document.body.append(probe); const context = document.createElement("canvas").getContext("2d")!; context.fillStyle = getComputedStyle(probe).color; probe.remove(); context.fillRect(0, 0, 1, 1); return context.getImageData(0, 0, 1, 1).data.join(); };
    return pixel(getComputedStyle(element).backgroundColor) === pixel("color-mix(in srgb, var(--mtrl-sys-color-on-surface) 8%, var(--mtrl-sys-color-surface-container-highest))");
  }), "hovering an unchecked box lays on-surface at 8% over its container");
  await dialog.locator(".mtrl-time-picker__hours").focus();
  await page.mouse.move(0, 0);
  await page.keyboard.press("ArrowRight");
  assert.equal(await page.evaluate(() => document.activeElement?.getAttribute("data-type")), "minute", "ArrowRight moves the focus to minutes");
  assert.deepEqual(await selector("minutes").then(({ checked, ring }) => ({ checked, ring })), { checked: "true", ring: "3px solid" }, "and checks it, with the focus ring");
  assert.equal((await hand()).label, "Minute", "the dial turns to minutes");
  await page.keyboard.press("ArrowLeft");
  assert.equal((await hand()).label, "Hour", "ArrowLeft goes back to hours");
  const stop = dialog.locator('.mtrl-time-picker__dial-number[tabindex="0"]');
  await stop.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
  assert.equal(await page.locator('input[name="appointment"]').inputValue(), "10:35", "the keyboard selects on the dial");
  const face = (await dialog.locator(".mtrl-time-picker__dial-face").boundingBox())!;
  await page.mouse.move(face.x + 128, face.y + 28); await page.mouse.down();
  await page.mouse.move(face.x + 228, face.y + 128); await page.mouse.up();
  assert.equal(await page.locator('input[name="appointment"]').inputValue(), "03:35", "a drag to three o'clock picks 3");
  await page.waitForFunction(() => document.querySelector(".mtrl-time-picker__dial-face")?.getAttribute("aria-label") === "Minute");
  assert.equal((await hand()).selected, "35 minutes", "then the dial moves on to minutes");
  assert.equal((await selector("minutes")).checked, "true", "and checks the minute box");
  await page.evaluate(() => (window as unknown as TimePickerWindow).timePicker.setFormat("24h" as never).setValue("12:00"));
  await dialog.locator(".mtrl-time-picker__hours").click();
  assert.deepEqual(await hand(), { angle: 0, radius: 69, label: "Hour", selected: "12 hours" }, "noon is on the inner ring, at the top");
  await page.evaluate(() => (window as unknown as TimePickerWindow).timePicker.setValue("00:00"));
  assert.deepEqual(await hand(), { angle: 0, radius: 101, label: "Hour", selected: "0 hours" }, "midnight is on the outer ring, at the top");
  await page.evaluate(() => (window as unknown as TimePickerWindow).timePicker.setFormat("12h" as never).setValue("11:00"));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.evaluate(() => (window as unknown as TimePickerWindow).timePicker.setValue("13:00"));
  const path: number[] = [];
  for (let i = 0; i < 6; i++) { path.push((await hand()).angle); await page.waitForTimeout(40); }
  assert.ok(path.every(angle => angle >= 330 || angle <= 31), `11 to 1 springs forward through 12, not back round the dial (${path.join(", ")})`);
  assert.ok(new Set(path).size > 1, "the hand moves rather than jumping");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => (window as unknown as TimePickerWindow).timePicker.setFormat("12h" as never).setValue("09:35"));
  // The dial section's own changes are asserted above; the log below is the input
  // path's, from 09:35.
  await page.evaluate(() => { (window as unknown as TimePickerWindow).timeChanges.splice(1); });
  await dialog.locator(".mtrl-time-picker__toggle-type").click();
  assert.equal(await dialog.locator(".mtrl-time-picker__dial-face").isVisible(), false);
  assert.equal(await dialog.locator(".mtrl-time-picker__hours").evaluate(element => getComputedStyle(element).width), "96px");
  const minutes = dialog.locator(".mtrl-time-picker__minutes");
  await minutes.fill("45");
  await minutes.press("Tab");
  assert.equal(await page.locator('input[name="appointment"]').inputValue(), "09:45");
  await dialog.locator(".mtrl-time-picker__period-pm").click();
  assert.equal(await dialog.locator(".mtrl-time-picker__period-pm").getAttribute("aria-checked"), "true");
  assert.equal(await dialog.locator(".mtrl-time-picker__period--selected").textContent(), "PM");
  await page.screenshot({ path: join(artifacts, "timepicker-bem.png"), animations: "disabled" });
  await dialog.locator(".mtrl-time-picker__confirm").click();
  assert.equal(await page.evaluate(() => (window as unknown as TimePickerWindow).confirmedTime), "21:45");
  assert.deepEqual(await page.evaluate(() => {
    const state = window as unknown as TimePickerWindow;
    return {
      value: state.timePicker.getValue(),
      submitted: new FormData(document.querySelector("form")!).get("appointment"),
      changes: state.timeChanges,
    };
  }), { value: "21:45", submitted: "21:45", changes: ["09:35", "09:45", "21:45"] });
  await page.evaluate(({ format, orientation }) => {
    const picker = (window as unknown as TimePickerWindow).timePicker;
    picker.setFormat(format).setOrientation(orientation).setTitle("Updated").open();
  }, { format: TIME_FORMAT.MILITARY, orientation: TIME_PICKER_ORIENTATION.HORIZONTAL });
  assert.equal(await dialog.locator(".mtrl-time-picker__title").textContent(), "Updated");
  assert.equal(await dialog.evaluate(element => getComputedStyle(element).minWidth), "520px");
  assert.equal(await dialog.locator(".mtrl-time-picker__period").count(), 0);
  assert.deepEqual(await page.locator('[class*="mtrl-time-picker"]').evaluateAll(elements => elements.flatMap(element => [...element.classList].filter(name => /^mtrl-time-picker-[^-]/.test(name)))), []);
  await dialog.locator(".mtrl-time-picker__cancel").click();
  // FLO-278: a native modal dialog. Opened from a trigger, it is :modal over a 0.32
  // scrim, takes focus, and Escape closes it alone and returns focus.
  await page.evaluate(() => {
    const state = window as unknown as TimePickerWindow;
    const trigger = document.createElement("button"); trigger.id = "time-trigger"; trigger.textContent = "Time"; document.body.append(trigger);
    (window as unknown as { otherPicker: ReturnType<typeof state.createTimePicker> }).otherPicker = state.createTimePicker({ title: "Other" });
  });
  await page.locator("#time-trigger").focus();
  await page.evaluate(() => { (window as unknown as { otherPicker: { open(): void } }).otherPicker.open(); (window as unknown as TimePickerWindow).timePicker.open(); });
  const modal = await page.evaluate(() => {
    const open = [...document.querySelectorAll<HTMLDialogElement>("dialog.mtrl-time-picker__dialog")].filter(el => el.open);
    const top = (window as unknown as TimePickerWindow).timePicker.dialogElement as HTMLDialogElement;
    const probe = document.createElement("i"); probe.style.color = "color-mix(in srgb, var(--mtrl-sys-color-scrim) 32%, transparent)"; document.body.append(probe);
    const scrim = getComputedStyle(probe).color; probe.remove();
    return { open: open.length, modal: top.matches(":modal"), backdrop: getComputedStyle(top, "::backdrop").backgroundColor === scrim, focusInside: top.contains(document.activeElement), named: document.getElementById(top.getAttribute("aria-labelledby")!)?.textContent };
  });
  assert.deepEqual(modal, { open: 2, modal: true, backdrop: true, focusInside: true, named: "Updated" }, "a native modal over a 0.32 scrim, focused, named by its title");
  await page.keyboard.press("Escape");
  assert.deepEqual(await page.evaluate(() => [(window as unknown as TimePickerWindow).timePicker.isOpen, (window as unknown as { otherPicker: { isOpen: boolean } }).otherPicker.isOpen]), [false, true], "Escape closes the top picker only");
  await page.keyboard.press("Escape");
  assert.equal(await page.evaluate(() => document.activeElement?.id), "time-trigger", "focus returns to the trigger");
  await page.evaluate(() => { (window as unknown as { otherPicker: { destroy(): void } }).otherPicker.destroy(); document.getElementById("time-trigger")?.remove(); });
  await page.evaluate(() => (window as unknown as TimePickerWindow).timePicker.destroy());
  assert.equal(await page.locator(".mtrl-time-picker__dialog").count(), 0);
  console.log("Passed packed Time Picker: BEM layout, dial/input switching, AM/PM, input edits, form value, format/orientation, a native modal dialog with its own Escape and focus return, the DOM dial (positions, 24h rings, keyboard, drag, spring), its hour and minute radios, and teardown.");
}
