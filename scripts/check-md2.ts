#!/usr/bin/env bun
// scripts/check-md2.ts
//
// The MD2 look, measured in Chromium: the measures in the study's "Visual
// proof" table, in light and dark, LTR and RTL, through the factory path and
// the element path. Every measure is also taken on a page that loads the same
// fixtures without `material/styles/md2` and without the flag: there the MD2
// value must NOT hold, which is what proves the assertions read the sheet.
//
// Values and their pages (read 2026-11-22):
// - buttons: https://m2.material.io/components/buttons
// - text fields: https://m2.material.io/components/text-fields
// - cards: https://m2.material.io/components/cards
// - selection controls: https://m2.material.io/components/selection-controls
// - top app bars: https://m2.material.io/components/app-bars-top
// - colour: https://m2.material.io/design/color/the-color-system.html
// - elevation: https://m2.material.io/design/environment/elevation.html
import assert from "node:assert/strict";
import { mkdir, mkdtemp, symlink, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { build } from "vite";
import { chromium, type Browser, type Page } from "playwright";
import { createPackageFixture } from "./package-fixture";

const fixture = await createPackageFixture();
const scratch = await mkdtemp(resolve(".md2-check-"));

const FIXTURES = `
import createButton from 'material/components/button';
import createTextField from 'material/components/text-field';
import createCard from 'material/components/card';
import createSwitch from 'material/components/switch';
import createTopAppBar from 'material/components/top-app-bar';
const icon = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M4 4h16v16H4z"/></svg>';
const put = (id, element) => { element.id = id; document.body.append(element); };
put('b-filled', createButton({ text: 'Continue', variant: 'filled' }).element);
put('b-elevated', createButton({ text: 'Raised', variant: 'elevated' }).element);
put('b-outlined', createButton({ text: 'Outlined', variant: 'outlined' }).element);
put('b-text', createButton({ text: 'Text', variant: 'text' }).element);
put('b-icon', createButton({ text: 'Send', icon }).element);
put('tf-filled', createTextField({ label: 'Name', variant: 'filled' }).element);
put('tf-outlined', createTextField({ label: 'Name', variant: 'outlined' }).element);
const card = createCard({ variant: 'elevated', content: { text: 'Body copy' } });
card.element.id = 'card-elevated';

document.body.append(card.element);
const outlined = createCard({ variant: 'outlined' });
outlined.element.id = 'card-outlined';
document.body.append(outlined.element);
put('sw-off', createSwitch({ label: 'Off' }).element);
put('sw-on', createSwitch({ label: 'On', checked: true }).element);
put('bar', createTopAppBar({ title: 'Inbox' }).element);
put('bar-medium', createTopAppBar({ title: 'Prominent', type: 'medium' }).element);
import 'material/elements/css';
import { defineAll } from 'material/elements';
defineAll();
document.body.insertAdjacentHTML('beforeend',
  '<m-button id="el-button" data-style="md2">Element</m-button>');
document.documentElement.dataset.fixtures = 'ready';
`;

const WITHOUT = `import 'material/styles/base';\nimport 'material/styles/button';\nimport 'material/styles/text-field';\nimport 'material/styles/card';\nimport 'material/styles/switch';\nimport 'material/styles/top-app-bar';\nimport 'material/components/button';\n${FIXTURES}`;
const WITH = `import 'material/styles/base';\nimport 'material/styles/md2';\ndocument.documentElement.dataset.style = 'md2';\nimport 'material/styles/button';\nimport 'material/styles/text-field';\nimport 'material/styles/card';\nimport 'material/styles/switch';\nimport 'material/styles/top-app-bar';\nimport 'material/components/button';\n${FIXTURES}`;

type App = { name: string; files: Map<string, string> };
const buildApp = async (name: string, entry: string): Promise<App> => {
  const dir = join(scratch, name);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "entry.js"), entry);
  await writeFile(join(dir, "index.html"), `<!doctype html><html data-theme="baseline"><head><meta charset="utf-8">
<style>body{margin:0;padding:24px;display:flex;flex-direction:column;gap:16px;align-items:flex-start}
#bar,#bar-medium{position:static;width:100%}</style></head>
<body><script type="module" src="./entry.js"></script></body></html>`);
  const result = await build({ root: dir, base: `/${name}/`, configFile: false, envFile: false, logLevel: "error",
    build: { write: false, minify: false, modulePreload: { polyfill: false } } });
  assert(!Array.isArray(result) && "output" in result);
  const files = new Map<string, string>();
  for (const output of result.output) {
    const text = output.type === "asset" ? String(output.source) : output.code;
    files.set(`/${name}/${output.fileName}`, text);
  }
  return { name, files };
};

