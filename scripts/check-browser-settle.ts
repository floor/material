#!/usr/bin/env bun
/**
 * The settle helper against the motion it exists for: a bare `settle()` after a
 * smooth scroll must return only once the scroll has ended — in the document,
 * in a scroll container, and in one inside a shadow root. A parent colour
 * transition whose child inherits that colour and has its own colour transition
 * must also be waited out, including the child's transition that starts on a
 * later frame: in the light DOM, in a shadow root, and scoped to a target.
 *
 * Before the helper read scrollers, a bare settle() after
 * `scrollTo({behavior: "smooth"})` returned one frame in, and the carousel
 * RTL check read its strip at 0 on main. Before it read animations again after
 * the first set, that child colour was still moving when settle() returned.
 */
import assert from "node:assert/strict";

import { chromium, webkit, type Browser } from "playwright";

import { settle } from "./browser-settle";

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch() {
    return new Response(
      `<!doctype html><html><head><style>
        body { margin: 0; height: 4000px; }
        #box { width: 200px; height: 100px; overflow: auto; }
        #box div { height: 60px; }
        #host { display: block; width: 300px; height: 100px; }
        .colour-parent { color: rgb(0, 0, 0); transition: color 700ms linear; }
        .colour-parent.go { color: rgb(255, 0, 0); }
        .colour-child { color: inherit; transition: color 800ms linear; }
      </style></head><body>
      <div id="box"><div>1</div><div>2</div><div>3</div><div>4</div><div>5</div><div>6</div></div>
      <div id="host"></div>
      <div id="light" class="colour-parent"><span class="colour-child">light</span></div>
      <div id="scoped" class="colour-parent"><span class="colour-child">scoped</span></div>
      <div id="colour-host"></div>
      <script type="module">
        const host = document.getElementById("host");
        const root = host.attachShadow({ mode: "open" });
        root.innerHTML = '<style>:host{display:block;width:300px;height:100px}</style>' +
          '<div id="scroller" style="overflow:auto;width:300px;height:100px"><div style="height:600px;width:900px"></div></div>';
        const colourHost = document.getElementById("colour-host");
        const colourRoot = colourHost.attachShadow({ mode: "open" });
        colourRoot.innerHTML = '<style>' +
          '.colour-parent { color: rgb(0, 0, 0); transition: color 700ms linear; }' +
          '.colour-parent.go { color: rgb(255, 0, 0); }' +
          '.colour-child { color: inherit; transition: color 800ms linear; }' +
          '</style><div class="colour-parent"><span class="colour-child">shadow</span></div>';
        window.ready = true;
      </script></body></html>`,
      { headers: { "Content-Type": "text/html" } },
    );
  },
});

