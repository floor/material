#!/usr/bin/env bun
// Runtime colour in a real browser: an image becomes a scheme, and the scheme
// colours one section of the page and only that section.
//
// m3.material.io > Styles > Color > Dynamic color: an image is quantized, one
// colour is chosen as the source, and tones are assigned to each colour role;
// the scheme "can be applied within a specified area of an app, such as a set
// of components or a particular screen". This check is that sentence: a
// section carries the scheme, the components inside it repaint from the new
// tokens, and the components outside it keep the page's own colours.
//
//   bun run scripts/check-theme-runtime.ts

import assert from "node:assert/strict";
import { chromium } from "playwright";

const bundle = await Bun.build({
  entrypoints: ["scripts/fixtures/theme-runtime.ts"],
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
    if (path === "/theme-runtime.js")
      return new Response(js, { headers: { "Content-Type": "text/javascript" } });
    if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"));
    return new Response(
      `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/styles.css">
<style>body{margin:0;font-family:sans-serif}main{display:flex;gap:32px;padding:16px}section{padding:16px}</style>
</head><body><main>
<section id="outside"><button id="outside-filled" class="mtrl-button mtrl-button--filled">Outside</button>
<button id="outside-text" class="mtrl-button mtrl-button--text">Outside text</button></section>
<section id="scoped"><button id="inside-filled" class="mtrl-button mtrl-button--filled">Inside</button>
<button id="inside-text" class="mtrl-button mtrl-button--text">Inside text</button></section>
</main><script type="module" src="/theme-runtime.js"></script></body></html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  },
});

const browser = await chromium.launch({ headless: true });
let checks = 0;

try {
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => !!(window as unknown as { themeRuntime?: unknown }).themeRuntime);

  const measured = await page.evaluate(async () => {
    type Runtime = {
      createScheme: (seed: unknown, options?: unknown) => unknown;
      createSchemeByName: (seed: string, options?: unknown) => unknown;
      applyScheme: (scheme: unknown, target: Element, options?: unknown) => void;
      sourceColorFromImage: (image: HTMLImageElement) => Promise<{ toInt(): number }>;
    };
    const runtime = (window as unknown as { themeRuntime: Runtime }).themeRuntime;
    const scoped = document.getElementById("scoped")!;
    const root = document.documentElement;

    // The image: one solid colour, drawn on a canvas and decoded back as an
    // image, so the source really comes from its pixels. A solid image pins the
    // quantizer's answer; a photograph would give its dominant colour here.
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#4285f4";
    context.fillRect(0, 0, 40, 40);
    const image = new Image();
    image.src = canvas.toDataURL("image/png");
    await image.decode();
    const seed = await runtime.sourceColorFromImage(image);
    const argb = seed.toInt();
    const hex = "#" + (argb & 0xffffff).toString(16).padStart(6, "0");

    // The same seed through the hex entry, as the expected scheme.
    const fromImage = runtime.createScheme(seed);
    const fromHex = runtime.createSchemeByName(hex);
    const expectedTarget = document.createElement("div");
    runtime.applyScheme(fromHex, expectedTarget);
    const expected: Record<string, string> = {};
    const declared = expectedTarget.style;
    for (let index = 0; index < declared.length; index += 1) {
      const property = declared[index];
      if (property.startsWith("--mtrl-sys-color-")) expected[property] = declared.getPropertyValue(property);
    }

    const rgb = (value: string): string => {
      const probe = document.createElement("div");
      probe.style.color = value;
      document.body.append(probe);
      const computed = getComputedStyle(probe).color;
      probe.remove();
      return computed;
    };
    const read = (element: Element): Record<string, string> => {
      const style = getComputedStyle(element);
      const roles: Record<string, string> = {};
      for (let index = 0; index < style.length; index += 1) {
        const property = style[index];
        if (property.startsWith("--mtrl-sys-color-")) roles[property] = style.getPropertyValue(property).trim();
      }
      return roles;
    };

    const before = {
      rootPrimary: getComputedStyle(root).getPropertyValue("--mtrl-sys-color-primary").trim(),
      outsideFilled: getComputedStyle(document.getElementById("outside-filled")!).backgroundColor,
      outsideText: getComputedStyle(document.getElementById("outside-text")!).color,
    };

    runtime.applyScheme(fromImage, scoped);

    const after = {
      rootPrimary: getComputedStyle(root).getPropertyValue("--mtrl-sys-color-primary").trim(),
      outsideFilled: getComputedStyle(document.getElementById("outside-filled")!).backgroundColor,
      outsideText: getComputedStyle(document.getElementById("outside-text")!).color,
      insideFilled: getComputedStyle(document.getElementById("inside-filled")!).backgroundColor,
      insideText: getComputedStyle(document.getElementById("inside-text")!).color,
    };

    return {
      imageColours: ["#4285f4"],
      seed: hex,
      insideRoles: read(scoped),
      outsideRoles: read(document.getElementById("outside")!),
      expected,
      before,
      after,
      expectedFilled: rgb(expected["--mtrl-sys-color-primary"]),
      expectedText: rgb(expected["--mtrl-sys-color-primary"]),
      rootFilled: rgb(before.rootPrimary),
      rootText: rgb(before.rootPrimary),
    };
  });

  console.log(`image ${JSON.stringify(measured.imageColours)} -> source ${measured.seed}`);
  console.log(
    `root primary ${measured.before.rootPrimary}, section primary ${measured.insideRoles["--mtrl-sys-color-primary"]}, ` +
      `${Object.keys(measured.expected).length} scheme roles on the section, ${Object.keys(measured.insideRoles).length} colour tokens readable inside`
  );
  console.log(
    `filled: inside ${measured.after.insideFilled} outside ${measured.after.outsideFilled}; ` +
      `text: inside ${measured.after.insideText} outside ${measured.after.outsideText}`
  );

  // The source colour comes from the image's own pixels.
  assert.ok(
    measured.imageColours.includes(measured.seed),
    `the source ${measured.seed} must be the image's colour, ${JSON.stringify(measured.imageColours)}`
  );
  checks++;

  // The scheme the image produced is the scheme the hex seed produces, and
  // every role of it reached the section.
  const missing = Object.entries(measured.expected).filter(([property, value]) => measured.insideRoles[property] !== value);
  assert.deepEqual(missing, [], `roles the section did not carry from the image-derived scheme`);
  assert.equal(Object.keys(measured.expected).length, 34, `the scheme writes 34 roles, wrote ${Object.keys(measured.expected).length}`);
  checks += 2;
  assert.notEqual(
    measured.insideRoles["--mtrl-sys-color-primary"],
    measured.before.rootPrimary,
    "the section's primary differs from the page's own"
  );
  checks++;

  // The components inside the section draw the new colour; the ones outside
  // did not move.
  assert.equal(measured.after.insideFilled, measured.expectedFilled, "the filled button inside draws the section's primary");
  assert.equal(measured.after.insideText, measured.expectedText, "the text button inside draws the section's primary");
  assert.equal(measured.after.outsideFilled, measured.rootFilled, "the filled button outside keeps the page's primary");
  assert.equal(measured.after.outsideText, measured.rootText, "the text button outside keeps the page's primary");
  checks += 4;

  // The page itself did not change: the root token and the outside section are
  // as they were before applyScheme ran.
  assert.equal(measured.after.rootPrimary, measured.before.rootPrimary, "the document root keeps its own primary");
  assert.equal(measured.after.outsideFilled, measured.before.outsideFilled, "the outside filled button did not repaint");
  assert.equal(measured.after.outsideText, measured.before.outsideText, "the outside text button did not repaint");
  assert.equal(
    measured.outsideRoles["--mtrl-sys-color-primary"],
    measured.before.rootPrimary,
    "the section outside still reads the page's primary"
  );
  checks += 4;

  assert.deepEqual(errors, [], `page errors: ${errors.join(", ")}`);
  console.log(
    `Passed ${checks} runtime-colour checks: an image's source colour, its scheme on one section's 34 roles, ` +
      `the components inside repainted and the ones outside unchanged.`
  );
} finally {
  await browser.close();
  server.stop();
}
