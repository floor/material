/** Owner-requested time-picker motion; baseline main 14809ddc, 2026-11-09.
 * Run one source entry with selective CSS; no library build required.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import * as sass from "sass";
import type createTimePicker from "../src/components/timepicker";
import { baseStyles } from "./style-manifest";

type MotionWindow = Window & { factory: typeof createTimePicker; picker: ReturnType<typeof createTimePicker> };
const built = await Bun.build({ entrypoints: ["src/components/timepicker/index.ts"], target: "browser" });
assert(built.success, String(built.logs));
const css = sass.compileString([...baseStyles, "components/timepicker"].map(s => `@use "${s}";`).join("\n"), {
  loadPaths: [resolve("src/styles")], logger: sass.Logger.silent,
}).css;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 850, height: 850 }, reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setContent('<!doctype html><html data-theme="baseline"><head></head><body></body></html>');
  await page.addStyleTag({ content: css });
  await page.evaluate(async entry => { (window as unknown as MotionWindow).factory = (await import(entry)).default; },
    `data:text/javascript;base64,${Buffer.from(await built.outputs[0].text()).toString("base64")}`);
  const mount = async () => {
    await page.evaluate(() => {
      const state = window as unknown as MotionWindow;
      state.picker?.destroy();
      state.picker = state.factory({ type: "dial", value: "09:30", format: "12h" });
      document.body.append(state.picker.element);
      state.picker.open();
    });
    await page.waitForTimeout(600);
  };
  const snapshot = async (mode?: string) => page.evaluate(mode => {
    if (mode) document.querySelector<HTMLElement>(`[data-type="${mode}"]`)!.click();
    const face = document.querySelector<HTMLElement>(".mtrl-time-picker__dial-face")!;
    // Reading computed style creates pending CSS transitions/animations now.
    const transition = getComputedStyle(face).transition;
    return {
      transition,
      hand: face.getAnimations().filter(a => a instanceof CSSTransition).length,
      digits: [...face.querySelectorAll<HTMLElement>(".mtrl-time-picker__dial-numbers:not(.mtrl-time-picker__dial-numbers--selected)")].map(group => ({
        first: group.firstElementChild?.textContent,
        opacity: Number(getComputedStyle(group).opacity),
        scale: new DOMMatrix(getComputedStyle(group).transform).a,
        motions: group.getAnimations().map(a => ({
          duration: a.effect!.getTiming().duration,
          easing: a.effect!.getComputedTiming().easing,
          frames: (a.effect as KeyframeEffect).getKeyframes().map(f => ({
            scale: new DOMMatrix(String(f.transform ?? "none")).a,
            opacity: Number(f.opacity ?? 1),
          })),
        })),
      })),
      all: face.getAnimations({ subtree: true }).length,
    };
  }, mode);
  const failures: string[] = [];
  const markup: string[] = [];
  let checks = 0;
  const check = (name: string, ok: boolean) => { checks++; if (!ok) failures.push(name); };
  for (const reduced of [false, true]) {
    await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
    await mount();
    for (const [mode, oldFirst, newFirst] of [["minute", "12", "00"], ["hour", "00", "12"]]) {
      const state = await snapshot(mode);
      console.log(`${reduced ? "reduced" : "normal"}/${mode}: ${JSON.stringify(state)}`);
      check(`${reduced}/${mode}: only live digits are accessible`, await page.getByRole("option").count() === 12);
      check(`${reduced}/${mode}: ids remain unique`, await page.evaluate(() => {
        const ids = [...document.querySelectorAll("[id]")].map(el => el.id);
        return ids.length === new Set(ids).size;
      }));
      check(`${reduced}/${mode}: input-field mode change jumps hand`, state.hand === 0);
      if (reduced) check(`reduced/${mode}: digits do not animate`, state.all === 0 && state.digits.length === 1);
      else {
        const outgoing = state.digits.find(g => g.first === oldFirst);
        const incoming = state.digits.find(g => g.first === newFirst);
        const scales = (group: typeof outgoing) => group?.motions.some(m => mode === "hour"
          ? m.frames[0].scale > m.frames.at(-1)!.scale : m.frames[0].scale < m.frames.at(-1)!.scale);
        const fades = (group: typeof outgoing, out: boolean) => group?.motions.some(m => out
          ? m.frames[0].opacity > m.frames.at(-1)!.opacity : m.frames[0].opacity < m.frames.at(-1)!.opacity);
        check(`${mode}: leaving digits scale in the requested direction and fade out`, !!scales(outgoing) && !!fades(outgoing, true));
        check(`${mode}: arriving digits scale to one and fade in`, !!scales(incoming) && !!fades(incoming, false) && !!incoming?.motions.some(m => (mode === "hour" ? m.frames[0].scale > 1 : m.frames[0].scale < 1) && m.frames.at(-1)!.scale === 1));
      }
      if (!reduced) {
        await page.waitForTimeout(50);
        const mid = await snapshot();
        const leaving = mid.digits.find(g => g.first === oldFirst);
        check(`${mode}: leaving digits remain visible during fade`, !!leaving && leaving.opacity > 0 && leaving.opacity < 1 && (mode === "hour" ? leaving.scale < 1 : leaving.scale > 1));
      }
      await page.waitForTimeout(600);
      const settled = await snapshot();
      check(`${reduced}/${mode}: old digits cleaned up`, settled.digits.length === 1 && settled.digits[0].first === newFirst && settled.all === 0);
      markup.push(await page.locator(".mtrl-time-picker__dialog").evaluate(el => el.outerHTML));
    }
    const target = await page.getByRole("option", { name: "3 o'clock", exact: true }).boundingBox();
    assert(target);
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
    await page.mouse.down();
    const clicked = await snapshot();
    console.log(`${reduced ? "reduced" : "normal"}/dial: ${JSON.stringify(clicked)}`);
    check(`${reduced}: dial click hand motion`, reduced ? clicked.all === 0 : clicked.hand > 0);
    const dragTarget = await page.getByRole("option", { name: "6 o'clock", exact: true }).boundingBox();
    assert(dragTarget);
    await page.mouse.move(dragTarget.x + dragTarget.width / 2, dragTarget.y + dragTarget.height / 2);
    check(`${reduced}: dragging follows immediately`, (await snapshot()).hand === 0);
    await page.mouse.up();
  }
  // Real pointer events: normal click noise must not cancel a spring; an old
  // hour-selection timer must not cut a later selection short.
  const face = page.locator(".mtrl-time-picker__dial-face");
  const point = async (name: string) => {
    const box = await page.getByRole("option", { name, exact: true }).boundingBox();
    assert(box);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  for (const reduced of [false, true]) {
    await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
    await mount();
    const three = await point("3 o'clock");
    await page.mouse.move(three.x, three.y);
    await page.mouse.down();
    await page.mouse.move(three.x + 1, three.y);
    await page.mouse.up();
    const jitter = await snapshot();
    console.log(`jitter/${reduced}: ${JSON.stringify(jitter)}`);
    check(`${reduced}: one-pixel click noise keeps hand animation`, reduced ? jitter.all === 0 : jitter.hand > 0);
    await page.waitForTimeout(600);
    await mount();
    await page.mouse.click(three.x, three.y);
    if (!reduced) {
      await page.waitForTimeout(40);
      await page.mouse.click(three.x, three.y);
      check("same value during a spring preserves motion", (await snapshot()).hand > 0);
    }
    await page.waitForTimeout(reduced ? 30 : 220);
    const six = await point(await face.getAttribute("aria-label") === "Hour" ? "6 o'clock" : "30 minutes");
    await page.mouse.click(six.x, six.y);
    const second = await snapshot();
    check(`${reduced}: quick second selection animates`, reduced ? second.all === 0 : second.hand > 0);
    if (!reduced) {
      await page.waitForTimeout(270);
      const mid = await snapshot();
      console.log(`second-selection-mid: ${JSON.stringify(mid)}`);
      check("earlier click cannot interrupt the later hour spring", await face.getAttribute("aria-label") === "Hour" && mid.hand > 0);
    }
    await page.waitForTimeout(600);
    check(`${reduced}: completed hour selection advances to minutes`, await face.getAttribute("aria-label") === "Minute");
    if (!reduced) {
      await mount();
      await page.mouse.click(three.x, three.y);
      await page.waitForTimeout(100);
      await snapshot("hour");
      await page.waitForTimeout(500);
      check("explicit field choice cancels pending automatic mode switch", await face.getAttribute("aria-label") === "Hour" && (await snapshot()).hand === 0);
    }
    await mount();
    await snapshot("minute");
    // Click dial track between labels immediately after a field mode change.
    const box = await face.boundingBox();
    assert(box);
    await page.mouse.click(box.x + box.width / 2 + 75, box.y + box.height / 2);
    const track = await snapshot();
    check(`${reduced}: track click just after mode change animates hand`, reduced ? track.all === 0 : track.hand > 0);
    await page.waitForTimeout(600);
    // Re-selecting a settled value has zero distance: it must stay still,
    // rather than invent a full turn to manufacture a transition.
    const angle = await face.evaluate(el => getComputedStyle(el).getPropertyValue("--mtrl-time-picker-angle"));
    await page.mouse.click(box.x + box.width / 2 + 75, box.y + box.height / 2);
    check(`${reduced}: same settled value stays in place`, await face.evaluate(el => getComputedStyle(el).getPropertyValue("--mtrl-time-picker-angle")) === angle);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 75);
    check(`${reduced}: real track drag follows instantly`, (await snapshot()).hand === 0);
    await page.mouse.up();
    await page.mouse.click(box.x + box.width / 2 - 75, box.y + box.height / 2);
    check(`${reduced}: click after dragging animates again`, reduced ? (await snapshot()).all === 0 : (await snapshot()).hand > 0);
  }
  // Observe each real pointer selection in a single event turn: CSS must
  // retarget from its rendered angle, not the previous destination's angle.
  for (const mode of ["hour", "minute"]) {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await mount();
    if (mode === "minute") { await snapshot("minute"); await page.waitForTimeout(600); }
    for (const [value, delay] of [[3, 50], [12, 100], [8, 200], [2, 50], [10, 150], [1, 50]]) {
      await face.evaluate(el => {
        const read = () => parseFloat(getComputedStyle(el).getPropertyValue("--mtrl-time-picker-angle"));
        let before = 0;
        el.addEventListener("pointerdown", () => { before = read(); }, { capture: true, once: true });
        el.addEventListener("pointerdown", () => {
          const after = read();
          el.setAttribute("data-motion-sample", JSON.stringify({ before, after,
            target: parseFloat((el as HTMLElement).style.getPropertyValue("--mtrl-time-picker-angle")),
            active: el.getAnimations().some(a => a instanceof CSSTransition),
          }));
        }, { once: true });
      });
      const target = await point(mode === "hour" ? `${value} o'clock` : `${value * 5 % 60} minutes`);
      await page.mouse.click(target.x, target.y);
      const sample = JSON.parse((await face.getAttribute("data-motion-sample"))!) as {
        before: number; after: number; target: number; active: boolean;
      };
      const nearest = ((value * 30 - sample.before) % 360 + 540) % 360 - 180;
      check(`${mode}/${value}: retarget begins at the on-screen angle`, Math.abs(sample.before - sample.after) < 0.1);
      check(`${mode}/${value}: new destination takes shortest rendered path`, Math.abs(sample.target - sample.before) <= 180.1);
      check(`${mode}/${value}: retarget has active hand motion`, sample.active);
      await page.waitForTimeout(delay);
      const visible = await face.evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue("--mtrl-time-picker-angle")));
      check(`${mode}/${value}: visible hand moves toward new number`, Math.abs(nearest) < 0.1 || (visible - sample.before) * nearest > 0);
      console.log(`retarget/${mode}/${value}/${delay}ms: ${JSON.stringify({ ...sample, visible, nearest })}`);
      await face.evaluate(el => el.removeAttribute("data-motion-sample"));
      check(`${mode}/${value}: click chain keeps selected mode`, await face.getAttribute("aria-label") === (mode === "hour" ? "Hour" : "Minute"));
      // Main used a shorter automatic-advance timer; recover its face so a
      // failing baseline still measures the rest of the click chain.
      if (await face.getAttribute("aria-label") !== (mode === "hour" ? "Hour" : "Minute")) await snapshot(mode);
    }
  }
  await page.evaluate(() => (window as unknown as MotionWindow).picker.destroy());
  assert.deepEqual(errors, [], "browser errors");
  const artifacts = resolve("tmp/timepicker-transitions");
  await mkdir(artifacts, { recursive: true });
  await Bun.write(resolve(artifacts, `${process.env.TIMEPICKER_MOTION_LABEL ?? "run"}.json`), JSON.stringify(markup));
  console.log(`Timepicker motion checks: ${checks}; failures: ${JSON.stringify(failures)}`);
  assert.deepEqual(failures, [], "timepicker transitions match input source and motion preference");
} finally { await browser.close(); }
