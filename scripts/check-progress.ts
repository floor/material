#!/usr/bin/env bun
// scripts/check-progress.ts
//
// The progress indicators' motion math, in a browser, against the built
// package. The canvas drew every frame from formulas; the sheet composes
// the same poses from CSS, and each of these checks holds one of those
// compositions to the formula it replaced — the four parity findings the
// canvas-to-SVG cut (PR #189) left behind, each pinned by the control that
// isolated it:
//
// 1. The circular track must vanish when the arc leaves it no room: the
//    canvas's guard drew nothing once the arc and its caps took the ring,
//    while a dash clamped to zero still paints its round cap as a dot.
//    The count is a same-pose A/B — the shot with the track against the
//    shot with the track display:none — so the arc's own anti-aliased
//    edge, which sits near the track's colour, cancels out and only what
//    the track itself paints is counted. Controls: the same track one
//    beat earlier paints most of the ring, and the thin stroke's
//    sub-unit dash still paints at the same beat.
// 2. The indeterminate linear between-track holds an absolute gap behind
//    the first bar's tail — the canvas's gap, not the proportional share
//    keyframes interpolated, which painted track over the bar's head
//    early in the cycle. Controls: the between's tail var against the
//    first bar's tail var less the gap at four beats of the segment the
//    two share, and — the control that isolated the finding — hiding the
//    between-track must not reveal any of the bar's paint.
// 3. A wavy linear indicator in a right-to-left page is the mirror of the
//    left-to-right one, as m3.material.io/components/progress-indicators
//    (read 2026-11-01) directs: "Linear progress indicators should be
//    mirrored horizontally for products using right-to-left (RTL)
//    languages". The branch was already the mirror — this holds it there,
//    at the token wavelength.
// 4. The wavy circular window turns at a constant rate of angle, the way
//    the canvas placed it ("Circular indicators animate from the top of
//    the track, clockwise by default") — not at a constant rate of path,
//    which let the window's start wobble degrees off its rotation as the
//    wave traveled underneath. The ring must also close: the token
//    wavelength does not divide the circumference, and a sine that stops
//    mid-period left a notch the closing line cut straight across.
//    Controls: the flat ring holds exactly, and the window holds at five
//    beats across its loop.
//
//   bun run build && bun run progress:check
import assert from "node:assert/strict";
import { chromium, type Browser, type Page } from "playwright";

// The stylesheet and the entry the checks drive. CI serves the built
// package; a parity run points both at a recorded dist to read a tree this
// checkout no longer contains.
const stylesPath = process.env.MTRL_CHECK_STYLES ?? "dist/styles.css";
const entryPath = process.env.MTRL_CHECK_ENTRY ?? "scripts/fixtures/elements.ts";

