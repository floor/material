/** The selection controls against the m3.material.io specs, painted in Chromium. */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createSwitch from "../src/components/switch";
import type createCheckbox from "../src/components/checkbox";
import type createRadios from "../src/components/radios";

type ControlsWindow = Window & {
  inputs: { createSwitch: typeof createSwitch; createCheckbox: typeof createCheckbox; createRadios: typeof createRadios };
  controlsHost: HTMLElement;
};
type Box = { left: number; right: number; top: number; width: number; height: number };

const settle = (page: Page) => page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined))));
const box = (page: Page, selector: string): Promise<Box> =>
  page.locator(selector).evaluate((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, width: r.width, height: r.height }; });
const style = (page: Page, selector: string, property: string, pseudo?: string): Promise<string> =>
  page.locator(selector).evaluate((el, [p, pe]) => getComputedStyle(el, pe || undefined).getPropertyValue(p), [property, pseudo ?? ""] as const);
const role = (page: Page, name: string): Promise<string> =>
  page.evaluate((name) => { const probe = document.createElement("i"); probe.style.color = `var(--mtrl-sys-color-${name})`; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }, name);

/** FLO-267: the switch handle in both directions, its icons, states, focus ring and label side. */
async function checkSwitch(page: Page): Promise<number> {
  const icon = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
  let checks = 0;
  for (const dir of ["ltr", "rtl"] as const) {
    await page.evaluate(([dir, icon]) => {
      const state = window as unknown as ControlsWindow;
      document.documentElement.dir = dir;
      state.controlsHost?.remove();
      const host = document.createElement("div");
      host.style.cssText = "width:400px;padding:24px";
      state.controlsHost = host;
      document.body.append(host);
      const { createSwitch } = state.inputs;
      for (const [id, config] of [["sw-off", { label: "Off" }], ["sw-on", { label: "On", checked: true }], ["sw-icons", { label: "Icons", unselectedIcon: icon }], ["sw-end", { label: "End", labelPosition: "end" }]] as const) {
        const control = createSwitch(config);
        control.element.id = id;
        host.append(control.element);
      }
    }, [dir, icon] as const);
    await settle(page);
    const centre = (b: Box) => b.left + b.width / 2;
    // The handle sits 16dp from the track's start edge when off, 16dp from its end when on.
    const offTrack = await box(page, "#sw-off .mtrl-switch__track"), offThumb = await box(page, "#sw-off .mtrl-switch__thumb");
    const onTrack = await box(page, "#sw-on .mtrl-switch__track"), onThumb = await box(page, "#sw-on .mtrl-switch__thumb");
    const fromStart = (track: Box, thumb: Box) => (dir === "ltr" ? centre(thumb) - track.left : track.right - centre(thumb));
    assert.equal(fromStart(offTrack, offThumb), 16, `${dir}: the unselected 16dp handle 16dp from the start edge`);
    assert.equal(fromStart(onTrack, onThumb), 36, `${dir}: the selected 24dp handle 16dp from the end edge`);
    assert.deepEqual([offThumb.width, onThumb.width], [16, 24], `${dir}: handle sizes`);
    // The state layer is centred on the handle.
    await page.hover("#sw-on .mtrl-switch__input");
    await settle(page);
    const layer = await page.locator("#sw-on .mtrl-switch__track").evaluate((el) => {
      const c = getComputedStyle(el, "::after"); const t = el.getBoundingClientRect();
      return { left: parseFloat(c.insetInlineStart), width: parseFloat(c.width), opacity: c.opacity, rtl: getComputedStyle(el).direction === "rtl", trackWidth: t.width };
    });
    assert.equal(layer.left + 2 + layer.width / 2, 36, `${dir}: the state layer centred on the selected handle`);
    assert.equal(layer.opacity, "0.08", `${dir}: hover layer`);
    // Label side: 'end' puts the track first in reading order.
    const endTrack = await box(page, "#sw-end .mtrl-switch__track"), endLabel = await box(page, "#sw-end .mtrl-switch__label");
    assert.equal(dir === "ltr" ? endTrack.left < endLabel.left : endTrack.left > endLabel.left, true, `${dir}: labelPosition end puts the label after the switch`);
    checks += 6;
  }
  await page.evaluate(() => { document.documentElement.dir = "ltr"; });
  await page.mouse.move(0, 0);
  await settle(page);
  // Icons: 16dp; selected on-primary-container, unselected surface-container-highest on a 24dp handle.
  assert.equal((await box(page, "#sw-on .mtrl-switch__thumb-icon svg")).width, 16, "selected icon 16dp");
  assert.equal(await style(page, "#sw-on .mtrl-switch__thumb-icon", "color"), await role(page, "on-primary-container"), "selected icon on-primary-container");
  assert.equal((await box(page, "#sw-icons .mtrl-switch__thumb")).width, 24, "with icons, the unselected handle is 24dp");
  assert.equal(await style(page, "#sw-icons .mtrl-switch__thumb-icon--unselected", "opacity"), "1", "the unselected icon shows");
  assert.equal(await style(page, "#sw-icons .mtrl-switch__thumb-icon--unselected", "color"), await role(page, "surface-container-highest"), "unselected icon colour");
  // Keyboard focus: a 0.10 layer, the handle recoloured, the 3dp secondary ring.
  await page.evaluate(() => { const before = document.createElement("button"); before.id = "before-switch"; document.getElementById("sw-on")!.before(before); before.focus(); });
  await page.keyboard.press("Tab");
  await settle(page);
  assert.equal(await style(page, "#sw-on .mtrl-switch__track", "opacity", "::after"), "0.1", "focus layer");
  assert.equal(await style(page, "#sw-on .mtrl-switch__thumb", "background-color"), await role(page, "primary-container"), "focused selected handle primary-container");
  const ring = await page.locator("#sw-on .mtrl-switch__track").evaluate((el) => { const c = getComputedStyle(el); return `${c.outlineWidth} ${c.outlineStyle} ${c.outlineColor} ${c.outlineOffset}`; });
  assert.equal(ring, `3px solid ${await role(page, "secondary")} 2px`, "focus ring");
  checks += 8;
  await page.evaluate(() => { (window as unknown as ControlsWindow).controlsHost.remove(); document.getElementById("before-switch")?.remove(); });
  return checks;
}