try {
  await mkdir(join(scratch, "node_modules"));
  await symlink(fixture.installed, join(scratch, "node_modules/material"), "dir");
  await writeFile(join(scratch, "package.json"), '{"type":"module","sideEffects":true}');
  const apps = [await buildApp("default", WITHOUT), await buildApp("md2", WITH)];
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/") return new Response("<!doctype html>", { headers: { "Content-Type": "text/html" } });
    for (const app of apps) {
      const file = app.files.get(path);
      if (file === undefined) continue;
      const type = path.endsWith(".css") ? "text/css" : path.endsWith(".html") ? "text/html" : "text/javascript";
      return new Response(file, { headers: { "Content-Type": type } });
    }
    return new Response("Not found", { status: 404 });
  } });

  const browser: Browser = await chromium.launch();
  type Load = { direction?: "ltr" | "rtl"; scheme?: "light" | "dark"; width?: number };
  const open = async (app: string, { direction = "ltr", scheme = "light", width = 1000 }: Load = {}): Promise<Page> => {
    const page = await browser.newPage({ colorScheme: scheme, viewport: { width, height: 900 } });
    await page.goto(`http://127.0.0.1:${server.port}/${app}/${"index.html"}`);
    await page.waitForFunction(() => document.documentElement.dataset.fixtures === "ready");
    if (direction === "rtl") await page.evaluate(() => { document.documentElement.dir = "rtl"; });
    await page.waitForFunction(() => document.documentElement.dir === "rtl" || document.documentElement.dir === "");
    return page;
  };
  /** One element's computed style, by camelCase property. */
  const style = (page: Page, selector: string, ...properties: string[]) => page.evaluate(([target, names]) => {
    const element = document.querySelector(target as string);
    if (!element) throw new Error(`missing ${target}`);
    const computed = getComputedStyle(element);
    return Object.fromEntries((names as string[]).map(name => [name, computed[name as never]]));
  }, [selector, properties] as const);
  const pixel = (value: string | number) => Math.round(Number.parseFloat(String(value)));

  const failures: string[] = [];
  const check = (label: string, condition: boolean, detail: unknown): void => {
    if (!condition) failures.push(`${label}: ${JSON.stringify(detail)}`);
  };
  const equal = (label: string, actual: unknown, expected: unknown): void =>
    check(label, JSON.stringify(actual) === JSON.stringify(expected), { actual, expected });

  // --- With the sheet: the MD2 measures hold, light and dark, LTR and RTL. ---
  for (const scheme of ["light", "dark"] as const) {
    const page = await open("md2", { scheme });
    const dark = scheme === "dark";
    const primary = dark ? "rgb(187, 134, 252)" : "rgb(98, 0, 238)";
    const onPrimary = dark ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)";
    const surface = dark ? "rgb(18, 18, 18)" : "rgb(255, 255, 255)";

    const filled = await style(page, "#b-filled", "height", "minWidth", "paddingLeft", "borderTopLeftRadius",
      "fontSize", "letterSpacing", "textTransform", "backgroundColor", "color");
    equal(`${scheme}/button height`, pixel(filled.height), 36);
    check(`${scheme}/button min width`, pixel(filled.minWidth) >= 64, filled.minWidth);
    equal(`${scheme}/button inset`, pixel(filled.paddingLeft), 16);
    equal(`${scheme}/button radius`, pixel(filled.borderTopLeftRadius), 4);
    equal(`${scheme}/button type`, [pixel(filled.fontSize), filled.textTransform], [14, "uppercase"]);
    check(`${scheme}/button tracking`, Math.abs(Number.parseFloat(filled.letterSpacing) - 1.25) < 0.06, filled.letterSpacing);
    equal(`${scheme}/filled roles`, [filled.backgroundColor, filled.color], [primary, onPrimary]);

    const outlined = await style(page, "#b-outlined", "color", "borderTopWidth", "borderTopColor", "backgroundColor");
    equal(`${scheme}/outlined ink`, outlined.color, primary);
    check(`${scheme}/outlined stroke`, Math.abs(Number.parseFloat(outlined.borderTopWidth) - 1) < 0.01, outlined.borderTopWidth);
    check(`${scheme}/outlined stroke a low-emphasis on-surface`, /0\.12\)/.test(outlined.borderTopColor.replace(/,\s*/g, ",")), outlined.borderTopColor);
    equal(`${scheme}/outlined container`, outlined.backgroundColor, "rgba(0, 0, 0, 0)");

    const elevated = await style(page, "#b-elevated", "boxShadow", "backgroundColor");
    equal(`${scheme}/raised roles`, elevated.backgroundColor, primary);
    check(`${scheme}/raised 2dp shadow at rest`, elevated.boxShadow.includes("0px 3px 1px -2px"), elevated.boxShadow);
    const elevatedBox = await page.evaluate(() => {
      const button = document.querySelector("#b-elevated") as HTMLElement;
      const box = button.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    await page.mouse.move(elevatedBox.x, elevatedBox.y);
    await page.mouse.down();
    // The shadow transitions (the default's spring); let it land before reading.
    await page.waitForTimeout(500);
    const pressed = await page.evaluate(() => {
      const button = document.querySelector("#b-elevated") as HTMLElement;
      const style = getComputedStyle(button);
      return { shadow: style.boxShadow, radius: style.borderTopLeftRadius };
    });
    await page.mouse.up();
    check(`${scheme}/raised 8dp while pressed`, pressed.shadow.includes("0px 5px 5px -3px"), pressed.shadow);
    equal(`${scheme}/4px corners under press`, pixel(pressed.radius), 4);

    const iconButton = await style(page, "#b-icon", "paddingLeft", "columnGap", "paddingRight");
    equal(`${scheme}/icon button is 12/8/16`, [pixel(iconButton.paddingLeft), pixel(iconButton.columnGap), pixel(iconButton.paddingRight)], [12, 8, 16]);
    const iconSize = await style(page, "#b-icon .mtrl-button__icon", "width", "height");
    check(`${scheme}/icon is 18px`, [pixel(iconSize.width), pixel(iconSize.height)].every(size => size === 18), iconSize);

    const textButton = await style(page, "#b-text", "paddingLeft", "color");
    equal(`${scheme}/text inset`, pixel(textButton.paddingLeft), 8);
    equal(`${scheme}/text ink`, textButton.color, primary);

    const tfFilled = await style(page, "#tf-filled input", "backgroundColor", "borderTopLeftRadius", "borderBottomColor", "height", "paddingLeft", "color");
    check(`${scheme}/filled field 4% on-surface`, /0\.04\)/.test(tfFilled.backgroundColor.replace(/,\s*/g, ",")), tfFilled.backgroundColor);
    equal(`${scheme}/filled corners`, pixel(tfFilled.borderTopLeftRadius), 4);
    equal(`${scheme}/field height`, pixel(tfFilled.height), 56);
    equal(`${scheme}/field inset`, pixel(tfFilled.paddingLeft), 16);
    check(`${scheme}/input ink 87%`, /0\.87\)/.test(tfFilled.color.replace(/,\s*/g, ",")), tfFilled.color);
    check(`${scheme}/filled line 42%`, /0\.42\)/.test(tfFilled.borderBottomColor.replace(/,\s*/g, ",")), tfFilled.borderBottomColor);
    const tfOutlined = await style(page, "#tf-outlined .mtrl-text-field__outline-trailing", "borderTopColor", "borderTopWidth", "borderTopRightRadius");
    check(`${scheme}/outlined stroke 38%`, /0\.38\)/.test(tfOutlined.borderTopColor.replace(/,\s*/g, ",")), tfOutlined.borderTopColor);
    equal(`${scheme}/outlined stroke`, pixel(tfOutlined.borderTopWidth), 1);
    equal(`${scheme}/outlined corners`, pixel(tfOutlined.borderTopRightRadius), 4);

    const elevatedCard = await style(page, "#card-elevated", "borderTopLeftRadius", "backgroundColor", "boxShadow");
    equal(`${scheme}/card radius`, pixel(elevatedCard.borderTopLeftRadius), 4);
    equal(`${scheme}/card surface`, elevatedCard.backgroundColor, surface);
    equal(`${scheme}/card flat at rest on a fine pointer`, elevatedCard.boxShadow, "none");
    await page.hover("#card-elevated");
    await page.waitForTimeout(500);
    const hoveredCard = await style(page, "#card-elevated", "boxShadow");
    check(`${scheme}/card lifts to 4dp on hover`, hoveredCard.boxShadow.includes("0px 2px 4px -1px"), hoveredCard.boxShadow);
    const outlinedCard = await style(page, "#card-outlined", "borderTopWidth", "boxShadow");
    equal(`${scheme}/outlined card stroke`, pixel(outlinedCard.borderTopWidth), 1);
    equal(`${scheme}/outlined card flat`, outlinedCard.boxShadow, "none");
    const content = await style(page, "#card-elevated .mtrl-card__content", "paddingTop", "paddingLeft");
    equal(`${scheme}/card content inset`, [pixel(content.paddingTop), pixel(content.paddingLeft)], [16, 16]);

    const track = await style(page, "#sw-off .mtrl-switch__track", "width", "height", "borderTopWidth", "backgroundColor", "borderTopLeftRadius");
    check(`${scheme}/switch track 36x14`, [pixel(track.width), pixel(track.height)].join("x") === "36x14", track);
    equal(`${scheme}/switch track borderless`, pixel(track.borderTopWidth), 0);
    check(`${scheme}/switch off track neutral`, /0\.38\)/.test(track.backgroundColor.replace(/,\s*/g, ",")), track.backgroundColor);
    equal(`${scheme}/switch track pill`, pixel(track.borderTopLeftRadius), 7);
    const thumb = await style(page, "#sw-off .mtrl-switch__thumb", "width", "height", "boxShadow", "backgroundColor");
    check(`${scheme}/switch thumb 20px`, [pixel(thumb.width), pixel(thumb.height)].every(size => size === 20), thumb);
    check(`${scheme}/switch thumb raised`, thumb.boxShadow.includes("0px 2px 1px -1px"), thumb.boxShadow);
    equal(`${scheme}/switch off thumb surface`, thumb.backgroundColor, surface);
    const onTrack = await style(page, "#sw-on .mtrl-switch__track", "backgroundColor");
    equal(`${scheme}/switch on track primary`, onTrack.backgroundColor, primary);
    const onThumb = await style(page, "#sw-on .mtrl-switch__thumb", "backgroundColor");
    equal(`${scheme}/switch on thumb on-primary`, onThumb.backgroundColor, onPrimary);
    const glyph = await style(page, "#sw-on .mtrl-switch__thumb-icon", "display");
    equal(`${scheme}/switch glyphs suppressed`, glyph.display, "none");

    const bar = await style(page, "#bar", "height", "backgroundColor", "color", "paddingLeft", "paddingRight");
    equal(`${scheme}/bar height at desktop`, pixel(bar.height), 64);
    equal(`${scheme}/bar roles`, [bar.backgroundColor, bar.color], [primary, onPrimary]);
    equal(`${scheme}/bar insets`, [pixel(bar.paddingLeft), pixel(bar.paddingRight)], [16, 16]);
    const headline = await style(page, "#bar .mtrl-top-app-bar__headline", "fontSize", "lineHeight", "letterSpacing", "fontWeight");
    equal(`${scheme}/bar title`, [pixel(headline.fontSize), pixel(headline.lineHeight), pixel(headline.fontWeight)], [20, 32, 500]);
    check(`${scheme}/bar title tracking`, Math.abs(Number.parseFloat(headline.letterSpacing) - 0.25) < 0.06, headline.letterSpacing);
    const prominent = await style(page, "#bar-medium", "height");
    equal(`${scheme}/prominent bar 128`, pixel(prominent.height), 128);
    await page.evaluate(() => document.querySelector("#bar")!.classList.add("mtrl-top-app-bar--scrolled"));
    await page.waitForTimeout(500);
    const scrolled = await style(page, "#bar", "boxShadow");
    check(`${scheme}/scrolled 4dp shadow`, scrolled.boxShadow.includes("0px 2px 4px -1px"), scrolled.boxShadow);

    await page.close();
  }

  // Narrow width: the regular bar is 56.
  const narrow = await open("md2", { width: 500 });
  const narrowBar = await style(narrow, "#bar", "height");
  equal("narrow/bar height 56", pixel(narrowBar.height), 56);
  await narrow.close();

  // RTL: the insets mirror.
  const rtl = await open("md2", { direction: "rtl" });
  const rtlFilled = await style(rtl, "#b-filled", "paddingRight", "paddingLeft");
  equal("rtl/button insets mirror", [pixel(rtlFilled.paddingRight), pixel(rtlFilled.paddingLeft)], [16, 16]);
  const rtlIcon = await style(rtl, "#b-icon", "paddingRight");
  equal("rtl/icon button inset on the start edge", pixel(rtlIcon.paddingRight), 12);
  await rtl.close();

  // The element path: the same sheet adopted into the opted-in host's shadow.
  const elements = await open("md2");
  const elementButton = await elements.evaluate(() => {
    const host = document.querySelector("#el-button") as HTMLElement;
    const inner = host.shadowRoot?.querySelector("button");
    if (!inner) return null;
    const style = getComputedStyle(inner);
    return {
      height: style.height, radius: style.borderTopLeftRadius,
      adopted: host.shadowRoot!.adoptedStyleSheets.length > 0
        || host.shadowRoot!.querySelector("style[data-md2]") !== null,
    };
  });
  check("elements/host adopts the md2 sheet", elementButton !== null && elementButton.adopted, elementButton);
  equal("elements/button height", pixel(elementButton!.height), 36);
  equal("elements/button radius", pixel(elementButton!.radius), 4);
  await elements.close();

  // --- Without the sheet: none of those measures holds, so the check reads it. ---
  const control = await open("default");
  const controlButton = await style(control, "#b-filled", "height", "borderTopLeftRadius", "textTransform");
  check("default/button is not MD2", pixel(controlButton.height) !== 36 || pixel(controlButton.borderTopLeftRadius) !== 4
    || controlButton.textTransform !== "uppercase", controlButton);
  const controlTrack = await style(control, "#sw-off .mtrl-switch__track", "width", "height");
  check("default/switch is not MD2", [pixel(controlTrack.width), pixel(controlTrack.height)].join("x") !== "36x14", controlTrack);
  const controlBar = await style(control, "#bar", "backgroundColor");
  check("default/bar is not MD2", controlBar.backgroundColor !== "rgb(98, 0, 238)", controlBar);
  const controlElement = await control.evaluate(() => {
    const host = document.querySelector("#el-button") as HTMLElement;
    const inner = host.shadowRoot?.querySelector("button");
    return inner ? { height: getComputedStyle(inner).height } : null;
  });
  check("default/element is not MD2", controlElement !== null && pixel(controlElement.height) !== 36, controlElement);
  await control.close();

  await browser.close();
  server.stop(true);

  if (failures.length > 0) {
    console.error(`md2: ${failures.length} failure(s):\n${failures.map(line => `- ${line}`).join("\n")}`);
    process.exit(1);
  }
  console.log("md2: button, text field, card, switch and top app bar match the MD2 measures in light and dark, LTR and RTL, through the factory and the element; without the sheet none of them holds.");
} finally {
  await rm(scratch, { recursive: true, force: true });
  fixture.cleanup();
}
