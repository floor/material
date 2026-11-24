#!/usr/bin/env bun
// scripts/check-slider-ticks.ts
/**
 * The handle sits on the tick scale at every value, at every size, along both
 * axes and in both directions; and a press that starts an interaction narrows
 * the handle until the release.
 *
 * The tick scale is read from the painted page, not from the geometry that
 * drew it: a discrete slider is parked at its maximum with the handles hidden,
 * the harness screenshots the track and finds the tick dots in the pixels.
 * Their centres are fitted to a line, and every handle centre for every value
 * from min to max must sit on that line within half a pixel — the first and
 * the last value included. A continuous slider must put its handle at min and
 * max on the same two ends of that scale, the corner radius in from the track's
 * ends. The element route (`<m-slider>`, its `ticks` attribute arriving after
 * the element upgraded) is measured the same way.
 *
 * The press check reads the handle's bar (`::before`) width: 4dp at rest, 2dp
 * while a press on the handle, the active track or the inactive track lasts,
 * and back to 4dp on release.
 *
 *   bun run scripts/check-slider-ticks.ts
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { inflateSync } from "node:zlib";
import { resolve } from "node:path";

import * as sass from "sass";

import { launchChromium } from "./browser-profile";
import { directionArmsPrelude, sassOptions } from "./build-styles";

const HOST = 320;
const STEPS = 10;
// Two device pixels per CSS pixel: a dot's centre is readable to a quarter of a CSS pixel.
const DPR = 2;

/** PNG decode, for reading the painted track. */
const decodePNG = (buf: Buffer): { width: number; height: number; channels: number; data: Uint8Array } => {
  let offset = 8;
  let width = 0;
  let height = 0;
  let colorType = 6;
  const parts: Buffer[] = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9]!;
    } else if (type === "IDAT") parts.push(data);
    else if (type === "IEND") break;
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(parts));
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 1;
  const stride = width * channels;
  const out = new Uint8Array(width * height * channels);
  let p = 0;
  let previous = new Uint8Array(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[p++]!;
    const line = raw.subarray(p, p + stride);
    p += stride;
    const current = new Uint8Array(stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? current[x - channels]! : 0;
      const b = previous[x]!;
      const c = x >= channels ? previous[x - channels]! : 0;
      let value = line[x]!;
      if (filter === 1) value += a;
      else if (filter === 2) value += b;
      else if (filter === 3) value += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c);
        const pb = Math.abs(a - c);
        const pc = Math.abs(a + b - 2 * c);
        value += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      current[x] = value & 255;
    }
    out.set(current, y * stride);
    previous = current;
  }
  return { width, height, channels, data: out };
};

type RGB = [number, number, number];
/** A painted colour, as the browser writes it. */
const rgbOf = (css: string): RGB => {
  const value = css.trim();
  const numbers = value.match(/rgba?\(([^)]+)\)/);
  if (numbers) {
    return numbers[1]!.split(/[\s,/]+/).slice(0, 3).map(Number) as RGB;
  }
  const hex = value.replace("#", "");
  const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as RGB;
};
const distance = (a: RGB, b: RGB): number =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/**
 * The centres of the runs along one pixel line that carry the tick colour
 * against the track colour, in pixels from the start of the image.
 */