const bundle = await Bun.build({ entrypoints: [entryPath], target: "browser", minify: false });
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/elements.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(Bun.file(stylesPath), { headers: { "Content-Type": "text/css" } });
    return new Response(
      `<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;background:#fff}</style></head>
<body><div id="host"></div><script type="module" src="/elements.js"></script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

const ready = (): { predicate: () => boolean } => ({ predicate: () => (window as unknown as { ready?: boolean }).ready === true });

const newCheckPage = async (browser: Browser, viewport: { width: number; height: number }, scale = 1): Promise<Page> => {
  const page = await browser.newPage({ viewport, deviceScaleFactor: scale });
  await page.goto(server.url.href);
  await page.waitForFunction(ready().predicate, undefined, { timeout: 15000 });
  return page;
};

const addProgress = (page: Page, config: Record<string, unknown>): Promise<void> =>
  page.evaluate(async (options) => {
    const host = document.getElementById("host")!;
    const factory = (window as unknown as {
      mtrl: { createProgress: (config: Record<string, unknown>) => { element: HTMLElement } };
    }).mtrl;
    host.appendChild(factory.createProgress(options).element);
    await new Promise<void>((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())));
  }, config);

/** Count the pixels near a colour in a screenshot, decoded in the page. */
const countColour = (page: Page, b64: string, rgb: number[]): Promise<number> =>
  page.evaluate(async ([source, colour]) => {
    const img = new Image();
    img.src = "data:image/png;base64," + source;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let painted = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i]! - colour[0]!) < 30 && Math.abs(data[i + 1]! - colour[1]!) < 30 && Math.abs(data[i + 2]! - colour[2]!) < 30) {
        painted++;
      }
    }
    return painted;
  }, [b64, rgb] as unknown as [string, number[]]);

const wrapDelta = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
};

interface StartReading { predicted: number; intended: number }

/**
 * Finding 4: the wavy ring's window turns at a constant rate of angle. The
 * dash math is read back through the browser's own path geometry — the arc
 * table the dashes actually walk — so what is asserted is what paints.
 */
const checkCircularWindow = async (browser: Browser): Promise<string[]> => {
  const found: string[] = [];
  const readStart = (page: Page, ms: number): Promise<StartReading> =>
    page.evaluate((time) => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = time;
      }
      const svg = document.querySelector("#host svg")!;
      const path = svg.querySelector(".mtrl-progress__indicator") as SVGGeometryElement;
      const turn = (selector: string): number => {
        const el = svg.querySelector(selector);
        return el ? parseFloat(getComputedStyle(el).rotate) || 0 : 0;
      };
      const spin = turn(".mtrl-progress__spin");
      const kick = turn(".mtrl-progress__kick");
      const travel = turn(".mtrl-progress__wave-travel");
      const off = parseFloat(getComputedStyle(path).strokeDashoffset) || 0;
      const box = path.ownerSVGElement!.viewBox.baseVal;
      const cx = box.width / 2;
      const cy = box.height / 2;
      const total = path.getTotalLength();
      const table: number[] = [];
      for (let i = 0; i <= 720; i++) {
        const point = path.getPointAtLength((total * i) / 720);
        table.push((Math.atan2(point.y - cy, point.x - cx) * 180) / Math.PI);
      }
      // The curve's own arc→angle map, interpolated wrap-aware.
      const angleAt = (fraction: number): number => {
        const f = ((fraction % 1) + 1) % 1;
        const x = f * 720;
        const i = Math.floor(x);
        const a0 = table[i]!;
        const a1 = i + 1 <= 720 ? table[i + 1]! : table[0]!;
        let d = a1 - a0;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        return a0 + d * (x - i);
      };
      const mod = (v: number): number => ((v % 360) + 360) % 360;
      const start = (((-off / 100) % 1) + 1) % 1;
      return {
        predicted: mod(spin + kick + travel + angleAt(start) + 90),
        intended: mod(spin + kick + 90),
      };
    }, ms);

  const wavy = await newCheckPage(browser, { width: 360, height: 360 });
  await addProgress(wavy, { variant: "circular", shape: "wavy", size: 240, indeterminate: true });
  await wavy.waitForTimeout(300);

  // The ring closes: the path's last point is its first, or the closing
  // line cuts a chord straight across the seam.
  const seam = await wavy.evaluate(() => {
    const path = document.querySelector("#host .mtrl-progress__indicator") as SVGPathElement;
    const numbers = path.getAttribute("d")!.match(/-?[\d.]+/g)!.map(Number);
    const first = [numbers[0]!, numbers[1]!];
    const last = [numbers[numbers.length - 2]!, numbers[numbers.length - 1]!];
    return Math.hypot(last[0]! - first[0]!, last[1]! - first[1]!);
  });
  if (seam > 0.1) found.push(`the wavy ring does not close: its closing line spans ${seam.toFixed(2)}px at the seam`);

  const drifts: number[] = [];
  for (const t of [1000, 1250, 1500, 1750, 2000]) {
    const row = await readStart(wavy, t);
    const drift = wrapDelta(row.predicted, row.intended);
    drifts.push(drift);
    if (drift > 0.5) {
      found.push(`t=${t}ms: the window's start drifts ${drift.toFixed(2)}° from its rotation (predicted ${row.predicted.toFixed(2)}°, intended ${row.intended.toFixed(2)}°)`);
    }
  }
  await wavy.close();

  // Control: the flat ring's window holds exactly — its path is a circle,
  // where dash units are angles already.
  const flat = await newCheckPage(browser, { width: 360, height: 360 });
  await addProgress(flat, { variant: "circular", size: 240, indeterminate: true });
  await flat.waitForTimeout(300);
  for (const t of [1500, 2000]) {
    const row = await readStart(flat, t);
    const drift = wrapDelta(row.predicted, row.intended);
    if (drift > 0.25) {
      found.push(`flat control t=${t}ms: even the circle's window drifts ${drift.toFixed(2)}° (predicted ${row.predicted.toFixed(2)}°, intended ${row.intended.toFixed(2)}°)`);
    }
  }
  await flat.close();
  console.log(`  circular window: seam ${seam.toFixed(2)}px, worst start drift ${Math.max(...drifts).toFixed(2)}° over ${drifts.length} beats, flat control exact`);
  return found;
};

interface BetweenReading { gapBehind: number; covered: number }

