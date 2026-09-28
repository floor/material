/** The selection controls against the m3.material.io specs, painted in Chromium. */
import assert from "node:assert/strict";
import type { Page } from "playwright";
import type createSwitch from "../src/components/switch";

type ControlsWindow = Window & {
  inputs: { createSwitch: typeof createSwitch };
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

export async function checkControls(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const checks = await checkSwitch(page);
  console.log(`Passed ${checks} selection-control checks: the switch handle and state layer in both directions, its icons, label side, focus layer, handle colour and ring.`);
}