/** FLO-265: the checkbox box, its state layers, focus ring, error and disabled indeterminate states. */
async function checkCheckbox(page: Page): Promise<number> {
  await page.evaluate(() => {
    const state = window as unknown as ControlsWindow;
    state.controlsHost?.remove();
    const host = document.createElement("div");
    host.style.cssText = "padding:24px;display:flex;flex-direction:column;gap:8px";
    state.controlsHost = host;
    document.body.append(host);
    const { createCheckbox } = state.inputs;
    for (const [id, config] of [["cb-off", { label: "Off" }], ["cb-on", { label: "On", checked: true }], ["cb-error", { label: "Error", checked: true, error: true }], ["cb-error-off", { label: "Error off", error: true }], ["cb-dis-mixed", { label: "Mixed", indeterminate: true, disabled: true }]] as const) {
      const control = createCheckbox(config);
      control.element.id = id;
      host.append(control.element);
    }
  });
  await page.mouse.move(0, 0);
  await settle(page);
  const icon = (id: string) => `#${id} .mtrl-checkbox__icon`;
  const transparent = "rgba(0, 0, 0, 0)";
  // The box: no fill and an on-surface-variant outline when unselected.
  assert.equal(await style(page, icon("cb-off"), "background-color"), transparent, "unselected: no container fill");
  assert.equal(await style(page, icon("cb-off"), "border-top-color"), await role(page, "on-surface-variant"), "unselected outline");
  assert.deepEqual([(await box(page, icon("cb-off"))).width, (await box(page, icon("cb-off"))).height], [18, 18], "18dp box");
  // The 40dp state layer, centred; hover on-surface 0.08 unselected, primary 0.08 selected.
  const layer = async (id: string) => page.locator(icon(id)).evaluate((el) => {
    const c = getComputedStyle(el, "::before"); const b = el.getBoundingClientRect();
    return { width: parseFloat(c.width), colour: c.backgroundColor, ring: `${c.outlineWidth} ${c.outlineStyle} ${c.outlineColor} ${c.outlineOffset}`, box: b.width };
  });
  const mix = (name: string, percent: number) => page.evaluate(([name, percent]) => { const probe = document.createElement("i"); probe.style.color = `color-mix(in srgb, var(--mtrl-sys-color-${name}) ${percent}%, transparent)`; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }, [name, percent] as const);
  await page.hover("#cb-off .mtrl-checkbox__input");
  await settle(page);
  assert.equal((await layer("cb-off")).width, 40, "40dp state layer");
  assert.equal((await layer("cb-off")).colour, await mix("on-surface", 8), "unselected hover: on-surface 0.08");
  assert.equal(await style(page, icon("cb-off"), "border-top-color"), await role(page, "on-surface"), "unselected hover outline on-surface");
  await page.hover("#cb-on .mtrl-checkbox__input");
  await settle(page);
  assert.equal((await layer("cb-on")).colour, await mix("primary", 8), "selected hover: primary 0.08 (was the pressed 0.10)");
  await page.mouse.down();
  await settle(page);
  assert.equal((await layer("cb-on")).colour, await mix("on-surface", 10), "selected press: on-surface, the state it leads to");
  await page.mouse.up();
  await page.locator("#cb-on .mtrl-checkbox__input").evaluate((el) => (el as HTMLInputElement).click());
  await page.mouse.move(0, 0);
  // Keyboard focus: a 0.10 layer and the 3dp secondary ring 2dp outside it.
  await page.evaluate(() => { const before = document.createElement("button"); before.id = "before-checkbox"; document.getElementById("cb-off")!.before(before); before.focus(); });
  await page.keyboard.press("Tab");
  await settle(page);
  const focused = await layer("cb-off");
  assert.equal(focused.colour, await mix("on-surface", 10), "focus layer");
  assert.equal(focused.ring, `3px solid ${await role(page, "secondary")} 2px`, "focus ring");
  // Enter is left to the form (Dr Jones); Space toggles.
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#cb-off .mtrl-checkbox__input").isChecked(), false, "Enter does not toggle");
  await page.keyboard.press("Space");
  assert.equal(await page.locator("#cb-off .mtrl-checkbox__input").isChecked(), true, "Space toggles");
  // Error and disabled indeterminate.
  assert.equal(await style(page, icon("cb-error"), "background-color"), await role(page, "error"), "selected error container");
  assert.equal(await style(page, `${icon("cb-error")} svg`, "color"), await role(page, "on-error"), "error check on-error");
  assert.equal(await style(page, icon("cb-error-off"), "border-top-color"), await role(page, "error"), "unselected error outline");
  assert.equal(await page.locator("#cb-error .mtrl-checkbox__input").getAttribute("aria-invalid"), "true", "aria-invalid");
  assert.equal(await style(page, icon("cb-dis-mixed"), "background-color"), await mix("on-surface", 38), "disabled indeterminate container");
  assert.equal(await style(page, icon("cb-dis-mixed"), "background-color", "::after"), await role(page, "surface"), "disabled indeterminate dash: surface, visible");
  await page.evaluate(() => { (window as unknown as ControlsWindow).controlsHost.remove(); document.getElementById("before-checkbox")?.remove(); });
  return 17;
}

