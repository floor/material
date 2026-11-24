#!/usr/bin/env bun
import { launchChromium } from "./browser-profile";
/** Browser coverage for the standalone MD3 drawer. Run after build. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderElement } from '../dist/ssr/index.js';
import type { DrawerComponent, DrawerConfig } from '../src/components/drawer/types';

declare global {
  interface Window {
    drawer: DrawerComponent;
    mountDrawer: (config: DrawerConfig) => void;
  }
}
const artifacts = resolve('analysis/drawer');
await mkdir(artifacts, { recursive: true });
const bundle = await Bun.build({ entrypoints: [resolve('src/components/drawer/index.ts')], target: 'browser', minify: true });
assert(bundle.success, String(bundle.logs));
const js = await bundle.outputs[0].text();
const sections = `
  <m-drawer-item value="home" href="#home">Home</m-drawer-item>
  <m-drawer-item value="navigation">Navigation
    <m-drawer-item value="drawer" href="#drawer">Drawer</m-drawer-item>
    <m-drawer-item value="tabs" href="#tabs">Tabs</m-drawer-item>
    <m-drawer-item value="disabled" href="#disabled" disabled>Unavailable</m-drawer-item>
  </m-drawer-item>
  <m-drawer-item value="containment" label="Containment">
    <m-drawer-item value="card" href="#card">Card</m-drawer-item>
  </m-drawer-item>`;
const shadowDrawer = renderElement("m-drawer", { open: true, value: "drawer" }, sections);

const server = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === '/drawer.js') return new Response(js, { headers: { 'Content-Type': 'text/javascript' } });
  if (path === '/styles.css') return new Response(Bun.file('dist/styles.css'));
  if (path.startsWith("/dist/")) return new Response(Bun.file(path.slice(1)), { headers: { "Content-Type": "text/javascript" } });
  if (path === "/sections") {
    const variant = new URL(request.url).searchParams.get("variant");
    const markup = variant === "server" ? shadowDrawer :
      `<m-drawer open value="drawer" ${variant === "modal" ? "modal dense" : ""}>${sections}</m-drawer>`;
    return new Response(`<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"></head>
      <body>${markup}<span id="tabs">Tabs destination</span><button id="outside">Outside</button>
      <script type="module">
        import "/dist/elements/css/drawer.js";
        import { defineDrawer } from "/dist/elements/index.js";
        defineDrawer();
      </script></body></html>`, { headers: { "Content-Type": "text/html" } });
  }
  return new Response(`<!doctype html><html><head><link rel="stylesheet" href="/styles.css"><style>body{margin:0;height:100vh}main{padding:24px}</style></head><body><main><button id="opener">Navigation</button><button id="outside">Outside</button></main>
  <script type="module">import createDrawer from '/drawer.js';
  window.mountDrawer = config => { window.drawer?.destroy(); window.drawer=createDrawer({headline:'Mail',items:[{id:'inbox',label:'Inbox',badge:'24',active:true},{id:'sent',label:'Sent'},{type:'divider'},{type:'section',label:'Labels'},{id:'family',label:'Family'}],...config});document.body.append(window.drawer.element); };
  document.querySelector('#opener').onclick=()=>window.drawer.open();</script></body></html>`, { headers: { 'Content-Type': 'text/html' } });
} });
const browser = await launchChromium({ headless: true });
try {
  const page = await browser.browser()!.newPage({ viewport: { width: 1040, height: 720 }, reducedMotion: 'reduce' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => !!window.mountDrawer);
  let scenes = 0;
  for (const width of [390, 1040]) for (const direction of ['ltr', 'rtl']) for (const position of ['start', 'end']) for (const mode of ['light', 'dark']) {
    await page.setViewportSize({ width, height: 720 });
    await page.evaluate(({ direction, position, mode }) => {
      document.documentElement.dir = direction;
      document.documentElement.dataset.theme = "baseline";
      document.documentElement.dataset.themeMode = mode;
      window.mountDrawer({ variant: 'modal', position });
    }, { direction, position, mode });
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.click('#opener');
    await page.waitForFunction(() => document.activeElement?.getAttribute("data-id") === "inbox", undefined, { timeout: 5000 });
    const geometry = await page.locator('.mtrl-drawer__sheet').boundingBox();
    assert(geometry);
    assert.equal(Math.round(geometry.width), Math.min(360, width - 56));
    const left = (direction === 'ltr') === (position === 'start');
    assert.equal(Math.round(geometry.x), left ? 0 : width - geometry.width);
    assert.equal(await page.locator('.mtrl-drawer__item').first().evaluate(el => el.getBoundingClientRect().height), 56);
    await page.locator('[data-id="family"]').focus(); await page.keyboard.press('Tab');

    assert.equal(await page.locator('[data-id="inbox"]').evaluate(el => el === document.activeElement), true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.locator('[data-id="family"]').evaluate(el => el === document.activeElement), true);
    await page.screenshot({ path: `${artifacts}/${width}-${direction}-${position}-${mode}.png` });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#opener').evaluate(el => el === document.activeElement), true);
    assert.equal(await page.getByRole('dialog').count(), 0);
    scenes++;
  }
  await page.evaluate(() => window.mountDrawer({ variant: 'standard', open: true }));
  // Reduced motion stops movement and keeps fades: nothing that moves or resizes the drawer may transition
  const reduced = await page.locator('.mtrl-drawer').evaluate(el => getComputedStyle(el).transitionProperty);
  assert(!/transform|width|height|top|left|inset/.test(reduced), `Drawer still moves under reduced motion: ${reduced}`);
  // The pill and the state layer own the item's transitions, so the switch has
  // to reach their pseudo-elements, not only the indicator element.
  const indicatorMotion = await page.locator('.mtrl-drawer__item--active .mtrl-drawer__active-indicator').evaluate(el => ({
    pill: getComputedStyle(el, '::before').transitionDuration,
    state: getComputedStyle(el, '::after').transitionDuration,
  }));
  assert.equal(indicatorMotion.pill, '0s', `The active pill still transitions under reduced motion: ${indicatorMotion.pill}`);
  assert.equal(indicatorMotion.state, '0s', `The state layer still transitions under reduced motion: ${indicatorMotion.state}`);
  // The section motion joins the instant set: the sub items and the panel
  // switch without the grow/fade.
  await page.evaluate(() => window.mountDrawer({
    variant: 'standard', open: true,
    items: [{ type: 'section', id: 'labels', label: 'Labels', items: [{ id: 'family', label: 'Family' }, { id: 'work', label: 'Work' }] }],
  }));
  const revealMotion = await page.locator('.mtrl-drawer__group-items-inner').first().evaluate(el => ({
    duration: getComputedStyle(el).transitionDuration,
  }));
  assert.equal(revealMotion.duration.split(', ')[0], '0s', `The section reveal still animates under reduced motion: ${revealMotion.duration}`);
  await page.click('#outside');
  assert.equal(await page.locator('#outside').evaluate(el => el === document.activeElement), true);
  await page.evaluate(() => window.mountDrawer({ variant: 'modal' }));
  await page.click('#opener');
  await page.locator('.mtrl-drawer__scrim').click({ position: { x: 10, y: 700 } });
  assert.equal(await page.evaluate(() => window.drawer.isOpen()), false);
  await page.evaluate(() => {
    window.drawer.destroy();
    for (let i = 0; i < 40; i++) { window.mountDrawer({ variant: 'modal', open: true }); window.drawer.destroy(); }
  });
  await page.waitForTimeout(50);
  assert.equal(await page.locator('.mtrl-drawer').count(), 0);
  assert.equal(await page.evaluate(() => document.body.style.overflow), '');
  assert.equal(await page.locator('main[inert]').count(), 0);
  assert.deepEqual(errors, []);

  // ========================================================================
  // SPEC GEOMETRY: the item's paddings inside the active indicator
  // ========================================================================
  // m3.material.io/components/navigation-drawer/specs, the anatomy diagram
  // (read 2026-11-24): the item's content starts 16dp inside the indicator,
  // and the trailing content — the section chevron, a badge, and a selected
  // label's end — sits 24dp inside the indicator's end; the indicator itself
  // is 12dp from the drawer's edge (the spec table's active indicator
  // padding). The owner set these values in the decision of 2026-11-24.
  await page.evaluate(() => {
    document.documentElement.dir = 'ltr';
    document.documentElement.dataset.theme = 'baseline';
    document.documentElement.dataset.themeMode = 'light';
    window.mountDrawer({
      variant: 'standard', open: true,
      items: [
        { id: 'inbox', label: 'Inbox' },
        { type: 'section', id: 'labels', label: 'Labels', items: [{ id: 'family', label: 'Family', active: true }, { id: 'work', label: 'Work' }] },
        { id: 'archive', label: 'Archive', badge: '12' },
      ],
    });
  });
  await page.waitForFunction(() => !!document.querySelector('[data-id="labels"]'));
  const near = (a: number, b: number, label: string) => assert.ok(Math.abs(a - b) <= 0.5, `${label}: ${a.toFixed(1)} vs ${b.toFixed(1)}`);
  const specGeometry = await page.evaluate(() => {
    // The sheet keeps a 1px scrollbar gutter under overflow-y: auto, so the
    // spec's paddings are measured from the content edge (the items container).
    const content = document.querySelector('.mtrl-drawer__items')!;
    const rect = (el: Element) => el.getBoundingClientRect();
    const header = document.querySelector('[data-id="labels"]')!;
    const child = document.querySelector('[data-id="family"]')!;
    const badged = document.querySelector('[data-id="archive"]')!;
    const headerBox = rect(header);
    return {
      content: rect(content),
      header: { left: headerBox.left, right: headerBox.right, labelLeft: rect(header.querySelector('.mtrl-drawer__item-label')!).left },
      chevron: rect(header.querySelector('.mtrl-drawer__item-chevron')!),
      child: rect(child),
      childLabel: rect(child.querySelector('.mtrl-drawer__item-label')!),
      badged: rect(badged),
      badge: rect(badged.querySelector('.mtrl-drawer__item-badge')!),
    };
  });
  near(specGeometry.header.left, specGeometry.content.left + 12, 'indicator start inset from the content edge (active indicator padding 12dp)');
  near(specGeometry.header.labelLeft, specGeometry.header.left + 16, 'top-level label starts 16dp inside the indicator (diagram start padding)');
  near(specGeometry.header.right, specGeometry.content.right - 12, 'indicator end inset from the content edge (active indicator padding 12dp)');
  near(specGeometry.chevron.right, specGeometry.header.right - 18, 'chevron box ends 18dp inside the indicator (24dp ink line - 6px ink margin)');
  near(specGeometry.child.left, specGeometry.content.left + 12 + 12, 'child pill starts the indent further in than the parent (m3 site shift)');
  near(specGeometry.childLabel.left, specGeometry.child.left + 16, 'child label starts 16dp inside its own pill');
  near(specGeometry.childLabel.right, specGeometry.child.right - 24, "selected pill's end padding 24dp (diagram)");
  near(specGeometry.badge.right, specGeometry.badged.right - 24, 'badge ends 24dp inside the indicator');

  // ========================================================================
  // DENSITY SWEEP: the chevron holds the diagram placement at every density
  // ========================================================================
  // The item shrinks 4dp a step with --mtrl-density (56px down to the 36px
  // floor, styles/components/_drawer.scss f.density) while the chevron box
  // stays a fixed 24x24 in the centred flex row: its end inset (24dp) and
  // vertical centre must not move at any compact step
  // (m3.material.io/foundations/designing/structure/density, read 2026-11-24).
  for (const density of [0, -1, -2, -3, -4, -5] as const) {
    await page.evaluate((d) => {
      document.documentElement.dir = 'ltr';
      window.mountDrawer({
        variant: 'standard', open: true,
        items: [
          { id: 'inbox', label: 'Inbox' },
          { type: 'section', id: 'labels', label: 'Labels', badge: '24', items: [{ id: 'family', label: 'Family', active: true }, { id: 'work', label: 'Work' }] },
          { id: 'archive', label: 'Archive', badge: '12' },
        ],
      });
      (window as unknown as { drawer: { element: HTMLElement } }).drawer.element.style.setProperty('--mtrl-density', String(d));
    }, density);
    await page.waitForFunction(() => !!document.querySelector('[data-id="labels"]'));
    await page.waitForTimeout(60);
    const row = await page.evaluate(() => {
      const header = document.querySelector('[data-id="labels"]') as HTMLElement;
      const chevron = header.querySelector('.mtrl-drawer__item-chevron') as HTMLElement;
      const ib = header.getBoundingClientRect();
      const cb = chevron.getBoundingClientRect();
      return { height: ib.height, endInset: ib.right - cb.right, cyDelta: (cb.y + cb.height / 2) - (ib.y + ib.height / 2) };
    });
    const expectedHeight = 56 + 4 * density;
    near(row.height, expectedHeight, `density ${density}: item height follows density`);
    near(row.endInset, 18, `density ${density}: chevron box end inset inside the indicator (24dp ink line - 6px ink margin)`);
    near(row.cyDelta, 0, `density ${density}: chevron vertical centre`);
    // The painted ink, not the box: the shipped chevron's ink is 12 units
    // wide centred in the 24-unit box, so its reading-direction end must
    // land on the indicator's 24dp line, where a badge's text ends on a
    // chevron-less row. Both corners go through the screen matrix — the
    // expanded header rotates the glyph 180 degrees about its centre, and
    // the symmetric glyph keeps its screen extent, so the reading-side end
    // is the larger (LTR) or smaller (RTL) of the two mapped corners.
    const ink = await page.evaluate(() => {
      const header = document.querySelector('[data-id="labels"]') as HTMLElement;
      const chevron = header.querySelector('.mtrl-drawer__item-chevron') as HTMLElement;
      const svg = chevron.querySelector('svg') as SVGSVGElement;
      const path = svg.querySelector('path') as SVGPathElement;
      const badged = document.querySelector('[data-id="archive"]') as HTMLElement;
      const bbox = path.getBBox();
      const ltr = document.documentElement.dir !== 'rtl';
      const svgEl = svg;
      const screenX = (x: number) => {
        const point = svgEl.createSVGPoint();
        point.x = x;
        point.y = bbox.y + bbox.height / 2;
        return point.matrixTransform(path.getScreenCTM()!).x;
      };
      const end = Math.max(screenX(bbox.x), screenX(bbox.x + bbox.width));
      const start = Math.min(screenX(bbox.x), screenX(bbox.x + bbox.width));
      const inkEnd = ltr ? end : start;
      const indicatorEnd = ltr ? header.getBoundingClientRect().right : header.getBoundingClientRect().left;
      const badgeEnd = ltr ? badged.querySelector('.mtrl-drawer__item-badge')!.getBoundingClientRect().right
        : badged.querySelector('.mtrl-drawer__item-badge')!.getBoundingClientRect().left;
      const inset = ltr ? indicatorEnd - inkEnd : inkEnd - indicatorEnd;
      return { inset, badgeGap: ltr ? badgeEnd - inkEnd : inkEnd - badgeEnd };
    });
    near(ink.inset, 24, `density ${density}: chevron ink ends 24dp inside the indicator`);
    near(ink.badgeGap, 0, `density ${density}: chevron ink end lands on the badge text end`);
  }
  // The dense option is the density scale's last step through the component.
  await page.evaluate(() => {
    window.mountDrawer({
      variant: 'standard', open: true, dense: true,
      items: [
        { id: 'inbox', label: 'Inbox' },
        { type: 'section', id: 'labels', label: 'Labels', items: [{ id: 'family', label: 'Family', active: true }, { id: 'work', label: 'Work' }] },
        { id: 'archive', label: 'Archive', badge: '12' },
      ],
    });
  });
  await page.waitForFunction(() => !!document.querySelector('[data-id="labels"]'));
  await page.waitForTimeout(60);
  const denseRow = await page.evaluate(() => {
    const header = document.querySelector('[data-id="labels"]') as HTMLElement;
    const chevron = header.querySelector('.mtrl-drawer__item-chevron') as HTMLElement;
    const ib = header.getBoundingClientRect();
    const cb = chevron.getBoundingClientRect();
    return { height: ib.height, endInset: ib.right - cb.right, cyDelta: (cb.y + cb.height / 2) - (ib.y + ib.height / 2) };
  });
  near(denseRow.height, 36, 'dense option: item height at the density floor');
  near(denseRow.endInset, 18, 'dense option: chevron box end inset inside the indicator');
  near(denseRow.cyDelta, 0, 'dense option: chevron vertical centre');
  // RTL mirrors through the logical properties: same numbers, mirrored side.
  for (const density of [0, -5] as const) {
    await page.evaluate((d) => {
      document.documentElement.dir = 'rtl';
      window.mountDrawer({
        variant: 'standard', open: true,
        items: [
          { id: 'inbox', label: 'Inbox' },
          { type: 'section', id: 'labels', label: 'Labels', badge: '24', items: [{ id: 'family', label: 'Family', active: true }] },
          { id: 'archive', label: 'Archive', badge: '12' },
        ],
      });
      (window as unknown as { drawer: { element: HTMLElement } }).drawer.element.style.setProperty('--mtrl-density', String(d));
    }, density);
    await page.waitForFunction(() => !!document.querySelector('[data-id="labels"]'));
    await page.waitForTimeout(60);
    const row = await page.evaluate(() => {
      const header = document.querySelector('[data-id="labels"]') as HTMLElement;
      const chevron = header.querySelector('.mtrl-drawer__item-chevron') as HTMLElement;
      const ib = header.getBoundingClientRect();
      const cb = chevron.getBoundingClientRect();
      return { height: ib.height, endInset: cb.left - ib.left, cyDelta: (cb.y + cb.height / 2) - (ib.y + ib.height / 2) };
    });
    near(row.height, 56 + 4 * density, `density ${density} RTL: item height follows density`);
    near(row.endInset, 18, `density ${density} RTL: chevron box end inset inside the indicator`);
    near(row.cyDelta, 0, `density ${density} RTL: chevron vertical centre`);
    const ink = await page.evaluate(() => {
      const header = document.querySelector('[data-id="labels"]') as HTMLElement;
      const chevron = header.querySelector('.mtrl-drawer__item-chevron') as HTMLElement;
      const svg = chevron.querySelector('svg') as SVGSVGElement;
      const path = svg.querySelector('path') as SVGPathElement;
      const badged = document.querySelector('[data-id="archive"]') as HTMLElement;
      const bbox = path.getBBox();
      const screenX = (x: number) => {
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = bbox.y + bbox.height / 2;
        return point.matrixTransform(path.getScreenCTM()!).x;
      };
      const inkEnd = Math.min(screenX(bbox.x), screenX(bbox.x + bbox.width));
      const badgeEnd = badged.querySelector('.mtrl-drawer__item-badge')!.getBoundingClientRect().left;
      return { inset: inkEnd - header.getBoundingClientRect().left, badgeGap: inkEnd - badgeEnd };
    });
    near(ink.inset, 24, `density ${density} RTL: chevron ink ends 24dp inside the indicator`);
    near(ink.badgeGap, 0, `density ${density} RTL: chevron ink end lands on the badge text end`);
  }
  // Open the section rotates the chevron 180 degrees about its centre; the
  // glyph is symmetric, so the ink's horizontal extent — and the alignment
  // with the badge text — holds through the turn. Both states are asserted.
  await page.evaluate(() => {
    document.documentElement.dir = 'ltr';
    window.mountDrawer({
      variant: 'standard', open: true, dense: true,
      items: [
        { type: 'section', id: 'labels', label: 'Labels', badge: '24', items: [{ id: 'family', label: 'Family', active: true }] },
        { id: 'archive', label: 'Archive', badge: '12' },
      ],
    });
  });
  await page.waitForFunction(() => !!document.querySelector('[data-id="labels"]'));
  await page.waitForTimeout(60);
  const inkOf = () => page.evaluate(() => {
    const header = document.querySelector('[data-id="labels"]') as HTMLElement;
    const chevron = header.querySelector('.mtrl-drawer__item-chevron') as HTMLElement;
    const svg = chevron.querySelector('svg') as SVGSVGElement;
    const path = svg.querySelector('path') as SVGPathElement;
    const bbox = path.getBBox();
    const screenX = (x: number) => {
      const point = svg.createSVGPoint();
      point.x = x;
      point.y = bbox.y + bbox.height / 2;
      return point.matrixTransform(path.getScreenCTM()!).x;
    };
    const inkEnd = Math.max(screenX(bbox.x), screenX(bbox.x + bbox.width));
    const badged = document.querySelector('[data-id="archive"]') as HTMLElement | null;
    const badgeEnd = badged ? badged.querySelector('.mtrl-drawer__item-badge')!.getBoundingClientRect().right : null;
    return { inset: header.getBoundingClientRect().right - inkEnd, badgeGap: badgeEnd === null ? null : badgeEnd - inkEnd, transform: getComputedStyle(chevron).transform };
  });
  let rotated = await inkOf();
  assert.equal(rotated.transform, 'matrix(-1, 0, 0, -1, 0, 0)', 'the expanded section rotated its chevron');
  near(rotated.inset, 24, 'expanded (rotated) chevron: ink still ends 24dp inside the indicator');
  if (rotated.badgeGap !== null) near(rotated.badgeGap, 0, 'expanded (rotated) chevron: ink end lands on the badge text end');
  await page.click('[data-id="labels"]');
  await page.waitForFunction(() => document.querySelector('[data-id="labels"]')?.getAttribute('aria-expanded') === 'false');
  rotated = await inkOf();
  assert.equal(rotated.transform, 'matrix(1, 0, 0, 1, 0, 0)', 'the collapsed section turned the chevron back');
  near(rotated.inset, 24, 'collapsed chevron: ink still ends 24dp inside the indicator');
  if (rotated.badgeGap !== null) near(rotated.badgeGap, 0, 'collapsed chevron: ink end lands on the badge text end');

  // ========================================================================
  // SECTION MOTION: the open/close follows the menu's timing
  // ========================================================================
  // The menu reveals with transform scaleY + opacity on duration-medium1
  // (250ms) + easing-emphasized (styles/components/_menu.scss). The drawer
  // section runs the same timing: the panel's height opens and closes on it
  // and each sub item GROWS from 0 to full — height and pill together —
  // fading on the menu's opacity timing, with no spring overshoot; the
  // chevron turns on the same duration. Sampled per frame below.
  const motionPage = await browser.browser()!.newPage({ viewport: { width: 640, height: 800 } });
  const motionErrors: string[] = [];
  motionPage.on('pageerror', error => motionErrors.push(error.message));
  await motionPage.goto(`http://127.0.0.1:${server.port}`);
  await motionPage.waitForFunction(() => !!window.mountDrawer);
  await motionPage.evaluate(() => window.mountDrawer({
    variant: 'standard', open: true,
    items: [
      { id: 'inbox', label: 'Inbox' },
      { type: 'section', id: 'labels', label: 'Labels', expanded: false, items: [{ id: 'family', label: 'Family' }, { id: 'work', label: 'Work' }] },
      { id: 'archive', label: 'Archive', badge: '12' },
    ],
  }));
  await motionPage.waitForFunction(() => !!document.querySelector('[data-id="labels"]'));
  const timing = await motionPage.evaluate(() => {
    const inner = document.querySelector('.mtrl-drawer__group:not(.mtrl-drawer__group--expanded) .mtrl-drawer__group-items-inner') as HTMLElement;
    const panel = document.querySelector('.mtrl-drawer__group-items') as HTMLElement;
    const innerStyle = getComputedStyle(inner);
    const panelStyle = getComputedStyle(panel);
    const chevronStyle = getComputedStyle(document.querySelector('[data-id="labels"] .mtrl-drawer__item-chevron')!);
    return {
      closedTransform: innerStyle.transform,
      closedOpacity: innerStyle.opacity,
      innerTransition: innerStyle.transitionProperty,
      innerDuration: innerStyle.transitionDuration,
      innerEasing: innerStyle.transitionTimingFunction,
      panelDuration: panelStyle.transitionDuration,
      chevronDuration: chevronStyle.transitionDuration,
      chevronEasing: chevronStyle.transitionTimingFunction,
    };
  });
  // The menu's mechanism, shared through the mixin: closed, the container
  // holds scaleY(0) and opacity 0 from its top-centre origin.
  assert.equal(timing.closedTransform, 'matrix(1, 0, 0, 0, 0, 0)', `a closed section holds the menu's scaleY(0): ${timing.closedTransform}`);
  assert.equal(timing.closedOpacity, '0', 'a closed section holds opacity 0');
  assert.ok(timing.innerTransition.includes('transform') && timing.innerTransition.includes('opacity'),
    `the container transitions transform and opacity: ${timing.innerTransition}`);
  assert.equal(timing.innerDuration.split(', ')[0], '0.25s', `the container takes the menu's duration-medium1: ${timing.innerDuration}`);
  assert.ok(timing.innerEasing.startsWith('cubic-bezier(0.3, 0, 0, 1)'), `the container takes the menu's emphasized curve: ${timing.innerEasing}`);
  assert.equal(timing.panelDuration.split(', ')[0], '0.25s', `the panel pushes the content below on the menu's duration: ${timing.panelDuration}`);
  assert.equal(timing.chevronDuration, '0.25s', `the chevron turns on the same duration: ${timing.chevronDuration}`);
  assert.equal(timing.chevronEasing, 'cubic-bezier(0.3, 0, 0, 1)', `the chevron turns on the emphasized curve: ${timing.chevronEasing}`);
  const frames = await motionPage.evaluate(async () => {
    const rows: Array<{ t: number; panel: number; innerH: number; scale: number; op: number }> = [];
    document.querySelector('[data-id="labels"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const panel = document.querySelector('.mtrl-drawer__group-items') as HTMLElement;
    const inner = panel.querySelector('.mtrl-drawer__group-items-inner') as HTMLElement;
    const start = performance.now();
    await new Promise<void>((done) => {
      const tick = () => {
        const t = performance.now() - start;
        const matrix = new DOMMatrixReadOnly(getComputedStyle(inner).transform);
        rows.push({ t, panel: panel.getBoundingClientRect().height, innerH: inner.getBoundingClientRect().height, scale: matrix.d, op: parseFloat(getComputedStyle(inner).opacity) });
        if (t < 450) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
    return rows;
  });
  assert.ok(frames.length >= 8, `the open was sampled per frame (${frames.length} frames)`);
  assert.ok(frames[0]!.innerH < 20, `the container starts growing from near 0 (${frames[0]!.innerH.toFixed(1)})`);
  assert.equal(Math.round(frames[frames.length - 1]!.innerH), 112, 'the container reaches its full height (two 56dp rows)');
  assert.ok(frames[frames.length - 1]!.op > 0.95, 'the container fades in to full opacity');
  // The menu's coupling: opacity rides the scale fraction on every frame.
  const coupled = frames.every(f => Math.abs(f.op - f.scale) <= 0.01);
  assert.ok(coupled, 'opacity rides the scale fraction on every frame, as the menu reads');
  // The grid row below pushes on the same curve: the panel height fraction
  // matches the container's scale fraction.
  const pushed = frames.every(f => Math.abs(f.panel / 112 - f.scale) <= 0.03);
  assert.ok(pushed, 'the panel height follows the same curve as the reveal');
  const maxPanel = Math.max(...frames.map(f => f.panel));
  assert.ok(maxPanel <= 112.5, `no spring overshoot on the panel height (max ${maxPanel.toFixed(1)})`);
  const at100 = frames.find(f => f.t >= 100)!;
  assert.ok(at100.scale > 0.5, `the emphasized curve starts fast: past half at ~100ms of 250 (scale ${at100.scale.toFixed(2)})`);
  const at250 = frames.find(f => f.t >= 250)!;
  assert.ok(at250.scale > 0.96, `the reveal is settled at 250ms like the menu (scale ${at250.scale.toFixed(2)})`);
  assert.deepEqual(motionErrors, [], 'no page errors on the motion page');
  await motionPage.close();

  // ========================================================================
  // PARENT CUE: the section of the active child keeps a hover state layer
  // ========================================================================
  // The header of the section that owns the active destination shows the
  // hover state layer persistently — open or collapsed — with no pill and
  // no weight change; the child carries the active indicator.
  const readCue = () => page.evaluate(() => {
    const header = document.querySelector('[data-id="labels"]') as HTMLElement;
    const indicator = header.querySelector('.mtrl-drawer__active-indicator')!;
    const hover = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mtrl-sys-state-hover-state-layer-opacity'));
    return {
      hover,
      layer: getComputedStyle(indicator, '::after').opacity,
      pill: getComputedStyle(indicator, '::before').opacity,
      weight: getComputedStyle(header.querySelector('.mtrl-drawer__item-label')!).fontWeight,
      hasActive: header.classList.contains('mtrl-drawer__item--has-active'),
    };
  });
  for (const mode of ['light', 'dark'] as const) {
    await page.evaluate((m) => { document.documentElement.dataset.themeMode = m; }, mode);
    await page.evaluate(() => {
      window.mountDrawer({
        variant: 'standard', open: true,
        items: [
          { id: 'inbox', label: 'Inbox' },
          { type: 'section', id: 'labels', label: 'Labels', badge: '24', items: [{ id: 'family', label: 'Family', active: true }, { id: 'work', label: 'Work' }] },
          { id: 'archive', label: 'Archive', badge: '12' },
        ],
      });
    });
    await page.waitForFunction(() => !!document.querySelector('[data-id="labels"]'));
    await page.waitForTimeout(60);
    // Starts expanded (the selected child auto-expands its section); collapse it.
    await page.click('[data-id="labels"]');
    await page.waitForFunction(() => document.querySelector('[data-id="labels"]')?.getAttribute('aria-expanded') === 'false');
    let cue = await readCue();
    assert.equal(cue.hasActive, true, 'collapsed header of the selected child carries the cue state');
    assert.equal(cue.layer, String(cue.hover), `${mode}: collapsed header shows the hover state layer`);
    assert.equal(cue.pill, '0', `${mode}: collapsed header has no pill`);
    assert.notEqual(cue.weight, '700', `${mode}: collapsed header label weight unchanged`);
    await page.click('[data-id="labels"]');
    await page.waitForFunction(() => document.querySelector('[data-id="labels"]')?.getAttribute('aria-expanded') === 'true');
    cue = await readCue();
    assert.equal(cue.layer, String(cue.hover), `${mode}: open header shows the same persistent layer`);
    assert.equal(cue.pill, '0', `${mode}: open header has no pill`);
    assert.notEqual(cue.weight, '700', `${mode}: open header label weight unchanged`);
  }
  // Selecting outside clears the cue; re-selecting the child restores it.
  await page.click('[data-id="archive"]');
  await page.waitForFunction(() => !document.querySelector('[data-id="labels"]')?.classList.contains('mtrl-drawer__item--has-active'));
  assert.equal((await readCue()).layer, '0', 'cue clears when the selection moves outside the section');
  await page.click('[data-id="family"]');
  await page.waitForFunction(() => !!document.querySelector('[data-id="labels"]')?.classList.contains('mtrl-drawer__item--has-active'));
  assert.equal((await readCue()).layer, String((await readCue()).hover), 'cue returns with the selected child');
  // Hover and press still give their own feedback on top of the floor.
  const headerColors = await page.evaluate(() => {
    const header = document.querySelector('[data-id="labels"]') as HTMLElement;
    const indicator = header.querySelector('.mtrl-drawer__active-indicator')!;
    return { rest: getComputedStyle(indicator, '::after').backgroundColor };
  });
  await page.hover('[data-id="labels"]');
  await page.waitForFunction(() => {
    const header = document.querySelector('[data-id="labels"]') as HTMLElement;
    return header.matches(':hover');
  });
  const hoverColor = await page.evaluate(() => {
    const header = document.querySelector('[data-id="labels"]') as HTMLElement;
    return getComputedStyle(header.querySelector('.mtrl-drawer__active-indicator')!, '::after').backgroundColor;
  });
  assert.notEqual(hoverColor, headerColors.rest, 'hover still shifts the state layer colour over the cue');
  // The focus ring is untouched by the cue.
  await page.locator('[data-id="inbox"]').focus();
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => {
    const header = document.querySelector('[data-id="labels"]') as HTMLElement;
    return { matches: header.matches(':focus-visible'), width: getComputedStyle(header).outlineWidth, style: getComputedStyle(header).outlineStyle };
  });
  assert.equal(focused.matches, true, 'the header takes keyboard focus');
  assert.equal(`${focused.style} ${focused.width}`, 'solid 3px', 'header focus ring unchanged');

  const url = (variant: string): string => `http://127.0.0.1:${server.port}/sections?variant=${variant}`;
  const still = await browser.browser()!.newPage({ javaScriptEnabled: false, reducedMotion: "reduce" });
  await still.goto(url("server"));
  const before = still.getByRole("button", { name: "Navigation", exact: true });
  assert.equal(await before.getAttribute("id"), "mtrl-drawer-sec-navigation-btn");
  assert.equal(await before.getAttribute("aria-expanded"), "true");
  assert.equal(await still.getByRole("link", { name: "Drawer" }).getAttribute("aria-current"), "page");
  assert.equal(await still.getByRole("link", { name: "Card" }).count(), 0);
  await still.getByRole("link", { name: "Tabs" }).click();
  assert.equal(new URL(still.url()).hash, "#tabs", "server-rendered link navigates with JavaScript off");
  await still.close();

  for (const variant of ["standard", "modal", "server"]) {
    await page.goto(url(variant));
    await page.waitForFunction(() => !!document.querySelector("m-drawer")?.component);
    const host = page.locator("m-drawer");
    const sheet = host.getByRole(variant === "modal" ? "dialog" : "navigation");
    const navigation = sheet.getByRole("button", { name: "Navigation", exact: true });
    const containment = sheet.getByRole("button", { name: "Containment" });
    const drawer = sheet.getByRole("link", { name: "Drawer", exact: true });
    if (variant === "modal") assert.equal(await sheet.evaluate(node => node.matches(":modal")), true);
    assert.equal(await navigation.getAttribute("id"), "mtrl-drawer-sec-navigation-btn");
    assert.equal(await navigation.getAttribute("aria-expanded"), "true");
    assert.equal(await drawer.getAttribute("aria-current"), "page");
    assert.equal(await sheet.getByRole("link", { name: "Card" }).count(), 0);
    assert.equal(await sheet.getByRole("link", { name: "Unavailable" }).getAttribute("aria-disabled"), "true");
    assert.equal(await drawer.evaluate(node => node.getBoundingClientRect().height), variant === "modal" ? 36 : 56);

    const cdp = await page.context().newCDPSession(page);
    const { nodes } = await cdp.send("Accessibility.getFullAXTree");
    assert(nodes.some(node => !node.ignored && node.role?.value === "link" && node.name?.value === "Drawer"), variant);
    assert(!nodes.some(node => !node.ignored && node.role?.value === "link" && node.name?.value === "Card"), variant);
    await cdp.detach();

    await navigation.focus();
    await page.keyboard.press("ArrowDown");
    assert.equal(await drawer.evaluate(node => node.matches(":focus")), true);
    await page.keyboard.press("End");
    assert.equal(await containment.evaluate(node => node.matches(":focus")), true);
    await page.keyboard.press("Tab");
    const tabTarget = variant === "modal" ? sheet.getByRole("link", { name: "Home" }) : page.locator("#outside");
    assert.equal(await tabTarget.evaluate(node => node.matches(":focus")), true, variant);
    await containment.focus();
    await page.keyboard.press("ArrowRight");
    assert.equal(await containment.getAttribute("aria-expanded"), "true");
    // The reveal runs 250ms; the child row becomes focusable as it opens.
    await page.waitForTimeout(300);
    await page.keyboard.press("ArrowRight");
    const card = sheet.getByRole("link", { name: "Card" });
    assert.equal(await card.evaluate(node => node.matches(":focus")), true);
    await page.keyboard.press("ArrowLeft");
    assert.equal(await containment.evaluate(node => node.matches(":focus")), true);
    await page.keyboard.press("ArrowLeft");
    assert.equal(await containment.getAttribute("aria-expanded"), "false");
    await page.keyboard.press("Enter");
    assert.equal(await containment.getAttribute("aria-expanded"), "true");
    await page.keyboard.press("Space");
    assert.equal(await containment.getAttribute("aria-expanded"), "false");

    const reflection = await host.evaluate((node: HTMLElementTagNameMap["m-drawer"]) => {
      const declaration = node.querySelector('m-drawer-item[value="containment"]')!;
      const log: unknown[] = [];
      node.addEventListener("expand", event =>
        log.push([(event as CustomEvent).detail, declaration.hasAttribute("expanded"), node.value]));
      node.expandSection("containment");
      node.collapseSection("containment");
      node.value = "card";
      return { log, expanded: node.getExpandedSections() };
    });
    assert.deepEqual(reflection, { log: [[{ value: "containment", expanded: true }, true, "drawer"]], expanded: ["navigation", "containment"] });
    assert.equal(await card.getAttribute("aria-current"), "page");
    await host.locator('m-drawer-item[value="card"]').evaluate(node => node.setAttribute("label", "Card details"));
    await page.waitForFunction(() => document.querySelector("m-drawer")?.shadowRoot?.querySelector('[data-id="card"]')?.textContent?.includes("Card details"));
    assert.equal(await containment.getAttribute("aria-expanded"), "true");
    const updatedCard = sheet.getByRole("link", { name: "Card details" });

    await page.evaluate(() => { document.documentElement.dir = "rtl"; });
    assert.deepEqual(await updatedCard.evaluate(node => {
      const style = getComputedStyle(node);
      return [style.paddingLeft, style.paddingRight];
    // The child's paddings are the top level's 16/24; the indent is a
    // logical margin, so in RTL the physical paddings swap.
    }), ["24px", "16px"]);
    // Parent cue on the element form too. After the reflection above the
    // active child is "Card" in Containment: Containment shows the cue and
    // Navigation — the previous parent — has cleared it.
    const cueOf = (button: ReturnType<typeof sheet.getByRole>) => button.evaluate(node => {
      node.blur();
      const indicator = node.querySelector('.mtrl-drawer__active-indicator')!;
      const hover = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mtrl-sys-state-hover-state-layer-opacity'));
      return {
        hover,
        layer: getComputedStyle(indicator, '::after').opacity,
        pill: getComputedStyle(indicator, '::before').opacity,
        weight: getComputedStyle(node.querySelector('.mtrl-drawer__item-label')!).fontWeight,
        hasActive: node.classList.contains('mtrl-drawer__item--has-active'),
      };
    });
    const containmentCue = await cueOf(sheet.getByRole("button", { name: "Containment" }));
    assert.equal(containmentCue.hasActive, true, variant);
    assert.equal(containmentCue.layer, String(containmentCue.hover), `${variant}: element header shows the persistent layer`);
    assert.equal(containmentCue.pill, '0', `${variant}: element header has no pill`);
    assert.notEqual(containmentCue.weight, '700', `${variant}: element header label weight unchanged`);
    assert.equal((await cueOf(sheet.getByRole("button", { name: "Navigation", exact: true }))).hasActive, false, `${variant}: the former parent cleared its cue`);
    await page.evaluate(() => { document.documentElement.dataset.themeMode = 'dark'; });
    assert.equal(await cueOf(sheet.getByRole("button", { name: "Containment" })).then(c => c.layer),
      String(containmentCue.hover), `${variant}: layer persists in dark`);
    await page.evaluate(() => { document.documentElement.dataset.themeMode = 'light'; });
    await containment.focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await updatedCard.evaluate(node => node.matches(":focus")), true);
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    assert.equal(await containment.getAttribute("aria-expanded"), "false");
    const chevronMotion = await containment.locator(".mtrl-drawer__item-chevron").evaluate(node => getComputedStyle(node).transitionProperty);
    const panelMotion = await host.locator(".mtrl-drawer__group-items").first().evaluate(node => getComputedStyle(node).transitionProperty);
    assert(!/\b(?:all|transform)\b/.test(chevronMotion), chevronMotion);
    assert(!/\b(?:all|grid-template-rows)\b/.test(panelMotion), panelMotion);

    await page.emulateMedia({ forcedColors: "active" });
    assert.equal(await containment.locator(".mtrl-drawer__active-indicator").evaluate(node => getComputedStyle(node).outlineStyle), "solid");
    await page.emulateMedia({ forcedColors: "none" });
  }
  assert.deepEqual(errors, []);
  console.log("Passed drawer links, no-JS navigation, initial section state, AX visibility, native focus, LTR/RTL disclosure keys, forced colors and reduced motion.");
  console.log(`Passed ${scenes} drawer scenes, modal keyboard/scrim interaction, standard layout, reduced motion, and 40 teardown cycles.`);
} finally { await browser.close(); server.stop(true); }