const tickCentres = (
  image: { width: number; height: number; channels: number; data: Uint8Array },
  line: { axis: "x" | "y"; at: number },
  colours: { tick: RGB; track: RGB },
): number[] => {
  const page: RGB = [255, 255, 255];
  const length = line.axis === "x" ? image.width : image.height;
  const run: number[] = [];
  const runs: [number, number][] = [];
  const at = (i: number): RGB => {
    const x = line.axis === "x" ? i : line.at;
    const y = line.axis === "x" ? line.at : i;
    const index = (y * image.width + x) * image.channels;
    return [image.data[index]!, image.data[index + 1]!, image.data[index + 2]!];
  };
  for (let i = 0; i < length; i++) {
    const pixel = at(i);
    // Nearer the tick colour than the track's or the page's: the page is not a tick.
    const isTick =
      distance(pixel, colours.tick) <= distance(pixel, colours.track) &&
      distance(pixel, colours.tick) <= distance(pixel, page);
    if (isTick) run.push(i);
    else if (run.length) {
      runs.push([run[0]!, run[run.length - 1]!]);
      run.length = 0;
    }
  }
  if (run.length) runs.push([run[0]!, run[run.length - 1]!]);
  // A 4dp dot at the device scale, with antialiasing on both sides, sitting in
  // the track: a run at the track's own edge is its antialiasing, and its
  // neighbours there are the page, not the track.
  const widest = Math.round(4 * DPR) + 4;
  // Three device pixels clear of the dot's own antialiasing: nearer the track
  // than the page, so an edge of the track is not a tick.
  const inTrack = (i: number): boolean =>
    i >= 0 && i < length && distance(at(i), colours.track) < distance(at(i), page);
  return runs
    .filter(([start, end]) => end - start + 1 >= 2 && end - start + 1 <= widest && inTrack(start - 3) && inTrack(end + 3))
    .map(([start, end]) => (start + end) / 2);
};