/** FLO-266: the radio ring and dot, state layers, keyboard-only focus, and the label gap in both directions. */
async function checkRadios(page: Page): Promise<number> {
  const mount = (dir: "ltr" | "rtl") => page.evaluate((dir) => {
    const state = window as unknown as ControlsWindow;
    document.documentElement.dir = dir;
    state.controlsHost?.remove();
    const host = document.createElement("div");
    host.style.cssText = "padding:24px";
    state.controlsHost = host;
    document.body.append(host);
    const group = state.inputs.createRadios({ name: "size", value: "s", options: [{ value: "s", label: "Small" }, { value: "m", label: "Medium" }, { value: "l", label: "Large" }] });
    group.element.id = "rd";
    host.append(group.element);
  }, dir);
  const item = (n: number) => `#rd .mtrl-radios__item:nth-child(${n})`;
  const mix = (name: string, percent: number) => page.evaluate(([name, percent]) => { const probe = document.createElement("i"); probe.style.color = `color-mix(in srgb, var(--mtrl-sys-color-${name}) ${percent}%, transparent)`; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); return c; }, [name, percent] as const);
  const layer = (n: number) => style(page, `${item(n)} .mtrl-radios__ripple`, "background-color");
  let checks = 0;
  for (const dir of ["ltr", "rtl"] as const) {
    await mount(dir);
    await settle(page);
    const control = await box(page, `${item(1)} .mtrl-radios__control`), text = await box(page, `${item(1)} .mtrl-radios__text`);
    assert.equal(dir === "ltr" ? text.left - control.right : control.left - text.right, 8, `${dir}: 8dp between the control and its label`);
    checks += 1;
  }
  await page.evaluate(() => { document.documentElement.dir = "ltr"; });
  await page.mouse.move(0, 0);
  await settle(page);
  assert.equal(await style(page, `${item(1)} .mtrl-radios__circle`, "border-top-width"), "2px", "2dp ring");
  assert.equal(await style(page, `${item(2)} .mtrl-radios__circle`, "border-top-color"), await role(page, "on-surface-variant"), "unselected ring on-surface-variant");
  assert.equal((await box(page, `${item(1)} .mtrl-radios__circle`)).width, 20, "20dp icon");
  assert.equal(parseFloat(await style(page, `${item(1)} .mtrl-radios__circle`, "width", "::after")), 10, "10dp dot");
  await page.hover(`${item(2)} .mtrl-radios__label`);
  await settle(page);
  assert.equal(await layer(2), await mix("on-surface", 8), "unselected hover: on-surface");
  assert.equal(await style(page, `${item(2)} .mtrl-radios__circle`, "border-top-color"), await role(page, "on-surface"), "unselected hover ring on-surface");
  await page.mouse.down();
  await settle(page);
  assert.equal(await layer(2), await mix("primary", 10), "unselected press: primary");
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await settle(page);
  assert.equal(await style(page, `${item(2)} .mtrl-radios__ripple`, "outline-style"), "none", "a click draws no focus ring");
  // Keyboard: Tab onto the selected radio, an arrow moves and selects.
  await page.evaluate(() => { const before = document.createElement("button"); before.id = "before-radios"; document.getElementById("rd")!.before(before); before.focus(); });
  await page.keyboard.press("Tab");
  await page.keyboard.press("ArrowDown");
  await settle(page);
  assert.equal(await page.locator(`${item(3)} input`).isChecked(), true, "ArrowDown moves and selects");
  assert.equal(await layer(3), await mix("primary", 10), "selected focus: primary");
  const ring = await page.locator(`${item(3)} .mtrl-radios__ripple`).evaluate((el) => { const c = getComputedStyle(el); return `${c.outlineWidth} ${c.outlineStyle} ${c.outlineColor} ${c.outlineOffset}`; });
  assert.equal(ring, `3px solid ${await role(page, "secondary")} 2px`, "focus ring");
  checks += 10;
  await page.evaluate(() => { (window as unknown as ControlsWindow).controlsHost.remove(); document.getElementById("before-radios")?.remove(); });
  return checks;
}

export async function checkControls(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const checks = (await checkSwitch(page)) + (await checkCheckbox(page)) + (await checkRadios(page));
  console.log(`Passed ${checks} selection-control checks: the switch handle and state layer in both directions, its icons, label side, focus layer, handle colour and ring; the checkbox box, state layers, focus ring, keys, error and disabled indeterminate; the radio ring, dot, state layers, keyboard focus and label gap.`);
}
