#!/usr/bin/env bun
/**
 * Changelog fragments: one file per pull request under `.changes/`.
 *
 * A fragment is a small Markdown file. Header lines come first, then a blank
 * line, then the bullet's text (one paragraph; no leading `-`):
 *
 *   Section: Fixed
 *   Migration: optional, one line
 *
 *   **What changed (links).** Why it changed, and what stays the same.
 *
 * `Section` is Added, Changed, Deprecated or Fixed. `Migration` is optional;
 * it renders as a trailing `Migration: …` sentence in the same bullet.
 *
 * The assembler groups the fragments into a release section and deletes the
 * files it consumed. A release pull request runs:
 *
 *   bun run changelog:assemble 3.14.2 2026-11-16
 *
 * The section body sorts by section order (Added, Changed, Deprecated, Fixed),
 * then by fragment filename in byte order, so two pull requests that each add
 * a fragment merge in either order with no conflict and the same output.
 *
 * The check runs on every pull request: a change under `src/` adds a fragment,
 * and no branch except `release/*` edits CHANGELOG.md. It reads the pull
 * request's base from CHANGELOG_BASE and its branch from GITHUB_HEAD_REF.
 */
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const FRAGMENT_DIR = ".changes";
export const SECTION_ORDER = ["Added", "Changed", "Deprecated", "Fixed"] as const;
export type Section = (typeof SECTION_ORDER)[number];

export interface Fragment {
  /** Repository-relative path; the assembler sorts within a section by it. */
  path: string;
  section: Section;
  text: string;
  migration?: string;
}

export interface Change {
  /** `A`, `M`, `D`, `R…` from `git diff --name-status`. */
  status: string;
  path: string;
}

const HEADER = /^(Section|Migration):\s*(.*)$/;

/** Parse one fragment. Throws with the path and the reason on anything unexpected. */
export function parseFragment(path: string, source: string): Fragment {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  let section: Section | undefined;
  let migration: string | undefined;
  let index = 0;
  for (; index < lines.length; index += 1) {
    const line = lines[index]!;
    if (line.trim() === "") break;
    const header = HEADER.exec(line);
    if (!header) throw new Error(`${path}: expected "Section:" or "Migration:" on line ${index + 1}, got ${JSON.stringify(line)}`);
    const [, key, value] = header as unknown as [string, "Section" | "Migration", string];
    if (key === "Section") {
      if (section !== undefined) throw new Error(`${path}: Section is written twice`);
      if (!(SECTION_ORDER as readonly string[]).includes(value.trim())) {
        throw new Error(`${path}: Section must be one of ${SECTION_ORDER.join(", ")}, got ${JSON.stringify(value.trim())}`);
      }
      section = value.trim() as Section;
    } else {
      if (migration !== undefined) throw new Error(`${path}: Migration is written twice`);
      if (value.trim() === "") throw new Error(`${path}: Migration is empty; omit the line instead`);
      migration = value.trim();
    }
  }
  if (section === undefined) throw new Error(`${path}: no Section line`);
  if (lines[index]?.trim() !== "" && index < lines.length) throw new Error(`${path}: headers must be followed by a blank line`);
  const body = lines.slice(index + 1).join("\n").trim();
  if (body === "") throw new Error(`${path}: the bullet text is empty`);
  if (body.startsWith("-") || body.startsWith("* ")) throw new Error(`${path}: the bullet text starts with a list marker; the assembler adds it`);
  if (/\n\s*\n/.test(body)) throw new Error(`${path}: one paragraph per fragment; split it into two fragments instead`);
  return { path, section, text: body, ...(migration === undefined ? {} : { migration }) };
}

const byPath = (a: Fragment, b: Fragment): number => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

/** The grouped `###` blocks for a set of fragments, without a version heading. */
export function renderSection(fragments: readonly Fragment[]): string {
  const grouped = new Map<Section, Fragment[]>();
  for (const fragment of fragments) {
    const list = grouped.get(fragment.section) ?? [];
    list.push(fragment);
    grouped.set(fragment.section, list);
  }
  const blocks: string[] = [];
  for (const section of SECTION_ORDER) {
    const list = grouped.get(section);
    if (list === undefined || list.length === 0) continue;
    const bullets = [...list].sort(byPath).map(fragment => {
      const text = fragment.text.split("\n").join("\n  ");
      return `- ${text}${fragment.migration === undefined ? "" : ` Migration: ${fragment.migration}`}`;
    });
    blocks.push(`### ${section}\n\n${bullets.join("\n")}`);
  }
  return blocks.join("\n\n");
}

