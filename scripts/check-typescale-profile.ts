// Packed public profile, styled browser checks and complete consumer closures.
// Called by check-typescale-consumers after its three-path behavioral measure.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, symlink, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { gzipSync, brotliCompressSync, constants } from "node:zlib";
import { build } from "vite";
import * as sass from "sass";
import { chromium, type Page } from "playwright";
import { createPackageFixture } from "./package-fixture";
import { PACKAGE_GZIP } from "./budgets";

const fixture = await createPackageFixture();
const scratch = await mkdtemp(resolve(".typescale-packed-"));
const report: Record<string, unknown> = { package: { size: fixture.pack.size, unpackedSize: fixture.pack.unpackedSize, entryCount: fixture.pack.entryCount }, bun: Bun.version };
const outcomes: string[] = [];
const record = (text: string) => { outcomes.push(text); console.log(`typescale: ${text}`); };
const browser = await chromium.launch();
const output = new Map<string, { files: Map<string, string>; html: string }>();
const family = ["button", "text-field", "badge", "button-group", "card", "tabs"];
const js = `
import createButton from 'material/components/button';
import createTextField from 'material/components/text-field';
import createBadge from 'material/components/badge';
import {defineButton,defineTextField,defineBadge,defineButtonGroup} from 'material/elements';
import {preupgradeStyles} from 'PROFILE_PREUPGRADE';
const scope=document.createElement('div');scope.id='scope';document.body.append(scope);
const button=createButton({text:'Factory'});button.element.id='factory';scope.append(button.element);
const field=createTextField({label:'Name',value:'Ada',supportingText:'Support'});field.element.id='field';scope.append(field.element);
const badge=createBadge({label:'5'});badge.element.id='badge';scope.append(badge.element);
scope.insertAdjacentHTML('beforeend','<m-button>Element</m-button><m-text-field label="Name" value="Ada" supporting-text="Support"></m-text-field><m-badge label="5"></m-badge>');
Object.assign(window,{profile:{button,field,badge,defineButton,defineTextField,defineBadge,defineButtonGroup,preupgradeStyles}});
document.documentElement.dataset.ready='true';
`;
type API = { button: { setSize(size: string): void }; badge: { setVariant(variant: string): void }; defineButton(options?: { prefix: string }): void; defineButtonGroup(options?: { prefix: string }): void; defineTextField(): void; defineBadge(): void; preupgradeStyles(prefix?: string): string };
type ProfileWindow = Window & { profile: API };
const metrics = (bytes: Uint8Array) => ({ raw: bytes.length, gzip: gzipSync(bytes, { level: 9 }).length,
  brotli: brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length });
