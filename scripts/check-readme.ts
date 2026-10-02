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
 * - a fence marked `example: continues` compiles together with the one before it;
 *   the fences marked `example: run` are run by readme-browser:check, in Chromium
 *   (scripts/readme-blocks.ts has the marks);
 * - every `material/…` specifier, in a block or in inline code, resolves through
 *   the package's `exports` to a file the package ships, and every `dist/…` path
 *   named in inline code exists;
 * - every `createX` named in inline code is an export of `material`;
 * - every `<m-…>` tag is an element or a declaration child the package defines,
 *   and each attribute written on it is one its spec declares;
 * - the install line follows the version: `material@next` while package.json is a
 *   3.0.0 pre-release, `material` once it is not (the release pull request that
 *   sets 3.0.0 fails here until both files are changed);
 * - the numbers between the `sizes` markers are within 2% of what size:check
 *   measured (the release pull request refreshes them);
 * - readability: no paragraph or list item over about four rendered lines, no
 *   sentence with more than two inline code spans (tables and fences apart);
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

import { createPackageFixture, run } from "./package-fixture";
import { FILES, headingSlugs, parse, type Block } from "./readme-blocks";

const REPOSITORY = "https://github.com/floor/material";
const online = process.argv.includes("--online");
// md3.io pages that deploy with the site's move to `material` 3.0.0, before the
// release: each is in data/published-urls.txt on md3.io's feat/material-3-move
// branch, whose own test requires every listed URL to answer. Until that deploy
// `--online` accepts a 404 for them, and says when one is live so the entry goes.
const PENDING = ["https://md3.io/docs/events-and-overlays/"];

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
// A stated figure may be up to 2% (and at least 100 bytes) from the measurement:
// a pull request that moves a bundle by a few bytes must not fail because a row
// now rounds differently. The release pull request refreshes the table
// (.github/CONTRIBUTING.md), and a row that has drifted is printed until then.
const SIZE_TOLERANCE = 0.02;
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
    const bytes = measured.sizes[key].gzip;
    const current = (bytes / 1000).toFixed(1);
    const drift = Math.abs(stated[index] * 1000 - bytes);
    if (drift > Math.max(SIZE_TOLERANCE * bytes, 100)) {
      fail(`${doc.file}: sizes row ${index + 1} (${key}) says ${stated[index]} kB; size:check measured ${bytes} bytes, ${current} kB, more than 2% away`);
    } else if (stated[index].toFixed(1) !== current) {
      console.log(`${doc.file}: sizes row ${index + 1} (${key}) says ${stated[index]} kB and the build is ${current} kB: within the tolerance, to refresh at the release`);
    }
  });
}
if (docs[0].text.split("<!-- sizes -->")[1]?.split("<!-- /sizes -->")[0] !== docs[1].text.split("<!-- sizes -->")[1]?.split("<!-- /sizes -->")[0]) {
  fail("README.md and npm-readme.md have different sizes tables");
}

// ── Readability ───────────────────────────────────────────────────
// Two rules a script can hold, of the four the READMEs follow (the other two are
// a reviewer's: what reads as a specification lives on md3.io with a link, and
// three or more parallel items are a list or a table):
//
// - a paragraph or a list item is at most about four rendered lines: 440
//   characters of the text as rendered (GitHub's README column holds about 110);
// - a sentence has at most two inline code spans.
//
// Tables, fences, headings and comments are not prose. The list between the
// markup-attributes markers is left out: test/ssr/markup-attributes.test.ts
// holds its lines to one form, `attribute` on `<m-element>`, with a condition.
const MAX_PARAGRAPH = 440;
const MAX_SPANS = 2;
for (const doc of docs) {
  const prose = doc.prose.replace(/<!-- markup-attributes -->[\s\S]*?<!-- \/markup-attributes -->/, "");
  const units = prose.split(/\n{2,}/).flatMap(paragraph => /^- /m.test(paragraph) ? paragraph.split(/\n(?=- )/) : [paragraph])
    .map(unit => unit.trim()).filter(unit => unit && !/^(?:#|\||<!--)/.test(unit));
  for (const unit of units) {
    const rendered = unit.replace(/\]\([^)]*\)/g, "]").replace(/[`*[\]]/g, "").replace(/\s+/g, " ");
    const start = `${doc.file}: "${rendered.slice(0, 50)}…"`;
    if (rendered.length > MAX_PARAGRAPH) fail(`${start} is ${rendered.length} characters as rendered: over ${MAX_PARAGRAPH}, about four lines`);
    for (const sentence of unit.split(/(?<=[.:;?!])\s+/)) {
      const spans = sentence.match(/`[^`\n]+`/g)?.length ?? 0;
      if (spans > MAX_SPANS) fail(`${start} has a sentence with ${spans} code spans, more than ${MAX_SPANS}: "${sentence.slice(0, 70)}…"`);
    }
  }
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
    // GitHub answers 429 or 503 to a burst of requests: ask those once more.
    let response = await fetch(link, { redirect: "manual" }).catch((error: Error) => error);
    if (!(response instanceof Error) && [429, 503].includes(response.status)) {
      await Bun.sleep(5_000);
      response = await fetch(link, { redirect: "manual" }).catch((error: Error) => error);
    }
    const status = response instanceof Error ? response.message : String(response.status);
    console.log(`${status}  ${link}`);
    const pending = PENDING.some(prefix => link.startsWith(prefix));
    if (status !== "200" && !(pending && status === "404")) fail(`${link} answered ${status}`);
    if (pending) console.log(`      ${status === "200" ? "now live: remove it from PENDING" : "not deployed yet, as PENDING says"}`);
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
      if (["typescript", "ts", "tsx"].includes(block.lang)) {
        const previous = doc.blocks[doc.blocks.indexOf(block) - 1];
        scripts.push({ block, code: block.continues ? `${previous.code}\n${block.code}` : block.code, tsx: block.lang === "tsx" });
      }
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
  // What an example imports and this repository does not install: the reader's sanitizer. And
  // Trusted Types, which the DOM library of the installed TypeScript (5.8) does
  // not declare (an app gets them from @types/trusted-types or a later library).
  await writeFile(join(directory, "ambient.d.ts"), `
    declare module 'dompurify' { const DOMPurify: { sanitize(html: string): string }; export default DOMPurify; }
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

  console.log(`${FILES.join(" and ")}: ${scripts.length} scripts compiled, ${specifiers.size} specifiers resolved, ` +
    `${tags.length} tags checked, ${docs.reduce((count, doc) => count + doc.links.length, 0)} links${online ? ` (${external.size} fetched)` : ""}`);
} finally {
  await fixture.cleanup();
}

if (failures.length) {
  console.error(`\n${failures.length} README ${failures.length === 1 ? "failure" : "failures"}:\n`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