const bundle = await Bun.build({
  entrypoints: [resolve("src/components/slider/index.ts")],
  target: "browser",
  format: "esm",
  minify: true,
});
assert(bundle.success, String(bundle.logs));
const componentJs = await bundle.outputs[0]!.text();
// The element and the style registry share one module instance, or the
// registration would land in a copy the element never reads.
await mkdir("analysis", { recursive: true });
const elementEntry = resolve("analysis/slider-element-entry.ts");
await Bun.write(
  elementEntry,
  `export * from "${resolve("src/elements/slider.ts")}";\nexport * from "${resolve("src/elements/styles.ts")}";\n`,
);
const elementBundle = await Bun.build({ entrypoints: [elementEntry], target: "browser", format: "esm", minify: true });
assert(elementBundle.success, String(elementBundle.logs));
const elementJs = await elementBundle.outputs[0]!.text();
const sheet = sass.compileString(directionArmsPrelude() + (await Bun.file("src/styles/main.scss").text()), sassOptions()).css;
const shadowCss = sass.compileString('@use "components/slider";', sassOptions()).css;

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/slider.js") return new Response(componentJs, { headers: { "Content-Type": "text/javascript" } });
    if (url.pathname === "/element.js") return new Response(elementJs, { headers: { "Content-Type": "text/javascript" } });
    if (url.pathname === "/styles.css") return new Response(sheet, { headers: { "Content-Type": "text/css" } });
    const element = url.pathname === "/element";
    const dir = url.searchParams.get("dir") === "rtl" ? "rtl" : "ltr";
    return new Response(
      `<!doctype html><html dir="${dir}" data-theme="baseline" data-theme-mode="light"><head>
<link rel="stylesheet" href="/styles.css">
<style>body{margin:0;padding:24px;background:#fff}#host{width:${HOST}px}
/* Every position here is the settled one: no transition stands between the value and the paint. */
.mtrl-slider *,.mtrl-slider{transition:none!important}</style>
<style>.mtrl-slider *,.mtrl-slider{transition:none!important}</style></head>
<body><div id="host">${element ? '<m-slider aria-label="Volume"></m-slider>' : ""}</div>
<script type="module">
${element
  ? `import * as element from "/element.js";import * as styles from "/element.js";
styles.registerStyles({ slider: ${JSON.stringify(shadowCss)} });
element.defineSlider();window.ready=true;`
  : `import createSlider from "/slider.js";window.createSlider=createSlider;window.ready=true;`}
</script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

const browser = await launchChromium({ headless: true });
try {
  const page = await browser.browser()!.newPage({ viewport: { width: 500, height: 500 }, deviceScaleFactor: DPR });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);

  await page.evaluate((host) => {
    const window_ = window as unknown as {
      mount: (config: Record<string, unknown>, vertical: boolean) => void;
      slider: { setValue: (value: number, emit?: boolean) => void; destroy: () => void };
    };
    window_.mount = (config, vertical) => {
      window_.slider?.destroy();
      const holder = document.querySelector<HTMLElement>("#host")!;
      holder.replaceChildren();
      holder.style.width = vertical ? "64px" : `${host}px`;
      holder.style.height = vertical ? `${host}px` : "";
      window_.slider = (window as unknown as { createSlider: (config: unknown) => never }).createSlider(
        JSON.parse(JSON.stringify(config)),
      );
      holder.append((window_.slider as unknown as { element: HTMLElement }).element);
    };
  }, HOST);

  /** Colours as painted: the active track, and the tick layer drawn on it. */
  const colours = async (): Promise<{ tick: RGB; track: RGB }> => {
    const values = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(".mtrl-slider")!;
      const active = root.querySelector<HTMLElement>(".mtrl-slider__segment--active") ?? root.querySelector<HTMLElement>(".mtrl-slider__segment")!;
      const ticks = root.querySelector<HTMLElement>(".mtrl-slider__ticks--active")!;
      return { track: getComputedStyle(active).backgroundColor, tick: getComputedStyle(ticks).color };
    });
    return { track: rgbOf(values.track), tick: rgbOf(values.tick) };
  };

  /** The handle's centre as a distance from the track's start end. */
  const handleAlong = (vertical: boolean, rtl: boolean) =>
    page.evaluate(
      ({ vertical, rtl }) => {
        const holder = document.querySelector<HTMLElement>("#host")!;
        const handle = holder.querySelector<HTMLElement>('[role="slider"]')!.getBoundingClientRect();
        const track = holder.querySelector<HTMLElement>(".mtrl-slider__track")!.getBoundingClientRect();
        return vertical
          ? track.y + track.height - (handle.y + handle.height / 2)
          : rtl
            ? track.right - (handle.x + handle.width / 2)
            : handle.x + handle.width / 2 - track.x;
      },
      { vertical, rtl },
    );

  /** The painted tick centres, as distances from the track's start end. */
  const measure = async (vertical: boolean, rtl: boolean) => {
    const handleVisibility = await page.evaluate(() => {
      const handle = document.querySelector<HTMLElement>('[role="slider"]')!;
      const before = handle.style.visibility;
      handle.style.visibility = "hidden";
      return before;
    });
    const box = await page.locator("#host").screenshot();
    await page.evaluate((before) => (document.querySelector<HTMLElement>('[role="slider"]')!.style.visibility = before), handleVisibility);
    const image = decodePNG(Buffer.from(box));
    const geometry = await page.evaluate(
      ({ vertical, rtl }) => {
        const holder = document.querySelector<HTMLElement>("#host")!;
        const host = holder.getBoundingClientRect();
        const track = holder.querySelector<HTMLElement>(".mtrl-slider__track")!.getBoundingClientRect();
        return {
          line: vertical ? Math.round(track.x + track.width / 2 - host.x) : Math.round(track.y + track.height / 2 - host.y),
          // Where the track's start end is in the image, along the axis.
          start: vertical ? Math.round(track.bottom - host.y) : rtl ? Math.round(track.right - host.x) : Math.round(track.x - host.x),
        };
      },
      { vertical, rtl },
    );
    const palette = await colours();
    const centres = tickCentres(image, { axis: vertical ? "y" : "x", at: Math.round(geometry.line * DPR) }, palette);
    // Value grows up a vertical track and left along an RTL one; the centres
    // come back in image pixels and are compared in CSS pixels.
    const along = (pixel: number): number => {
      const css = pixel / DPR;
      return vertical || rtl ? geometry.start - css : css - geometry.start;
    };
    // Indexed from the track's start end, whichever way the value grows.
    return { centres: centres.map(along).sort((a, b) => a - b), geometry, image, palette };
  };

  /**
   * The tick scale of a painted run. Ten dots are expected above the handle at
   * max, or eleven when the mask's hole around the handle does not cover the
   * last one; a run that does not sit at the spacing of the others is an
   * antialiased edge of the track, not a tick, and is dropped.
   */
  const scaleFrom = (positions: number[], what: string) => {
    assert(
      positions.length === STEPS || positions.length === STEPS + 1,
      `${what} where the scale has ${STEPS} above the handle at max`,
    );
    // Ten dots above the handle at max; an eleventh run is either the mask's
    // hole missing the last dot or an antialiased edge of the track's end.
    // The line that explains its points within half a pixel, with the most
    // points, is the scale.
    const candidates = [positions, positions.slice(1), positions.slice(0, -1)]
      .filter((values) => values.length === STEPS)
      .map((values) => ({ values, line: fit(values) }));
    const whole = fit(positions);
    if (positions.length === STEPS + 1 && whole.residual <= 0.35) return whole;
    const best = candidates.sort((a, b) => a.line.residual - b.line.residual)[0]!;
    return best.line;
  };
  const fit = (positions: number[]) => {
    const values = positions;
    const n = values.length;
    const meanI = (n - 1) / 2;
    const meanS = values.reduce((sum, value) => sum + value, 0) / n;
    let covariance = 0;
    let variance = 0;
    values.forEach((value, index) => {
      covariance += (index - meanI) * (value - meanS);
      variance += (index - meanI) ** 2;
    });
    const slope = covariance / variance;
    const intercept = meanS - slope * meanI;
    const residual = Math.max(...values.map((value, index) => Math.abs(value - (intercept + slope * index))));
    return { at: (step: number) => intercept + slope * step, slope, residual };
  };

  const report: string[] = [];
  for (const size of ["XS", "S", "M", "L", "XL"]) {
    for (const vertical of [false, true]) {
      for (const rtl of [false, true]) {
        const name = `${size} ${vertical ? "vertical" : "horizontal"} ${rtl ? "RTL" : "LTR"}`;
        await page.evaluate(() => (document.documentElement.dir = "ltr"));
        if (rtl) await page.evaluate(() => (document.documentElement.dir = "rtl"));
        await page.evaluate(
          ({ size, vertical }) => {
            const window_ = window as unknown as { mount: (config: Record<string, unknown>, v: boolean) => void; slider: { setValue: (v: number, emit?: boolean) => void } };
            window_.mount({ ticks: true, step: 10, value: 100, size, ...(vertical ? { orientation: "vertical" } : {}) }, vertical);
          },
          { size, vertical },
        );
        await page.waitForTimeout(40);
        // The ticks, with the handle out of the picture; then the scale they make.
        const painted = await measure(vertical, rtl);
        const scale = scaleFrom(painted.centres, `${name}: ${painted.centres.length} painted ticks`);
        assert(scale.residual <= 0.35, `${name}: the painted ticks sit on a line (worst ${scale.residual.toFixed(2)} px off)`);
        // Every value, the ends included.
        const handleDistances: string[] = [];
        for (let step = 0; step <= STEPS; step++) {
          await page.evaluate((value) => (window as unknown as { slider: { setValue: (v: number, emit?: boolean) => void } }).slider.setValue(value, false), step * 10);
          const where = await handleAlong(vertical, rtl);
          handleDistances.push(where.toFixed(1));
          const expected = scale.at(step);
          assert(
            Math.abs(where - expected) <= 0.5,
            `${name}: the handle at ${step * 10} sits ${where.toFixed(2)} px into the track where its tick is at ${expected.toFixed(2)} px`,
          );
        }
        // A continuous slider keeps the same inset at both ends, and the same scale between.
        await page.evaluate(
          ({ size, vertical }) => {
            const window_ = window as unknown as { mount: (config: Record<string, unknown>, v: boolean) => void };
            window_.mount({ value: 0, size, snapToSteps: false, ...(vertical ? { orientation: "vertical" } : {}) }, vertical);
          },
          { size, vertical },
        );
        await page.waitForTimeout(40);
        for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
          await page.evaluate((value) => (window as unknown as { slider: { setValue: (v: number, emit?: boolean) => void } }).slider.setValue(value, false), Math.round(fraction * 100));
          const where = await handleAlong(vertical, rtl);
          const expected = scale.at(fraction * STEPS);
          assert(
            Math.abs(where - expected) <= 0.5,
            `${name}: the continuous handle at ${fraction * 100}% sits ${where.toFixed(2)} px into the track where the discrete scale is at ${expected.toFixed(2)} px`,
          );
        }
        report.push(`${name}: ticks ${painted.centres.length}, residual ${scale.residual.toFixed(2)} px, handles ${handleDistances.join("/")}`);
      }
    }
  }

  // The element route, the form the owner's page uses: the element upgrades
  // first and the ticks attribute arrives after it, over a range that does not
  // start at zero. The first tick is read from the painted track, as above.
  const elementPage = await browser.browser()!.newPage({ viewport: { width: 500, height: 500 }, deviceScaleFactor: DPR });
  elementPage.on("pageerror", (error) => errors.push(error.message));
  await elementPage.goto(`http://127.0.0.1:${server.port}/element`);
  await elementPage.waitForFunction(() => (window as unknown as { ready?: boolean }).ready);
  await elementPage.evaluate(() => {
    const slider = document.querySelector("m-slider")!;
    slider.setAttribute("min", "20");
    slider.setAttribute("max", "120");
    slider.setAttribute("step", "10");
    slider.setAttribute("value", "120");
  });
  await elementPage.waitForTimeout(60);
  await elementPage.evaluate(() => document.querySelector("m-slider")!.setAttribute("ticks", ""));
  // The page's stylesheet does not reach into the shadow root: the settle
  // transition is switched off there, so the capture is the settled geometry.
  await elementPage.evaluate(() => {
    const root = document.querySelector("m-slider")!.shadowRoot!;
    const still = new CSSStyleSheet();
    still.replaceSync(".mtrl-slider *, .mtrl-slider { transition: none !important; }");
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, still];
  });
  await elementPage.waitForTimeout(60);
  const elementGeometry = await elementPage.evaluate(() => {
    const host = document.querySelector<HTMLElement>("#host")!;
    const element = host.querySelector<HTMLElement>("m-slider")!;
    const root = element.shadowRoot!;
    const handle = root.querySelector<HTMLElement>('[role="slider"]')!;
    handle.style.visibility = "hidden";
    const box = host.getBoundingClientRect();
    const track = root.querySelector<HTMLElement>(".mtrl-slider__track")!.getBoundingClientRect();
    return {
      line: Math.round(track.y + track.height / 2 - box.y),
      start: Math.round(track.x - box.x),
      value: handle.getAttribute("aria-valuenow"),
      handle: Math.round(handle.getBoundingClientRect().x + handle.getBoundingClientRect().width / 2 - track.x),
      track: [Math.round(track.x - box.x), Math.round(track.width)],
    };
  });
  const elementShot = decodePNG(Buffer.from(await elementPage.locator("#host").screenshot()));
  await elementPage.evaluate(() => {
    const root = document.querySelector("m-slider")!.shadowRoot!;
    (root.querySelector<HTMLElement>('[role="slider"]')!.style.visibility = "");
  });
  const elementColours = await elementPage.evaluate(() => {
    const root = document.querySelector("m-slider")!.shadowRoot!.querySelector<HTMLElement>(".mtrl-slider")!;
    const active = root.querySelector<HTMLElement>(".mtrl-slider__segment--active") ?? root.querySelector<HTMLElement>(".mtrl-slider__segment")!;
    const ticks = root.querySelector<HTMLElement>(".mtrl-slider__ticks--active")!;
    return { track: getComputedStyle(active).backgroundColor, tick: getComputedStyle(ticks).color };
  });
  const elementTicks = tickCentres(
    elementShot,
    { axis: "x", at: Math.round(elementGeometry.line * DPR) },
    { track: rgbOf(elementColours.track), tick: rgbOf(elementColours.tick) },
  ).map((centre) => centre / DPR - elementGeometry.start);
  const elementScale = scaleFrom(elementTicks, `element: ${elementTicks.length} painted ticks`);
  // The state the ticks arrive in: nothing has moved the value since, and the
  // handle must already sit on the scale the ticks paint.
  const elementAtRest = await elementPage.evaluate(() => {
    const root = document.querySelector("m-slider")!.shadowRoot!;
    const handle = root.querySelector<HTMLElement>('[role="slider"]')!.getBoundingClientRect();
    const track = root.querySelector<HTMLElement>(".mtrl-slider__track")!.getBoundingClientRect();
    return handle.x + handle.width / 2 - track.x;
  });
  assert(
    Math.abs(elementAtRest - elementScale.at(STEPS)) <= 0.5,
    `element: the handle sits ${elementAtRest.toFixed(2)} px into the track when the ticks arrive where the last tick is at ${elementScale.at(STEPS).toFixed(2)} px`,
  );
  for (let step = 0; step <= STEPS; step++) {
    const where = await elementPage.evaluate((value) => {
      const element = document.querySelector("m-slider")!;
      (element as unknown as { value: number }).value = 20 + value;
      const root = element.shadowRoot!;
      const handle = root.querySelector<HTMLElement>('[role="slider"]')!.getBoundingClientRect();
      const track = root.querySelector<HTMLElement>(".mtrl-slider__track")!.getBoundingClientRect();
      return handle.x + handle.width / 2 - track.x;
    }, step * 10);
    const expected = elementScale.at(step);
    assert(
      Math.abs(where - expected) <= 0.5,
      `element: the handle at ${20 + step * 10} sits ${where.toFixed(2)} px into the track where its tick is at ${expected.toFixed(2)} px`,
    );
  }
  await elementPage.close();

  // A press anywhere that starts an interaction narrows the handle until the release.
  await page.evaluate(() => (document.documentElement.dir = "ltr"));
  await page.evaluate(() => {
    const window_ = window as unknown as { mount: (config: Record<string, unknown>, v: boolean) => void };
    window_.mount({ value: 20, step: 10, ticks: true }, false);
  });
  await page.waitForTimeout(40);
  const barWidth = () =>
    page.evaluate(() => {
      const handle = document.querySelector<HTMLElement>(".mtrl-slider [role=slider], [role=slider]")!;
      return {
        width: parseFloat(getComputedStyle(handle, "::before").width),
        pressed: handle.classList.contains("mtrl-slider__handle--pressed"),
      };
    });
  const trackBox = await page.locator(".mtrl-slider__container").boundingBox();
  assert(trackBox);
  const at = async (fraction: number) => ({ x: trackBox.x + trackBox.width * fraction, y: trackBox.y + trackBox.height / 2 });
  const press = async (fraction: number, what: string) => {
    const point = await at(fraction);
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    const held = await barWidth();
    assert.equal(held.width, 2, `${what}: the handle narrows to 2 px while the press lasts (measured ${held.width} px)`);
    assert(held.pressed, `${what}: the handle carries the pressed state`);
    await page.mouse.up();
    const released = await barWidth();
    assert.equal(released.width, 4, `${what}: the handle is 4 px again after the release (measured ${released.width} px)`);
    assert(!released.pressed, `${what}: the pressed state ends with the release`);
  };
  const rest = await barWidth();
  assert.equal(rest.width, 4, `at rest the handle is 4 px (measured ${rest.width} px)`);
  assert(!rest.pressed, "at rest the handle is not pressed");
  await press(0.2, "a press on the handle");
  await page.evaluate(() => (window as unknown as { slider: { setValue: (v: number, emit?: boolean) => void } }).slider.setValue(20, false));
  await press(0.8, "a press on the inactive track");
  await page.evaluate(() => (window as unknown as { slider: { setValue: (v: number, emit?: boolean) => void } }).slider.setValue(80, false));
  await press(0.15, "a press on the active track");

  assert.deepEqual(errors, []);
  console.log(report.join("\n"));
  console.log("Slider ticks and press check passed.");
} finally {
  await browser.close();
  server.stop(true);
}