const failures: string[] = [];
const run = async (browser: Browser, engine: string): Promise<string[]> => {
  const lines: string[] = [];
    const page = await browser.newPage({ viewport: { width: 800, height: 600 }, reducedMotion: "no-preference" });
  try {
    await page.goto(`http://127.0.0.1:${server.port}`);
    await page.waitForFunction(() => (window as unknown as { ready?: boolean }).ready === true);

    // The document's own smooth scroll. A block body returns nothing: an
    // expression body would hand page.evaluate the Promise `scrollTo` returns
    // in Chromium, which it awaits — the case would then have waited for the
    // scroll itself and proved nothing about settle().
    await page.evaluate(() => {
      window.scrollTo({ top: 800, behavior: "smooth" });
    });
    await settle(page);
    const scrollY = await page.evaluate(() => window.scrollY);
    try {
      assert.equal(scrollY, 800, `a bare settle() waited for the smooth scroll (scrollY ${scrollY})`);
      lines.push(`${engine} document smooth scroll`);
    } catch (error) {
      failures.push(`${engine} document: ${error instanceof Error ? error.message : String(error)}`);
    }

    // A scroll container in the light DOM, started the same way.
    await page.evaluate(() => {
      (document.getElementById("box") as HTMLElement).scrollTo({ top: 120, behavior: "smooth" });
    });
    await settle(page);
    const boxTop = await page.evaluate(() => (document.getElementById("box") as HTMLElement).scrollTop);
    try {
      assert.equal(boxTop, 120, `a bare settle() waited for the smooth scroll (scrollTop ${boxTop})`);
      lines.push(`${engine} container smooth scroll`);
    } catch (error) {
      failures.push(`${engine} container: ${error instanceof Error ? error.message : String(error)}`);
    }

    // A scroll container inside a shadow root, reached through the target.
    await page.evaluate(() => {
      const scroller = document.getElementById("host")!.shadowRoot!.querySelector<HTMLElement>("#scroller")!;
      scroller.scrollTo({ left: 600, behavior: "smooth" });
    });
    await settle(page, { target: "#host" });
    const shadowLeft = await page.evaluate(() => document.getElementById("host")!.shadowRoot!.querySelector<HTMLElement>("#scroller")!.scrollLeft);
    try {
      assert.equal(shadowLeft, 600, `a settle() on the target waited for its scroller (scrollLeft ${shadowLeft})`);
      lines.push(`${engine} shadow-root smooth scroll`);
    } catch (error) {
      failures.push(`${engine} shadow root: ${error instanceof Error ? error.message : String(error)}`);
    }

    // A parent colour transition, and a child that inherits the colour and has
    // its own colour transition. When the parent's colour transition ends, the
    // child is sent back to black and its colour transition starts again. That
    // second transition is not in the snapshot taken when settle() starts, so a
    // helper that does not read again returns with the child still short of red.
    const colourCase = async (where: "light" | "shadow" | "scoped"): Promise<void> => {
      await page.evaluate((place) => {
        const parent = place === "shadow"
          ? document.getElementById("colour-host")!.shadowRoot!.querySelector<HTMLElement>(".colour-parent")!
          : document.getElementById(place)!;
        const child = parent.querySelector<HTMLElement>(".colour-child")!;
        const restart = (event: Event): void => {
          if (event.target !== parent || (event as TransitionEvent).propertyName !== "color") return;
          parent.removeEventListener("transitionend", restart);
          child.style.transition = "none";
          child.style.color = "rgb(0, 0, 0)";
          void child.offsetWidth;
          child.style.transition = "color 400ms linear";
          child.style.color = "inherit";
        };
        parent.addEventListener("transitionend", restart);
        parent.classList.add("go");
      }, where);
      await settle(page, where === "scoped" ? { target: "#scoped" } : {});
      const colour = await page.evaluate((place) => {
        const parent = place === "shadow"
          ? document.getElementById("colour-host")!.shadowRoot!.querySelector<HTMLElement>(".colour-parent")!
          : document.getElementById(place)!;
        const child = parent.querySelector<HTMLElement>(".colour-child")!;
        const running = child.getAnimations().filter((animation) => {
          if (animation.playState !== "running") return false;
          return Number.isFinite(animation.effect?.getComputedTiming().iterations ?? 0);
        }).length;
        return { color: getComputedStyle(child).color, running };
      }, where);
      const channels = colour.color.match(/\d+/g)?.slice(0, 3).map(Number) ?? [];
      assert.deepEqual(channels, [255, 0, 0], `${where} child colour is ${colour.color}`);
      assert.equal(colour.running, 0, `${where} child still has a finite colour transition`);
    };
    for (const where of ["light", "shadow", "scoped"] as const) {
      try {
        await colourCase(where);
        lines.push(`${engine} ${where} inherited colour`);
      } catch (error) {
        failures.push(`${engine} ${where} colour: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    return lines;
  } finally {
    await page.close();
  }
};

const lines: string[] = [];
const chromiumBrowser = await chromium.launch({ headless: true });
try {
  lines.push(...await run(chromiumBrowser, "chromium"));
} finally {
  await chromiumBrowser.close();
}

let webkitBrowser: Browser | null = null;
try {
  webkitBrowser = await webkit.launch({ headless: true });
} catch (error) {
  if (process.argv.includes("--skip-missing-webkit")) console.log("browser settle: WebKit is not installed here, skipped");
  else throw error;
}
if (webkitBrowser) {
  try {
    lines.push(...await run(webkitBrowser, "webkit"));
  } finally {
    await webkitBrowser.close();
  }
}

server.stop(true);
for (const line of lines) console.log(`ok ${line}`);
console.log(`browser settle: ${lines.length} passed, ${failures.length} failed`);
assert.deepEqual(failures, [], `browser settle:\n  ${failures.join("\n  ")}`);
console.log(`Passed browser settle: ${lines.length} cases.`);
