#!/usr/bin/env bun
// scripts/check-readme.ts
/**
 * Build first, and run size:check first (it writes analysis/package-size.json).
 *
 * README.md is what GitHub shows and npm-readme.md is what npm shows (publish.yml
 * packs it as the package's README.md). This checks what both say against the
 * packed package, the one createPackageFixture() installs:
 *
 * - every `typescript` and `tsx` block, and the module script of every `html`
 *   block, compiles under `--strict` against the package's own declarations;
 * - a block that follows `<!-- example: run -->` also runs, in Node with a JSDOM
 *   document, and must leave something in the page;
 * - every `material/…` specifier, in a block or in inline code, resolves through
 *   the package's `exports` to a file the package ships, and every `dist/…` path
 *   named in inline code exists;
 * - every `createX` named in inline code is an export of `material`;
 * - every `<m-…>` tag is an element or a declaration child the package defines,
 *   and each attribute written on it is one its spec declares;
 * - the install line follows the version: `material@next` while package.json is a
 *   3.0.0 pre-release, `material` once it is not (the release pull request that
 *   sets 3.0.0 fails here until both files are changed);
 * - the numbers between the `sizes` markers are the ones size:check measured;
 * - links: an anchor names a heading of the same file, a relative link names a
 *   file of the repository (README.md only: npm-readme.md has none), and a link
 *   to this repository's CHANGELOG.md on GitHub names one of its headings.
 *
 * With `--online` it also fetches every external link and fails on anything but
 * a 200. CI does not pass the flag: a pull request must not fail because another
 * site is down. Run it by hand when a link changes.
 *
 * Not checked here: `css` and `bash` blocks other than the install line, and the
 * prose. A reviewer reads those.
 */
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { createPackageFixture, run } from "./package-fixture";

const FILES = ["README.md", "npm-readme.md"] as const;
const REPOSITORY = "https://github.com/floor/material";
const online = process.argv.includes("--online");

interface Block { file: string; line: number; lang: string; code: string; run: boolean }
interface Doc { file: string; text: string; blocks: Block[]; prose: string; spans: string[]; links: string[]; slugs: Set<string> }

/** GitHub's heading anchor: lower case, punctuation dropped, spaces to hyphens. */
const slug = (heading: string): string =>
  heading.trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, "").replace(/ /g, "-");

