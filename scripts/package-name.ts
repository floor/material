#!/usr/bin/env bun
/**
 * One tree, two names: `mtrl` and `material`.
 *
 * mtrl 1.0.0 and material 3.0.0 are the same code. Only the package name, the
 * import specifiers and the repository links differ: the class prefix `mtrl-`,
 * the custom properties `--mtrl-`, the cascade layers `mtrl.*`, the symbols,
 * the `m-` tags and `data-mtrl-ssr` stay under either name. The generated
 * adapters import the package by its own name, so each name is built from its
 * own tree; this script turns one tree into the other, in both directions.
 *
 *   bun scripts/package-name.ts material 3.0.0 floor/material   rename to `material`
 *   bun scripts/package-name.ts mtrl 0.10.6 floor/mtrl           rename back to `mtrl`
 *   bun scripts/package-name.ts mtrl --check                    change nothing; exit 1 if the tree is not consistently `mtrl`
 *   bun scripts/package-name.ts material 3.0.0 floor/material --dry-run   print every change, write nothing
 *
 * **NEVER PUSH mtrl's VERSION TAGS TO `floor/material`.** A pushed `v*` tag
 * starts a publish of that version there: npm's trusted publisher for
 * `material` is bound to the workflow file name in the pair's data (today
 * `.github/workflows/publish.yml`), and the tag is what triggers the release.
 *
 * The names are data: `scripts/fixtures/package-names/<pair>.json` holds the
 * pair (name, repository, workflow file), the allowlist of what stays under
 * either name, and the one-off keeps. A second pair — mtrl-addons →
 * material-addons — would be another data file, not another script.
 *
 * Every occurrence of the name being replaced must be classified: a change
 * rule, an allowlist entry, or a keep. Anything else — and a change that would
 * touch a guarded allowlist string — is an error naming the file and line,
 * never a silent skip. Explicit entries are exact text (no pattern can see
 * them) and are applied before the rules, so the rules never touch their
 * spans; an entry whose old text is not found fails by name.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const DATA_DIR = join(ROOT, "scripts/fixtures/package-names");

// ---------------------------------------------------------------------------
// The data

export interface NameSpec {
  /** the package name */
  name: string;
  /** `owner/repo`, as npm's trusted publishing compares it */
  repository: string;
  /** the release workflow file in `.github/workflows` */
  workflow: string;
}

export interface AllowEntry {
  id: string;
  reason: string;
  /** a keep rule of this script */
  rule?: string;
  /** a regular expression, matched against the line, that must cover the occurrence */
  pattern?: string;
  /** a whole file, kept as it is */
  file?: string;
  /** the strings a change must never touch: a change crossing one is an error */
  guard?: boolean;
  /** inputs that must come out unchanged, read by `--check` and by the unit test */
  examples: { file?: string; text: string }[];
}

export interface KeepEntry {
  id: string;
  file: string;
  /** the exact text that must be present, unchanged, on either tree */
  text: string;
  reason: string;
}

export interface Pair {
  pair: string;
  names: NameSpec[];
  allowlist: AllowEntry[];
  keeps: KeepEntry[];
}

/** One-off edits no pattern can see. `%s`/`%t` are the source and target names,
 *  `%S`/`%T` the source and target workflow file names. */
export interface ChangeEntry {
  id: string;
  file: string;
  find: string;
  replace: string;
  reason: string;
}

export const ENTRIES: ChangeEntry[] = [
  {
    id: "consumer-subpath-template",
    file: "scripts/check-consumer.ts",
    find: "map(key => `%s${key.slice(1)}`)",
    replace: "map(key => `%t${key.slice(1)}`)",
    reason: "a template literal builds the subpath the consumer check imports; `${…}` right after the name is invisible to a quoted-subpath pattern",
  },
  {
    id: "consumer-size-budgets",
    file: "scripts/check-consumer.ts",
    find: '["addClass", "addClass", 750, "%s/core/dom"], ["textfield", "createTextField", 9700, "%s"], ["button", "createButton", 8550, "%s"],',
    replace: '["addClass", "addClass", 750, "%t/core/dom"], ["textfield", "createTextField", 9700, "%t"], ["button", "createButton", 8550, "%t"],',
    reason: "the size budgets name the specifiers they measure; the bare `\"%s\"` entries are not import forms",
  },
  {
    id: "release-title",
    file: ".github/workflows/%S",
    find: '--title "%s $version"',
    replace: '--title "%t $version"',
    reason: "the GitHub Release's title is the package name and the version",
  },
  {
    id: "contributing-workflow-name",
    file: ".github/CONTRIBUTING.md",
    find: "`.github/workflows/%S`",
    replace: "`.github/workflows/%T`",
    reason: "CONTRIBUTING names the release workflow; npm's trusted publisher for `material` is bound to its file name",
  },
  {
    id: "release-notes-test-workflow-name",
    file: "test/scripts/release-notes.test.ts",
    find: "(%S)",
    replace: "(%T)",
    reason: "the test's header names the workflow the release notes come from",
  },
];

/** Files whose name-bearing lines are written by a generator or are data,
 *  never by this script: `bun run adapters:generate`, `root-exports:update`,
 *  `bun install`, and the pair's own data file. */
