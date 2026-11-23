#!/usr/bin/env bun
/**
 * A bare button in a top app bar's leading or trailing slot gets a pressed
 * state layer and a 48px hit target, at desktop and small-screen widths, for
 * the factory and for <m-top-app-bar>.
 *
 * The resting border box stays under 48px, the resting background matches a
 * button outside the bar, and the small-screen 8px padding stays on the
 * factory buttons that rule already covers. A button whose class contains the
 * library prefix keeps its own layers.
 *
 * Prints one MEASURE line per button, then fails if any row is off.
 * Two adjacent bare buttons are checked separately: a point 1px inside the
 * first, toward the second, must hit the first. Two 16px leading buttons must
 * not share a 48px target. An author class such as nav-button is styled; a
 * library class is not. base-elements plus the element shadow sheet, with no
 * document top-app-bar sheet, is checked on its own page, as is a configured
 * tag prefix. The document base does not carry the rule. The pre-upgrade
 * sheet styles no child pseudo-element.
 */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { launchChromium } from "./browser-profile";
import * as sass from "sass";
import { baseElementsStyles } from "./style-manifest";
import { assertRollbackBeats } from "./preupgrade-specificity";

const repoRoot = resolve(process.argv[2] ?? resolve(import.meta.dir, ".."));
const compile = (source: string): string => sass.compileString(`@use "${source}";`, {
  loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;

const entrySource = `
import { createTopAppBar } from ${JSON.stringify(resolve(repoRoot, "src/index.ts"))};
import { defineAll, registerStyles } from ${JSON.stringify(resolve(repoRoot, "src/elements/index.ts"))};
registerStyles({ "top-app-bar": ${JSON.stringify(compile("components/top-app-bar"))} });
defineAll();
window.api = { createTopAppBar };
`;
const bundleBuild = await Bun.build({
  entrypoints: ["top-app-bar-plain-button-entry.ts"],
  target: "browser",
  format: "iife",
  plugins: [{
    name: "virtual-entry",
    setup(build) {
      build.onResolve({ filter: /^top-app-bar-plain-button-entry\.ts$/ }, () => ({
        path: resolve(repoRoot, "top-app-bar-plain-button-entry.ts"),
      }));
      build.onLoad({ filter: /top-app-bar-plain-button-entry\.ts$/ }, () => ({ contents: entrySource, loader: "ts" }));
    },
  }],
});
assert(bundleBuild.success, String(bundleBuild.logs));

type Side = { top: string; right: string; bottom: string; left: string };
type Layer = { content: string; opacity: string; background: string };
type Row = {
  kind: "factory" | "element";
  viewport: number;
  dir: "ltr" | "rtl";
  slot: "leading" | "trailing";
  box: { width: number; height: number };
  padding: Side;
  outsidePadding: Side;
  background: string;
  outsideBackground: string;
  beforeRest: Layer;
  beforePressed: Layer & { active: boolean };
  after: { content: string; width: string; height: string };
  hit: boolean;
  hitName: string;
  onSurface: string;
  decoyBefore: string;
  decoyAfter: string;
};

const browser = await launchChromium({ headless: true });
try {
  const context = await browser.browser()!.newContext({ viewport: { width: 800, height: 600 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setContent(`<!DOCTYPE html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body></body></html>`);
  await page.addStyleTag({ content: compile("main") });
  await page.addScriptTag({ content: await bundleBuild.outputs[0]!.text() });

  const read = async (kind: Row["kind"], viewport: number, dir: Row["dir"]): Promise<Row[]> => {
    await page.setViewportSize({ width: viewport, height: 600 });
    const centers = await page.evaluate(async ({ kind, dir }) => {
      const settle = () => new Promise((resolve) => setTimeout(resolve, 60));
      document.body.replaceChildren();
      document.documentElement.dir = dir;

      const icon = (): SVGSVGElement => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", "24");
        svg.setAttribute("height", "24");
        svg.setAttribute("viewBox", "0 0 24 24");
        svg.setAttribute("aria-hidden", "true");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M4 4h16v16H4z");
        svg.append(path);
        return svg;
      };
      const bare = (slot: string): HTMLButtonElement => {
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.slot = slot;
        button.dataset.probe = slot;
        button.setAttribute("aria-label", slot);
        button.append(icon());
        return button;
      };
      const leading = bare("leading");
      const trailing = bare("trailing");
      const decoy = bare("decoy");
      decoy.className = "mtrl-decoy";
      decoy.dataset.probe = "decoy";

      if (kind === "factory") {
        const api = (window as unknown as { api: { createTopAppBar: (config: { title: string }) => {
          element: HTMLElement;
          addLeadingElement: (element: HTMLElement) => void;
          addTrailingElement: (element: HTMLElement) => void;
        } } }).api;
        const bar = api.createTopAppBar({ title: "Title" });
        document.body.append(bar.element);
        bar.addLeadingElement(leading);
        bar.addTrailingElement(decoy);
        bar.addTrailingElement(trailing);
      } else {
        const host = document.createElement("m-top-app-bar");
        host.setAttribute("headline", "Title");
        leading.slot = "leading";
        trailing.slot = "trailing";
        decoy.slot = "trailing";
        host.append(leading, decoy, trailing);
        document.body.append(host);
        await settle();
      }

      const outside = document.createElement("button");
      outside.type = "button";
      outside.dataset.probe = "outside";
      outside.append(icon());
      document.body.append(outside);

      const probe = document.createElement("span");
      probe.style.color = "var(--mtrl-sys-color-on-surface)";
      document.body.append(probe);
      const onSurface = getComputedStyle(probe).color;
      probe.remove();

      const center = (button: HTMLButtonElement) => {
        const box = button.getBoundingClientRect();
        return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      };
      return {
        onSurface,
        leading: center(leading),
        trailing: center(trailing),
      };
    }, { kind, dir });

    const press = async (slot: "leading" | "trailing"): Promise<Row["beforePressed"]> => {
      const point = centers[slot];
      await page.mouse.move(point.x, point.y);
      await page.mouse.down();
      const reading = await page.evaluate((slot) => {
        const button = document.querySelector<HTMLButtonElement>(`[data-probe="${slot}"]`);
        if (!button) return { active: false, content: "missing", opacity: "missing", background: "missing" };
        const before = getComputedStyle(button, "::before");
        return {
          active: button.matches(":active"),
          content: before.content,
          opacity: before.opacity,
          background: before.backgroundColor,
        };
      }, slot);
      await page.mouse.up();
      return reading;
    };

    const pressed = {
      leading: await press("leading"),
      trailing: await press("trailing"),
    };

    const rest = await page.evaluate(() => {
      const side = (style: CSSStyleDeclaration) => ({
        top: style.paddingTop,
        right: style.paddingRight,
        bottom: style.paddingBottom,
        left: style.paddingLeft,
      });
      const layer = (button: Element, pseudo: "::before" | "::after") => {
        const style = getComputedStyle(button, pseudo);
        return { content: style.content, opacity: style.opacity, background: style.backgroundColor, width: style.width, height: style.height };
      };
      const outside = document.querySelector<HTMLButtonElement>('[data-probe="outside"]')!;
      const outsideStyle = getComputedStyle(outside);
      const decoy = document.querySelector<HTMLButtonElement>('[data-probe="decoy"]')!;
      const readButton = (slot: string) => {
        const button = document.querySelector<HTMLButtonElement>(`[data-probe="${slot}"]`)!;
        const box = button.getBoundingClientRect();
        const style = getComputedStyle(button);
        const direction = style.direction;
        const sign = slot === "leading" ? (direction === "rtl" ? 1 : -1) : (direction === "rtl" ? -1 : 1);
        const dx = sign * (box.width / 2 + 1.5);
        const x = box.left + box.width / 2 + dx;
        const y = box.top + box.height / 2;
        const target = document.elementFromPoint(x, y);
        const before = layer(button, "::before");
        const after = layer(button, "::after");
        return {
          box: { width: Math.round(box.width), height: Math.round(box.height) },
          padding: side(style),
          background: style.backgroundColor,
          beforeRest: { content: before.content, opacity: before.opacity, background: before.background },
          after: { content: after.content, width: after.width, height: after.height },
          hit: target === button || (target !== null && button.contains(target)),
          hitName: target ? `${target.tagName.toLowerCase()}${target.className ? "." + String(target.className).split(" ")[0] : ""}` : "null",
        };
      };
      return {
        outsidePadding: side(outsideStyle),
        outsideBackground: outsideStyle.backgroundColor,
        decoyBefore: layer(decoy, "::before").content,
        decoyAfter: layer(decoy, "::after").content,
        leading: readButton("leading"),
        trailing: readButton("trailing"),
      };
    });

    return (["leading", "trailing"] as const).map((slot) => ({
      kind,
      viewport,
      dir,
      slot,
      ...rest[slot],
      outsidePadding: rest.outsidePadding,
      outsideBackground: rest.outsideBackground,
      beforePressed: pressed[slot],
      onSurface: centers.onSurface,
      decoyBefore: rest.decoyBefore,
      decoyAfter: rest.decoyAfter,
    }));
  };

  const rows: Row[] = [];
  for (const viewport of [800, 400] as const) {
    for (const kind of ["factory", "element"] as const) {
      rows.push(...await read(kind, viewport, "ltr"));
    }
  }
  rows.push(...await read("factory", 800, "rtl"));
  rows.push(...await read("element", 800, "rtl"));

  for (const row of rows) console.log(`MEASURE ${JSON.stringify(row)}`);

  const failures: string[] = [];
  const same = (label: string, actual: unknown, expected: unknown) => {
    if (actual !== expected) failures.push(`${label}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  };
  const sameSide = (label: string, actual: Side, expected: Side) => {
    same(`${label} top`, actual.top, expected.top);
    same(`${label} right`, actual.right, expected.right);
    same(`${label} bottom`, actual.bottom, expected.bottom);
    same(`${label} left`, actual.left, expected.left);
  };
  for (const row of rows) {
    const name = `${row.kind} ${row.dir} ${row.viewport} ${row.slot}`;
    if (!(row.box.width < 48 && row.box.height < 48)) {
      failures.push(`${name} rest box is ${row.box.width}x${row.box.height}, not under 48`);
    }
    same(`${name} rest background`, row.background, row.outsideBackground);
    if (row.kind === "factory" && row.viewport === 400) {
      sameSide(`${name} padding`, row.padding, { top: "8px", right: "8px", bottom: "8px", left: "8px" });
    } else {
      sameSide(`${name} padding`, row.padding, row.outsidePadding);
    }
    same(`${name} rest ::before opacity`, row.beforeRest.opacity, "0");
    if (row.beforeRest.content === "none") failures.push(`${name} rest ::before content is none`);
    same(`${name} pressed :active`, row.beforePressed.active, true);
    same(`${name} pressed ::before opacity`, row.beforePressed.opacity, "0.1");
    same(`${name} pressed ::before background`, row.beforePressed.background, row.onSurface);
    if (row.beforePressed.content === "none") failures.push(`${name} pressed ::before content is none`);
    same(`${name} ::after width`, row.after.width, "48px");
    same(`${name} ::after height`, row.after.height, "48px");
    if (row.after.content === "none") failures.push(`${name} ::after content is none`);
    same(`${name} hit outside the border box`, row.hit, true);
    if (!row.hit) failures.push(`${name} elementFromPoint hit ${row.hitName}`);
    same(`${name} library-classed ::before`, row.decoyBefore, "none");
    same(`${name} library-classed ::after`, row.decoyAfter, "none");
  }

  const neighbours = await page.evaluate(() => {
    const icon = (): SVGSVGElement => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "24");
      svg.setAttribute("height", "24");
      svg.setAttribute("viewBox", "0 0 24 24");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M4 4h16v16H4z");
      svg.append(path);
      return svg;
    };
    const button = (probe: string): HTMLButtonElement => {
      const element = document.createElement("button");
      element.type = "button";
      element.dataset.probe = probe;
      element.append(icon());
      return element;
    };
    const inward = (first: HTMLButtonElement, second: HTMLButtonElement): string => {
      const box = first.getBoundingClientRect();
      const other = second.getBoundingClientRect();
      const toward = other.left >= box.left ? box.right - 1 : box.left + 1;
      const hit = document.elementFromPoint(toward, box.top + box.height / 2);
      return hit === first ? "first" : hit === second ? "second" : hit ? hit.tagName.toLowerCase() : "null";
    };
    document.body.replaceChildren();
    document.documentElement.dir = "ltr";
    const api = (window as unknown as { api: { createTopAppBar: (config: { title: string }) => {
      element: HTMLElement;
      addLeadingElement: (element: HTMLElement) => void;
      addTrailingElement: (element: HTMLElement) => void;
    } } }).api;
    const bar = api.createTopAppBar({ title: "Title" });
    const factoryFirst = button("factory-first");
    const factorySecond = button("factory-second");
    bar.addLeadingElement(factoryFirst);
    bar.addLeadingElement(factorySecond);
    const factoryTrailFirst = button("factory-trail-first");
    const factoryTrailSecond = button("factory-trail-second");
    bar.addTrailingElement(factoryTrailFirst);
    bar.addTrailingElement(factoryTrailSecond);
    document.body.append(bar.element);
    const host = document.createElement("m-top-app-bar");
    const elementFirst = button("element-first");
    const elementSecond = button("element-second");
    elementFirst.slot = "leading";
    elementSecond.slot = "leading";
    const elementTrailFirst = button("element-trail-first");
    const elementTrailSecond = button("element-trail-second");
    elementTrailFirst.slot = "trailing";
    elementTrailSecond.slot = "trailing";
    host.append(elementFirst, elementSecond, elementTrailFirst, elementTrailSecond);
    document.body.append(host);
    const custom = document.createElement("div");
    custom.className = "acme-top-app-bar__leading";
    const customBare = button("custom-bare");
    const authorClass = button("author-class");
    authorClass.className = "nav-button";
    const authorIcon = button("author-icon");
    authorIcon.className = "acme-icon-button";
    const customLibrary = button("custom-library");
    customLibrary.className = "mtrl-decoy";
    custom.append(customBare, authorClass, authorIcon, customLibrary);
    document.body.append(custom);
    const small = (probe: string): HTMLButtonElement => {
      const element = button(probe);
      element.style.boxSizing = "border-box";
      element.style.width = "16px";
      element.style.height = "16px";
      element.style.padding = "0";
      element.style.minWidth = "0";
      element.style.border = "0";
      element.replaceChildren();
      return element;
    };
    const factorySmallFirst = small("factory-small-first");
    const factorySmallSecond = small("factory-small-second");
    bar.addLeadingElement(factorySmallFirst);
    bar.addLeadingElement(factorySmallSecond);
    const elementSmallFirst = small("element-small-first");
    const elementSmallSecond = small("element-small-second");
    elementSmallFirst.slot = "leading";
    elementSmallSecond.slot = "leading";
    host.append(elementSmallFirst, elementSmallSecond);
    const afterBox = (element: HTMLButtonElement) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element, "::after");
      const width = Number.parseFloat(style.width);
      const height = Number.parseFloat(style.height);
      const left = box.left + box.width / 2 - width / 2;
      const top = box.top + box.height / 2 - height / 2;
      return { left, right: left + width, top, bottom: top + height, border: Math.round(box.width) };
    };
    const share = (first: HTMLButtonElement, second: HTMLButtonElement) => {
      const one = afterBox(first);
      const two = afterBox(second);
      const overlap = Math.min(one.right, two.right) - Math.max(one.left, two.left);
      const box = first.getBoundingClientRect();
      const other = second.getBoundingClientRect();
      const mid = (box.right + other.left) / 2;
      const y = box.top + box.height / 2;
      const name = (x: number) => {
        const hit = document.elementFromPoint(x, y);
        return hit === first ? "first" : hit === second ? "second" : hit ? hit.tagName.toLowerCase() : "null";
      };
      return { overlap, border: one.border, beforeMid: name(mid - 1), afterMid: name(mid + 1) };
    };
    // Both bars are position:absolute at the top. Measure one at a time so
    // the later bar's target does not cover the earlier bar's buttons.
    host.hidden = true;
    const factoryLeading = inward(factoryFirst, factorySecond);
    const factoryTrailing = inward(factoryTrailFirst, factoryTrailSecond);
    const factorySmall = share(factorySmallFirst, factorySmallSecond);
    host.hidden = false;
    bar.element.hidden = true;
    const elementLeading = inward(elementFirst, elementSecond);
    const elementTrailing = inward(elementTrailFirst, elementTrailSecond);
    const elementSmall = share(elementSmallFirst, elementSmallSecond);
    const read = (element: HTMLButtonElement) => {
      const after = getComputedStyle(element, "::after");
      const before = getComputedStyle(element, "::before");
      return { width: after.width, opacity: before.opacity, content: before.content };
    };
    return {
      factoryLeading,
      factoryTrailing,
      elementLeading,
      elementTrailing,
      factorySmall,
      elementSmall,
      customBare: read(customBare),
      authorClass: read(authorClass),
      authorIcon: read(authorIcon),
      customLibrary: read(customLibrary),
    };
  });
  console.log(`NEIGHBOURS ${JSON.stringify(neighbours)}`);
  for (const [name, hit] of Object.entries({
    factoryLeading: neighbours.factoryLeading,
    factoryTrailing: neighbours.factoryTrailing,
    elementLeading: neighbours.elementLeading,
    elementTrailing: neighbours.elementTrailing,
  })) same(`adjacent ${name} 1px inside the first`, hit, "first");
  same("custom class prefix ::after", neighbours.customBare.width, "48px");
  same("custom class prefix rest opacity", neighbours.customBare.opacity, "0");
  if (neighbours.customBare.content === "none") failures.push("custom class prefix ::before content is none");
  same("author class nav-button ::after", neighbours.authorClass.width, "48px");
  same("author class nav-button rest opacity", neighbours.authorClass.opacity, "0");
  if (neighbours.authorClass.content === "none") failures.push("author class nav-button ::before content is none");
  same("author class acme-icon-button ::after", neighbours.authorIcon.width, "48px");
  same("author class acme-icon-button rest opacity", neighbours.authorIcon.opacity, "0");
  same("library class ::after", neighbours.customLibrary.width, "auto");
  for (const [name, small] of Object.entries({ factorySmall: neighbours.factorySmall, elementSmall: neighbours.elementSmall })) {
    same(`${name} border box`, small.border, 16);
    if (!(small.overlap <= 0)) failures.push(`${name} 48px targets overlap by ${small.overlap}px`);
    same(`${name} gap before midpoint`, small.beforeMid, "first");
    same(`${name} gap after midpoint`, small.afterMid, "second");
  }

  const sassOptions = {
    loadPaths: [resolve(repoRoot, "src/styles"), repoRoot],
    style: "compressed" as const,
    logger: sass.Logger.silent,
  };
  const baseElements = sass.compileString(
    baseElementsStyles.map((source, index) => `@use "${source}" as entry${index};`).join("\n"),
    sassOptions,
  ).css;
  const shadowCss = compile("components/top-app-bar");
  const preupgradeCss = sass.compileString(`@use "elements/top-app-bar";`, sassOptions).css;
  if (preupgradeCss.includes("::before") || preupgradeCss.includes("::after")) {
    failures.push("pre-upgrade sheet styles a pseudo-element");
  }
  try {
    assertRollbackBeats(preupgradeCss);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }
  if (baseElements.includes("m-top-app-bar>button") || baseElements.includes("::slotted(")) {
    failures.push("base-elements sheet carries the plain-button rule");
  }
  if (!shadowCss.includes("m-top-app-bar>button")) failures.push("top app bar sheet omitted the plain-button rule");
  if (!shadowCss.includes("slot[name=leading]::slotted(button:not([class*=mtrl-]))::before")) {
    failures.push("element shadow sheet omitted the slotted pressed layer");
  }
  if (!shadowCss.includes("::slotted(button:not([class*=mtrl-]):active)::before")) {
    failures.push("element shadow sheet omitted the slotted pressed opacity");
  }
  if (baseElements.includes("[class*=-button]") || shadowCss.includes("[class*=-button]")) {
    failures.push("plain-button rule still excludes an author class");
  }
  const configuredDocument = sass.compileString(`@use "config" with ($tag-prefix: "x"); @use "base/document";`, sassOptions).css;
  const configuredComponent = sass.compileString(`@use "config" with ($tag-prefix: "x"); @use "components/top-app-bar";`, sassOptions).css;
  if (configuredDocument.includes("x-top-app-bar>button") || configuredDocument.includes("m-top-app-bar>button")) {
    failures.push("configured document base emits a top app bar button rule");
  }
  if (!configuredComponent.includes("x-top-app-bar>button")) failures.push("configured component did not emit x-top-app-bar>button");
  if (configuredComponent.includes("m-top-app-bar>button")) failures.push("configured component still emits m-top-app-bar>button");
  const prefixPage = await context.newPage();
  await prefixPage.setContent(`<!DOCTYPE html><html lang="en" data-theme="baseline"><head><meta charset="utf-8"></head><body>
    <m-top-app-bar id="host">
      <button type="button" slot="leading" id="bare" class="nav-button"></button>
      <button type="button" slot="leading" id="next"></button>
      <button type="button" slot="leading" id="library" class="mtrl-decoy"></button>
    </m-top-app-bar>
    <x-top-app-bar><button type="button" slot="leading" id="custom-tag" class="nav-button"></button></x-top-app-bar>
  </body></html>`);
  await prefixPage.addStyleTag({ content: baseElements });
  const adoptShadow = (css: string) => {
    const host = document.getElementById("host")!;
    const root = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    root.adoptedStyleSheets = [sheet];
    if (!root.querySelector("slot")) {
      const slot = document.createElement("slot");
      slot.name = "leading";
      root.append(slot);
    }
  };
  await prefixPage.evaluate(adoptShadow, shadowCss);
  const readButtons = () => {
    const read = (id: string) => {
      const button = document.getElementById(id)!;
      const after = getComputedStyle(button, "::after");
      const before = getComputedStyle(button, "::before");
      const box = button.getBoundingClientRect();
      return { width: after.width, opacity: before.opacity, content: before.content, border: Math.round(box.width) };
    };
    const bare = document.getElementById("bare") as HTMLButtonElement;
    const next = document.getElementById("next") as HTMLButtonElement;
    for (const button of [bare, next]) {
      button.style.boxSizing = "border-box";
      button.style.width = "16px";
      button.style.height = "16px";
      button.style.padding = "0";
      button.style.minWidth = "0";
      button.style.border = "0";
    }
    const one = bare.getBoundingClientRect();
    const two = next.getBoundingClientRect();
    const afterOf = (element: HTMLButtonElement) => {
      const box = element.getBoundingClientRect();
      const width = Number.parseFloat(getComputedStyle(element, "::after").width);
      const left = box.left + box.width / 2 - width / 2;
      return { left, right: left + width };
    };
    const left = afterOf(bare);
    const right = afterOf(next);
    const mid = (one.right + two.left) / 2;
    const y = one.top + one.height / 2;
    const hit = (x: number) => {
      const target = document.elementFromPoint(x, y);
      return target === bare ? "first" : target === next ? "second" : target ? target.tagName.toLowerCase() : "null";
    };
    return {
      bare: read("bare"),
      library: read("library"),
      customTag: read("custom-tag"),
      overlap: Math.min(left.right, right.right) - Math.max(left.left, right.left),
      beforeMid: hit(mid - 1),
      afterMid: hit(mid + 1),
    };
  };
  const shadowOnly = await prefixPage.evaluate(readButtons);
  const bareBox = await prefixPage.locator("#bare").boundingBox();
  if (!bareBox) failures.push("slotted button has no box");
  else {
    await prefixPage.mouse.move(bareBox.x + bareBox.width / 2, bareBox.y + bareBox.height / 2);
    await prefixPage.mouse.down();
  }
  const pressed = await prefixPage.evaluate(() => {
    const button = document.getElementById("bare");
    const before = button ? getComputedStyle(button, "::before") : null;
    return { active: button?.matches(":active") ?? false, opacity: before?.opacity ?? "missing" };
  });
  await prefixPage.mouse.up();
  await prefixPage.addStyleTag({ content: configuredComponent });
  const withConfigured = await prefixPage.evaluate(readButtons);
  console.log(`BASE ${JSON.stringify({ shadowOnly, pressed, withConfigured })}`);
  same("base-elements plus shadow ::after", shadowOnly.bare.width, "48px");
  same("base-elements plus shadow rest opacity", shadowOnly.bare.opacity, "0");
  if (shadowOnly.bare.content === "none") failures.push("base-elements plus shadow ::before content is none");
  same("base-elements plus shadow author class border", shadowOnly.bare.border, 16);
  if (!(shadowOnly.overlap <= 0)) failures.push(`base-elements plus shadow 16px targets overlap by ${shadowOnly.overlap}px`);
  same("base-elements plus shadow gap before midpoint", shadowOnly.beforeMid, "first");
  same("base-elements plus shadow gap after midpoint", shadowOnly.afterMid, "second");
  same("base-elements plus shadow library ::after", shadowOnly.library.width, "auto");
  if (!pressed.active) failures.push("slotted button was not :active");
  same("base-elements plus shadow pressed opacity", pressed.opacity, "0.1");
  same("configured top app bar sheet ::after", withConfigured.customTag.width, "48px");
  same("configured top app bar sheet rest opacity", withConfigured.customTag.opacity, "0");
  await prefixPage.close();

  assert.deepEqual(errors, []);
  assert.deepEqual(failures, [], `top app bar plain button:\n  ${failures.join("\n  ")}`);
  console.log(`Passed top app bar plain buttons: ${rows.length} buttons in Chromium.`);
} finally {
  await browser.close();
}
