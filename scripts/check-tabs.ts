#!/usr/bin/env bun
// Tabs laid out in a real browser.
//
// FLO-241. `.mtrl-tabs` is `flex-direction: column` so that a scroll container
// sits above the divider. Without `scrollable` the component builds no scroll
// container and the tab buttons are direct children of the root, so they
// inherited that column and **stacked vertically** — while the rule right
// beside it gave them `flex: 1` with the comment "Compose divides the row
// evenly", which was dividing the height instead.
//
// Nothing could catch it. `bun test` runs in JSDOM, which has no stylesheet,
// so every tabs test passed with the component rendering as a vertical list.
// `consumer:check` renders a button and a textfield only. This is the
// component's first browser check, and it exists because a layout bug needs a
// layout engine.
//
// Measured before the fix, at 600px with three tabs:
//   scrollable=false  flexDirection=column  tops=[0,17,34]  lefts=[0,0,0]
//   scrollable=true   flexDirection=column  tops=[0,0,0]    lefts=[52,142,232]
//
//   bun run scripts/check-tabs.ts

import assert from "node:assert/strict";
import { chromium } from "playwright";

const bundle = await Bun.build({
  entrypoints: ["src/components/tabs/index.ts"],
  target: "browser",
  minify: false,
});
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/tabs.js")
      return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"));
    return new Response(
      `<!doctype html><html><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0}main{width:600px}</style></head><body><main id="host"></main>
<script type="module">import createTabs from '/tabs.js';
window.mount = (config) => {
  window.t?.destroy?.();
  window.t = createTabs({ tabs: [
    { text: 'Flights', value: 'f', state: 'active' },
    { text: 'Trips', value: 't' },
    { text: 'Hotels', value: 'h' },
  ], ...config });
  document.getElementById('host').append(window.t.element);
};</script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  },
});

type Geometry = {
  direction: string;
  tops: number[];
  lefts: number[];
  widths: number[];
  dividerPosition: string;
  indicatorPosition: string;
};

const browser = await chromium.launch({ headless: true });
let checks = 0;

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => !!(window as unknown as { mount?: unknown }).mount);

  const measure = async (scrollable: boolean, dir: "ltr" | "rtl"): Promise<Geometry> => {
    await page.evaluate(
      ({ scrollable, dir }) => {
        document.documentElement.dir = dir;
        (window as unknown as { mount: (c: unknown) => void }).mount({ scrollable });
      },
      { scrollable, dir }
    );
    await page.waitForTimeout(80);
    return page.evaluate(() => {
      const root = document.querySelector(".mtrl-tabs") as HTMLElement;
      const tabs = [...root.querySelectorAll('[role="tab"]')] as HTMLElement[];
      const at = (selector: string) => {
        const el = root.querySelector(selector) as HTMLElement | null;
        return el ? getComputedStyle(el).position : "absent";
      };
      return {
        direction: getComputedStyle(root).flexDirection,
        tops: tabs.map((t) => Math.round(t.getBoundingClientRect().top)),
        lefts: tabs.map((t) => Math.round(t.getBoundingClientRect().left)),
        widths: tabs.map((t) => Math.round(t.getBoundingClientRect().width)),
        dividerPosition: at(".mtrl-tabs__divider"),
        indicatorPosition: at(".mtrl-tabs__indicator"),
      };
    });
  };

  for (const dir of ["ltr", "rtl"] as const) {
    // Fixed: the tabs are direct children of the root and must sit in a row,
    // dividing the container evenly.
    const fixed = await measure(false, dir);
    assert.equal(fixed.direction, "row", `fixed tabs, ${dir}: container is ${fixed.direction}`);
    assert.equal(
      new Set(fixed.tops).size,
      1,
      `fixed tabs, ${dir}: not on one row, tops ${fixed.tops}`
    );
    assert.equal(
      new Set(fixed.lefts).size,
      3,
      `fixed tabs, ${dir}: overlapping, lefts ${fixed.lefts}`
    );
    // flex: 1 over a 600px container, three tabs. The comment in the
    // stylesheet says Compose divides the row evenly; this is that.
    for (const width of fixed.widths) {
      assert.ok(
        Math.abs(width - 200) <= 1,
        `fixed tabs, ${dir}: uneven division, widths ${fixed.widths}`
      );
    }
    checks += 4;

    // Scrollable: the tabs live inside the scroll container, so the root keeps
    // its column direction and the tabs are still a row.
    const scrollable = await measure(true, dir);
    assert.equal(
      scrollable.direction,
      "column",
      `scrollable tabs, ${dir}: container is ${scrollable.direction}`
    );
    assert.equal(
      new Set(scrollable.tops).size,
      1,
      `scrollable tabs, ${dir}: not on one row, tops ${scrollable.tops}`
    );
    checks += 2;

    // The reason the root can change direction at all: neither of these is in
    // flow, so neither depends on it.
    assert.equal(fixed.dividerPosition, "absolute", `divider, ${dir}`);
    if (fixed.indicatorPosition !== "absent") {
      assert.equal(fixed.indicatorPosition, "absolute", `indicator, ${dir}`);
    }
    checks += 2;
  }

  // FLO-262: the painted indicator, the stacked icon and the interaction states,
  // against m3.material.io tabs specs.
  await page.evaluate(() => { document.documentElement.dir = "ltr"; });
  await page.emulateMedia({ reducedMotion: "reduce" });
  type Painted = { tab: DOMRectLike; label: DOMRectLike; icon: DOMRectLike | null; indicator: DOMRectLike & { radius: string }; root: DOMRectLike };
  type DOMRectLike = { left: number; width: number; bottom: number };
  const paint = async (config: Record<string, unknown>): Promise<Painted> => {
    await page.evaluate((c) => (window as unknown as { mount: (c: unknown) => void }).mount(c), config);
    await page.waitForTimeout(120);
    return page.evaluate(() => {
      const box = (el: Element | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { left: r.left, width: r.width, bottom: r.bottom };
      };
      const root = document.querySelector(".mtrl-tabs")!;
      const tab = root.querySelector('[role="tab"]')!;
      const indicator = root.querySelector(".mtrl-tabs__indicator")!;
      return {
        root: box(root)!, tab: box(tab)!, label: box(tab.querySelector(".mtrl-button__text"))!,
        icon: box(tab.querySelector(".mtrl-button__icon")),
        indicator: { ...box(indicator)!, radius: getComputedStyle(indicator).borderRadius },
      };
    });
  };
  const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) <= 0.5, `${what}: ${a} against ${b}`);
  const primary = await paint({ variant: "primary", scrollable: false });
  near(primary.indicator.width, primary.label.width - 4, "primary indicator: the label's width, inset 2dp on each side");
  near(primary.indicator.left, primary.label.left + 2, "primary indicator: centred under the label");
  near(primary.indicator.bottom, primary.root.bottom, "primary indicator: on the row's bottom edge, over the divider");
  assert.equal(primary.indicator.radius, "3px 3px 0px 0px", "primary indicator: shape 3, 3, 0, 0");
  const secondary = await paint({ variant: "secondary", scrollable: false });
  near(secondary.indicator.width, secondary.tab.width, "secondary indicator: the tab's full width");
  assert.equal(await page.locator(".mtrl-tabs__indicator").evaluate((el) => el.getBoundingClientRect().height), 2, "secondary indicator: 2dp");
  const icon = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4 4h16v16H4z"/></svg>';
  const stacked = await paint({ scrollable: false, tabs: [{ text: "Flights", value: "f", state: "active", icon }, { text: "Trips", value: "t", icon }] });
  near(stacked.icon!.left + stacked.icon!.width / 2, stacked.tab.left + stacked.tab.width / 2, "stacked tab: the icon centred");
  checks += 8;

  // Inactive tab states: label and layer on-surface on hover; the press is primary,
  // drawn by the ripple; the focus ring is 3dp secondary, inward.
  await paint({ variant: "primary", scrollable: false });
  const colours = await page.evaluate(() => {
    const probe = document.createElement("div");
    document.body.append(probe);
    const role = (name: string) => { probe.style.color = `var(--mtrl-sys-color-${name})`; return getComputedStyle(probe).color; };
    const result = { onSurface: role("on-surface"), primary: role("primary"), secondary: role("secondary") };
    probe.remove();
    return result;
  });
  const inactive = page.locator('[role="tab"]').nth(1);
  const where = (await inactive.boundingBox())!;
  await page.mouse.move(where.x + 20, where.y + 20);
  // The colour fades in; sample it once settled.
  await inactive.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
  assert.equal(await inactive.evaluate((el) => getComputedStyle(el).color), colours.onSurface, "hovered inactive tab: on-surface label");
  await page.mouse.down();
  assert.equal(await inactive.locator(".mtrl-ripple-wave").first().evaluate((el) => getComputedStyle(el).backgroundColor), colours.primary, "pressed inactive tab: a primary ripple");
  await page.mouse.up();
  await page.mouse.move(0, 500);
  // From a button before the row into its one tab stop, by keyboard, so
  // :focus-visible applies.
  await page.evaluate(() => {
    const before = document.createElement("button");
    before.id = "before-tabs";
    document.getElementById("host")!.before(before);
    before.focus();
  });
  await page.keyboard.press("Tab");
  await page.evaluate(() => Promise.all(document.activeElement!.getAnimations().map((a) => a.finished)));
  const ring = await page.evaluate(() => { const c = getComputedStyle(document.activeElement!); return `${c.outlineWidth} ${c.outlineStyle} ${c.outlineColor} ${c.outlineOffset}`; });
  assert.equal(ring, `3px solid ${colours.secondary} -3px`, "focused tab: a 3dp secondary ring drawn inward");
  checks += 3;

  // FLO-417: a tab value is data, so quotes in its id must not enter a CSS selector.
  const quotedValue = await page.evaluate(() => {
    const value = 'a"b';
    const panel = document.createElement("div");
    panel.id = "quoted-tab-panel";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", `tab-special-${value}`);
    document.body.append(panel);
    (window as unknown as { mount: (c: unknown) => void }).mount({
      groupId: "special",
      tabs: [
        { text: "Other", value: "other" },
        { text: "Quoted", value, state: "active" },
      ],
    });
    const tab = document.getElementById(`tab-special-${value}`)!;
    return {
      id: tab.id,
      selected: tab.getAttribute("aria-selected"),
      controls: tab.getAttribute("aria-controls"),
      visible: !panel.hasAttribute("hidden"),
    };
  });
  assert.deepEqual(quotedValue, {
    id: 'tab-special-a"b', selected: "true", controls: "quoted-tab-panel", visible: true,
  }, "quoted tab value links to its selected panel");
  checks++;

  assert.deepEqual(errors, [], `page errors: ${errors.join(", ")}`);
  console.log(
    `Passed ${checks} tabs checks: fixed tabs in an evenly divided row, ` +
      `scrollable tabs in their scroller, both directions, divider and indicator out of flow, ` +
      `the M3 indicator per variant, a centred stacked icon, inactive state colours and the focus ring.`
  );
} finally {
  await browser.close();
  server.stop();
}
