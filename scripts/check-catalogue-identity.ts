#!/usr/bin/env bun
/**
 * scripts/check-catalogue-identity.ts
 *
 * The identity gate preserves the package's existing default surface while
 * allowing catalogue data and explicitly validated optional style additions.
 * Two packed tarballs — the main tip this tree
 * is compared against, and this tree, built and packed by the same job with
 * the same pinned toolchain — are compared member by member:
 * identical bytes in existing members everywhere, except the explicit
 * allowlist (the version fields of package.json, the dist/tokens catalogue
 * data files, and whole-line additions to README.md — documentation of the new
 * data may be added, existing documentation may not be rewritten). A new
 * optional profile pair must exactly project its unchanged parent stylesheet
 * and import its declared dependencies; once on main its bytes are frozen too.
 * A declared opt-in entry (`material/components/listbox` with
 * `material/styles/listbox`) ships at its own subpath and joins no barrel, root
 * export or default sheet, so it may add exactly its own files, export key and
 * check script without moving a default byte. Anything
 * else — a moved byte, a renamed file, a shifted bundle —
 * fails with the member named, because a data-only change has no business
 * touching a single default byte.
 *
 *   bun run catalogue:identity:check [branch.tgz] [base.tgz]
 *
 * With no arguments the branch tarball is the one packed in this directory
 * and the base the one packed in ../material-base (the CI layout).
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { optionalStyleFiles, validateOptionalStyleProfiles } from "./optional-style-profiles";
import { componentStyles } from "./style-manifest";

const sole = (directory: string): string => {
  const tarballs = readdirSync(directory).filter(name => name.endsWith(".tgz"));
  if (tarballs.length !== 1) throw new Error(`${directory}: expected exactly one packed tarball, found ${tarballs.join(", ") || "none"}`);
  return join(directory, tarballs[0]!);
};
const branchTgz = process.argv[2] ?? sole(".");
const mainTgz = process.argv[3] ?? sole("../material-base");

/** The normalized member map of a tarball: path -> content bytes. */
const readTarball = (tgz: string): Map<string, Buffer> => {
  const dir = mkdtempSync("./.mtrl-identity-");
  try {
    // --strip-components=1 drops npm's package/ folder so member files land
    // at the paths the normalized listing names them by.
    execFileSync("tar", ["-xzf", tgz, "-C", dir, "--strip-components=1"]);
    const listing = execFileSync("tar", ["-tzf", tgz]).toString().trim().split("\n");
    const members = new Map<string, Buffer>();
    for (const member of listing) {
      const normalized = member.replace(/^package\//, "").replace(/\/$/, "");
      if (!normalized || normalized === "package" || normalized.endsWith("/.")) continue;
      const relative = normalized.replace(/^\.?\//, "");
      try {
        members.set(relative, readFileSync(join(dir, relative === "" ? "." : relative)));
      } catch {
        // A directory entry; its children carry the content.
      }
    }
    if (!members.has("package.json")) {
      throw new Error(`${tgz}: no package.json member after extraction (found ${members.size} file members) — refusing to compare an unread tarball`);
    }
    return members;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const branch = readTarball(branchTgz);
const main = readTarball(mainTgz);

/** The only differences a data-only change may introduce. README.md is
 * documentation every consumer downloads and none loads; it is held to
 * whole-line additions below, so the allowance documents the new data without
 * opening the door to rewriting what a consumer reads. */
const allowed = (member: string): boolean =>
  member === "package.json" || member === "README.md" || member.startsWith("dist/tokens/");

/** README.md may change only by whole-line additions: every line of the base
 * document appears in the branch document, in order. */
const additionsOnly = (before: Buffer, after: Buffer): boolean => {
  const remaining = after.toString().split("\n");
  for (const line of before.toString().split("\n")) {
    const at = remaining.indexOf(line);
    if (at === -1) return false;
    remaining.splice(0, at + 1);
  }
  return true;
};

const problems: string[] = [];
// A new optional stylesheet adds catalogue references. Permit only its exact
// declared pair, validated against the unchanged parent sheet and dependency
// imports. Once present on main, even these files are byte-frozen below.
const optionalAdditions = new Set(optionalStyleFiles.map(path => `dist/${path}`));
const addsProfile = [...optionalAdditions].some(path => branch.has(path) && !main.has(path));
// A declared opt-in entry is a new component shipped at its own subpath: the
// manifest marks it `optIn`, the build gives it its own style pair, and it
// joins no barrel, root export or default stylesheet. The allowance admits
// exactly what that entry produces — its component modules, its stylesheet
// pair, the Sass partial the sheet compiles from, its export key and its check
// script. An entry already packed on main is not new, so the member loop freezes
// it byte for byte like every other member.
const partialPath = (source: string): string => `src/styles/${source.replace(/\/([^/]+)$/, "/_$1.scss")}`;
const optInEntries = Object.entries(componentStyles).filter(([, entry]) => entry.optIn);
const newOptIn = new Set(optInEntries
  .filter(([name]) => !main.has(`dist/components/${name}/index.js`))
  .map(([name]) => name));
const optInStyleMembers = new Map(optInEntries.flatMap(([name, entry]) =>
  [[`dist/styles/${name}.js`, name], [`dist/styles/${name}.css`, name], [partialPath(entry.source), name]] as [string, string][]));
/** The declared opt-in entry a new member belongs to, when it is one it produces. */
const optInMember = (member: string): string | undefined => {
  const style = optInStyleMembers.get(member);
  if (style !== undefined) return newOptIn.has(style) ? style : undefined;
  const component = /^dist\/components\/([\w-]+)\/(?:[\w.-]+\.js|[\w.-]+\.d\.ts)$/.exec(member);
  return component && newOptIn.has(component[1]!) ? component[1] : undefined;
};
try {
  validateOptionalStyleProfiles(new Map([...branch]
    .filter(([path]) => path.startsWith("dist/styles/"))
    .map(([path, bytes]) => [path.slice("dist/".length), bytes.toString()])), false);
} catch (error) {
  problems.push(String(error));
}
for (const member of [...new Set([...main.keys(), ...branch.keys()])].sort()) {
  const inMain = main.get(member);
  const inBranch = branch.get(member);
  if (inMain === undefined) {
    if (!allowed(member) && !optionalAdditions.has(member) && !optInMember(member)) problems.push(`added member ${member} outside the allowlist (package.json, README.md, dist/tokens/*, validated optional profiles, declared opt-in entries)`);
    continue;
  }
  if (inBranch === undefined) {
    problems.push(`removed member ${member}: the default surface cannot lose a file`);
    continue;
  }
  if (inMain.equals(inBranch)) continue;
  if (!allowed(member)) {
    problems.push(`changed member ${member} (${inMain.length} -> ${inBranch.length} bytes): a data-only change must not touch the default surface`);
  } else if (member === "README.md" && !additionsOnly(inMain, inBranch)) {
    problems.push("changed member README.md beyond whole-line additions: the new data may be documented, existing documentation may not be rewritten");
  }
}

// The allowlist is not a blank cheque: package.json may only add the two
// catalogue export keys and the script entries that run the catalogue gates.
// Adding the validated optional profile also permits its exact check script
// and its pinned build-time parser; neither allowance changes existing keys.
// Every other field — type, sideEffects, dependencies, main, existing export
// targets, existing script entries, version — is frozen by name and value,
// and nothing anywhere in it may be removed. Version compares equal because
// the base is the main tip the merge was computed from: only this pull
// request's own delta reaches the comparison, and a data-only change never
// bumps a version.
const branchPkg = JSON.parse(branch.get("package.json")!.toString()) as Record<string, unknown>;
const mainPkg = JSON.parse(main.get("package.json")!.toString()) as Record<string, unknown>;
const branchExports = (branchPkg.exports ?? {}) as Record<string, unknown>;
const mainExports = (mainPkg.exports ?? {}) as Record<string, unknown>;
for (const key of Object.keys(mainExports)) {
  if (!Object.hasOwn(branchExports, key)) {
    problems.push(`export key ${key} was removed: existing export targets are frozen by this change`);
  } else if (JSON.stringify(branchExports[key]) !== JSON.stringify(mainExports[key])) {
    problems.push(`export key ${key} changed: existing export targets are frozen by this change`);
  }
}
for (const key of Object.keys(branchExports)) {
  if (Object.hasOwn(mainExports, key)) continue;
  const componentKey = /^\.\/components\/([\w-]+)$/.exec(key);
  const optInExport = componentKey !== null && newOptIn.has(componentKey[1]!)
    && JSON.stringify(branchExports[key]) === JSON.stringify({
      types: `./dist/components/${componentKey[1]}/index.d.ts`,
      import: `./dist/components/${componentKey[1]}/index.js`,
    });
  if (!optInExport && !/^\.\/tokens\/catalogue\.(json|schema\.json)$/.test(key)) problems.push(`new export key ${key} outside the catalogue data allowlist`);
}
const branchScripts = (branchPkg.scripts ?? {}) as Record<string, unknown>;
const mainScripts = (mainPkg.scripts ?? {}) as Record<string, unknown>;
for (const key of Object.keys(mainScripts)) {
  if (!Object.hasOwn(branchScripts, key)) {
    problems.push(`script ${key} was removed: existing script entries are frozen by this change`);
  } else if (JSON.stringify(branchScripts[key]) !== JSON.stringify(mainScripts[key])) {
    problems.push(`script ${key} changed: existing script entries are frozen by this change`);
  }
}
for (const key of Object.keys(branchScripts)) {
  if (Object.hasOwn(mainScripts, key)) continue;
  const profileCheck = addsProfile && key === "button-profile:check" && branchScripts[key] === "bun run scripts/check-button-profile.ts";
  const checkKey = /^([\w-]+):check$/.exec(key);
  const optInCheck = checkKey !== null && newOptIn.has(checkKey[1]!) && branchScripts[key] === `bun run scripts/check-${checkKey[1]}.ts`;
  if (!/^(?:tokens:catalogue|catalogue:identity)/.test(key) && !profileCheck && !optInCheck) problems.push(`new script ${key} outside the catalogue gate allowlist`);
}
for (const key of new Set([...Object.keys(mainPkg), ...Object.keys(branchPkg)])) {
  if (key === "exports" || key === "scripts") continue;
  if (key === "devDependencies" && addsProfile) {
    const before = (mainPkg[key] ?? {}) as Record<string, unknown>;
    const after = (branchPkg[key] ?? {}) as Record<string, unknown>;
    const { postcss, ...unchanged } = after;
    if (!Object.hasOwn(before, "postcss") && postcss === "8.5.28" && JSON.stringify(before) === JSON.stringify(unchanged)) continue;
  }
  if (!Object.hasOwn(branchPkg, key)) {
    problems.push(`package.json field ${key} was removed: a data-only change may not`);
  } else if (!Object.hasOwn(mainPkg, key)) {
    problems.push(`package.json field ${key} was added: a data-only change may not, outside the catalogue export keys and scripts`);
  } else if (JSON.stringify(mainPkg[key]) !== JSON.stringify(branchPkg[key])) {
    problems.push(`package.json field ${key} changed: type, sideEffects and every field outside the catalogue additions are frozen by this change`);
  }
}
// A declared opt-in entry ships complete and exact: its component entry, both
// style files and the Sass partial its sheet compiles from. The style module
// must import exactly the dependencies the manifest declares and its own CSS —
// the build writes that string (scripts/build-styles.ts, `emit`) — so a hidden
// stylesheet dependency cannot ride in behind the new subpath. The entry is
// reachable only through its own export key and is checked by its own script.
for (const [name, entry] of optInEntries) {
  if (!newOptIn.has(name)) continue;
  for (const member of [`dist/components/${name}/index.js`, `dist/styles/${name}.js`, `dist/styles/${name}.css`, partialPath(entry.source)]) {
    if (!branch.has(member)) problems.push(`declared opt-in entry ${name} does not ship ${member}`);
  }
  const expected = entry.dependencies.map(dependency => `import "./${dependency}.js";`).join("\n") + `\nimport "./${name}.css";\n`;
  const shipped = branch.get(`dist/styles/${name}.js`)?.toString();
  if (shipped !== undefined && shipped !== expected) {
    problems.push(`opt-in style entry ${name}: its JS module must import exactly its declared dependencies and its own CSS, found ${JSON.stringify(shipped)}`);
  }
  if (!Object.hasOwn(branchExports, `./components/${name}`)) problems.push(`declared opt-in entry ${name} has no ./components/${name} export key`);
  if (!Object.hasOwn(branchScripts, `${name}:check`)) problems.push(`declared opt-in entry ${name} has no ${name}:check script`);
}
// Since the catalogue merged into main, dist/tokens members exist on both
// sides of the comparison: their presence is the merged state, not a
// violation — the pre-merge invariant that the catalogue data must be new
// there is retired with this block. The member loop above already governs
// these files: byte-identical members pass, and a regenerated catalogue
// document or schema is the sanctioned data change this gate exists to
// allow, while every default member and the whole manifest stay frozen
// exactly as before.

if (problems.length) {
  console.error(`catalogue identity check failed (${problems.length} problem(s)):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
const added = [...branch.keys()].filter(member => !main.has(member));
console.log(`catalogue identity check passed: ${main.size} default members byte-identical; additions: ${added.sort().join(", ")}`);