/** The latest released `## [x.y.z]` heading in the file, for the comparison links. */
export function latestVersion(changelog: string): string | undefined {
  for (const line of changelog.split("\n")) {
    const heading = /^## \[(\d+\.\d+\.\d+(?:-next\.\d+)?)\]/.exec(line);
    if (heading) return heading[1];
  }
  return undefined;
}

/**
 * Insert the assembled section after `## [Unreleased]` and move the comparison
 * links: `[Unreleased]` against the new version, a new entry for it against the
 * previous one. Pure; the caller writes the file and deletes the fragments.
 */
export function assemble(
  changelog: string,
  fragments: readonly Fragment[],
  version: string,
  date: string,
): { changelog: string; section: string } {
  if (fragments.length === 0) throw new Error(`${FRAGMENT_DIR}/ has no fragments to assemble`);
  if (!/^\d+\.\d+\.\d+(?:-next\.\d+)?$/.test(version)) throw new Error(`not a version: ${JSON.stringify(version)}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`not a date (YYYY-MM-DD): ${JSON.stringify(date)}`);
  if (new RegExp(`^## \\[${version.replace(/\./g, "\\.")}\\]`, "m").test(changelog)) {
    throw new Error(`CHANGELOG.md already has a section for ${version}`);
  }
  const lines = changelog.split("\n");
  const unreleased = lines.findIndex(line => line === "## [Unreleased]");
  if (unreleased === -1) throw new Error("CHANGELOG.md has no ## [Unreleased] heading");
  const previous = latestVersion(changelog);
  if (previous === undefined) throw new Error("CHANGELOG.md has no released section to compare against");
  const section = renderSection(fragments);
  lines.splice(unreleased + 1, 0, "", `## [${version}] - ${date}`, "", section);

  const link = (name: string): number => lines.findIndex(line => line.startsWith(`[${name}]: `));
  const unreleasedLink = link("Unreleased");
  if (unreleasedLink !== -1) {
    lines[unreleasedLink] = `[Unreleased]: https://github.com/floor/material/compare/v${version}...HEAD`;
    const previousLink = link(previous);
    const at = previousLink === -1 ? unreleasedLink + 1 : previousLink;
    lines.splice(at, 0, `[${version}]: https://github.com/floor/material/compare/v${previous}...v${version}`);
  } else {
    lines.push("", `[Unreleased]: https://github.com/floor/material/compare/v${version}...HEAD`);
    lines.push(`[${version}]: https://github.com/floor/material/compare/v${previous}...v${version}`);
  }
  return { changelog: lines.join("\n"), section };
}

/** Fragments are consumed under the release branch; other branches keep them. */
const isReleaseBranch = (branch: string): boolean => branch === "release" || branch.startsWith("release/") || branch.startsWith("refs/heads/release/");

export interface ChangeSet {
  branch: string;
  changes: readonly Change[];
  /** Fragment sources by path, for the added ones. */
  fragments: ReadonlyMap<string, string>;
}

