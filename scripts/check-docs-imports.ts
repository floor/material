#!/usr/bin/env bun
// scripts/check-docs-imports.ts
/**
 * Build first: the documented imports are compiled against the packed package,
 * the one createPackageFixture() installs.
 *
 * Every import of the package that this repository documents must be one a
 * reader can write (scripts/docs-imports.ts lists what documentation is: every
 * tracked Markdown file but CHANGELOG.md and the fixtures, and every `@example`
 * block under src/). Only the import statement is compiled, never the example
 * around it: examples are fragments, and what they demonstrate is the subject
 * of their own checks.
 *
 * Each distinct statement is copied into a file of its own and run through tsc
 * against the packed package, so the specifier resolves through the package's
 * `exports` and every name it takes must be one that module exports — the root,
 * a component, a component's constants, a core subpath, an adapter.
 *
 * This is the sibling of readme:check, which holds README.md and npm-readme.md
 * to more than an import: sizes, links, elements, the install line. What the
 * two share is compiling against the packed package rather than the sources.
 *
 *   bun run docs-imports:check
 */
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { documentedImports } from "./docs-imports";
import { createPackageFixture } from "./package-fixture";

const ROOT = join(import.meta.dir, "..");
const manifest = await Bun.file(join(ROOT, "package.json")).json() as { name: string };
const { imports, documents, sources } = await documentedImports(ROOT, manifest.name);

// One file per distinct statement: the same import line in several docs is
// compiled once, and a failure names every place it is documented.
const places = new Map<string, typeof imports>();
for (const item of imports) places.set(item.statement, [...(places.get(item.statement) ?? []), item]);
const statements = [...places.keys()];

const fixture = await createPackageFixture();
const failures: string[] = [];
try {
  // What an adapter's declarations import, installed by the reader: the same
  // links readme:check makes before its compile.
  await mkdir(join(fixture.directory, "node_modules/@types"), { recursive: true });
  for (const name of ["react", "react-dom", "@types/react", "@types/react-dom", "csstype", "vue", "svelte", "solid-js"]) {
    await symlink(resolve("node_modules", name), join(fixture.directory, "node_modules", name), "dir").catch(() => {});
  }
  const names = statements.map((statement, index) => ({ name: `docs-import-${index}.ts`, statement }));
  for (const { name, statement } of names) {
    await writeFile(join(fixture.directory, name), `${statement}\nexport {};\n`);
  }
  const tsc = Bun.spawnSync([
    resolve("node_modules/.bin/tsc"), "--noEmit", "--strict", "--skipLibCheck", "--moduleResolution", "bundler",
    "--module", "esnext", "--target", "es2022", ...names.map(({ name }) => name),
  ], { cwd: fixture.directory, stdout: "pipe", stderr: "pipe" });
  const output = `${tsc.stdout.toString()}${tsc.stderr.toString()}`;
  let reported = 0;
  for (const match of output.matchAll(/^docs-import-(\d+)\.ts\(\d+,\d+\): error (TS\d+): (.*)$/gm)) {
    const statement = names[Number(match[1])]?.statement;
    if (statement === undefined) continue;
    for (const where of places.get(statement) ?? []) {
      failures.push(`${where.file}:${where.line}: ${match[3]} (${match[2]})`);
      reported += 1;
    }
  }
  // A tsc failure no statement accounts for: the check itself could not run.
  if (tsc.exitCode !== 0 && reported === 0) failures.push(`The documented imports did not compile:\n${output}`);
} finally {
  await fixture.cleanup();
}

if (failures.length) {
  console.error(`\n${failures.length} documented ${failures.length === 1 ? "import is" : "imports are"} not importable from ${manifest.name}:\n`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`${imports.length} documented imports of ${manifest.name}: ${statements.length} statements compiled against the packed package, ` +
  `${documents.length} Markdown files and ${sources.length} sources read.`);