/**
 * Finding 2: the between-track holds an absolute gap behind the first
 * bar's tail. The between's tail var must sit the gap behind the first
 * bar's tail at every beat of the segment the two keyframe sets share,
 * and hiding the between-track must not reveal any of the bar's paint —
 * the between paints after the first bar, so whatever of the bar it
 * reaches is covered.
 */
const checkLinearBetween = async (browser: Browser): Promise<string[]> => {
  const found: string[] = [];
  const page = await newCheckPage(browser, { width: 360, height: 120 }, 2);
  await page.evaluate(() => document.getElementById("host")!.setAttribute("style", "width:320px"));
  await addProgress(page, { variant: "linear", shape: "wavy", indeterminate: true });
  await page.waitForTimeout(300);

  // The bar's painted pixels, counted in the component's shot.
  const primaryPixels = async (): Promise<number> => {
    const box = await page.evaluate(() => {
      const rect = (document.querySelector("#host > *") as HTMLElement).getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    const shot = await page.screenshot({ clip: box });
    return page.evaluate(async (source) => {
      const img = new Image();
      img.src = "data:image/png;base64," + source;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let painted = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (Math.abs(data[i]! - 103) < 60 && Math.abs(data[i + 1]! - 80) < 60 && Math.abs(data[i + 2]! - 164) < 60) painted++;
      }
      return painted;
    }, Buffer.from(shot).toString("base64"));
  };

  const rows: BetweenReading[] = [];
  for (const t of [350, 525, 700, 875]) {
    const read = await page.evaluate((time) => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = time;
      }
      const svg = document.querySelector("#host svg")!;
      // The window rect inside the bar's clipPath carries the animation's
      // own edge vars, even though it never renders a box itself.
      const first = svg.querySelector(".mtrl-progress__bar-first rect.mtrl-progress__wave-window")!;
      const between = svg.querySelector(".mtrl-progress__between")!;
      const num = (el: Element, name: string): number => parseFloat(getComputedStyle(el).getPropertyValue(name)) || 0;
      return { l: num(first, "--mtrl-progress-l"), r: num(between, "--mtrl-progress-r"), gapp: num(svg, "--mtrl-progress-gapp") };
    }, t);
    const gapBehind = read.r - (read.l - read.gapp);
    const withBetween = await primaryPixels();
    await page.evaluate(() => {
      (document.querySelector("#host .mtrl-progress__between") as SVGElement).style.visibility = "hidden";
    });
    const withoutBetween = await primaryPixels();
    await page.evaluate(() => {
      (document.querySelector("#host .mtrl-progress__between") as SVGElement).style.visibility = "";
    });
    const covered = withoutBetween - withBetween;
    rows.push({ gapBehind, covered });
    if (Math.abs(gapBehind) > 0.3) {
      found.push(`t=${t}ms: the between-track's tail sits ${gapBehind.toFixed(2)}% off a gap behind the first bar's tail`);
    }
    if (covered > 6) {
      found.push(`t=${t}ms: hiding the between-track reveals ${covered}px of the bar's paint — the between paints over it`);
    }
  }
  console.log(`  linear between: worst tail gap error ${Math.max(...rows.map((row) => Math.abs(row.gapBehind))).toFixed(2)}%, worst bar cover ${Math.max(...rows.map((row) => row.covered)).toFixed(0)}px over ${rows.length} beats`);
  await page.close();
  return found;
};

interface TrackReading { painted: number; trackSweep: number }

/**
 * Finding 1: the track paints nothing once the arc and both its caps take
 * the ring, and still paints a sub-unit dash when they do not. Counted at
 * the pixel level as a same-pose A/B — track visible against track
 * display:none — so only what the track itself paints is counted, and the
 * arc's anti-aliased edge, which lands near the track's colour, cancels.
 */