const GENERATED = [
  /^src\/(react|solid|vue)\/(?!create\.ts$|css\.d\.ts$).*\.ts$/,
  /^scripts\/fixtures\/package-names\/.*\.json$/,
];

// ---------------------------------------------------------------------------
// The rules
//
// Every occurrence of the name is classified by the first rule that matches.
// The keeps before the change rules win over them (`scoped-name`: a dependency
// scope is never this package's name); the keeps after catch what the change
// rules must not touch. The detailed change rules come before the broad ones,
// so the summary reads like plan 2.2's table.

export interface Span {
  start: number;
  end: number;
}

export interface Finding {
  file: string;
  line: number;
  kind: "change" | "keep";
  /** the rule id, or the allowlist entry's id for a rule it names */
  id: string;
}

export interface Problem {
  file: string;
  line: number;
  message: string;
}

export interface Edit extends Span {
  file: string;
  line: number;
  id: string;
  from: string;
  to: string;
}

export interface FileScan {
  edits: Edit[];
  findings: Finding[];
  problems: Problem[];
  /** per rule id: occurrences, and the lines they sit on */
  counts: Map<string, { occurrences: number; lines: Set<number> }>;
  /** per allowlist entry id: occurrences it covers */
  allow: Map<string, number>;
  /** the file is allowlisted whole and was not scanned */
  skipped: boolean;
}

const isQuote = (ch: string): boolean => ch === "\"" || ch === "'" || ch === "`";
const isWord = (ch: string): boolean => ch !== "" && /[A-Za-z0-9_$]/.test(ch);

function lineStartsOf(text: string): number[] {
  const starts = [0];
  for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) starts.push(i + 1);
  return starts;
}

function lineAt(starts: number[], index: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (starts[middle] <= index) low = middle;
    else high = middle - 1;
  }
  return low + 1;
}

function lineTextAt(text: string, starts: number[], line: number): string {
  const start = starts[line - 1];
  const end = text.indexOf("\n", start);
  return text.slice(start, end === -1 ? text.length : end);
}

/** The one occurrence of `from` in `text`, or why there is not one. */
function locate(text: string, from: string): { start: number; end: number } | "absent" | "many" {
  const first = text.indexOf(from);
  if (first === -1) return "absent";
  if (text.indexOf(from, first + 1) !== -1) return "many";
  return { start: first, end: first + from.length };
}

export interface Ctx {
  text: string;
  index: number;
  /** the line the occurrence sits on */
  line: string;
  lineNumber: number;
  /** the name being classified and its spec — the repository drives the link rule */
  from: NameSpec;
}

const prev = (c: Ctx): string => (c.index === 0 ? "" : c.text[c.index - 1]);
const next = (c: Ctx): string => {
  const at = c.index + c.from.name.length;
  return at >= c.text.length ? "" : c.text[at];
};
const before = (c: Ctx, n: number): string => c.text.slice(Math.max(0, c.index - n), c.index);
const after = (c: Ctx, n: number): string => c.text.slice(c.index + c.from.name.length, c.index + c.from.name.length + n);