/** The rules a pull request's diff must satisfy. Returns one message per failure. */
export function lintChanges({ branch, changes, fragments }: ChangeSet): string[] {
  const errors: string[] = [];
  const paths = changes.map(change => change.path);
  const added = changes.filter(change => change.status.startsWith("A"));
  const deleted = changes.filter(change => change.status.startsWith("D"));
  const fragmentsAdded = added.filter(change => change.path.startsWith(`${FRAGMENT_DIR}/`) && change.path.endsWith(".md"));
  const fragmentsDeleted = deleted.filter(change => change.path.startsWith(`${FRAGMENT_DIR}/`));
  const srcChanged = paths.some(path => path.startsWith("src/"));
  const release = isReleaseBranch(branch);

  if (release) {
    for (const change of fragmentsAdded) errors.push(`${change.path}: a release pull request assembles fragments, it does not add them`);
    for (const path of fragments.keys()) {
      if (!fragmentsAdded.some(change => change.path === path)) errors.push(`${path}: not an added fragment on this branch`);
    }
    for (const [path, source] of fragments) {
      try {
        parseFragment(path, source);
      } catch (error) {
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }
    return errors;
  }

  if (paths.includes("CHANGELOG.md")) {
    errors.push("CHANGELOG.md: a pull request adds .changes/<slug>.md instead; only release/* branches edit CHANGELOG.md");
  }
  if (srcChanged && fragmentsAdded.length === 0) {
    errors.push(`src/: a change under src/ needs one ${FRAGMENT_DIR}/<slug>.md fragment`);
  }
  if (fragmentsDeleted.length > 0) {
    errors.push(`${fragmentsDeleted[0]!.path}: fragments are deleted by the release assembler, not by a pull request`);
  }
  for (const [path, source] of fragments) {
    try {
      parseFragment(path, source);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

const fragmentFiles = async (): Promise<string[]> =>
  (await readdir(FRAGMENT_DIR).catch(() => [] as string[])).filter(name => name.endsWith(".md")).sort();

const readFragments = async (): Promise<Fragment[]> =>
  Promise.all((await fragmentFiles()).map(async name => {
    const path = join(FRAGMENT_DIR, name);
    return parseFragment(path, await readFile(path, "utf8"));
  }));

async function assembleCommand(version: string | undefined, date: string | undefined): Promise<void> {
  if (version === undefined || date === undefined) throw new Error("usage: bun run changelog:assemble <version> <YYYY-MM-DD>");
  const fragments = await readFragments();
  const result = assemble(await readFile("CHANGELOG.md", "utf8"), fragments, version, date);
  await writeFile("CHANGELOG.md", result.changelog);
  for (const fragment of fragments) await rm(fragment.path);
  console.log(result.section);
  console.log(`\nAssembled ${fragments.length} fragment(s) into ${version}; deleted ${fragments.map(fragment => fragment.path).join(", ")}.`);
}

async function git(args: string[]): Promise<string> {
  const child = Bun.spawn(["git", ...args], { stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0) throw new Error(`git ${args.join(" ")} failed: ${stderr.trim()}`);
  return stdout;
}

async function checkCommand(): Promise<void> {
  const event = process.env.GITHUB_EVENT_NAME;
  if (event !== undefined && event !== "pull_request") {
    console.log(`changelog:check: ${event}; fragments are checked on pull requests only`);
    return;
  }
  const base = process.env.CHANGELOG_BASE ?? "origin/main";
  const branch = process.env.GITHUB_HEAD_REF ?? (await git(["rev-parse", "--abbrev-ref", "HEAD"])).trim();
  const head = process.env.CHANGELOG_HEAD ?? "HEAD";
  const changes: Change[] = (await git(["diff", "--name-status", base, head]))
    .split("\n")
    .filter(line => line.trim() !== "")
    .map(line => {
      const [status, ...path] = line.split("\t");
      return { status: status!.trim(), path: path.join("\t").trim() };
    });
  const fragments = new Map<string, string>();
  for (const change of changes) {
    if (change.status.startsWith("A") && change.path.startsWith(`${FRAGMENT_DIR}/`) && change.path.endsWith(".md")) {
      fragments.set(change.path, await readFile(change.path, "utf8"));
    }
  }
  const errors = lintChanges({ branch, changes, fragments });
  if (errors.length > 0) {
    for (const error of errors) console.error(`changelog:check: ${error}`);
    throw new Error(`${errors.length} changelog rule(s) failed`);
  }
  if (isReleaseBranch(branch)) {
    console.log(`changelog:check: release branch; ${changes.filter(change => change.path === "CHANGELOG.md").length} CHANGELOG.md change(s)`);
    return;
  }
  const added = changes.filter(change => change.path.startsWith(`${FRAGMENT_DIR}/`) && change.status.startsWith("A")).length;
  console.log(`changelog:check: ${added} fragment(s); ${changes.some(change => change.path.startsWith("src/")) ? "src/ change has one" : "no src/ change"}`);
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  if (command === "assemble") {
    await assembleCommand(args[0], args[1]);
    return;
  }
  if (command === "check") {
    await checkCommand();
    return;
  }
  throw new Error("usage: bun run scripts/changelog-fragments.ts <assemble <version> <date>|check>");
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
