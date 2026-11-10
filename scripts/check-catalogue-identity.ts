#!/usr/bin/env bun
/**
 * scripts/check-catalogue-identity.ts
 *
 * The identity gate: the opt-in token catalogue must be the only change the
 * package's default surface sees. Two packed tarballs — the main tip this tree
 * is compared against, and this tree, built and packed by the same job with
 * the same pinned toolchain — are compared member by member:
 * identical member lists, identical bytes everywhere, except the explicit
 * allowlist (the version fields of package.json, the new dist/tokens data
 * files, and whole-line additions to README.md — documentation of the new
 * data may be added, existing documentation may not be rewritten). Anything
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
for (const member of [...new Set([...main.keys(), ...branch.keys()])].sort()) {
  const inMain = main.get(member);
  const inBranch = branch.get(member);
  if (inMain === undefined) {
    if (!allowed(member)) problems.push(`added member ${member} outside the allowlist (package.json, README.md, dist/tokens/*)`);
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
  if (!/^\.\/tokens\/catalogue\.(json|schema\.json)$/.test(key)) problems.push(`new export key ${key} outside the catalogue data allowlist`);
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
  if (!/^(?:tokens:catalogue|catalogue:identity)/.test(key)) problems.push(`new script ${key} outside the catalogue gate allowlist`);
}
for (const key of new Set([...Object.keys(mainPkg), ...Object.keys(branchPkg)])) {
  if (key === "exports" || key === "scripts") continue;
  if (!Object.hasOwn(branchPkg, key)) {
    problems.push(`package.json field ${key} was removed: a data-only change may not`);
  } else if (!Object.hasOwn(mainPkg, key)) {
    problems.push(`package.json field ${key} was added: a data-only change may not, outside the catalogue export keys and scripts`);
  } else if (JSON.stringify(mainPkg[key]) !== JSON.stringify(branchPkg[key])) {
    problems.push(`package.json field ${key} changed: type, sideEffects and every field outside the catalogue additions are frozen by this change`);
  }
}
for (const member of branch.keys()) {
  if (main.has(member) && member.startsWith("dist/tokens/")) problems.push(`dist/tokens/${member.slice("dist/tokens/".length)} exists in main: the catalogue data is not new there`);
}

if (problems.length) {
  console.error(`catalogue identity check failed (${problems.length} problem(s)):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
const added = [...branch.keys()].filter(member => !main.has(member));
console.log(`catalogue identity check passed: ${main.size} default members byte-identical; additions: ${added.sort().join(", ")}`);
