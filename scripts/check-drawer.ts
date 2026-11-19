#!/usr/bin/env bun
/** Browser coverage for the standalone MD3 drawer. Run after build. */
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
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
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1040, height: 720 }, reducedMotion: 'reduce' });
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
  const url = (variant: string): string => `http://127.0.0.1:${server.port}/sections?variant=${variant}`;
  const still = await browser.newPage({ javaScriptEnabled: false, reducedMotion: "reduce" });
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
    }), ["24px", "44px"]);
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
