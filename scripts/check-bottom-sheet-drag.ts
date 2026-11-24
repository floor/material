/**
 * Bottom sheet drag, with a real pointer.
 *
 * The handle follows the pointer both ways. Release uses the last 100ms of
 * the gesture and Compose's AnchoredDraggable computeTarget (56px, 125px/s).
 * Partial and expanded differ by max-height, and that change animates from
 * the released position. A missed release (blur, context menu, lost capture,
 * mouse buttons already up) still settles.
 *
 * Sources read 2026-11-24:
 * https://m3.material.io/components/bottom-sheets/guidelines
 * androidx Compose AnchoredDraggable.kt computeTarget, and BottomSheetDefaults
 * positional threshold 56dp / velocity threshold 125dp/s.
 *
 * bun run scripts/check-bottom-sheet-drag.ts
 */
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import * as sass from "sass";
import { launchChromium } from "./browser-profile";

const css = sass.compileString(`@use 'components/bottom-sheet';`, {
  loadPaths: ["src/styles"],
  style: "expanded",
}).css;

const scratch = mkdtempSync(join(tmpdir(), "bottom-sheet-drag-"));
const browser = await launchChromium({ headless: true });
const page = await browser.browser()!.newPage({
  viewport: { width: 800, height: 640 },
  deviceScaleFactor: 1,
  hasTouch: true,
});
const errors: string[] = [];
page.on("pageerror", (error) => errors.push(error.message));