const headingSlugs = (text: string): Set<string> =>
  new Set([...text.replace(/^```[\s\S]*?^```/gm, "").matchAll(/^#{1,6} (.+)$/gm)].map(match => slug(match[1])));

const parse = async (file: string): Promise<Doc> => {
  const text = await Bun.file(file).text();
  const blocks: Block[] = [];
  const lines = text.split("\n");
  const proseLines: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const open = /^```(\w+)\s*$/.exec(lines[index]);
    if (!open) { proseLines.push(lines[index]); continue; }
    const start = index;
    const code: string[] = [];
    for (index++; index < lines.length && lines[index] !== "```"; index++) code.push(lines[index]);
    assert(index < lines.length, `${file}:${start + 1}: the code block is not closed`);
    blocks.push({ file, line: start + 1, lang: open[1], code: code.join("\n"), run: lines[start - 1] === "<!-- example: run -->" });
  }
  const prose = proseLines.join("\n");
  return {
    file, text, blocks, prose,
    spans: [...prose.matchAll(/`([^`\n]+)`/g)].map(match => match[1]),
    links: [...prose.matchAll(/\]\(([^)\s]+)\)/g)].map(match => match[1]),
    slugs: headingSlugs(text),
  };
};

const docs = await Promise.all(FILES.map(parse));
const failures: string[] = [];
const fail = (message: string): void => { failures.push(message); };

// ── The install line ──────────────────────────────────────────────
const manifest = await Bun.file("package.json").json() as { name: string; version: string };
// The package's name comes from the manifest, so the patterns below follow it.
const NAME = manifest.name;
/** A subpath of the package in inline code: `<name>/styles/base`. */
const SUBPATH = new RegExp(`^${NAME}/[\\w./-]+$`);
/** The package or one of its subpaths, imported in an example. */
const IMPORTED = new RegExp(`(?:from|import)\\s*\\(?\\s*['"](${NAME}(?:/[\\w./-]+)?)['"]`, "g");
/** The JSX entries have declarations and no module. */
const TYPES_ONLY = new RegExp(`^${NAME}/(?:react|solid)/jsx$`);
const install = manifest.version.startsWith("3.0.0-") ? "npm install material@next" : "npm install material";
for (const doc of docs) {
  const section = doc.text.split("<!-- install -->")[1]?.split("<!-- /install -->")[0];
  if (!section) { fail(`${doc.file}: no <!-- install --> section`); continue; }
  const lines = section.split("\n").filter(line => line.startsWith("npm install"));
  if (lines.length !== 1 || lines[0] !== install) {
    fail(`${doc.file}: the install line is ${JSON.stringify(lines)}; package.json is ${manifest.version}, so it is "${install}"`);
  }
  // The sentence about the `next` tag belongs to the pre-release only.
  if (install === "npm install material" && /`next` tag|material@next/.test(section)) {
    fail(`${doc.file}: the install section still speaks of the next tag; ${manifest.version} is not a pre-release`);
  }
}

// ── The sizes ─────────────────────────────────────────────────────
// Each row of the table, in order, and the size:check measurement it states.
const SIZE_ROWS = ["button-initial", "button", "form", "all-js", "base-css", "button-css", "full-css"] as const;
const measuredFile = Bun.file("analysis/package-size.json");
assert(await measuredFile.exists(), "analysis/package-size.json is missing: run `bun run size:check` first");
const measured = await measuredFile.json() as { sizes: Record<string, { gzip: number }> };
for (const doc of docs) {
  const table = doc.text.split("<!-- sizes -->")[1]?.split("<!-- /sizes -->")[0];
  if (!table) { fail(`${doc.file}: no <!-- sizes --> table`); continue; }
  const stated = [...table.matchAll(/\| ([\d.]+) kB \|$/gm)].map(match => Number(match[1]));
  if (stated.length !== SIZE_ROWS.length) { fail(`${doc.file}: the sizes table has ${stated.length} rows, expected ${SIZE_ROWS.length}`); continue; }
  SIZE_ROWS.forEach((key, index) => {
    const expected = (measured.sizes[key].gzip / 1000).toFixed(1);
    if (stated[index].toFixed(1) !== expected) {
      fail(`${doc.file}: sizes row ${index + 1} (${key}) says ${stated[index]} kB; size:check measured ${measured.sizes[key].gzip} bytes, ${expected} kB`);
    }
  });
}
if (docs[0].text.split("<!-- sizes -->")[1]?.split("<!-- /sizes -->")[0] !== docs[1].text.split("<!-- sizes -->")[1]?.split("<!-- /sizes -->")[0]) {
  fail("README.md and npm-readme.md have different sizes tables");
}

// ── Links ─────────────────────────────────────────────────────────
const changelogSlugs = headingSlugs(await Bun.file("CHANGELOG.md").text());
const external = new Set<string>();
for (const doc of docs) {
  for (const link of doc.links) {
    if (link.startsWith("#")) {
      if (!doc.slugs.has(link.slice(1))) fail(`${doc.file}: ${link} names no heading of the file`);
    } else if (/^https?:\/\//.test(link)) {
      external.add(link);
      const anchor = link.startsWith(`${REPOSITORY}/blob/main/CHANGELOG.md#`) ? link.split("#")[1] : undefined;
      if (anchor !== undefined && !changelogSlugs.has(anchor)) fail(`${doc.file}: ${link} names no heading of CHANGELOG.md`);
      const path = new RegExp(`^${REPOSITORY}/blob/main/([^#]+)`).exec(link)?.[1];
      if (path && !existsSync(path)) fail(`${doc.file}: ${link} names no file of the repository`);
    } else if (doc.file === "npm-readme.md") {
      fail(`${doc.file}: ${link} is a relative link; npm's page needs the full address`);
    } else if (!existsSync(link.split("#")[0])) {
      fail(`${doc.file}: ${link} names no file of the repository`);
    }
  }
}
if (online) {
  for (const link of [...external].sort()) {
    const response = await fetch(link, { redirect: "manual" }).catch((error: Error) => error);
    const status = response instanceof Error ? response.message : String(response.status);
    console.log(`${status}  ${link}`);
    if (status !== "200") fail(`${link} answered ${status}`);
  }
}

// ── The packed package ────────────────────────────────────────────
const fixture = await createPackageFixture();
const { directory, installed } = fixture;
try {
  const published = await Bun.file(join(installed, "package.json")).json() as {
    dependencies?: Record<string, string>;
    exports: Record<string, unknown>;
    peerDependencies: Record<string, string>;
    peerDependenciesMeta: Record<string, { optional?: boolean }>;
  };
  // "Zero dependencies", and every framework an optional peer.
  assert.deepEqual(published.dependencies ?? {}, {}, "The package has dependencies: both READMEs say it has none");
  for (const peer of Object.keys(published.peerDependencies)) {
    assert(published.peerDependenciesMeta[peer]?.optional, `${peer} is not an optional peer: both READMEs say each framework is`);
  }
  // "the 37 components": one `./components/<name>` entry each.
  const components = Object.keys(published.exports).filter(key => /^\.\/components\/[\w-]+$/.test(key)).length;
  for (const doc of docs) {
    for (const match of doc.prose.matchAll(/\bthe (\d+) components\b/g)) {
      if (Number(match[1]) !== components) fail(`${doc.file}: "${match[0]}"; the package has ${components}`);
    }
  }

  // What the package itself says it exports, elements and declaration children.
  const probe = join(directory, "probe.mjs");
  await writeFile(probe, `
    import * as root from 'material';
    import { elements, declarations } from 'material/elements';
    import { existsSync } from 'node:fs';
    import { fileURLToPath } from 'node:url';
    const specifiers = JSON.parse(process.argv[2]);
    const resolved = {};
    for (const specifier of specifiers) {
      try {
        const url = import.meta.resolve(specifier);
        resolved[specifier] = existsSync(fileURLToPath(url)) ? 'ok' : 'resolves to a file the package does not ship';
      } catch (error) {
        resolved[specifier] = error.code ?? String(error);
      }
    }
    const attributes = spec => Object.keys(spec.attributes ?? {});
    console.log(JSON.stringify({
      root: Object.keys(root),
      resolved,
      tags: Object.fromEntries([
        ...Object.values(elements).map(entry => [entry.spec.name, attributes(entry.spec)]),
        ...Object.values(declarations).map(spec => [spec.name, attributes(spec)]),
      ]),
    }));
  `);

  const scripts: { block: Block; code: string; tsx: boolean }[] = [];
  const specifiers = new Set<string>();
  const tags: { where: string; tag: string; attributes: string[] }[] = [];
  const collectTags = (where: string, markup: string): void => {
    for (const match of markup.matchAll(/<m-([a-z-]+)((?:\s+[a-z-]+(?:="[^"]*")?)*)\s*\/?>/g)) {
      tags.push({ where, tag: match[1], attributes: [...match[2].matchAll(/\s([a-z-]+)/g)].map(attribute => attribute[1]) });
    }
  };
  for (const doc of docs) {
    for (const block of doc.blocks) {
      const where = `${block.file}:${block.line}`;
      if (["typescript", "ts", "tsx"].includes(block.lang)) scripts.push({ block, code: block.code, tsx: block.lang === "tsx" });
      if (block.lang === "html") {
        collectTags(where, block.code);
        for (const match of block.code.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) scripts.push({ block, code: match[1], tsx: false });
      }
      if (block.lang === "tsx") collectTags(where, block.code);
    }
    for (const span of doc.spans) {
      if (SUBPATH.test(span)) specifiers.add(span);
      if (/^dist\/[\w./-]+$/.test(span) && !existsSync(join(installed, span))) fail(`${doc.file}: \`${span}\` is not in the package`);
      collectTags(doc.file, span);
    }
  }
  for (const { code } of scripts) {
    for (const match of code.matchAll(IMPORTED)) specifiers.add(match[1]);
  }
  const report = JSON.parse(await run(["node", probe, JSON.stringify([...specifiers].sort())], directory)) as {
    root: string[]; resolved: Record<string, string>; tags: Record<string, string[]>;
  };
  for (const [specifier, result] of Object.entries(report.resolved)) {
    // Types only: nothing to load, and the compile below reads it.
    if (TYPES_ONLY.test(specifier)) continue;
    if (result !== "ok") fail(`\`${specifier}\`: ${result}`);
  }
  for (const doc of docs) {
    for (const span of doc.spans) {
      if (/^create[A-Z]\w*$/.test(span) && !report.root.includes(span)) fail(`${doc.file}: \`${span}\` is not an export of the package root`);
    }
  }
  // Attributes every element takes: HTML's own, and the form attributes a
  // form-associated host reads.
  const GLOBAL = /^(?:id|class|slot|style|hidden|name|disabled|required|aria-[a-z]+|data-[a-z-]+)$/;
  for (const { where, tag, attributes } of tags) {
    const declared = report.tags[tag];
    if (!declared) { fail(`${where}: <m-${tag}> is not an element or a declaration child of the package`); continue; }
    for (const attribute of attributes) {
      if (!declared.includes(attribute) && !GLOBAL.test(attribute)) fail(`${where}: <m-${tag}> declares no \`${attribute}\` attribute`);
    }
  }

  // Compile every script against the packed declarations, as an app does.
  await mkdir(join(directory, "node_modules/@types"), { recursive: true });
  for (const name of ["react", "react-dom", "@types/react", "@types/react-dom", "csstype", "vue", "svelte", "solid-js"]) {
    await symlink(resolve("node_modules", name), join(directory, "node_modules", name), "dir").catch(() => {});
  }
  // What an example names and does not define: the reader's own sanitizer, and
  // Trusted Types, which the DOM library of the installed TypeScript (5.8) does
  // not declare (an app gets them from @types/trusted-types or a later library).
  await writeFile(join(directory, "ambient.d.ts"), `
    declare const DOMPurify: { sanitize(html: string): string };
    interface Window {
      trustedTypes: {
        createPolicy(name: string, rules: { createHTML(html: string): string }): { createHTML(html: string): { toString(): string } };
      };
    }
  `);
  const names: string[] = [];
  for (const [index, script] of scripts.entries()) {
    const name = `example-${index}-${script.block.file.replace(/\W/g, "-")}-${script.block.line}.${script.tsx ? "tsx" : "ts"}`;
    await writeFile(join(directory, name), `${script.code}\nexport {};\n`);
    names.push(name);
  }
  const tsc = Bun.spawnSync([
    resolve("node_modules/.bin/tsc"), "--noEmit", "--strict", "--skipLibCheck", "--moduleResolution", "bundler",
    "--module", "esnext", "--target", "es2022", "--lib", "es2022,dom,dom.iterable", "--jsx", "react-jsx",
    "ambient.d.ts", ...names,
  ], { cwd: directory, stdout: "pipe", stderr: "pipe" });
  if (tsc.exitCode !== 0) fail(`The examples do not compile against the packed package (example-<n>-<file>-<line>):\n${tsc.stdout}${tsc.stderr}`);

  // Run the blocks marked to run. The stylesheet imports are the bundler's part.
  const jsdom = pathToFileURL(resolve("node_modules/jsdom/lib/api.js")).href;
  const runnable = scripts.filter(script => script.block.run);
  assert(runnable.some(script => script.block.file === "npm-readme.md"), "npm-readme.md has no example marked <!-- example: run -->");
  for (const [index, script] of runnable.entries()) {
    const where = `${script.block.file}:${script.block.line}`;
    const javascript = new Bun.Transpiler({ loader: "ts" }).transformSync(script.code.replace(/^import 'material\/styles[\w/-]*';\n/gm, ""));
    const file = join(directory, `run-${index}.mjs`);
    await writeFile(file, `
      import { JSDOM } from ${JSON.stringify(jsdom)};
      const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
      for (const key of ['window', 'document', 'Node', 'Element', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Event', 'CustomEvent', 'MutationObserver']) {
        globalThis[key] = dom.window[key];
      }
      globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
      globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
      await import(${JSON.stringify(pathToFileURL(join(directory, `run-${index}-example.mjs`)).href)});
      if (!document.body.children.length) throw new Error('the example left nothing in the page');
      console.log(document.body.children.length + ' elements in the page');
      dom.window.close();
    `);
    await writeFile(join(directory, `run-${index}-example.mjs`), javascript);
    const child = Bun.spawnSync(["node", file], { cwd: directory, stdout: "pipe", stderr: "pipe" });
    if (child.exitCode !== 0) fail(`${where}: the example does not run:\n${child.stdout}${child.stderr}`);
    else console.log(`${where}: ran, ${child.stdout.toString().trim()}`);
  }

  console.log(`${FILES.join(" and ")}: ${scripts.length} scripts compiled, ${runnable.length} run, ${specifiers.size} specifiers resolved, ` +
    `${tags.length} tags checked, ${docs.reduce((count, doc) => count + doc.links.length, 0)} links${online ? ` (${external.size} fetched)` : ""}`);
} finally {
  await fixture.cleanup();
}

if (failures.length) {
  console.error(`\n${failures.length} README ${failures.length === 1 ? "failure" : "failures"}:\n`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
