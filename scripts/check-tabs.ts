#!/usr/bin/env bun
// Tabs laid out in a real browser.
//
// `.mtrl-tabs` is `flex-direction: column` so that a scroll container
// sits above the divider. Without `scrollable` the component builds no scroll
// container and the tab buttons are direct children of the root, so they
// inherited that column and **stacked vertically** — while the rule right
// beside it gave them `flex: 1` with the comment "Compose divides the row
// evenly", which was dividing the height instead.
//
// Nothing could catch it. `bun test` runs in JSDOM, which has no stylesheet,
// so every tabs test passed with the component rendering as a vertical list.
// `consumer:check` renders a button and a text field only. This is the
// component's first browser check, and it exists because a layout bug needs a
// layout engine.
//
// Measured before the fix, at 600px with three tabs:
//   scrollable=false  flexDirection=column  tops=[0,17,34]  lefts=[0,0,0]
//   scrollable=true   flexDirection=column  tops=[0,0,0]    lefts=[52,142,232]
//
// A badge given in a tab's config also has a section here. `createTab` called
// `setBadge` before the tab's button was appended to the list, and
// `withAttachment` wraps only a parented target — so the badge component
// existed (its value read back fine) while the DOM held none of it. Measured
// on main, the factory's config and `<m-tab badge>` mounts held zero elements
// whose class contains "badge", shadow roots included; only a `setBadge` call
// made after the tab was placed attached.
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

// The element route. The tabs live in the host's shadow root, whose sheets
// are the build's compiled scss, so this bundle takes the css from dist and
// the element from src.
const elementBundle = await Bun.build({
  entrypoints: ["scripts/fixtures/tabs-element.ts"],
  target: "browser",
  minify: false,
});
assert(elementBundle.success, String(elementBundle.logs));
const elementJs = await elementBundle.outputs[0].text();