try {
  await page.setContent("<!doctype html><html><body></body></html>");
  await page.addStyleTag({ content: css });
  const factoryBuild = await Bun.build({
    entrypoints: ["src/components/bottom-sheet/index.ts"],
    target: "browser",
    outdir: join(scratch, "factory"),
  });
  const elementBuild = await Bun.build({
    entrypoints: ["src/elements/bottom-sheet.ts"],
    target: "browser",
    outdir: join(scratch, "element"),
  });
  assert(factoryBuild.success, String(factoryBuild.logs));
  assert(elementBuild.success, String(elementBuild.logs));
  const factory = factoryBuild.outputs[0];
  const element = elementBuild.outputs[0];
  assert(factory && element, "the sheet bundles were not emitted");
  await page.evaluate(async ({ factorySource, elementSource, style }) => {
    const factoryModule = await import(factorySource) as { createBottomSheet: (config?: Record<string, unknown>) => Sheet };
    const elementModule = await import(elementSource) as { defineBottomSheet: () => string };
    const state = window as unknown as PageState;
    state.createBottomSheet = factoryModule.createBottomSheet;
    state.defineBottomSheet = elementModule.defineBottomSheet;
    state.css = style;
    state.defineBottomSheet();
    state.containerOf = () => {
      const host = document.querySelector("m-bottom-sheet");
      const root = host
        ? host.shadowRoot?.querySelector(".mtrl-bottom-sheet")
        : document.querySelector(".mtrl-bottom-sheet");
      return root?.querySelector(".mtrl-bottom-sheet__container") as HTMLElement;
    };
    state.stateOf = () => {
      if (state.sheet && "getState" in state.sheet) return (state.sheet as unknown as { getState: () => string }).getState();
      const host = document.querySelector("m-bottom-sheet");
      if (!host?.hasAttribute("open")) return "hidden";
      return host.hasAttribute("expanded") ? "expanded" : "partial";
    };
  }, {
    factorySource: `data:text/javascript;base64,${Buffer.from(await factory.text()).toString("base64")}`,
    elementSource: `data:text/javascript;base64,${Buffer.from(await element.text()).toString("base64")}`,
    style: css,
  });

  interface Box {
    top: number;
    height: number;
    state: string;
    transition: string;
    transform: string;
    maxHeight: string;
    ends: number;
  }

  const read = () => page.evaluate((): Box => {
    const state = window as unknown as PageState;
    const container = state.containerOf();
    const inline = container.style;
    return {
      top: container.getBoundingClientRect().top,
      height: container.getBoundingClientRect().height,
      state: state.stateOf(),
      transition: inline.transition,
      transform: inline.transform,
      maxHeight: inline.maxHeight,
      ends: state.ends,
    };
  });

  const frames = (count = 2) => page.evaluate((n) => new Promise<void>((resolve) => {
    let seen = 0;
    const step = () => {
      seen += 1;
      if (seen >= n) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }), count);

  const mount = async (api: "factory" | "element", variant: "standard" | "modal", open: "partial" | "expanded") => {
    await page.evaluate(({ api, variant, open }) => {
      const state = window as unknown as PageState;
      state.sheet?.destroy?.();
      document.body.replaceChildren();
      state.ends = 0;
      const tall = `<div style="height:2000px">Notes</div>`;
      if (api === "factory") {
        const sheet = state.createBottomSheet({
          variant,
          peekHeight: 400,
          title: "Share",
          content: tall,
        });
        sheet.on?.("dragEnd", () => { state.ends += 1; });
        document.body.append(sheet.element);
        state.sheet = sheet;
        if (open === "expanded") sheet.expand();
        else sheet.open();
        return;
      }
      const host = document.createElement("m-bottom-sheet");
      host.setAttribute("variant", variant);
      host.setAttribute("peek-height", "400");
      if (variant === "modal") host.setAttribute("modal", "");
      host.innerHTML = tall;
      document.body.append(host);
      const style = document.createElement("style");
      style.textContent = state.css;
      host.shadowRoot!.append(style);
      if (open === "expanded") host.setAttribute("expanded", "");
      host.setAttribute("open", "");
      state.sheet = { destroy: () => host.remove() };
    }, { api, variant, open });
    await frames(2);
    // A dialog enters in a later frame, so its open spring actually runs.
    // Wait until that spring has landed on the anchor before dragging it.
    const band = open === "expanded" ? [0, 24] : [220, 260];
    await page.waitForFunction((range) => {
      const top = (window as unknown as PageState).containerOf().getBoundingClientRect().top;
      return top >= range[0] && top <= range[1];
    }, band, { timeout: 2000 });
  };

  const handleCenter = async () => {
    const box = await page.locator(".mtrl-bottom-sheet__handle").boundingBox();
    assert(box, "the drag handle has no box");
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };

  const gap = () => page.evaluate(() => {
    const container = (window as unknown as PageState).containerOf();
    const savedTransition = container.style.transition;
    const savedHeight = container.style.maxHeight;
    container.style.transition = "none";
    const heightOf = (value: string) => {
      container.style.maxHeight = value;
      return container.getBoundingClientRect().height;
    };
    const expanded = heightOf("100%");
    const partial = heightOf("var(--mtrl-bottom-sheet-peek-height, 50%)");
    container.style.maxHeight = savedHeight;
    container.style.transition = savedTransition;
    return { expanded, partial, span: expanded - partial };
  });

  const drag = async (toY: number, ms: number) => {
    const steps = Math.max(2, Math.round(ms / 16));
    const start = await handleCenter();
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    for (let step = 1; step <= steps; step += 1) {
      await page.mouse.move(start.x, start.y + (toY - start.y) * (step / steps));
      if (ms > 0) await page.waitForTimeout(ms / steps);
    }
    return start;
  };

  const settled = async () => {
    await page.mouse.up();
    await frames(3);
  };

  const hosts = [
    ["factory", "standard"],
    ["factory", "modal"],
    ["element", "standard"],
    ["element", "modal"],
  ] as const;

  for (const [api, variant] of hosts) {
    await mount(api, variant, "partial");
    const before = await read();
    assert(before.height > 100, `${api} ${variant} partial has no height`);
    await drag((await handleCenter()).y - 100, 180);
    const during = await read();
    assert(during.top < before.top - 60, `${api} ${variant} does not follow an upward drag (${before.top} -> ${during.top})`);
    await settled();
    const after = await read();
    assert.equal(after.transition, "", `${api} ${variant} kept an inline transition after release`);
    assert.equal(after.state, "expanded", `${api} ${variant} upward drag settled ${after.state}`);

    await mount(api, variant, "expanded");
    const distances = await gap();
    assert(distances.span > 120, `${api} ${variant} anchors are ${distances.span}px apart`);
    await drag((await handleCenter()).y + distances.span + 80, 2200);
    await settled();
    assert.equal((await read()).state, "hidden", `${api} ${variant} drag past partial settled ${(await read()).state}`);

    await mount(api, variant, "expanded");
    const down = await handleCenter();
    await page.mouse.move(down.x, down.y);
    await page.mouse.down();
    await page.mouse.move(down.x, down.y + 40);
    await page.evaluate(() => {
      const handle = document.querySelector(".mtrl-bottom-sheet__handle")
        ?? document.querySelector("m-bottom-sheet")?.shadowRoot?.querySelector(".mtrl-bottom-sheet__handle");
      handle?.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
    });
    await frames(3);
    const stuck = await read();
    assert.equal(stuck.transition, "", `${api} ${variant} stayed mid-drag after a context menu`);
    assert.equal(stuck.transform, "", `${api} ${variant} kept a transform after a context menu`);
    await page.mouse.up();
  }

  await mount("factory", "standard", "expanded");
  const back = await handleCenter();
  await page.mouse.move(back.x, back.y);
  await page.mouse.down();
  const slowSteps = 12;
  for (let step = 1; step <= slowSteps; step += 1) {
    await page.mouse.move(back.x, back.y + 180 * (step / slowSteps));
    await page.waitForTimeout(40);
  }
  await page.mouse.move(back.x, back.y + 70);
  await settled();
  assert.equal((await read()).state, "expanded", `a drag that comes back settled ${(await read()).state}`);

  await mount("factory", "standard", "partial");
  const flick = await handleCenter();
  await page.mouse.move(flick.x, flick.y);
  await page.mouse.down();
  await page.mouse.move(flick.x, flick.y + 24);
  await settled();
  assert.equal((await read()).state, "hidden", `a short flick settled ${(await read()).state}`);

  await mount("factory", "modal", "partial");
  const outside = await handleCenter();
  await page.mouse.move(outside.x, outside.y);
  await page.mouse.down();
  await page.mouse.move(outside.x, outside.y + 30);
  await page.mouse.move(-20, 300);
  await settled();
  const released = await read();
  assert.equal(released.transition, "", "a release outside the window left the drag stuck");
  assert.notEqual(released.state, "", "a release outside the window left no state");

  await mount("factory", "standard", "expanded");
  const blur = await handleCenter();
  await page.mouse.move(blur.x, blur.y);
  await page.mouse.down();
  await page.mouse.move(blur.x, blur.y + 36);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await frames(3);
  assert.equal((await read()).transition, "", "blurring the window left the sheet mid-drag");
  await page.mouse.up();

  await mount("factory", "standard", "partial");
  const lost = await handleCenter();
  await page.mouse.move(lost.x, lost.y);
  await page.mouse.down();
  await page.mouse.move(lost.x, lost.y + 30);
  await page.evaluate(() => {
    document.querySelector(".mtrl-bottom-sheet__handle")?.dispatchEvent(new Event("lostpointercapture"));
  });
  await frames(3);
  assert.equal((await read()).transition, "", "a lost pointer capture left the sheet mid-drag");
  await page.mouse.up();

  await mount("factory", "modal", "partial");
  await page.mouse.click(400, 16);
  await frames(2);
  assert.equal((await read()).state, "hidden", "the scrim click did not close the modal sheet");

  await mount("factory", "standard", "partial");
  const click = await handleCenter();
  await page.mouse.click(click.x, click.y);
  await frames(2);
  assert.equal((await read()).state, "expanded", "a handle click did not expand");

  await mount("factory", "standard", "expanded");
  const dying = await handleCenter();
  await page.mouse.move(dying.x, dying.y);
  await page.mouse.down();
  await page.mouse.move(dying.x, dying.y + 40);
  await page.evaluate(() => (window as unknown as PageState).sheet?.destroy?.());
  await page.mouse.up();

  const session = await page.context().newCDPSession(page);
  await mount("factory", "standard", "partial");
  const touchBefore = await read();
  const touch = await handleCenter();
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: touch.x, y: touch.y, id: 1 }] });
  await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: touch.x, y: touch.y - 110, id: 1 }] });
  const touchDuring = await read();
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  assert(touchDuring.top < touchBefore.top - 60, `touch did not move the sheet (${touchBefore.top} -> ${touchDuring.top})`);

  // The opening spring peaks at 1.015, which lifts the sheet by 1.5% of its
  // own height. The colour shadow has to cover that gap. On the old paint
  // order the elevation sits on top of it and darkens the first pixels.
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--mtrl-sys-color-surface-container-low", "#b7d7c5");
    document.body.style.background = "#ff00aa";
    document.body.style.margin = "0";
  });

  const paintOpen = async (kind: "factory" | "element", variant: "standard" | "modal") => {
    await page.evaluate(({ kind, variant }) => {
      const state = window as unknown as PageState;
      state.sheet?.destroy?.();
      document.body.replaceChildren();
      const tall = `<div style="height:2000px">Notes</div>`;
      if (kind === "factory") {
        const sheet = state.createBottomSheet({ variant, title: "Share", content: tall });
        document.body.append(sheet.element);
        state.sheet = sheet;
        return;
      }
      const host = document.createElement("m-bottom-sheet");
      host.setAttribute("variant", variant);
      if (variant === "modal") host.setAttribute("modal", "");
      host.innerHTML = tall;
      document.body.append(host);
      const style = document.createElement("style");
      style.textContent = state.css;
      host.shadowRoot!.append(style);
      state.sheet = {
        element: host,
        open: () => host.setAttribute("open", ""),
        expand: () => {
          host.setAttribute("expanded", "");
          host.setAttribute("open", "");
        },
        destroy: () => host.remove(),
      };
    }, { kind, variant });
    await frames(2);
    await page.evaluate(() => (window as unknown as PageState).sheet?.expand());
    await frames(1);
  };

  const assertGuard = async (label: string) => {
    const running = await page.evaluate(() => {
      const container = (window as unknown as PageState).containerOf();
      const anim = container.getAnimations().find((item) => (item as CSSTransition).transitionProperty === "transform");
      if (!anim) return false;
      anim.pause();
      return true;
    });
    assert(running, `${label} did not start an open spring`);
    let sawGap = false;
    for (let time = 0; time <= 448; time += 16) {
      const frame = await page.evaluate((t) => {
        const state = window as unknown as PageState;
        const container = state.containerOf();
        const anim = container.getAnimations().find((item) => (item as CSSTransition).transitionProperty === "transform");
        if (anim) anim.currentTime = t;
        (document.activeElement as HTMLElement | null)?.blur?.();
        const rect = container.getBoundingClientRect();
        const root = container.parentElement;
        return {
          bottom: rect.bottom,
          viewport: window.innerHeight,
          overflow: getComputedStyle(container).overflow,
          rootOverflow: root ? getComputedStyle(root).overflow : "visible",
          scroll: document.documentElement.scrollTop,
        };
      }, time);
      assert.equal(frame.overflow, "visible", `${label} clips the sheet`);
      assert.equal(frame.rootOverflow, "visible", `${label} clips the sheet root`);
      assert.equal(frame.scroll, 0, `${label} scrolled the page`);
      const gap = frame.viewport - frame.bottom;
      if (gap < 2) continue;
      sawGap = true;
      const y = Math.floor(frame.bottom) + 2;
      const height = Math.min(8, Math.floor(frame.viewport - y));
      if (height < 1) continue;
      const shot = await page.screenshot({ clip: { x: 400, y, width: 1, height } });
      const pixels = pngPixels(shot);
      for (let row = 0; row < pixels.height; row += 1) {
        const index = row * pixels.channels;
        const red = pixels.data[index] ?? 0;
        const green = pixels.data[index + 1] ?? 0;
        const blue = pixels.data[index + 2] ?? 0;
        const near = Math.abs(red - 183) <= 8 && Math.abs(green - 215) <= 8 && Math.abs(blue - 197) <= 8;
        assert(near, `${label} at ${time}ms, ${row}px under the lifted edge is ${red},${green},${blue}`);
      }
    }
    assert(sawGap, `${label} never lifted its bottom edge above the viewport`);
  };

  for (const variant of ["standard", "modal"] as const) {
    await paintOpen("factory", variant);
    await assertGuard(`factory ${variant}`);
    await paintOpen("element", variant);
    await assertGuard(`element ${variant}`);
  }

  await page.emulateMedia({ colorScheme: "dark" });
  await paintOpen("factory", "standard");
  await assertGuard("dark");
  await page.emulateMedia({ colorScheme: "light" });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await paintOpen("factory", "standard");
  await frames(2);
  const reducedGap = await page.evaluate(() => {
    const rect = (window as unknown as PageState).containerOf().getBoundingClientRect();
    return window.innerHeight - rect.bottom;
  });
  assert(reducedGap < 1, `reduced motion lifted the sheet by ${reducedGap}px`);
  await page.emulateMedia({ reducedMotion: "no-preference" });

  await page.emulateMedia({ forcedColors: "active" });
  await paintOpen("factory", "standard");
  await frames(2);
  const forced = await page.evaluate(() => {
    const container = (window as unknown as PageState).containerOf();
    return {
      shadow: getComputedStyle(container).boxShadow,
      height: container.getBoundingClientRect().height,
    };
  });
  assert.equal(forced.shadow, "none", "forced colours kept an author box-shadow");
  assert(forced.height > 100, "forced colours hid the sheet");
  await page.emulateMedia({ forcedColors: "none" });

  assert.equal(errors.length, 0, errors.join("\n"));
  console.log("bottom sheet drag: mouse and touch, factory and element");
} finally {
  await browser.close();
  rmSync(scratch, { recursive: true, force: true });
}

