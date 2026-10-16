#!/usr/bin/env bun
// Real button/label bounds against the ancestor's clipping rectangle, in both
// directions. Runs against dist, independently of any application or website.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import type { NavigationRailComponent } from "../src/components/navigation-rail/types";
import type { NavigationRailElement } from "../src/elements/navigation-rail";
import type { ExtendedFabElement } from "../src/elements/extended-fab";
import type { fixture } from "./fixtures/rail-header-fab";

declare global {
  interface Window {
    railHeaderFab: typeof fixture;
    headerRail: NavigationRailComponent;
    headerEvents: Array<{ type: string; target: string }>;
    headerCleanup: () => void;
  }
}

export async function checkRailHeaderFab(): Promise<void> {
  await mkdir("analysis/navigation-rail/header-fab", { recursive: true });
  const bundle = await Bun.build({ entrypoints: ["scripts/fixtures/rail-header-fab.ts"], target: "browser" });
  assert(bundle.success, String(bundle.logs));
  const js = await bundle.outputs[0].text();
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/fixture.js") return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (url.pathname === "/styles.css") return new Response(Bun.file("dist/styles.css"));
    if (["base", "navigation-rail", "extended-fab"].some(name => url.pathname === `/${name}.css`)) {
      return new Response(Bun.file(`dist/styles${url.pathname}`));
    }
    const styles = url.searchParams.has("selective")
      ? '<link rel="stylesheet" href="/base.css"><link rel="stylesheet" href="/navigation-rail.css"><link rel="stylesheet" href="/extended-fab.css">'
      : '<link rel="stylesheet" href="/styles.css">';
    return new Response(`<!doctype html><html data-theme="baseline"><head>${styles}
<style>body{margin:0}#stage{width:600px;height:600px;display:flex}#outside{position:absolute;top:620px}</style>
</head><body><div id="stage"></div><div id="outside"></div><script type="module" src="/fixture.js"></script></body></html>`,
    { headers: { "Content-Type": "text/html" } });
  } });
  const browser = await chromium.launch();
  const failures: string[] = [];
  let checks = 0;
  const verify = (name: string, condition: boolean): void => {
    checks++;
    if (!condition) failures.push(name);
  };
  try {
    const page = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 900, height: 800 } });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const measure = async (name: string, expanded: boolean): Promise<void> => {
      // Both rail and FAB dimension transitions must have settled.
      await page.waitForTimeout(550);
      const m = await page.evaluate(() => {
        const rail = window.headerRail.element;
        const host = document.getElementById("header-fab")!;
        const button = host.shadowRoot?.querySelector<HTMLElement>(".mtrl-extended-fab") ?? host;
        const label = button.querySelector<HTMLElement>(".mtrl-extended-fab__text")!;
        const rect = (el: Element | Range) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right, width: r.width };
        };
        const clip = rail.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(host.shadowRoot ? host : label);
        const bounds = rect(button), text = rect(label);
        return {
          rail: { left: clip.left + rail.clientLeft, right: clip.left + rail.clientLeft + rail.clientWidth, width: rail.clientWidth },
          button: bounds, label: text, text: rect(range), opacity: getComputedStyle(label).opacity,
          overflowX: getComputedStyle(rail).overflowX,
        };
      });
      console.log(`${name}: ${JSON.stringify(m)}`);
      if (name.endsWith("initial") || name.endsWith("expanded")) {
        await page.screenshot({ path: `analysis/navigation-rail/header-fab/${name.replaceAll(" ", "-")}.png` });
      }
      const contained = (r: { left: number; right: number }) => r.left >= m.rail.left - 0.5 && r.right <= m.rail.right + 0.5;
      verify(`${name}: button contained by rail`, contained(m.button));
      verify(`${name}: rail width`, m.rail.width === (expanded ? 280 : 96));
      if (expanded) {
        verify(`${name}: label visible and contained`, m.label.width > 0 && m.opacity === "1" && contained(m.label) && contained(m.text));
      } else {
        verify(`${name}: compact button is 56px`, Math.abs(m.button.width - 56) < 0.5);
        verify(`${name}: label hidden`, m.label.width === 0 && m.opacity === "0");
      }
    };
    const events = async (name: string, expected: Array<{ type: string; target: string }>): Promise<void> => {
      const actual = await page.evaluate(() => window.headerEvents.splice(0));
      verify(`${name}: events ${JSON.stringify(actual)} expected ${JSON.stringify(expected)}`, JSON.stringify(actual) === JSON.stringify(expected));
    };
    for (const direction of ["ltr", "rtl"]) {
      for (const kind of ["factory", "wrapped-factory", "fluid-factory", "element", "prefixed-element"]) {
        await page.goto(`http://127.0.0.1:${server.port}/${kind === "wrapped-factory" ? "?selective" : ""}`);
        await page.waitForFunction(() => !!window.railHeaderFab);
        await page.evaluate(({ direction, kind }) => {
          document.documentElement.dir = direction;
          const stage = document.getElementById("stage")!;
          const { createNavigationRail, createExtendedFab, defineExtendedFab } = window.railHeaderFab;
          const icon = '<svg viewBox="0 0 24 24"><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z"/></svg>';
          window.headerEvents = [];
          const record = (event: Event): void => {
            window.headerEvents.push({ type: event.type, target: (event.target as HTMLElement).id });
          };
          stage.addEventListener("expand", record);
          stage.addEventListener("collapse", record);
          if (kind.includes("element")) {
            const prefix = kind === "prefixed-element" ? "test-ui" : "m";
            stage.innerHTML = `<${prefix}-navigation-rail id="header-rail"><${prefix}-extended-fab id="header-fab" slot="header" icon='${icon}'>Add timer</${prefix}-extended-fab></${prefix}-navigation-rail>`;
            // The default path upgrades parent before child in the same task.
            // The prefixed path is left undefined for a full assignment cycle.
            if (prefix === "m") defineExtendedFab();
            window.headerRail = (document.getElementById("header-rail") as NavigationRailElement).component!;
          } else {
            const fab = createExtendedFab({ text: "Add timer", icon, width: kind === "fluid-factory" ? "fluid" : "fixed" });
            fab.element.id = "header-fab";
            // Listen before creation, so silent initial synchronization is checked too.
            fab.on("expand", () => window.headerEvents.push({ type: "expand", target: "fab-emitter" }));
            fab.on("collapse", () => window.headerEvents.push({ type: "collapse", target: "fab-emitter" }));
            const wrapper = document.createElement("div");
            wrapper.append(fab.element);
            const rail = createNavigationRail({ header: kind === "wrapped-factory" ? wrapper : fab.element,
              onExpand: () => window.headerEvents.push({ type: "expand", target: "rail-emitter" }),
              onCollapse: () => window.headerEvents.push({ type: "collapse", target: "rail-emitter" }),
            });
            rail.element.id = "header-rail";
            stage.append(rail.element);
            window.headerRail = rail;
            window.headerCleanup = () => { rail.destroy(); fab.destroy(); };
          }
        }, { direction, kind });
        if (kind === "prefixed-element") {
          await page.waitForTimeout(50);
          await page.evaluate(() => window.railHeaderFab.defineExtendedFab({ prefix: "test-ui" }));
        }
        const name = `${kind} ${direction}`;
        await measure(`${name} initial`, false);
        await events(`${name} initial`, []);
        const target = kind.includes("element") ? "header-rail" : "rail-emitter";
        await page.evaluate(() => { window.headerRail.expand(); window.headerRail.expand(); });
        await measure(`${name} expanded`, true);
        await events(`${name} expanded`, [{ type: "expand", target }]);
        await page.evaluate(() => { window.headerRail.collapse(); window.headerRail.collapse(); });
        await measure(`${name} collapsed`, false);
        await events(`${name} collapsed`, [{ type: "collapse", target }]);
        if (kind.includes("element")) {
          await page.evaluate(() => document.getElementById("header-rail")!.setAttribute("expanded", ""));
          await measure(`${name} attribute expanded`, true);
          await events(`${name} attribute expanded`, []);
          await page.evaluate(() => document.getElementById("header-rail")!.removeAttribute("expanded"));
          await measure(`${name} attribute collapsed`, false);
          await events(`${name} attribute collapsed`, []);
          await page.evaluate(() => document.getElementById("header-fab")!.setAttribute("variant", "secondary"));
          await measure(`${name} rebuilt`, false);
          await events(`${name} rebuilt`, []);
          await page.evaluate(() => {
            const previous = document.getElementById("header-fab")!;
            previous.replaceWith(previous.cloneNode(true));
          });
          await measure(`${name} reassigned`, false);
          await events(`${name} reassigned`, []);
          // Repeated assignment must not emit spurious child/rail transitions.
          await page.evaluate(() => {
            const slot = window.headerRail.element.querySelector("slot")!;
            slot.dispatchEvent(new Event("slotchange"));
            slot.dispatchEvent(new Event("slotchange"));
          });
          await events(`${name} repeated assignment`, []);
          await page.locator(".mtrl-navigation-rail__toggle").click();
          await measure(`${name} menu expanded`, true);
          await events(`${name} menu expanded`, [{ type: "expand", target: "header-rail" }]);
          // Consumer-invoked FAB methods retain their bubbling event contract.
          await page.evaluate(() => (document.getElementById("header-fab") as ExtendedFabElement).collapse());
          await events(`${name} explicit FAB collapse`, [{ type: "collapse", target: "header-fab" }]);
          await page.waitForTimeout(550);
          verify(`${name}: explicit compact form allowed in expanded rail`, await page.locator("#header-fab .mtrl-extended-fab").evaluate(el => Math.abs(el.getBoundingClientRect().width - 56) < 0.5));
          await page.evaluate(() => (document.getElementById("header-fab") as ExtendedFabElement).expand());
          await events(`${name} explicit FAB expand`, [{ type: "expand", target: "header-fab" }]);
          // A detached FAB must no longer inherit the rail's compact layout.
          await page.evaluate(() => {
            window.headerRail.collapse();
            document.getElementById("outside")!.append(document.getElementById("header-fab")!);
          });
          await page.waitForTimeout(550);
          verify(`${name}: detached FAB extended`, await page.locator("#header-fab .mtrl-extended-fab").evaluate(el => el.getBoundingClientRect().width > 56));
        } else {
          await page.evaluate(() => window.headerCleanup());
        }
      }
    }
    // Arbitrary headers with similarly named methods must remain application-owned.
    const guards = await page.evaluate(() => {
      const { createNavigationRail, createFab } = window.railHeaderFab;
      let called = 0;
      const header = Object.assign(document.createElement("div"), { collapse: () => called++, expand: () => called++ });
      const rail = createNavigationRail({ header });
      rail.expand(); rail.collapse(); rail.destroy();
      const fab = createFab({ ariaLabel: "Create", icon: '<svg viewBox="0 0 24 24"></svg>' });
      const before = fab.element.className;
      const plain = createNavigationRail({ header: fab.element });
      plain.expand(); plain.collapse();
      const unchanged = before === fab.element.className;
      plain.destroy(); fab.destroy();
      const empty = createNavigationRail();
      empty.expand(); empty.collapse(); empty.destroy();
      return { called, unchanged };
    });
    verify("unrelated header methods untouched", guards.called === 0);
    verify("ordinary FAB untouched", guards.unchanged);
    assert.deepEqual(errors, [], "browser errors");
    assert.deepEqual(failures, [], `${failures.length}/${checks} header FAB checks failed`);
    console.log(`Passed ${checks} rail header FAB checks: LTR/RTL bounds, factory/wrapper/elements, late upgrade, rebuild, replacement, event targets/counts, detach and unrelated headers.`);
  } finally {
    await browser.close();
    server.stop(true);
  }
}

if (import.meta.main) await checkRailHeaderFab();
