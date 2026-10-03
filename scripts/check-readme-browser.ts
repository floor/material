#!/usr/bin/env bun
// scripts/check-readme-browser.ts
/**
 * Build first. Runs the README examples the way a reader does.
 *
 * Every fence of README.md and npm-readme.md marked
 * `<!-- example: run, shows "…" -->` (scripts/readme-blocks.ts) becomes a page,
 * with nothing added to the fence itself:
 *
 * - an `html` fence is the page's body;
 * - a `typescript` fence is the page's module script;
 * - a `tsx` fence is the page's module script, beside the `<div id="root">` the
 *   README says the page has, with React's JSX transform, `react` and `react-dom`
 *   installed, as the README says they are the reader's to install.
 *
 * Vite builds the pages from the packed package (the one a release publishes,
 * scripts/package-fixture.ts) and Chromium opens each one. An example passes when:
 *
 * - the text its mark names is visible;
 * - the page logged no error, logged no warning other than one listed in
 *   ALLOWED_WARNINGS, and threw none;
 * - every `<m-…>` element in it is defined and has a shadow root with a box, so
 *   text left unstyled in a tag nothing registered does not pass;
 * - if it imports a stylesheet of the package, the theme reached the page
 *   (`--mtrl-sys-color-primary` is set) and something with an `mtrl-` class or an
 *   `<m-…>` tag has a box.
 *
 * npm-readme.md must have one such example: its quick start.
 */
import assert from "node:assert/strict";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { build, preview } from "vite";
import { chromium } from "playwright";

import { createPackageFixture } from "./package-fixture";
import { FILES, parse } from "./readme-blocks";

// Warnings an example is allowed to log. Each entry needs its reason beside it.
const ALLOWED_WARNINGS: readonly string[] = [];

const docs = await Promise.all(FILES.map(parse));
const examples = docs.flatMap(doc => doc.blocks).filter(block => block.shows !== undefined);
assert(examples.some(block => block.file === "npm-readme.md"), "npm-readme.md has no example marked to run");

const fixture = await createPackageFixture();
const { directory } = fixture;
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
let server: Awaited<ReturnType<typeof preview>> | undefined;
const failures: string[] = [];
try {
  // What the React example says is the reader's to install.
  await mkdir(join(directory, "node_modules/@types"), { recursive: true });
  for (const name of ["react", "react-dom", "scheduler"]) {
    await symlink(resolve("node_modules", name), join(directory, "node_modules", name), "dir").catch(() => {});
  }
  // React's JSX transform, as an app's own setup has it.
  await writeFile(join(directory, "tsconfig.json"), JSON.stringify({ compilerOptions: { jsx: "react-jsx" } }));

  const page = (body: string): string =>
    `<!doctype html><html><head><meta charset="utf-8"><title>README example</title></head><body>${body}</body></html>`;
  const input: Record<string, string> = {};
  for (const [index, block] of examples.entries()) {
    const name = `readme-${index}`;
    if (block.lang === "html") {
      await writeFile(join(directory, `${name}.html`), page(`\n${block.code}\n`));
    } else {
      const tsx = block.lang === "tsx";
      await writeFile(join(directory, `${name}.${tsx ? "tsx" : "ts"}`), block.code);
      await writeFile(join(directory, `${name}.html`),
        page(`${tsx ? '<div id="root"></div>' : ""}<script type="module" src="./${name}.${tsx ? "tsx" : "ts"}"></script>`));
    }
    input[name] = join(directory, `${name}.html`);
  }
  const outDir = join(directory, "readme-site");
  await build({ root: directory, configFile: false, envFile: false, logLevel: "error",
    build: { outDir, target: "esnext", rolldownOptions: { input } },
  });
  server = await preview({ root: directory, configFile: false, envFile: false, logLevel: "error",
    build: { outDir }, preview: { host: "127.0.0.1", port: 0, open: false },
  });
  const address = server.httpServer.address();
  assert(address && typeof address === "object");
  browser = await chromium.launch();

  for (const [index, block] of examples.entries()) {
    const where = `${block.file}:${block.line}`;
    const tab = await browser.newPage();
    const errors: string[] = [];
    tab.on("pageerror", error => errors.push(String(error)));
    tab.on("console", message => {
      const type = message.type();
      if (type !== "error" && type !== "warning") return;
      if (type === "warning" && ALLOWED_WARNINGS.includes(message.text())) return;
      errors.push(message.text());
    });
    try {
      await tab.goto(`http://127.0.0.1:${address.port}/readme-${index}.html`, { waitUntil: "load" });
      await tab.getByText(block.shows!, { exact: true }).first().waitFor({ state: "visible", timeout: 10_000 });
      const state = await tab.evaluate(() => {
        const box = (element: Element): boolean => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        };
        const hosts = [...document.querySelectorAll("*")].filter(element => element.localName.startsWith("m-"));
        return {
          hosts: hosts.length,
          notUpgraded: hosts.filter(host => !host.matches(":defined") || !host.shadowRoot || !box(host)).map(host => host.localName),
          drawn: hosts.filter(box).length + [...document.querySelectorAll('[class*="mtrl-"]')].filter(box).length,
          theme: getComputedStyle(document.documentElement).getPropertyValue("--mtrl-sys-color-primary").trim(),
        };
      });
      if (state.notUpgraded.length) failures.push(`${where}: not upgraded, or without a box: ${state.notUpgraded.map(name => `<${name}>`).join(", ")}`);
      if (!state.drawn) failures.push(`${where}: nothing of the library has a box in the page`);
      if (/material\/styles/.test(block.code) && !state.theme) failures.push(`${where}: the example imports a stylesheet and the page has no theme`);
      if (errors.length) failures.push(`${where}: the page reported:\n  ${errors.join("\n  ")}`);
      console.log(`${where}: "${block.shows}" visible, ${state.hosts} elements, ${state.drawn} drawn${state.theme ? `, primary ${state.theme}` : ""}`);
    } catch (error) {
      failures.push(`${where}: ${String(error).split("\n")[0]}${errors.length ? `\n  ${errors.join("\n  ")}` : ""}`);
    } finally {
      await tab.close();
    }
  }
} finally {
  await browser?.close();
  await new Promise<void>((done, reject) => {
    if (!server) return done();
    server.httpServer.close(error => error ? reject(error) : done());
  });
  await fixture.cleanup();
}

if (failures.length) {
  console.error(`\n${failures.length} README ${failures.length === 1 ? "example does" : "examples do"} not run as written:\n`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`${examples.length} README examples run as written in Chromium`);