const checkHiddenTrack = async (browser: Browser): Promise<string[]> => {
  const found: string[] = [];
  const page = await newCheckPage(browser, { width: 200, height: 120 }, 2);
  await page.evaluate(() => document.getElementById("host")!.setAttribute("style", "display:flex;gap:8px"));
  await addProgress(page, { variant: "circular", size: 40, indeterminate: true, thickness: "thick" });
  await addProgress(page, { variant: "circular", size: 40, indeterminate: true });
  await page.waitForTimeout(300);

  const measure = async (selector: string, t: number): Promise<TrackReading> => {
    const geom = await page.evaluate(([sel, time]) => {
      for (const animation of document.getAnimations()) {
        animation.pause();
        animation.currentTime = time;
      }
      const root = document.querySelector(sel)!;
      const svg = root.querySelector("svg")!;
      const track = svg.querySelector("circle.mtrl-progress__track")!;
      const colour = getComputedStyle(track).stroke.match(/\d+/g)!.map(Number);
      const sweep = parseFloat(getComputedStyle(svg.querySelector(".mtrl-progress__kick")!).getPropertyValue("--mtrl-progress-sweep")) || 0;
      const gap100 = parseFloat(getComputedStyle(svg).getPropertyValue("--mtrl-progress-gap100")) || 0;
      const box = root.getBoundingClientRect();
      return { x: box.x, y: box.y, w: box.width, h: box.height, colour, trackSweep: 100 - sweep - 2 * Math.min(sweep, gap100) };
    }, [selector, t] as unknown as [string, number]);
    const clip = { x: geom.x, y: geom.y, width: geom.w, height: geom.h };
    const visible = await countColour(page, Buffer.from(await page.screenshot({ clip })).toString("base64"), geom.colour);
    await page.evaluate((sel) => {
      const track = document.querySelector(sel)!.querySelector("circle.mtrl-progress__track") as SVGElement;
      track.style.display = "none";
    }, selector);
    const without = await countColour(page, Buffer.from(await page.screenshot({ clip })).toString("base64"), geom.colour);
    await page.evaluate((sel) => {
      (document.querySelector(sel)!.querySelector("circle.mtrl-progress__track") as SVGElement).style.display = "";
    }, selector);
    return { painted: visible - without, trackSweep: geom.trackSweep };
  };

  // The thick ring at the sweep's peak: no room for the track at all.
  const hidden = await measure("#host > :nth-child(1)", 3000);
  if (hidden.trackSweep > -1) found.push(`pose: at t=3000ms the thick track's room is ${hidden.trackSweep.toFixed(2)} units, not past hiding (the check needs the hidden regime)`);
  if (hidden.painted > 4) found.push(`t=3000ms: the hidden track still paints ${hidden.painted}px (its zero dash's round cap)`);
  // Control: the same track paints most of the ring one beat earlier.
  const shown = await measure("#host > :nth-child(1)", 0);
  if (shown.painted < 20) found.push(`t=0ms control: the same track painted only ${shown.painted}px, so the hide is not the pose`);
  // Control: the thin stroke keeps its sub-unit dash at the same beat.
  const thin = await measure("#host > :nth-child(2)", 3000);
  if (thin.painted < 4) found.push(`t=3000ms thin control: the sub-unit dash (${thin.trackSweep.toFixed(2)} units) no longer paints`);
  console.log(`  hidden track: ${hidden.painted}px at the peak (room ${hidden.trackSweep.toFixed(1)} units), ${shown.painted}px at t=0, thin sub-unit ${thin.painted}px`);
  await page.close();
  return found;
};

/**
 * Finding 3: the RTL wavy linear indicator is the LTR one mirrored, and
 * its wavelength is the token. A regression guard — this tree already
 * mirrors; the check holds it there.
 */
