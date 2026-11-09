#!/usr/bin/env bun
// All existing default JS/CSS, not just the full stylesheet or a few examples.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import expected from "./fixtures/typescale-defaults.json";

const groups = new Map<string, string[]>();
async function walk(dir: string, relative = ""): Promise<void> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await walk(join(dir, entry.name), path);
    else if (/\.(?:js|css)$/.test(path) && !/^(?:styles\/typescale\/|elements\/(?:css\/)?typescale\/)/.test(path)) {
      const group = path.includes("/") ? path.split("/")[0] : ".";
      const paths = groups.get(group) ?? [];
      paths.push(path);
      groups.set(group, paths);
    }
  }
}
await walk("dist");
const actual: Record<string, { count: number; sha256: string }> = {};
for (const [group, paths] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
  const digest = createHash("sha256");
  for (const path of paths.sort()) {
    const text = (await readFile(join("dist", path), "utf8")).replace(/^\/\*! material v[^\n]*\*\/\n?/, "");
    digest.update(path + "\0").update(text).update("\0");
  }
  actual[group] = { count: paths.length, sha256: digest.digest("hex") };
}
assert.deepEqual(actual, expected.groups, `default JS/CSS changed from ${expected.main} (only the leading version banner is excluded)`);
console.log(`Default identity: all ${Object.values(actual).reduce((sum, group) => sum + group.count, 0)} existing JS/CSS files match main ${expected.main}`);
const { renderElement } = await import(pathToFileURL(join(process.cwd(), "dist/ssr/index.js")).href) as typeof import("../src/ssr");
// Existing generated IDs are random. Give both baseline and candidate the
// same synthetic input, restoring Math.random before leaving this check.
const random = Math.random;
Math.random = () => 0.123456;
try {
  for (const mode of ["inline", "link"] as const) {
    const digest = createHash("sha256");
    for (const row of expected.ssr.rows) digest.update(row.tag + "\0").update(renderElement(row.tag, row.attributes, row.children,
      mode === "link" ? { styles: "link", cssBase: "/assets/css" } : {})).update("\0");
    assert.equal(digest.digest("hex"), expected.ssr.modes[mode], `${mode}: default SSR HTML changed`);
  }
} finally { Math.random = random; }
console.log("Default inline/link SSR HTML matches the baseline for button, text field and badge");