interface Sheet {
  element: HTMLElement;
  open: () => void;
  expand: () => void;
  destroy?: () => void;
  on?: (event: string, handler: () => void) => void;
}

function pngPixels(png: Buffer): { height: number; channels: number; data: Uint8Array } {
  let offset = 8;
  let width = 0;
  let height = 0;
  let channels = 0;
  const idats: Buffer[] = [];
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const data = png.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      const colour = data[9];
      channels = colour === 6 ? 4 : colour === 2 ? 3 : 0;
    } else if (type === "IDAT") idats.push(Buffer.from(data));
    else if (type === "IEND") break;
    offset += 12 + length;
  }
  assert(channels > 0 && width > 0, "the screenshot is not an RGB png");
  const raw = inflateSync(Buffer.concat(idats));
  const stride = width * channels;
  const out = new Uint8Array(width * height * channels);
  let src = 0;
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[src] ?? 0;
    src += 1;
    const row = raw.subarray(src, src + stride);
    src += stride;
    const cur = new Uint8Array(stride);
    for (let i = 0; i < stride; i += 1) {
      const left = i >= channels ? cur[i - channels] ?? 0 : 0;
      const up = prev[i] ?? 0;
      const upperLeft = i >= channels ? prev[i - channels] ?? 0 : 0;
      const value = row[i] ?? 0;
      if (filter === 0) cur[i] = value;
      else if (filter === 1) cur[i] = (value + left) & 255;
      else if (filter === 2) cur[i] = (value + up) & 255;
      else if (filter === 3) cur[i] = (value + Math.floor((left + up) / 2)) & 255;
      else {
        const paeth = left + up - upperLeft;
        const pa = Math.abs(paeth - left);
        const pb = Math.abs(paeth - up);
        const pc = Math.abs(paeth - upperLeft);
        const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : upperLeft;
        cur[i] = (value + pred) & 255;
      }
    }
    out.set(cur, y * stride);
    prev = cur;
  }
  return { height, channels, data: out };
}

interface PageState {
  createBottomSheet: (config?: Record<string, unknown>) => Sheet;
  defineBottomSheet: () => string;
  css: string;
  sheet?: Sheet;
  ends: number;
  containerOf: () => HTMLElement;
  stateOf: () => string;
}