const checkRtlMirror = async (browser: Browser): Promise<string[]> => {
  const found: string[] = [];
  const lines: number[][] = [];
  for (const dir of ["ltr", "rtl"]) {
    const context = await browser.newContext({ viewport: { width: 360, height: 160 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto(server.url.href);
    await page.waitForFunction(ready().predicate, undefined, { timeout: 15000 });
    await page.evaluate((direction) => {
      const host = document.getElementById("host")!;
      host.setAttribute("dir", direction);
      host.setAttribute("style", "width:320px;background:#fff");
    }, dir);
    await addProgress(page, { variant: "linear", shape: "wavy", value: 50 });
    // The amplitude settles under script, not the document timeline; let
    // it finish, then pin the wave's travel at the top of its loop so both
    // pages stand at the same phase — the mirror reads exactly only then.
    await page.waitForTimeout(800);
    await page.evaluate(() => {
      const travel = document.querySelector("#host .mtrl-progress__wave-travel")!;
      for (const animation of travel.getAnimations()) {
        animation.pause();
        animation.currentTime = 0;
      }
    });
    const box = await page.evaluate(() => {
      const rect = (document.querySelector("#host > *") as HTMLElement).getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    });
    const shot = await page.screenshot({ clip: box });
    // The wave's centreline: the mean y of the indicator's colour in each
    // column of the element's own screenshot.
    const line = await page.evaluate(async (source) => {
      const img = new Image();
      img.src = "data:image/png;base64," + source;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const columns: number[] = [];
      for (let x = 0; x < canvas.width; x++) {
        let sum = 0;
        let n = 0;
        for (let y = 0; y < canvas.height; y++) {
          const i = (y * canvas.width + x) * 4;
          if (Math.abs(data[i]! - 103) < 60 && Math.abs(data[i + 1]! - 80) < 60 && Math.abs(data[i + 2]! - 164) < 60) {
            sum += y;
            n++;
          }
        }
        columns.push(n > 0 ? sum / n : Number.NaN);
      }
      return columns;
    }, Buffer.from(shot).toString("base64"));
    lines.push(line);
    await context.close();
  }

  // The mirrored RTL centreline against the LTR one: correlation over the
  // paired samples at each lag, sub-pixel peak — lag 0 is the mirror.
  const ltr = lines[0]!;
  const mir = lines[1]!.slice().reverse();
  const finite = (xs: number[]): number[] => xs.filter((v) => Number.isFinite(v));
  const mean = (xs: number[]): number => finite(xs).reduce((s, v) => s + v, 0) / Math.max(1, finite(xs).length);
  const m0 = mean(ltr);
  const scores: number[] = [];
  for (let lag = -12; lag <= 12; lag++) {
    let n = 0;
    let sa = 0;
    let sb = 0;
    let saa = 0;
    let sbb = 0;
    let sab = 0;
    for (let i = 30; i < ltr.length - 30; i++) {
      const a = ltr[i]!;
      const b = mir[i + lag];
      if (Number.isFinite(a) && Number.isFinite(b)) {
        n++;
        sa += a;
        sb += b;
        saa += a * a;
        sbb += b * b;
        sab += a * b;
      }
    }
    const cov = sab - (sa * sb) / n;
    const va = saa - (sa * sa) / n;
    const vb = sbb - (sb * sb) / n;
    scores.push(n > 40 && va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : -1);
  }
  let best = 0;
  scores.forEach((s, i) => {
    if (s > scores[best]!) best = i;
  });
  const left = scores[best - 1] ?? -1;
  const right = scores[best + 1] ?? -1;
  const denom = left - 2 * scores[best]! + right;
  const sub = denom < 0 ? (0.5 * (left - right)) / denom : 0;

  // Crest spacing over the detrended line, with hysteresis: the
  // wavelength's own guard, in device pixels at the shot's ratio of 2.
  const detrended = ltr.map((v) => v - m0);
  let crest = 0;
  let sign = 0;
  let firstCrest = -1;
  let lastCrest = -1;
  for (let i = 0; i < detrended.length; i++) {
    const v = detrended[i]!;
    if (sign >= 0 && v < -0.4) sign = -1;
    else if (sign <= 0 && v > 0.4) {
      if (sign < 0) {
        crest++;
        if (firstCrest < 0) firstCrest = i;
        lastCrest = i;
      }
      sign = 1;
    }
  }
  const wavelength = crest > 1 && lastCrest > firstCrest ? (lastCrest - firstCrest) / (crest - 1) / 2 : 0;

  if (Math.abs(best - 12 + sub) > 1) found.push(`the RTL wavy line is the LTR one shifted ${(best - 12 + sub).toFixed(2)}px under mirroring, not the mirror (peak ${scores[best]!.toFixed(3)})`);
  if (scores[best]! < 0.97) found.push(`the mirrored RTL line correlates at only ${scores[best]!.toFixed(3)} with the LTR one`);
  if (wavelength < 38.5 || wavelength > 41.5) found.push(`the wavy line's wavelength is ${wavelength.toFixed(1)}px, not the 40px token`);
  console.log(`  rtl mirror: lag ${(best - 12 + sub).toFixed(2)}px, correlation ${scores[best]!.toFixed(3)}, ${crest} crests -> wavelength ${wavelength.toFixed(1)}px`);
  return found;
};

const browser = await chromium.launch({ headless: true });
const failures: string[] = [];
try {
  for (const [name, check] of [
    ["circular window", checkCircularWindow],
    ["linear between", checkLinearBetween],
    ["hidden track", checkHiddenTrack],
    ["rtl mirror", checkRtlMirror],
  ] as [string, (browser: Browser) => Promise<string[]>][]) {
    try {
      const found = await check(browser);
      failures.push(...found.map((line) => `${name}: ${line}`));
    } catch (error) {
      failures.push(`${name}: the check itself failed: ${String(error).split("\n")[0]}`);
    }
  }
  assert.deepEqual(failures, [], `the progress motion math broke:\n${failures.join("\n")}`);
  console.log("Passed progress: the wavy ring closes and its window holds its angle over a loop (flat control exact), the between-track holds its gap behind the first bar without painting over it, the track hides at the sweep's peak while its sub-unit dash still paints, and the RTL wavy line is the LTR one mirrored at the 40px wavelength.");
} finally {
  await browser.close();
  server.stop(true);
}