// The icon an <m-tab icon> declares, for the element page that starts stacked.
const elementIcon = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M3 3h18v18H3z"/></svg>';

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/tabs.js")
      return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/tabs-element.js")
      return new Response(elementJs, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"));
    if (path === "/element" || path === "/element-icon") {
      // ?dir=html puts rtl on the document, ?dir=container on the container the
      // element sits in: ordinary ways a page gives <m-tabs> its direction.
      const query = new URL(request.url).searchParams;
      const dir = query.get("dir");
      const icon = path === "/element-icon" || query.has("icon");
      return new Response(
        `<!doctype html><html${dir === "html" ? ' dir="rtl"' : ""}><head><link rel="stylesheet" href="/styles.css">
<style>body{margin:0}main{width:600px}m-tabs{display:block}</style></head><body><main id="host"${dir === "container" ? ' dir="rtl"' : ""}>
<m-tabs value="f"><m-tab value="f">Flights</m-tab><m-tab value="t" badge="8"${icon ? ` icon='${elementIcon}'` : ""}>Trips</m-tab>
<m-tab value="h">Hotels</m-tab></m-tabs>
<script type="module" src="/tabs-element.js"></script></body></html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    }
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

type Box = { l: number; r: number; t: number; b: number };
type Measured = {
  text: string; onTab: string | null; visible: boolean; widths: number[];
  badge: Box; tab: Box | null; anchor: (Box & { kind: string }) | null; kids: number;
};

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

  // The painted indicator, the stacked icon and the interaction states,
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

  // A tab value is data, so quotes in its id must not enter a CSS selector.
  // The id is derived, a"b -> tabx-special-a_22_b, with no character
  // an id reference cannot carry.
  const quotedValue = await page.evaluate(() => {
    const value = 'a"b';
    const panel = document.createElement("div");
    panel.id = "quoted-tab-panel";
    panel.setAttribute("role", "tabpanel");
    panel.setAttribute("aria-labelledby", "tabx-special-a_22_b");
    document.body.append(panel);
    (window as unknown as { mount: (c: unknown) => void }).mount({
      groupId: "special",
      tabs: [
        { text: "Other", value: "other" },
        { text: "Quoted", value, state: "active" },
      ],
    });
    const tab = document.getElementById("tabx-special-a_22_b")!;
    return {
      id: tab.id,
      selected: tab.getAttribute("aria-selected"),
      controls: tab.getAttribute("aria-controls"),
      visible: !panel.hasAttribute("hidden"),
    };
  });
  assert.deepEqual(quotedValue, {
    id: "tabx-special-a_22_b", selected: "true", controls: "quoted-tab-panel", visible: true,
  }, "quoted tab value links to its selected panel");
  checks++;

  // A badge from a tab's config: on the tab it was declared on, with its
  // value, visible. Measured on every mount before anything is asserted, so
  // one failing run records all of them.
  await page.evaluate(() => { document.documentElement.dir = "ltr"; });
  // Run in the page: every badge under `root` (shadow roots included), with the
  // tab it is on, its anchor (the icon, else the label), and the widths of the
  // row's tabs. The tab is the badge's ancestor, or, when the wrapper sits
  // outside the button, the button inside the wrapper.
  const measureBadges = `(root) => {
    const r = (el) => { const b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
    const out = [];
    const walk = (node) => {
      for (const badge of node.querySelectorAll(".mtrl-badge")) {
        const wrapper = badge.closest(".mtrl-badge__wrapper");
        const tab = badge.closest('[role="tab"]') ?? wrapper?.querySelector('[role="tab"]');
        const icon = tab?.querySelector(".mtrl-button__icon");
        const label = tab?.querySelector(".mtrl-button__text");
        const row = tab?.closest(".mtrl-tabs");
        out.push({
          text: badge.textContent.trim(),
          onTab: label?.textContent.trim() ?? tab?.getAttribute("aria-label") ?? null,
          visible: getComputedStyle(badge).display !== "none",
          widths: [...(row?.querySelectorAll('[role="tab"]') ?? [])].map((t) => Math.round(t.getBoundingClientRect().width)),
          badge: r(badge),
          tab: tab ? r(tab) : null,
          anchor: icon ? { kind: "icon", ...r(icon) } : label ? { kind: "label", ...r(label) } : null,
          kids: wrapper ? wrapper.children.length : 0,
        });
      }
      for (const el of node.querySelectorAll("*")) if (el.shadowRoot) walk(el.shadowRoot);
    };
    walk(root);
    return out;
  }`;

  const badgeMount = { scrollable: false, tabs: [
    { text: "Flights", value: "f", state: "active" },
    { text: "Trips", value: "t", badge: 8 },
    { text: "Hotels", value: "h" },
  ] };
  await page.evaluate((c) => (window as unknown as { mount: (c: unknown) => void }).mount(c), badgeMount);
  await page.waitForTimeout(80);
  const badgeOf = async () => {
    const all = await page.evaluate(`(${measureBadges})(document)`) as Measured[];
    return { badgeCount: all.length, ...(all[0] ?? { text: null, onTab: null, visible: false, widths: [] as number[], badge: null, tab: null, anchor: null, kids: 0 }) };
  };
  const fromConfig = await badgeOf();

  // setBadge after creation, against a target already in the list. This one
  // attached before the fix and must keep doing so.
  await page.evaluate(() => {
    (window as unknown as { mount: (c: unknown) => void }).mount({ scrollable: false });
    const tabs = (window as unknown as { t: { getTabs: () => Array<{ setBadge: (v: number) => unknown }> } }).t.getTabs();
    tabs[2].setBadge(3);
  });
  await page.waitForTimeout(80);
  const afterCreation = await badgeOf();

  // The element route: `<m-tab badge="8">` reads the badge into the same
  // factory's config, but the tabs live in the host's shadow root — counted
  // deep, shadow roots included, as the reported defect was counted.
  const elementPage = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const elementErrors: string[] = [];
  elementPage.on("pageerror", (error) => elementErrors.push(error.message));
  await elementPage.goto(`http://127.0.0.1:${server.port}/element`);
  await elementPage.waitForFunction(() =>
    !!(window as unknown as { tabsElementReady?: boolean }).tabsElementReady &&
    !!(document.querySelector("m-tabs") as HTMLElement | null)?.shadowRoot?.querySelector(".mtrl-tabs"));
  await elementPage.waitForTimeout(80);
  const fromElement = await elementPage.evaluate(`(${measureBadges})(document)`) as Measured[];
  await elementPage.evaluate((icon) => document.querySelector('m-tab[value="t"]')!.setAttribute("icon", icon), elementIcon);
  await elementPage.waitForTimeout(300);
  const elementIconAdded = (await elementPage.evaluate(`(${measureBadges})(document)`) as Measured[])[0];
  await elementPage.close();

  // A stacked icon tab and a scrollable row, measured the same way.
  const svg = '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M3 3h18v18H3z"/></svg>';
  await page.evaluate((c) => (window as unknown as { mount: (c: unknown) => void }).mount(c), { scrollable: false, tabs: [
    { text: "Flights", value: "f", icon: svg, state: "active" },
    { text: "Trips", value: "t", icon: svg, badge: 8 },
    { text: "Hotels", value: "h", icon: svg },
  ] });
  await page.waitForTimeout(80);
  const stackedBadge = await badgeOf();
  await page.evaluate((c) => (window as unknown as { mount: (c: unknown) => void }).mount(c), { scrollable: true, tabs: [
    { text: "Flights", value: "f", state: "active" },
    { text: "Trips", value: "t", badge: 8 },
    { text: "Hotels", value: "h" },
  ] });
  await page.waitForTimeout(80);
  const scrollingBadge = await badgeOf();

  // Right-to-left: the same two rows, the badge on the mirrored side.
  type Win = { mount: (c: unknown) => void; t: { getTabs: () => Array<{ setIcon: (v: string) => unknown }> } };
  const stackedMount = { scrollable: false, tabs: [
    { text: "Flights", value: "f", icon: svg, state: "active" },
    { text: "Trips", value: "t", icon: svg, badge: 8 },
    { text: "Hotels", value: "h", icon: svg },
  ] };
  const mountIn = (c: unknown) => page.evaluate((c) => (window as unknown as Win).mount(c), c);
  await page.evaluate(() => { document.documentElement.dir = "rtl"; });
  await mountIn(badgeMount);
  await page.waitForTimeout(80);
  const rtlInline = await badgeOf();
  await mountIn(stackedMount);
  await page.waitForTimeout(80);
  const rtlStacked = await badgeOf();
  await page.evaluate(() => { document.documentElement.dir = "ltr"; });

  // The anchor follows the tab's icon: the badge was placed on the icon or the
  // label when it was created, and the tab can lose or gain its icon after.
  await mountIn(stackedMount);
  await page.waitForTimeout(80);
  await page.evaluate(() => (window as unknown as Win).t.getTabs()[1].setIcon(""));
  await page.waitForTimeout(300);
  const iconRemoved = await badgeOf();
  await mountIn(badgeMount);
  await page.waitForTimeout(80);
  await page.evaluate((icon) => (window as unknown as Win).t.getTabs()[1].setIcon(icon), svg);
  await page.waitForTimeout(300);
  const iconAdded = await badgeOf();

  const iconElementPage = await browser.newPage({ viewport: { width: 900, height: 600 } });
  iconElementPage.on("pageerror", (error) => elementErrors.push(error.message));
  await iconElementPage.goto(`http://127.0.0.1:${server.port}/element-icon`);
  await iconElementPage.waitForFunction(() =>
    !!(window as unknown as { tabsElementReady?: boolean }).tabsElementReady &&
    !!(document.querySelector("m-tabs") as HTMLElement | null)?.shadowRoot?.querySelector(".mtrl-tabs"));
  await iconElementPage.waitForTimeout(80);
  const elementStacked = (await iconElementPage.evaluate(`(${measureBadges})(document)`) as Measured[])[0];
  await iconElementPage.evaluate(() => document.querySelector('m-tab[value="t"]')!.removeAttribute("icon"));
  await iconElementPage.waitForTimeout(300);
  const elementIconRemoved = (await iconElementPage.evaluate(`(${measureBadges})(document)`) as Measured[])[0];
  await iconElementPage.close();

  // <m-tabs> takes its direction from the page, not from an attribute of its
  // own: rtl on the document, or on the container it sits in. The element's tabs
  // live in a shadow root, which a `dir` outside it does not reach by selector.
  const elementRtl: Array<{ name: string; direction: string; m: Measured | undefined }> = [];
  for (const where of ["html", "container"]) {
    for (const stackedRow of [false, true]) {
      const rtlPage = await browser.newPage({ viewport: { width: 900, height: 600 } });
      rtlPage.on("pageerror", (error) => elementErrors.push(error.message));
      await rtlPage.goto(`http://127.0.0.1:${server.port}/element?dir=${where}${stackedRow ? "&icon" : ""}`);
      await rtlPage.waitForFunction(() =>
        !!(window as unknown as { tabsElementReady?: boolean }).tabsElementReady &&
        !!(document.querySelector("m-tabs") as HTMLElement | null)?.shadowRoot?.querySelector(".mtrl-tabs"));
      await rtlPage.waitForTimeout(300);
      elementRtl.push({
        name: `<m-tabs> under ${where} dir=rtl, ${stackedRow ? "stacked" : "inline"}`,
        direction: await rtlPage.evaluate(() => getComputedStyle(document.querySelector("m-tabs")!).direction),
        m: (await rtlPage.evaluate(`(${measureBadges})(document)`) as Measured[])[0],
      });
      await rtlPage.close();
    }
  }
  console.log(`widths, badge on Trips: fixed ${JSON.stringify(fromConfig.widths)}, fixed stacked icon ${JSON.stringify(stackedBadge.widths)}, scrollable ${JSON.stringify(scrollingBadge.widths)}, element ${JSON.stringify(fromElement[0]?.widths)}`);
  console.log(`stacked icon: widths ${JSON.stringify(stackedBadge.widths)} anchor ${stackedBadge.anchor?.kind}; scrollable: widths ${JSON.stringify(scrollingBadge.widths)} anchor ${scrollingBadge.anchor?.kind}`);
  const place = (badge: { onTab: string | null; text: string | null }): string =>
    `on "${badge.onTab ?? "no tab"}" (${JSON.stringify(badge.text)})`;
  console.log(
    `badges measured: config ${fromConfig.badgeCount} ${place(fromConfig)} widths ${JSON.stringify(fromConfig.widths)}, ` +
    `setBadge later ${afterCreation.badgeCount} ${place(afterCreation)}, ` +
    `element ${fromElement.length} ${place(fromElement[0] ?? { onTab: null, text: null })} widths ${JSON.stringify(fromElement[0]?.widths)}`
  );

  assert.equal(fromConfig.badgeCount, 1, `config badge: ${fromConfig.badgeCount} badges in the DOM, want 1`);
  assert.equal(fromConfig.text, "8", "config badge: the label it was given");
  assert.equal(fromConfig.onTab, "Trips", "config badge: on the tab it was declared on");
  assert.ok(fromConfig.visible, "config badge: visible");
  checks += 4;
  const even = (label: string, widths: number[]): void => {
    assert.ok(widths.length === 3 && widths.every((w) => Math.abs(w - widths[0]) <= 1),
      `${label}: every tab in the fixed row has the same width, widths ${JSON.stringify(widths)}`);
    checks++;
  };
  even("config badge", fromConfig.widths);
  // The element builds a scrollable row (no attribute for the fixed form), whose tabs are
  // sized by content, so only the fixed factory row is held to equal widths.
  // Where the badge sits on its tab, as the tabs specs give it: inside the
  // tab, on the label with 4dp between them, or on the stacked icon.
  const sits = (label: string, m: { badge: Box | null; tab: Box | null; anchor: (Box & { kind: string }) | null; kids: number }, kind: string, dir: "ltr" | "rtl" = "ltr"): void => {
    assert.ok(m.badge && m.tab && m.anchor, `${label}: badge, tab and anchor present`);
    const { badge, tab, anchor } = m as { badge: Box; tab: Box; anchor: Box & { kind: string } };
    assert.equal(anchor.kind, kind, `${label}: anchored on the ${kind}`);
    assert.equal(m.kids, 2, `${label}: the badge's wrapper holds the ${kind} and the badge, holds ${m.kids} children`);
    assert.ok(badge.l >= tab.l - 1 && badge.r <= tab.r + 1 && badge.t >= tab.t - 1 && badge.b <= tab.b + 1,
      `${label}: badge inside its tab, badge ${JSON.stringify(badge)} tab ${JSON.stringify(tab)}`);
    // Measured from the anchor's inline end: its right edge in LTR, its left in RTL.
    if (kind === "label") {
      const gap = dir === "ltr" ? badge.l - anchor.r : anchor.l - badge.r;
      assert.ok(Math.abs(gap - 4) <= 1, `${label}, ${dir}: 4dp between the label and the badge, got ${gap}`);
    } else {
      const overlap = dir === "ltr" ? anchor.r - badge.l : badge.r - anchor.l;
      assert.ok(Math.abs(overlap - 6) <= 1, `${label}, ${dir}: 6dp overlap at the icon's inline-end corner, got ${overlap}`);
      assert.ok(badge.l < anchor.r && badge.r > anchor.l && badge.t < anchor.b && badge.b > anchor.t,
        `${label}: badge overlaps the icon, badge ${JSON.stringify(badge)} icon ${JSON.stringify(anchor)}`);
    }
    checks += 4;
  };
  sits("config badge", fromConfig, "label");
  sits("element badge", fromElement[0] as Measured, "label");

  even("stacked icon badge", stackedBadge.widths);
  sits("stacked icon badge", stackedBadge, "icon");
  sits("scrollable badge", scrollingBadge, "label");
  // The new rows: each recorded, so one failing run lists every one.
  const failures: string[] = [];
  const soft = (what: string, run: () => void): void => {
    try { run(); } catch (error) { failures.push(`${what}: ${(error as Error).message.split("\n")[0]}`); }
  };
  soft("RTL inline", () => sits("RTL inline badge", rtlInline, "label", "rtl"));
  soft("RTL stacked", () => sits("RTL stacked badge", rtlStacked, "icon", "rtl"));
  soft("RTL widths", () => even("RTL badge", rtlInline.widths));
  soft("icon removed by setIcon", () => sits("setIcon(\"\") on a stacked badged tab", iconRemoved, "label"));
  soft("icon added by setIcon", () => sits("setIcon(svg) on a text-only badged tab", iconAdded, "icon"));
  soft("icon attribute removed", () => sits("m-tab icon attribute removed", elementIconRemoved as Measured, "label"));
  soft("icon attribute added", () => sits("m-tab icon attribute added", elementIconAdded as Measured, "icon"));
  soft("element starts stacked", () => sits("m-tab icon attribute at the start", elementStacked as Measured, "icon"));
  for (const { name, direction, m } of elementRtl) {
    soft(name, () => {
      assert.equal(direction, "rtl", `${name}: computed direction`);
      sits(name, m as Measured, name.endsWith("stacked") ? "icon" : "label", "rtl");
    });
  }
  console.log(`<m-tabs> RTL: ${elementRtl.map(({ name, m }) => `${name} badge ${JSON.stringify(m?.badge)} anchor ${JSON.stringify(m?.anchor)}`).join("; ")}`);
  console.log(`RTL: inline ${JSON.stringify(rtlInline.badge)} label ${JSON.stringify(rtlInline.anchor)}; stacked ${JSON.stringify(rtlStacked.badge)} icon ${JSON.stringify(rtlStacked.anchor)}`);
  console.log(`anchors: icon removed ${iconRemoved.anchor?.kind}/${iconRemoved.kids} kids, icon added ${iconAdded.anchor?.kind}/${iconAdded.kids} kids, attribute removed ${elementIconRemoved?.anchor?.kind}/${elementIconRemoved?.kids} kids, attribute added ${elementIconAdded?.anchor?.kind}/${elementIconAdded?.kids} kids`);
  assert.deepEqual(failures, [], `${failures.length} badge rows failed:\n  ${failures.join("\n  ")}`);
  assert.equal(afterCreation.badgeCount, 1, `setBadge after creation: ${afterCreation.badgeCount} badges in the DOM, want 1`);
  assert.equal(afterCreation.text, "3", "setBadge after creation: the label it was given");
  assert.equal(afterCreation.onTab, "Hotels", "setBadge after creation: on the tab it was set on");
  checks += 3;
  assert.equal(fromElement.length, 1, `element badge: ${fromElement.length} badges, shadow roots included, want 1`);
  assert.equal(fromElement[0]?.text, "8", "element badge: the label its attribute gave");
  assert.equal(fromElement[0]?.onTab, "Trips", "element badge: on the tab that carries the attribute");
  assert.ok(fromElement[0]?.visible, "element badge: visible");
  checks += 4;
  assert.deepEqual(elementErrors, [], `element page errors: ${elementErrors.join(", ")}`);

  assert.deepEqual(errors, [], `page errors: ${errors.join(", ")}`);
  console.log(
    `Passed ${checks} tabs checks: fixed tabs in an evenly divided row, ` +
      `scrollable tabs in their scroller, both directions, divider and indicator out of flow, ` +
      `the M3 indicator per variant, a centred stacked icon, inactive state colours and the focus ring, ` +
      `a config badge on its tab by factory, element and later setBadge.`
  );
} finally {
  await browser.close();
  server.stop();
}