/** The plan's IMP, and the forms plan 1.2 lists as missing from it. Ends with the opening quote: `before()` stops at it. */
const IMPORT_BEFORE = /(?:from|import|require\(|resolve\(|import\()\s*["'`]$/;
const PROSE_PREV = /^[\s([{,;:*#>|&=+\\]$/;
const PROSE_NEXT = /^[\s)\][}!?,;:*|'"’—–@]$/;

interface Rule {
  id: string;
  test: (c: Ctx) => boolean;
}

/** Keeps that win over every change rule. */
const PRE_KEEPS: Rule[] = [
  // A dependency's scope, never this package's name.
  { id: "scoped-name", test: (c) => prev(c) === "@" },
];

const CHANGES: Rule[] = [
  // Repository links, before any subpath rule: `github.com/<owner>/mtrl` is
  // followed by `/`, `.git`, `)`, a quote or the end of the line — never by
  // `-`, so `github.com/floor/mtrl-addons` is never caught (plan 1.3).
  {
    id: "repository-link",
    test: (c) =>
      before(c, 80).endsWith(`github.com/${c.from.repository.split("/")[0]}/`) &&
      (next(c) === "" || next(c) === "/" || next(c) === "." || next(c) === ")" || isQuote(next(c))),
  },
  // The plan's import forms: a quote preceded by `from`, `import`, `import(`,
  // `require(` or `resolve(`, closed by the same quote or followed by `/`.
  {
    id: "import-form",
    test: (c) => isQuote(prev(c)) && IMPORT_BEFORE.test(before(c, 40)) && (next(c) === prev(c) || next(c) === "/"),
  },
  // `createRequire(import.meta.url)('mtrl')` (scripts/check-package-size.ts).
  {
    id: "create-require",
    test: (c) => isQuote(prev(c)) && /createRequire\([^)]*\)\s*\(\s*["'`]$/.test(before(c, 80)) && next(c) === prev(c),
  },
  // `node_modules/mtrl` followed by `/`, a quote, or the end of the word.
  {
    id: "node-modules",
    test: (c) =>
      before(c, 20).endsWith("node_modules/") &&
      (next(c) === "" || next(c) === "/" || next(c) === ")" || next(c) === "," || next(c) === " " || isQuote(next(c))),
  },
  {
    id: "npm-cli",
    test: (c) =>
      /(?:npm install|npm view) $/.test(before(c, 20)) &&
      (next(c) === "" || next(c) === " " || next(c) === "," || next(c) === "\n" || isQuote(next(c))),
  },
  {
    id: "npmjs-link",
    test: (c) =>
      before(c, 30).endsWith("npmjs.com/package/") &&
      (next(c) === "" || next(c) === "/" || next(c) === " " || next(c) === ")" || isQuote(next(c))),
  },
  // `mtrl@${version}` in the release notes' footer.
  { id: "release-tag", test: (c) => prev(c) === "`" && next(c) === "@" },

  // A quoted subpath outside an import — tables, arrays, Sass `@use`, comments,
  // `declare module "mtrl/…"` — and then the bare `mtrl/…` of prose and paths.
  { id: "quoted-subpath", test: (c) => isQuote(prev(c)) && (next(c) === "/" || (next(c) === "\\" && after(c, 1) === "/")) },
  { id: "subpath", test: (c) => next(c) === "/" || (next(c) === "\\" && after(c, 1) === "/") },
];

/** What stays. */
const POST_KEEPS: Rule[] = [
  // The class prefix and everything built on it: `mtrl-button`, `--mtrl-…`,
  // `mtrl-card__content`, `mtrl-button--filled`, `mtrl-consumer-`.
  { id: "name-dash", test: (c) => next(c) === "-" },
  // `mtrl.` layers, symbols, the site `mtrl.app`, a sentence's full stop.
  { id: "dotted-form", test: (c) => next(c) === "." },
  // `window.mtrl`, `w.mtrl[kind]`, `config.mtrl`.
  { id: "member-access", test: (c) => prev(c) === "." },
  // `{ mtrl: … }`, `mtrl: Record<string, …>`.
  { id: "object-key", test: (c) => next(c) === ":" },
  // A longer identifier: `mtrlWarnings`, `mtrl_textinput_box_label_cutout_padding`.
  { id: "identifier-runs", test: (c) => isWord(prev(c)) || isWord(next(c)) },
  // A path or host fragment: `file:../mtrl`, `https://mtrl.test/`, `YOUR-USERNAME/mtrl.git`.
  { id: "path-fragment", test: (c) => prev(c) === "/" },
  // A bare quoted name outside an import: a table cell, a policy name.
  { id: "quoted-bare", test: (c) => isQuote(prev(c)) },
  // The word in prose and comments, and identifier bindings like `import * as mtrl`.
  { id: "prose", test: (c) => (prev(c) === "" || PROSE_PREV.test(prev(c))) && (next(c) === "" || PROSE_NEXT.test(next(c))) },
];

// ---------------------------------------------------------------------------
// Classification

export function scanText(text: string, file: string, from: NameSpec, to: NameSpec, pair: Pair, handled: Span[] = []): FileScan {
  const starts = lineStartsOf(text);
  const edits: Edit[] = [];
  const findings: Finding[] = [];
  const problems: Problem[] = [];
  const counts = new Map<string, { occurrences: number; lines: Set<number> }>();
  const allow = new Map<string, number>();

  const skipped = pair.allowlist.find((entry) => entry.file === file);
  if (skipped !== undefined) {
    allow.set(skipped.id, text.split(from.name).length - 1);
    return { edits, findings, problems, counts, allow, skipped: true };
  }

  const record = (id: string, lineNumber: number): void => {
    const count = counts.get(id) ?? { occurrences: 0, lines: new Set<number>() };
    count.occurrences += 1;
    count.lines.add(lineNumber);
    counts.set(id, count);
  };
  const inHandled = (index: number): boolean => handled.some((span) => index >= span.start && index < span.end);

  for (let index = text.indexOf(from.name); index !== -1; index = text.indexOf(from.name, index + from.name.length)) {
    if (inHandled(index)) continue;
    const lineNumber = lineAt(starts, index);
    const line = lineTextAt(text, starts, lineNumber);
    const at = index - starts[lineNumber - 1];
    const ctx: Ctx = { text, index, line, lineNumber, from };

    // The allowlist strings that cover this occurrence (whole files were skipped above).
    const covered = pair.allowlist.filter((entry) => {
      if (entry.pattern === undefined) return false;
      for (const match of line.matchAll(new RegExp(entry.pattern, "g"))) {
        const start = match.index;
        if (at >= start && at < start + match[0].length) return true;
      }
      return false;
    });
    for (const entry of covered) allow.set(entry.id, (allow.get(entry.id) ?? 0) + 1);

    const preKeep = PRE_KEEPS.find((rule) => rule.test(ctx));
    if (preKeep !== undefined) {
      record(preKeep.id, lineNumber);
      findings.push({ file, line: lineNumber, kind: "keep", id: namedKeep(pair, preKeep.id) });
      continue;
    }

    const change = CHANGES.find((rule) => rule.test(ctx));
    if (change !== undefined) {
      const guarded = covered.filter((entry) => entry.guard === true);
      if (guarded.length > 0) {
        problems.push({
          file,
          line: lineNumber,
          message: `a change (${change.id}) would touch the allowlisted ${guarded.map((entry) => `\`${entry.id}\``).join(", ")}: ${line.trim()}`,
        });
        continue;
      }
      edits.push({ file, line: lineNumber, id: change.id, from: from.name, to: to.name, start: index, end: index + from.name.length });
      record(change.id, lineNumber);
      findings.push({ file, line: lineNumber, kind: "change", id: change.id });
      continue;
    }

    const keep = POST_KEEPS.find((rule) => rule.test(ctx));
    if (keep !== undefined) {
      record(keep.id, lineNumber);
      findings.push({ file, line: lineNumber, kind: "keep", id: namedKeep(pair, keep.id) });
      continue;
    }

    problems.push({ file, line: lineNumber, message: `unclassified \`${from.name}\` occurrence: ${line.trim()}` });
  }

  return { edits, findings, problems, counts, allow, skipped: false };
}

function namedKeep(pair: Pair, rule: string): string {
  return pair.allowlist.find((entry) => entry.rule === rule)?.id ?? rule;
}

/** The edits applied to `text`: `from` to `to`, nothing else. Throws on overlap
 *  and on anything the rules cannot classify — never a silent skip. */
export function rewrite(text: string, file: string, from: NameSpec, to: NameSpec, pair: Pair, handled: Span[] = []): string {
  const scan = scanText(text, file, from, to, pair, handled);
  if (scan.problems.length > 0) {
    throw new Error(scan.problems.map((problem) => `${problem.file}:${problem.line} ${problem.message}`).join("\n"));
  }
  return applyEdits(text, scan.edits);
}

export function applyEdits(text: string, edits: Edit[]): string {
  let next = text;
  let last = text.length;
  for (const edit of [...edits].sort((a, b) => b.start - a.start)) {
    if (edit.end > last) throw new Error(`overlapping edits at ${edit.file}:${edit.line}`);
    next = next.slice(0, edit.start) + edit.to + next.slice(edit.end);
    last = edit.start;
  }
  return next;
}

// ---------------------------------------------------------------------------
// The tree

export function isGenerated(file: string): boolean {
  return GENERATED.some((pattern) => pattern.test(file));
}

export interface TreeScan {
  files: number;
  findings: Finding[];
  problems: Problem[];
  edits: Edit[];
  counts: Map<string, { occurrences: number; lines: Set<number> }>;
  allow: Map<string, number>;
}

export function listFiles(): string[] {
  const result = spawnSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" });
  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  if (result.status !== 0 || stdout === "") {
    return readdirSync(ROOT, { recursive: true, encoding: "utf8" })
      .filter((entry) => /\.(ts|tsx|js|mjs|json|md|yml|yaml|scss|css|lock|svelte|html)$/.test(entry))
      .filter((entry) => !/^(node_modules|dist|docs|analysis|\.git)\//.test(entry));
  }
  return stdout.split("\0").filter(Boolean);
}

function read(file: string): string | undefined {
  try {
    return readFileSync(join(ROOT, file), "utf8");
  } catch {
    return undefined;
  }
}

function scanTree(from: NameSpec, to: NameSpec, pair: Pair, handledFiles: Map<string, Span[]>): TreeScan {
  const scan: TreeScan = { files: 0, findings: [], problems: [], edits: [], counts: new Map(), allow: new Map() };
  for (const file of listFiles()) {
    if (isGenerated(file)) continue;
    const text = read(file);
    if (text === undefined || text.includes("\0")) continue;
    scan.files += 1;
    const found = scanText(text, file, from, to, pair, handledFiles.get(file) ?? []);
    scan.edits.push(...found.edits);
    scan.findings.push(...found.findings);
    scan.problems.push(...found.problems);
    for (const [id, count] of found.counts) {
      const total = scan.counts.get(id) ?? { occurrences: 0, lines: new Set<number>() };
      total.occurrences += count.occurrences;
      for (const line of count.lines) total.lines.add(line);
      scan.counts.set(id, total);
    }
    for (const [id, count] of found.allow) scan.allow.set(id, (scan.allow.get(id) ?? 0) + count);
  }
  return scan;
}

// ---------------------------------------------------------------------------
// package.json and the structural invariants

interface Manifest {
  name?: string;
  version?: string;
  repository?: { url?: string };
  bugs?: { url?: string };
  typedocOptions?: { navigationLinks?: Record<string, string> };
  scripts?: Record<string, string>;
}

const MANIFEST_FIELDS = (spec: NameSpec): { find: string; what: string }[] => [
  { find: `"name": "${spec.name}"`, what: "name" },
  { find: `"url": "git+https://github.com/${spec.repository}.git"`, what: "repository.url" },
  { find: `"url": "https://github.com/${spec.repository}/issues"`, what: "bugs.url" },
  { find: `"GitHub": "https://github.com/${spec.repository}"`, what: "typedocOptions.navigationLinks.GitHub" },
  { find: `bun run scripts/package-name.ts ${spec.name} --check`, what: "scripts.name:check" },
];

/** Every field of step 1, each unique in package.json, as text edits. */
function manifestEdits(packageText: string, from: NameSpec, to: NameSpec, version: string | undefined): { edits: Edit[]; problems: Problem[] } {
  const edits: Edit[] = [];
  const problems: Problem[] = [];
  const starts = lineStartsOf(packageText);
  for (const field of MANIFEST_FIELDS(from)) {
    if (field.what === "scripts.name:check" && !packageText.includes('"name:check"')) continue;
    const at = locate(packageText, field.find);
    if (at === "absent" || at === "many") {
      problems.push({ file: "package.json", line: 0, message: `${at === "absent" ? "no" : "more than one"} ${field.what} to rename (\`${field.find}\`)` });
      continue;
    }
    edits.push({ file: "package.json", line: lineAt(starts, at.start), id: field.what, from: field.find, to: field.find.replace(from.name, to.name), ...at });
  }
  if (version !== undefined) {
    const current = /"version": "([^"]+)"/.exec(packageText)?.[1];
    const find = current === undefined ? "" : `"version": "${current}"`;
    const at = current === undefined ? "absent" : locate(packageText, find);
    if (at === "absent" || at === "many") {
      problems.push({ file: "package.json", line: 0, message: `no unique version to set (\`${find}\`)` });
    } else {
      edits.push({ file: "package.json", line: lineAt(starts, at.start), id: "version", from: find, to: `"version": "${version}"`, ...at });
    }
  }
  return { edits, problems };
}

/** What must hold in any tree this script runs on, whatever its name. */
function structuralProblems(pair: Pair, spec: NameSpec): Problem[] {
  const problems: Problem[] = [];
  // The banner: a one-time source change, so the script does not rewrite it —
  // it checks that it was made (scripts/build.ts reads the package name).
  const build = read("scripts/build.ts");
  const banner = build === undefined ? undefined : /^const banner = .*$/m.exec(build)?.[0];
  if (banner !== undefined && pair.names.some((name) => banner.includes(name.name))) {
    problems.push({
      file: "scripts/build.ts",
      line: lineAt(lineStartsOf(build ?? ""), (build ?? "").indexOf(banner)),
      message: `the banner still names the package literally: ${banner.trim()}`,
    });
  }
  // The release workflow's file name: npm's trusted publisher is bound to it.
  const want = join(".github/workflows", spec.workflow);
  if (!existsSync(join(ROOT, want))) problems.push({ file: want, line: 0, message: `the \`${spec.name}\` tree's release workflow is missing` });
  for (const other of pair.names.filter((name) => name.name !== spec.name)) {
    const unwanted = join(".github/workflows", other.workflow);
    if (other.workflow !== spec.workflow && existsSync(join(ROOT, unwanted))) {
      problems.push({ file: unwanted, line: 0, message: `the \`${other.name}\` tree's release workflow is still here` });
    }
  }
  // The lockfile's workspace name is written by `bun install`, not by the rules.
  const lock = read("bun.lock");
  const lockName = lock === undefined ? null : /"name": "([^"]+)"/.exec(lock);
  if (lock !== undefined && lockName !== null && lockName[1] !== spec.name) {
    problems.push({ file: "bun.lock", line: lineAt(lineStartsOf(lock), lockName.index), message: `the lockfile names \`${lockName[1]}\`; run \`bun install\` after the rename` });
  }
  return problems;
}

/** The explicit entries, templated for the direction `from` → `to`. */
function entriesFor(from: NameSpec, to: NameSpec): { entry: ChangeEntry; file: string; find: string; replace: string }[] {
  const fill = (template: string): string =>
    template.replaceAll("%s", from.name).replaceAll("%S", from.workflow).replaceAll("%t", to.name).replaceAll("%T", to.workflow);
  return ENTRIES.map((entry) => ({ entry, file: fill(entry.file), find: fill(entry.find), replace: fill(entry.replace) }));
}

function verifyKeeps(pair: Pair): Problem[] {
  const problems: Problem[] = [];
  for (const keep of pair.keeps) {
    const text = read(keep.file);
    if (text === undefined) {
      problems.push({ file: keep.file, line: 0, message: `the keep \`${keep.id}\` names a file that does not exist` });
      continue;
    }
    if (!text.includes(keep.text)) {
      problems.push({ file: keep.file, line: 0, message: `the keep \`${keep.id}\` is not found: \`${keep.text}\` (${keep.reason})` });
    }
  }
  return problems;
}

/** The spans the keep entries protect from every rule. Exported for the unit test. */
export function keepSpans(pair: Pair): Map<string, Span[]> {
  const handled = new Map<string, Span[]>();
  for (const keep of pair.keeps) {
    const text = read(keep.file);
    const at = text === undefined ? -1 : text.indexOf(keep.text);
    if (at === -1) continue; // verifyKeeps reports it
    handled.set(keep.file, [...(handled.get(keep.file) ?? []), { start: at, end: at + keep.text.length }]);
  }
  return handled;
}

// ---------------------------------------------------------------------------
// The counts the brief asks for

export function countName(name: string): { importLines: number; importFiles: number; prefixLines: number; prefixFiles: number } {
  const importOf = new RegExp(`(from|import|require\\(|resolve\\(|import\\()[ ]*["'\`]${name}["'\`/]`);
  const quotedOf = new RegExp(`["'\`]${name}["'\`]`);
  let importLines = 0;
  let importFiles = 0;
  let prefixLines = 0;
  let prefixFiles = 0;
  // Every tracked file, generated ones included: this is the plain grep the
  // brief quotes (349 import lines in 156 files on 437a6d14).
  for (const file of listFiles()) {
    const text = read(file);
    if (text === undefined) continue;
    let imports = 0;
    let prefixes = 0;
    for (const line of text.split("\n")) {
      if (importOf.test(line)) imports += 1;
      else if (quotedOf.test(line)) prefixes += 1;
    }
    if (imports > 0) {
      importLines += imports;
      importFiles += 1;
    }
    if (prefixes > 0) {
      prefixLines += prefixes;
      prefixFiles += 1;
    }
  }
  return { importLines, importFiles, prefixLines, prefixFiles };
}

function printCounts(name: string): void {
  const counts = countName(name);
  console.log(
    `  counts \`${name}\`: import lines ${counts.importLines} in ${counts.importFiles} files · ` +
      `quoted-name lines outside imports ${counts.prefixLines} in ${counts.prefixFiles} files`,
  );
}

function printProblems(problems: Problem[]): void {
  for (const problem of problems) {
    console.error(`  ${problem.line === 0 ? problem.file : `${problem.file}:${problem.line}`}  ${problem.message}`);
  }
}

// ---------------------------------------------------------------------------
// The modes

export function pairFor(target: string): Pair {
  const files = existsSync(DATA_DIR) ? readdirSync(DATA_DIR).filter((file) => file.endsWith(".json")) : [];
  for (const file of files) {
    const pair = JSON.parse(readFileSync(join(DATA_DIR, file), "utf8")) as Pair;
    if (pair.names.some((name) => name.name === target)) return pair;
  }
  throw new Error(`no pair in scripts/fixtures/package-names names \`${target}\` (have: ${files.join(", ") || "none"})`);
}

function specOf(pair: Pair, name: string): NameSpec {
  const spec = pair.names.find((candidate) => candidate.name === name);
  if (spec === undefined) throw new Error(`the pair \`${pair.pair}\` does not name \`${name}\``);
  return spec;
}

/** Is the tree consistently `target`? Changes nothing; exit 1 and list the
 *  offending files and lines if not. */
export function check(target: string): number {
  const pair = pairFor(target);
  const spec = specOf(pair, target);
  const other = pair.names.find((candidate) => candidate.name !== target);
  if (other === undefined) throw new Error(`the pair \`${pair.pair}\` names only \`${target}\``);
  const problems: Problem[] = [...structuralProblems(pair, spec)];

  // package.json: the name and the links npm's trusted publishing compares.
  const packageText = read("package.json") ?? "";
  const manifest = JSON.parse(packageText) as Manifest;
  const atName = packageText.indexOf('"name"');
  if (manifest.name !== spec.name) {
    problems.push({ file: "package.json", line: lineAt(lineStartsOf(packageText), atName), message: `name is \`${manifest.name}\`, not \`${spec.name}\`` });
  }
  const fields: [string, string, string][] = [
    ["repository.url", `git+https://github.com/${spec.repository}.git`, manifest.repository?.url ?? ""],
    ["bugs.url", `https://github.com/${spec.repository}/issues`, manifest.bugs?.url ?? ""],
    ["typedocOptions.navigationLinks.GitHub", `https://github.com/${spec.repository}`, manifest.typedocOptions?.navigationLinks?.["GitHub"] ?? ""],
  ];
  for (const [what, want, have] of fields) {
    if (have !== want) problems.push({ file: "package.json", line: 0, message: `${what} is \`${have}\`, not \`${want}\`` });
  }
  const nameCheck = manifest.scripts?.["name:check"];
  const wantNameCheck = `bun run scripts/package-name.ts ${spec.name} --check`;
  if (nameCheck !== undefined && nameCheck !== wantNameCheck) {
    problems.push({ file: "package.json", line: 0, message: `name:check is \`${nameCheck}\`, not \`${wantNameCheck}\`` });
  }

  // Every occurrence of the name itself must be classifiable...
  // package.json's manifest fields are checked one by one above; mark their
  // spans handled, as the rename does, so the rules never classify inside
  // them (the `.git` of the repository URL otherwise reads as a dotted form).
  const kept = keepSpans(pair);
  const manifestSpans: Span[] = [];
  for (const field of MANIFEST_FIELDS(spec)) {
    if (field.what === "scripts.name:check" && !packageText.includes('"name:check"')) continue;
    const at = locate(packageText, field.find);
    if (at !== "absent" && at !== "many") manifestSpans.push({ start: at.start, end: at.end });
  }
  kept.set("package.json", [...(kept.get("package.json") ?? []), ...manifestSpans]);
  const own = scanTree(spec, other, pair, kept);
  problems.push(...own.problems);
  // ...and none of the other name's must be an occurrence a rename would change.
  const foreign = scanTree(other, spec, pair, kept);
  problems.push(...foreign.problems);
  for (const finding of foreign.findings.filter((candidate) => candidate.kind === "change")) {
    problems.push({ file: finding.file, line: finding.line, message: `the tree is \`${spec.name}\`, and this ${finding.id} occurrence of \`${other.name}\` would be renamed` });
  }

  problems.push(...verifyKeeps(pair));

  // The allowlist's own examples: inputs that must come out of a rename
  // unchanged, in both directions (the unit test asserts the same list).
  for (const entry of pair.allowlist) {
    for (const example of entry.examples) {
      for (const [from, to] of [[spec, other], [other, spec]] as [NameSpec, NameSpec][]) {
        const scan = scanText(example.text, entry.file ?? "(allowlist example)", from, to, pair);
        if (scan.problems.length > 0 || scan.edits.length > 0) {
          problems.push({
            file: entry.file ?? "(allowlist example)",
            line: 0,
            message: `the allowlist example \`${entry.id}\` would change under \`${from.name}\`: ${JSON.stringify(example.text)}`,
          });
        }
      }
    }
  }

  // The explicit entries: their target text is here, the other name's is not.
  for (const { entry, file, find, replace } of entriesFor(spec, other)) {
    const text = read(file);
    if (text === undefined) {
      problems.push({ file, line: 0, message: `the entry \`${entry.id}\` names a file that does not exist` });
      continue;
    }
    const present = text.indexOf(find);
    if (present === -1) problems.push({ file, line: 0, message: `the entry \`${entry.id}\` is missing: \`${find}\`` });
    if (text.includes(replace)) problems.push({ file, line: lineAt(lineStartsOf(text), text.indexOf(replace)), message: `the entry \`${entry.id}\` still names \`${other.name}\`: \`${replace}\`` });
  }

  console.log(`package-name: \`${spec.name}\` (${pair.pair})`);
  printCounts(spec.name);
  printCounts(other.name);
  if (problems.length > 0) {
    console.error(`package-name: the tree is not consistently \`${spec.name}\`: ${problems.length} problems`);
    printProblems(problems);
    return 1;
  }
  const classified = [...own.counts.values()].reduce((sum, count) => sum + count.occurrences, 0);
  console.log(`package-name: the tree is consistently \`${spec.name}\` (${own.files} files scanned, ${own.edits.length} occurrences a rename would change, ${classified} classified)`);
  return 0;
}

// ---------------------------------------------------------------------------
// The rename

function rename(target: string, version: string, repository: string, dryRun: boolean): number {
  const pair = pairFor(target);
  const spec = specOf(pair, target);
  const other = pair.names.find((candidate) => candidate.name !== target);
  if (other === undefined) throw new Error(`the pair \`${pair.pair}\` names only \`${target}\``);
  if (repository !== spec.repository) throw new Error(`\`${target}\` is published from \`${spec.repository}\`, not \`${repository}\``);

  const packageText = read("package.json") ?? "";
  const manifest = JSON.parse(packageText) as Manifest;
  if (manifest.name === spec.name) {
    const status = check(target);
    if (status !== 0) return status;
    console.log(`package-name: the tree is already \`${spec.name}\`; nothing to do`);
    return 0;
  }
  if (manifest.name !== other.name) {
    console.error(`package-name: package.json names \`${manifest.name}\`; the tree is neither \`${other.name}\` nor \`${spec.name}\``);
    return 1;
  }

  // The source tree's invariants, not the target's: renaming achieves those.
  const problems: Problem[] = [...structuralProblems(pair, other), ...verifyKeeps(pair)];
  const edits: Edit[] = [];
  // The keep entries' spans, before anything else: their `from "mtrl"` comments
  // are kept, not renamed, under either name.
  const handled = new Map<string, Span[]>(keepSpans(pair));

  // Step 1: package.json, its spans marked so the rules never see them.
  const manifestEdit = manifestEdits(packageText, other, spec, version);
  problems.push(...manifestEdit.problems);
  edits.push(...manifestEdit.edits);
  handled.set("package.json", manifestEdit.edits.map(({ start, end }) => ({ start, end })));

  // The explicit entries, before the rules: their spans are handled too.
  const applied: string[] = [];
  for (const { entry, file, find, replace } of entriesFor(other, spec)) {
    const text = read(file);
    if (text === undefined) {
      problems.push({ file, line: 0, message: `the entry \`${entry.id}\` names a file that does not exist` });
      continue;
    }
    const at = locate(text, find);
    if (at === "absent") {
      problems.push({ file, line: 0, message: `the explicit entry \`${entry.id}\` is not found: \`${find}\` (${entry.reason})` });
      continue;
    }
    if (at === "many") {
      problems.push({ file, line: 0, message: `the explicit entry \`${entry.id}\` is not unique: \`${find}\`` });
      continue;
    }
    edits.push({ file, line: lineAt(lineStartsOf(text), at.start), id: entry.id, from: find, to: replace, ...at });
    handled.set(file, [...(handled.get(file) ?? []), { start: at.start, end: at.end }]);
    applied.push(entry.id);
  }

  // Steps 2 to 4: the rules.
  const scan = scanTree(other, spec, pair, handled);
  problems.push(...scan.problems);
  edits.push(...scan.edits);

  if (problems.length > 0) {
    console.error(`package-name: ${problems.length} problems; nothing written`);
    printProblems(problems);
    return 1;
  }

  console.log(`package-name: ${other.name} → ${spec.name} · ${version} · ${spec.repository}${dryRun ? " (dry run)" : ""}`);
  const manifestIds = ["name", "version", "repository.url", "bugs.url", "typedocOptions.navigationLinks.GitHub", "scripts.name:check"];
  const workflowIds = ["release-title", "contributing-workflow-name", "release-notes-test-workflow-name"];
  const steps: [string, string[]][] = [
    ["step 1 package.json", manifestIds],
    ["step 2 import forms", CHANGES.map((rule) => rule.id).filter((id) => id !== "repository-link")],
    ["step 3 repository links", ["repository-link"]],
    ["step 4 workflow", workflowIds],
    ["entries", applied.filter((id) => !workflowIds.includes(id))],
  ];
  for (const [label, ids] of steps) {
    for (const id of ids) {
      if (!edits.some((edit) => edit.id === id)) continue;
      const list = edits.filter((edit) => edit.id === id);
      const files = new Set(list.map((edit) => edit.file));
      console.log(`  ${label.padEnd(20)} ${id.padEnd(38)} ${list.length} line${list.length === 1 ? "" : "s"} in ${files.size} file${files.size === 1 ? "" : "s"}`);
    }
  }
  for (const keep of [...scan.counts].filter(([id]) => [...PRE_KEEPS, ...POST_KEEPS].some((rule) => rule.id === id))) {
    console.log(`  ${"keeps".padEnd(20)} ${namedKeep(pair, keep[0]).padEnd(38)} ${keep[1].occurrences}`);
  }
  for (const [id, count] of scan.allow) {
    console.log(`  ${"allowlist".padEnd(20)} ${id.padEnd(38)} ${count}`);
  }
  if (other.workflow !== spec.workflow) console.log(`  step 4 workflow       git mv .github/workflows/${other.workflow} → .github/workflows/${spec.workflow}`);
  console.log(`  step 5 banner         no change: scripts/build.ts reads the package name`);
  console.log(`  step 6 generators     adapters:generate, root-exports:update, bun install`);
  const files = new Set(edits.map((edit) => edit.file));
  console.log(`  total                 ${edits.length} edits in ${files.size} files of ${scan.files} scanned`);
  const stepFiles = (ids: string[]) => new Set(edits.filter((edit) => ids.includes(edit.id)).map((edit) => edit.file)).size;
  console.log(`  summary               lines per pattern: ${CHANGES.map((rule) => `${rule.id} ${edits.filter((edit) => edit.id === rule.id).length}`).join(" · ")}`);
  console.log(`  summary               files per step: 1=${stepFiles(manifestIds)} 2=${stepFiles(steps[1][1])} 3=${stepFiles(["repository-link"])} 4=${stepFiles(workflowIds)} entries=${stepFiles(applied)}`);
  console.log(`  summary               explicit entries applied: ${applied.length > 0 ? applied.join(", ") : "none"} · not found: none`);
  console.log(`  summary               keeps with a reason: ${pair.keeps.length > 0 ? pair.keeps.map((keep) => keep.id).join(", ") : "none"}`);
  printCounts(spec.name);
  printCounts(other.name);

  if (dryRun) {
    for (const edit of [...edits].sort((a, b) => a.file.localeCompare(b.file) || a.start - b.start)) {
      console.log(`  ${edit.file}:${edit.line}  ${edit.id}: ${JSON.stringify(edit.from)} → ${JSON.stringify(edit.to)}`);
    }
    return 0;
  }

  // Write the text edits, one file at a time, from the end so offsets hold.
  const byFile = new Map<string, Edit[]>();
  for (const edit of edits) byFile.set(edit.file, [...(byFile.get(edit.file) ?? []), edit]);
  for (const [file, fileEdits] of byFile) {
    const text = read(file);
    if (text === undefined) {
      console.error(`package-name: cannot read ${file}`);
      return 1;
    }
    writeFileSync(join(ROOT, file), applyEdits(text, fileEdits));
  }

  // Step 4, the move: the file name is what npm's trusted publisher is bound to.
  if (other.workflow !== spec.workflow) {
    const result = spawnSync("git", ["mv", join(".github/workflows", other.workflow), join(".github/workflows", spec.workflow)], { cwd: ROOT, encoding: "utf8" });
    if (result.status !== 0) {
      console.error(`package-name: git mv .github/workflows/${other.workflow} .github/workflows/${spec.workflow} failed: ${String(result.stderr).trim()}`);
      return 1;
    }
  }

  // Step 6: the generators, which write the files that name the package
  // (the adapters, the migration table's fixture, the lockfile's name line).
  for (const command of [["run", "adapters:generate"], ["run", "root-exports:update"], ["install"]]) {
    const result = spawnSync("bun", command, { cwd: ROOT, stdio: "inherit" });
    if (result.status !== 0) {
      console.error(`package-name: \`bun ${command.join(" ")}\` failed; the tree is renamed but not regenerated`);
      return 1;
    }
  }
  return 0;
}

// ---------------------------------------------------------------------------
// The command line

function usage(): never {
  console.error("usage: bun scripts/package-name.ts <name> <version> <repository> [--dry-run]");
  console.error("       bun scripts/package-name.ts <name> --check");
  process.exit(2);
}

if (import.meta.main) {
  const argv = process.argv.slice(2);
  const flags = argv.filter((argument) => argument.startsWith("--"));
  const rest = argv.filter((argument) => !argument.startsWith("--"));
  if (flags.some((flag) => flag !== "--check" && flag !== "--dry-run")) usage();
  const target = rest[0];
  if (target === undefined) usage();
  if (flags.includes("--check")) {
    if (rest.length !== 1) usage();
    process.exit(check(target));
  }
  if (rest.length !== 3) usage();
  process.exit(rename(target, rest[1], rest[2], flags.includes("--dry-run")));
}