const sizeOf = (page: Page, selector: string) => page.locator(selector).evaluate(async el => {
  // Badge styles transition all properties. Flush the changed value and sample
  // after finite transitions, rather than reading their previous endpoint.
  void getComputedStyle(el).fontSize;
  await Promise.all(el.getAnimations().filter(animation => animation.effect?.getComputedTiming().endTime !== Infinity)
    .map(animation => animation.finished.catch(() => {})));
  return getComputedStyle(el).fontSize;
});
try {
  await mkdir(join(scratch, "node_modules"));
  await symlink(fixture.installed, join(scratch, "node_modules/material"), "dir");
  await writeFile(join(scratch, "package.json"), '{"type":"module","sideEffects":true}');
  const sizes: Record<string, unknown> = {};
  for (const selected of [false, true]) {
    const name = selected ? "selected" : "default";
    const dir = join(scratch, name);
    await mkdir(dir);
    const prefix = selected ? "typescale/" : "";
    const preupgrade = `material/elements/${prefix}preupgrade`;
    let entry = `import 'material/styles/base';\n` + family.map(component => `import 'material/styles/${prefix}${component}';`).join("\n");
    entry += "\n" + family.map(component => `import 'material/elements/css/${prefix}${component}';`).join("\n");
    entry += `\nimport '${preupgrade}.css';\n` + js.replace("PROFILE_PREUPGRADE", preupgrade);
    await writeFile(join(dir, "entry.js"), entry);
    await writeFile(join(dir, "index.html"), '<!doctype html><html data-theme="baseline"><head><style>:root{--mtrl-sys-typescale-label-large-font-size:19px}</style></head><body><script type="module" src="./entry.js"></script></body></html>');
    const result = await build({ root: dir, base: `/${name}/`, configFile: false, envFile: false, logLevel: "error", build: {
      outDir: join(dir, "out"), minify: true, cssMinify: true, modulePreload: { polyfill: false },
    } });
    assert(!Array.isArray(result) && "output" in result);
    const chunks = result.output.filter(item => item.type === "chunk");
    const htmlAsset = result.output.find(item => item.fileName === "index.html");
    assert(htmlAsset?.type === "asset");
    const html = String(htmlAsset.source);
    const initial = new Set<string>();
    for (const match of html.matchAll(/(?:src|href)="\/(?:default|selected)\/([^"?#]+)"/g)) initial.add(match[1]);
    const visit = (file: string): void => {
      const chunk = chunks.find(chunk => chunk.fileName === file);
      for (const imported of chunk?.imports ?? []) if (!initial.has(imported)) { initial.add(imported); visit(imported); }
    };
    for (const file of [...initial]) visit(file);
    const files = new Map<string, string>();
    const assets = [];
    for (const item of result.output) {
      const text = item.type === "chunk" ? item.code : typeof item.source === "string" ? item.source : Buffer.from(item.source).toString();
      files.set(item.fileName, text);
      if (/\.(js|css)$/.test(item.fileName)) assets.push({ file: item.fileName, initial: initial.has(item.fileName), ...metrics(Buffer.from(text)) });
    }
    assert(assets.some(asset => asset.initial && asset.file.endsWith(".js")), "initial JS closure empty");
    assert(assets.some(asset => asset.initial && asset.file.endsWith(".css")), "initial CSS closure empty");
    sizes[name] = { initial: assets.filter(asset => asset.initial).reduce((sum, asset) => sum + asset.gzip, 0),
      full: assets.reduce((sum, asset) => sum + asset.gzip, 0), assets };
    output.set(name, { files, html });
  }
  report.sizes = sizes;
  const direct: Record<string, unknown> = {};
  for (const selected of [false, true]) {
    const prefix = selected ? "typescale/" : "";
    const paths = family.flatMap(name => [`styles/${prefix}${name}.css`, `elements/css/${prefix}${name}.css`]);
    paths.push(`elements/${prefix}preupgrade.css`);
    direct[selected ? "selected" : "default"] = Object.fromEntries(await Promise.all(paths.map(async path =>
      [path, metrics(new Uint8Array(await Bun.file(join(fixture.installed, "dist", path)).arrayBuffer()))])));
  }
  report.direct = direct;
  console.log(JSON.stringify({ package: report.package, sizes }));
  // Same packed public-root import and Bun ruler as the package gate, kept
  // observable here even when optional package growth blocks that job early.
  const allEntry = join(scratch, "all-js.ts");
  await writeFile(allEntry, "export * from 'material';\n");
  const allBuild = await Bun.build({ entrypoints: [allEntry], format: "esm", target: "browser", minify: true });
  assert(allBuild.success, String(allBuild.logs));
  const allOutput = allBuild.outputs.filter(output => output.path.endsWith(".js"));
  assert.equal(allOutput.length, 1);
  const allJs = metrics(new Uint8Array(await allOutput[0].arrayBuffer()));
  report.allJs = allJs;
  console.log(`packed all-js: ${allJs.gzip} gzip / cap ${PACKAGE_GZIP["all-js"]}`);
  assert(allJs.gzip <= PACKAGE_GZIP["all-js"], "default packed root exceeds its existing ceiling");

  // Both probe compilations use the packed Sass sources. No role literals are
  // duplicated in this harness; comparison is against the existing emitter.
  const probes = (selected: boolean) => sass.compileString(
    `@use "material/src/styles/config" with ($typography-tokens: ${selected});\n` +
    '@use "material/src/styles/abstract/variables" as v; @use "material/src/styles/abstract/mixins" as m;' +
    `@each $role, $spec in v.$typescale { .${selected ? "selected" : "plain"}-probe-#{$role} { @include m.typography($role); } }`,
    { loadPaths: [join(scratch, "node_modules")], style: "compressed", logger: sass.Logger.silent },
  ).css;
  const plain = probes(false), selected = probes(true);
  const roles = [...plain.matchAll(/\.plain-probe-([\w-]+)\{/g)].map(match => match[1]);
  const { renderElement } = await import(pathToFileURL(join(fixture.installed, "dist/ssr/index.js")).href) as typeof import("../src/ssr");
  const ssr = renderElement("m-button", { id: "ssr-button" }, "SSR", { styles: "link", cssBase: "/element-css" });
  const linkedAssets: Record<string, unknown> = {};
  const linkedPaths = [...new Set([...ssr.matchAll(/href="\/element-css\/([^"?#]+)"/g)].map(match => match[1]))];
  assert.equal(linkedPaths.length, 4, "SSR button must retain its host, ripple and component dependency sheets");
  for (const selected of [false, true]) {
    const prefix = selected ? "typescale/" : "";
    linkedAssets[selected ? "selected" : "default"] = Object.fromEntries(await Promise.all(linkedPaths.map(async path =>
      [path, metrics(new Uint8Array(await Bun.file(join(fixture.installed, `dist/elements/css/${prefix}`, path)).arrayBuffer()))])));
  }
  report.ssr = { defaultInline: metrics(Buffer.from(renderElement("m-button", {}, "SSR"))),
    linkedHtml: metrics(Buffer.from(ssr)), linked: ssr, external: linkedAssets };
  const server = Bun.serve({ hostname: "127.0.0.1", port: 0, async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/element-css/")) {
      const name = path.slice("/element-css/".length);
      if (name.includes("..")) return new Response("bad path", { status: 400 });
      return new Response(Bun.file(join(fixture.installed, "dist/elements/css/typescale", name)), { headers: { "Content-Type": "text/css" } });
    }
    const [, profile, ...parts] = path.split("/");
    const result = output.get(profile);
    if (!result) return new Response("missing", { status: 404 });
    const file = parts.join("/") || "index.html";
    let text = result.files.get(file);
    if (file === "ssr.html") text = result.html.replace("<body>", `<body>${ssr}`);
    return new Response(text ?? "missing", { status: text ? 200 : 404, headers: { "Content-Type": file.endsWith(".js") ? "text/javascript" : file.endsWith(".css") ? "text/css" : "text/html" } });
  } });
  try {
    // Default public modules retain literal consumption under the same token.
    const control = await browser.newPage();
    await control.goto(`${server.url}default/`);
    await control.waitForFunction(() => document.documentElement.dataset.ready === "true");
    assert.equal(await sizeOf(control, "#factory"), "14px");
    await control.evaluate(() => (window as unknown as ProfileWindow).profile.defineButton());
    assert.equal(await sizeOf(control, "m-button button"), "14px");
    await control.close();
    record("default packed consumers remain literal under a role override");

    for (const fallback of [false, true]) {
      const page = await browser.newPage();
      page.setDefaultTimeout(5_000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      if (fallback) await page.addInitScript(() => { Reflect.deleteProperty(ShadowRoot.prototype, "adoptedStyleSheets"); });
      await page.goto(`${server.url}selected/`);
      await page.waitForFunction(() => document.documentElement.dataset.ready === "true");
      assert.equal(await sizeOf(page, "#factory"), "19px");
      assert.equal(await sizeOf(page, "m-button"), "19px");
      const before = await page.locator("m-button").boundingBox();
      await page.evaluate(() => { const p = (window as unknown as ProfileWindow).profile; p.defineButton(); p.defineTextField(); p.defineBadge(); });
      assert.equal(await sizeOf(page, "m-button button"), "19px");
      const after = await page.locator("m-button").boundingBox();
      assert.equal(after?.height, before?.height, "profile changed height at upgrade");
      assert(Math.abs((after?.width ?? 0) - (before?.width ?? 0)) < 1, "profile changed width at upgrade");
      // Scope and live inheritance, without rebuilding the controls.
      await page.locator("#scope").evaluate(el => (el as HTMLElement).style.setProperty("--mtrl-sys-typescale-label-large-font-size", "23px"));
      assert.equal(await sizeOf(page, "#factory"), "23px");
      assert.equal(await sizeOf(page, "m-button button"), "23px");
      await page.locator("m-button").evaluate(el => (el as HTMLElement).style.setProperty("--mtrl-sys-typescale-label-large-font-size", "25px"));
      assert.equal(await sizeOf(page, "m-button button"), "25px");
      assert.equal(await sizeOf(page, "#factory"), "23px");
      await page.locator("m-button").evaluate(el => (el as HTMLElement).style.removeProperty("--mtrl-sys-typescale-label-large-font-size"));
      for (const [size, role, value] of [["m", "title-medium", "27px"], ["l", "headline-small", "31px"], ["xl", "headline-large", "37px"]]) {
        await page.evaluate(({ size, role, value }) => {
          document.documentElement.style.setProperty(`--mtrl-sys-typescale-${role}-font-size`, value);
          (window as unknown as ProfileWindow).profile.button.setSize(size);
          document.querySelector("m-button")!.setAttribute("size", size);
        }, { size, role, value });
        assert.equal(await sizeOf(page, "#factory"), value);
        assert.equal(await sizeOf(page, "m-button button"), value);
      }
      await page.evaluate(() => {
        document.documentElement.style.setProperty("--mtrl-sys-typescale-body-large-font-size", "21px");
        document.documentElement.style.setProperty("--mtrl-sys-typescale-body-small-font-size", "13px");
        document.documentElement.style.setProperty("--mtrl-sys-typescale-label-small-font-size", "13px");
      });
      assert.equal(await sizeOf(page, "#field input"), "21px");
      assert.equal(await sizeOf(page, "m-text-field input"), "21px");
      assert.equal(await sizeOf(page, "#field .mtrl-text-field__helper"), "13px");
      assert.equal(await sizeOf(page, "m-text-field .mtrl-text-field__helper"), "13px");
      assert.equal(await sizeOf(page, "#badge"), "13px");
      assert.equal(await sizeOf(page, "m-badge .mtrl-badge"), "13px");
      await page.evaluate(() => { (window as unknown as ProfileWindow).profile.badge.setVariant("small"); document.querySelector("m-badge")!.setAttribute("variant", "small"); });
      assert.equal(await sizeOf(page, "#badge"), "0px");
      assert.equal(await sizeOf(page, "m-badge .mtrl-badge"), "0px");
      const groups = [];
      for (const [size, role, fontSize, spacing, weight, font] of [
        ["m", "title-medium", "27px", "1px", "630", "monospace"],
        ["l", "headline-small", "31px", "2px", "650", "monospace"],
        ["xl", "headline-large", "37px", "3px", "670", "monospace"],
      ]) {
        const group = await page.evaluate(async ({ size, role, spacing, weight }) => {
          const prefix = `tg-${size}`;
          const style = document.createElement("style");
          style.textContent = (window as unknown as ProfileWindow).profile.preupgradeStyles(prefix);
          document.head.append(style);
          const group = document.createElement(`${prefix}-button-group`);
          group.setAttribute("size", size);
          // The group API parses item children into owned buttons on upgrade.
          const child = document.createElement(`${prefix}-button-group-item`);
          child.textContent = "Group";
          group.append(child);
          group.style.setProperty(`--mtrl-sys-typescale-${role}-letter-spacing`, spacing);
          group.style.setProperty(`--mtrl-sys-typescale-${role}-font-weight`, weight);
          group.style.setProperty("--mtrl-ref-typeface-brand", "monospace");
          group.style.setProperty("--mtrl-ref-typeface-plain", "serif");
          document.body.append(group);
          const values = (el: Element) => { const s = getComputedStyle(el); return { size: s.fontSize, spacing: s.letterSpacing, weight: s.fontWeight, font: s.fontFamily }; };
          const before = values(child);
          (window as unknown as ProfileWindow).profile.defineButtonGroup({ prefix });
          const button = group.shadowRoot!.querySelector("button")!;
          void getComputedStyle(button).fontSize;
          await Promise.all(button.getAnimations().filter(a => a.effect?.getComputedTiming().endTime !== Infinity).map(a => a.finished.catch(() => {})));
          const result = { size, before, after: values(button) };
          group.remove();
          return result;
        }, { size, role, spacing, weight });
        groups.push(group);
        assert.deepEqual(group.before, group.after, `button-group ${size} role typography must agree before and after upgrade`);
        assert.deepEqual(group.after, { size: fontSize, spacing, weight, font });
      }
      report.groups = groups;
      const custom = await page.evaluate(() => {
        const style = document.createElement("style"); style.textContent = (window as unknown as ProfileWindow).profile.preupgradeStyles("x"); document.head.append(style);
        const host = document.createElement("x-button"); host.textContent = "Custom"; host.setAttribute("size", "m"); document.body.append(host);
        return getComputedStyle(host).fontSize;
      });
      assert.equal(custom, "27px");
      await page.evaluate(() => (window as unknown as ProfileWindow).profile.defineButton({ prefix: "x" }));
      assert.equal(await sizeOf(page, "x-button button"), "27px");
      assert.deepEqual(errors, []);
      record(`${fallback ? "style fallback" : "adopted sheets"}: scopes, live roles, size roles, text field, badge/dot and custom-prefix upgrade`);
      await page.close();
    }

    // Role matrix on a clean page: fallback, then each property independently.
    const page = await browser.newPage();
    await page.setContent("<!doctype html><html><body></body></html>");
    await page.addStyleTag({ content: plain + selected });
    const roleMatrix = await page.evaluate(({ roles }) => {
      const props = { font: ["fontFamily", "monospace"], "font-size": ["fontSize", "21px"], "line-height": ["lineHeight", "29px"], "letter-spacing": ["letterSpacing", "0px"], "font-weight": ["fontWeight", "650"] } as const;
      const results = [];
      for (const role of roles) {
        const plain = document.createElement("span"), selected = document.createElement("span");
        plain.className = `plain-probe-${role}`; selected.className = `selected-probe-${role}`; document.body.append(plain, selected);
        const get = (el: Element) => { const s = getComputedStyle(el); return Object.values(props).map(([key]) => s[key]); };
        const original = get(plain), fallback = get(selected);
        const overrides = [];
        for (const [token, [property, value]] of Object.entries(props)) {
          selected.style.setProperty(`--mtrl-sys-typescale-${role}-${token}`, value);
          const computed = getComputedStyle(selected)[property];
          overrides.push({ token, expected: value, actual: token === "letter-spacing" && computed === "normal" ? "0px" : computed });
          selected.style.removeProperty(`--mtrl-sys-typescale-${role}-${token}`);
        }
        selected.style.setProperty("--mtrl-ref-typeface-brand", "serif"); selected.style.setProperty("--mtrl-ref-typeface-plain", "serif");
        const face = getComputedStyle(selected).fontFamily;
        results.push({ role, original, fallback, overrides, face });
      }
      return results;
    }, { roles });
    for (const row of roleMatrix) {
      assert.deepEqual(row.fallback, row.original, `${row.role}: fallback differs`);
      for (const property of row.overrides) assert.equal(property.actual, property.expected, `${row.role}/${property.token}`);
      assert.equal(row.face, "serif", `${row.role}: reference face fallback lost`);
    }
    report.roles = roleMatrix;
    record(`${roles.length} roles: five fallback values, five independent overrides and reference-face fallback`);
    const inheritance = await page.evaluate(() => {
      const parent = document.createElement("div"), child = document.createElement("span");
      parent.style.cssText = "--mtrl-ref-typeface-brand:monospace;--mtrl-sys-typescale-title-large-font:var(--mtrl-ref-typeface-brand)";
      child.className = "selected-probe-title-large"; child.style.setProperty("--mtrl-ref-typeface-brand", "serif");
      parent.append(child); document.body.append(parent);
      const providedRole = getComputedStyle(child).fontFamily;
      child.style.setProperty("--mtrl-sys-typescale-title-large-font", "initial");
      const referenceFallback = getComputedStyle(child).fontFamily;
      child.style.setProperty("--mtrl-sys-typescale-title-large-font-size", "red");
      const invalid = getComputedStyle(child).fontSize;
      const inherited = getComputedStyle(parent).fontSize;
      child.style.removeProperty("--mtrl-sys-typescale-title-large-font-size");
      return { providedRole, referenceFallback, invalid, inherited, restored: getComputedStyle(child).fontSize };
    });
    assert.equal(inheritance.providedRole, "monospace");
    assert.equal(inheritance.referenceFallback, "serif");
    assert.equal(inheritance.invalid, inheritance.inherited);
    assert.equal(inheritance.restored, "22px");
    report.inheritance = inheritance;
    record("provided role precedence, explicit missing-role/reference fallback, invalid-value inheritance and restoration");
    await page.close();

    const ssrPage = await browser.newPage();
    await ssrPage.goto(`${server.url}selected/ssr.html`);
    await ssrPage.waitForFunction(() => document.documentElement.dataset.ready === "true");
    await ssrPage.waitForFunction(() => {
      const button = document.querySelector("#ssr-button")?.shadowRoot?.querySelector("button");
      return button && getComputedStyle(button).fontSize === "19px";
    });
    await ssrPage.evaluate(() => (window as unknown as ProfileWindow).profile.defineButton());
    assert.equal(await sizeOf(ssrPage, "#ssr-button button"), "19px");
    record("linked SSR selected CSS and upgraded client both consume the role");
    await ssrPage.close();
  } finally { server.stop(true); }
} finally {
  report.outcomes = outcomes;
  await Bun.write("analysis/browser/typescale-profile.json", JSON.stringify(report, null, 2) + "\n");
  await browser.close();
  await rm(scratch, { recursive: true, force: true });
  await fixture.cleanup();
}
