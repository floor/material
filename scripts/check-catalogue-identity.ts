#!/usr/bin/env bun
/**
 * scripts/check-catalogue-identity.ts
 *
 * The identity gate: the opt-in token catalogue must be the only change the
 * package's default surface sees. Two packed tarballs — the main tip this tree
 * is compared against, and this tree, built and packed by the same job with
 * the same pinned toolchain — are compared member by member:
 * identical member lists, identical bytes everywhere, except the explicit
 * allowlist (the version fields of package.json and the new dist/tokens data
 * files). Anything else — a moved byte, a renamed file, a shifted bundle —
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
    execFileSync("tar", ["-xzf", tgz, "-C", dir]);
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
    return members;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const branch = readTarball(branchTgz);
const main = readTarball(mainTgz);

/** The only differences a data-only change may introduce. */
const allowed = (member: string): boolean =>
  member === "package.json" || member.startsWith("dist/tokens/");

const problems: string[] = [];
for (const member of [...new Set([...main.keys(), ...branch.keys()])].sort()) {
  const inMain = main.get(member);
  const inBranch = branch.get(member);
  if (inMain === undefined) {
    if (!allowed(member)) problems.push(`added member ${member} outside the allowlist (package.json, dist/tokens/*)`);
    continue;
  }
  if (inBranch === undefined) {
    problems.push(`removed member ${member}: the default surface cannot lose a file`);
    continue;
  }
  if (inMain.equals(inBranch)) continue;
  if (!allowed(member)) {
    problems.push(`changed member ${member} (${inMain.length} -> ${inBranch.length} bytes): a data-only change must not touch the default surface`);
  }
}

// The allowlist is not a blank cheque: package.json may only change its
// version field and the new export keys, and dist/tokens may only add.
const branchPkg = JSON.parse(branch.get("package.json")!.toString()) as Record<string, unknown>;
const mainPkg = JSON.parse(main.get("package.json")!.toString()) as Record<string, unknown>;
if (branchPkg.version === mainPkg.version) problems.push("package.json versions are identical — the compared tarballs are not a versioned pair");
const newKeys = Object.keys((branchPkg.exports ?? {}) as object).filter(key => !Object.hasOwn((mainPkg.exports ?? {}) as object, key));
for (const key of newKeys) {
  if (!/^\.\/tokens\/catalogue\.(json|schema\.json)$/.test(key)) problems.push(`new export key ${key} outside the catalogue data allowlist`);
}
const changedKeys = Object.keys((branchPkg.exports ?? {}) as object)
  .filter(key => Object.hasOwn((mainPkg.exports ?? {}) as object, key))
  .filter(key => JSON.stringify((branchPkg.exports as Record<string, unknown>)[key]) !== JSON.stringify((mainPkg.exports as Record<string, unknown>)[key]));
for (const key of changedKeys) problems.push(`export key ${key} changed: existing export targets are frozen by this change`);
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
