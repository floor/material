#!/usr/bin/env bun
// Renames the text field's one-word strings to two words (FLO-560).
// Order: git mv, the seven patterns, the explicit remainder, then the generators.
// A second run finds the new names already in place and changes nothing.
// textField and TextField are the two-word forms and are not the one-word spelling.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  changelogHistoryHeading,
  exemptFiles,
  generatedFiles,
  generatedPrefixes,
  handEdited,
  lineKept,
  oneWordHits,
  patternProtections,
  untouched,
} from "./text-field-rename-allowlist.ts";
import { entries, type RenameEntry } from "./text-field-rename-entries.ts";

const root = resolve(import.meta.dir, "..");
const dryRun = process.argv.includes("--dry-run");
const showRemainder = process.argv.includes("--remainder");

const moves: Array<[string, string]> = [
  ["src/components/textfield", "src/components/text-field"],
  ["src/components/text-field/textfield.ts", "src/components/text-field/text-field.ts"],
  ["src/elements/textfield.ts", "src/elements/text-field.ts"],
  ["src/styles/components/_textfield.scss", "src/styles/components/_text-field.scss"],
  ["src/styles/elements/_textfield.scss", "src/styles/elements/_text-field.scss"],
  ["scripts/check-textfield-browser.ts", "scripts/check-text-field-browser.ts"],
  ["test/components/textfield", "test/components/text-field"],
  ["test/components/text-field/textfield.test.ts", "test/components/text-field/text-field.test.ts"],
  ["test/styles/textfield-autofill.test.ts", "test/styles/text-field-autofill.test.ts"],
  ["test/styles/textfield-placeholder.test.ts", "test/styles/text-field-placeholder.test.ts"],
  ["test/styles/textfield-trailing.test.ts", "test/styles/text-field-trailing.test.ts"],
  ["test/types/textfield-events.fixture.ts", "test/types/text-field-events.fixture.ts"],
];

interface Pattern {
  name: string;
  re: RegExp;
  replace: (match: RegExpMatchArray) => string;
}

const patterns: Pattern[] = [
  { name: "1", re: /m-textfield/g, replace: () => "m-text-field" },
  { name: "2", re: /(mtrl|}|prefix)-textfield/g, replace: (match) => `${match[1]}-text-field` },
  { name: "3", re: /(?<!-)textfield(__|--)/g, replace: (match) => `text-field${match[1]}` },
  { name: "4", re: /select__textfield/g, replace: () => "select__text-field" },
  { name: "5", re: /\/_?textfield(?=\/|["'`]|\.|;|\b)/g, replace: (match) => match[0].replace("textfield", "text-field") },
  { name: "5b", re: /(['"`])textfield\//g, replace: (match) => `${match[1]}text-field/` },
  { name: "6", re: /check-textfield-browser/g, replace: () => "check-text-field-browser" },
  { name: "7", re: /(['"`])textfield\1/g, replace: (match) => `${match[1]}text-field${match[1]}` },
];

const skipped = new Set<string>([...exemptFiles, ...handEdited, ...generatedFiles, ...untouched]);

const isSkipped = (file: string): boolean => {
  if (skipped.has(file)) return true;
  return generatedPrefixes.some((prefix) => file.startsWith(prefix));
};

const relocate = (file: string): string => {
  let path = file;
  for (const [from, to] of moves) {
    if (path === from) path = to;
    else if (path.startsWith(`${from}/`)) path = to + path.slice(from.length);
  }
  return path;
};

const run = (command: string, args: string[], inherit: boolean): string => {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: inherit ? "inherit" : "pipe",
  });
  if (result.status !== 0) {
    const detail = inherit ? "" : `\n${result.stderr ?? ""}${result.stdout ?? ""}`;
    throw new Error(`${command} ${args.join(" ")} failed${detail}`);
  }
  return result.stdout ?? "";
};

const tracked = (): string[] => run("git", ["ls-files", "-z"], false).split("\0").filter((file) => file.length > 0);

const readText = (file: string): string | null => {
  const raw = readFileSync(resolve(root, file));
  if (raw.includes(0)) return null;
  return raw.toString("utf8");
};

const spansOf = (file: string, text: string): Array<[number, number]> => {
  const spans: Array<[number, number]> = [];
  for (const protection of patternProtections) {
    if (protection.file !== file) continue;
    let from = 0;
    while (from <= text.length) {
      const at = text.indexOf(protection.snippet, from);
      if (at < 0) break;
      spans.push([at, at + protection.snippet.length]);
      from = at + 1;
    }
  }
  return spans;
};

const overlaps = (start: number, end: number, spans: Array<[number, number]>): boolean =>
  spans.some(([spanStart, spanEnd]) => !(end <= spanStart || start >= spanEnd));

interface PatternCount {
  replacements: number;
  lines: number;
}

const applyPatterns = (file: string, text: string, counts: Map<string, PatternCount>): string => {
  let out = text;
  for (const pattern of patterns) {
    const spans = spansOf(file, out);
    const expression = new RegExp(pattern.re.source, pattern.re.flags);
    let cursor = 0;
    let next = "";
    const lines = new Set<number>();
    let replacements = 0;
    for (const match of out.matchAll(expression)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (overlaps(start, end, spans)) continue;
      lines.add(out.slice(0, start).split("\n").length);
      next += out.slice(cursor, start) + pattern.replace(match);
      cursor = end;
      replacements += 1;
    }
    next += out.slice(cursor);
    out = next;
    const count = counts.get(pattern.name) ?? { replacements: 0, lines: 0 };
    count.replacements += replacements;
    count.lines += lines.size;
    counts.set(pattern.name, count);
  }
  return out;
};

/** Where `path` is on disk, undoing moves already planned but not yet executed. */
const undoPlanned = (path: string, planned: Array<[string, string]>): string => {
  let real = path;
  for (let i = planned.length - 1; i >= 0; i -= 1) {
    const [from, to] = planned[i] ?? ["", ""];
    if (real === to) real = from;
    else if (real.startsWith(`${to}/`)) real = from + real.slice(to.length);
  }
  return real;
};

interface MovePlan {
  pending: Array<[string, string]>;
  already: string[];
}

const planMoves = (problems: string[]): MovePlan => {
  const pending: Array<[string, string]> = [];
  const already: string[] = [];
  for (const [from, to] of moves) {
    const source = existsSync(resolve(root, from)) || existsSync(resolve(root, undoPlanned(from, pending)));
    const destination = existsSync(resolve(root, to));
    if (source && destination) {
      problems.push(`move ${from} -> ${to}: both paths exist`);
      continue;
    }
    if (!source && !destination) {
      problems.push(`move ${from} -> ${to}: neither path exists`);
      continue;
    }
    if (destination) already.push(to);
    else pending.push([from, to]);
  }
  return { pending, already };
};

interface EntryTally {
  applied: string[];
  already: string[];
  kept: string[];
  missing: string[];
}

const applyBlock = (entry: RenameEntry, text: string, tally: EntryTally): string => {
  if (entry.action === "keep") {
    if (text.includes(entry.old)) tally.kept.push(entry.id);
    else tally.missing.push(entry.id);
    return text;
  }
  if (text.includes(entry.old)) {
    tally.applied.push(entry.id);
    return text.replaceAll(entry.old, entry.new);
  }
  if (text.includes(entry.new)) tally.already.push(entry.id);
  else tally.missing.push(entry.id);
  return text;
};

const applyLines = (list: RenameEntry[], text: string, tally: EntryTally): string => {
  const byOld = new Map<string, RenameEntry[]>();
  for (const entry of list) {
    const group = byOld.get(entry.old) ?? [];
    group.push(entry);
    byOld.set(entry.old, group);
  }
  const seen = new Set<string>();
  const lines = text.split("\n").map((line) => {
    const group = byOld.get(line);
    if (!group) return line;
    const replacements = group.filter((entry) => entry.action === "replace");
    const distinct = new Set(replacements.map((entry) => entry.new));
    if (distinct.size > 1) {
      tally.missing.push(group.map((entry) => `${entry.id} (conflict)`).join(", "));
      return line;
    }
    for (const entry of group) {
      seen.add(entry.id);
      if (entry.action === "keep") tally.kept.push(entry.id);
      else tally.applied.push(entry.id);
    }
    return replacements.length > 0 ? (replacements[0]?.new ?? line) : line;
  });
  for (const entry of list) {
    if (seen.has(entry.id)) continue;
    if (entry.action === "keep") tally.missing.push(entry.id);
    else if (lines.includes(entry.new)) tally.already.push(entry.id);
    else tally.missing.push(entry.id);
  }
  return lines.join("\n");
};

const applyEntries = (contents: Map<string, string>, tally: EntryTally, problems: string[]): void => {
  const byFile = new Map<string, RenameEntry[]>();
  for (const entry of entries) {
    if (isSkipped(entry.file)) {
      problems.push(`entry ${entry.id} points at ${entry.file}, which the script does not edit`);
      continue;
    }
    const group = byFile.get(entry.file) ?? [];
    group.push(entry);
    byFile.set(entry.file, group);
  }
  for (const [file, list] of byFile) {
    const text = contents.get(file);
    if (text === undefined) {
      for (const entry of list) tally.missing.push(entry.id);
      continue;
    }
    let next = text;
    for (const entry of list.filter((item) => item.kind === "block")) next = applyBlock(entry, next, tally);
    next = applyLines(list.filter((item) => item.kind === "line"), next, tally);
    contents.set(file, next);
  }
};

const unexplained = (contents: Map<string, string>, files: string[]): string[] => {
  const problems: string[] = [];
  for (const file of files) {
    if (handEdited.includes(file) || exemptFiles.includes(file)) continue;
    if (oneWordHits(file).length > 0) problems.push(`path ${file}`);
    const text = contents.get(file);
    if (text === undefined) continue;
    let inHistory = false;
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i] ?? "";
      if (file === "CHANGELOG.md" && line.startsWith(changelogHistoryHeading)) inHistory = true;
      if (oneWordHits(line).length === 0) continue;
      if (lineKept(file, line, inHistory)) continue;
      problems.push(`${file}:${i + 1}: ${line.trim().slice(0, 160)}`);
    }
  }
  return problems;
};

const loadAverage = (): number => {
  const result = spawnSync("uptime", [], { encoding: "utf8" });
  const text = result.stdout ?? "";
  const match = text.match(/load averages?: ([0-9.]+)/);
  const value = match?.[1];
  if (!value) throw new Error(`could not read the load average from uptime: ${text}`);
  return Number(value);
};

const waitForLoad = (): number => {
  let load = loadAverage();
  while (load > 30) {
    console.log(`load ${load} is above 30; waiting 30s`);
    const sleep = spawnSync("sleep", ["30"]);
    if (sleep.status !== 0) throw new Error("sleep failed");
    load = loadAverage();
  }
  return load;
};

const printRemainder = (): void => {
  const keeps = entries.filter((entry) => entry.action === "keep").length;
  console.log(`remainder ${entries.length} entries, ${keeps} keep`);
  for (const entry of entries) {
    console.log(`--- ${entry.id} (${entry.action}) ${entry.file}`);
    console.log(entry.reason);
    if (entry.action === "replace") {
      console.log("OLD:");
      console.log(entry.old);
      console.log("NEW:");
      console.log(entry.new);
    } else {
      console.log(entry.old);
    }
  }
};

const summary = (
  plan: MovePlan,
  counts: Map<string, PatternCount>,
  tally: EntryTally,
): void => {
  console.log(`paths moved: ${plan.pending.length}`);
  for (const [from, to] of plan.pending) console.log(`  ${from} -> ${to}`);
  console.log(`paths already moved: ${plan.already.length}`);
  for (const pattern of patterns) {
    const count = counts.get(pattern.name) ?? { replacements: 0, lines: 0 };
    console.log(`pattern ${pattern.name}: ${count.replacements} replacements, ${count.lines} lines`);
  }
  console.log(`remainder entries applied: ${tally.applied.length}`);
  console.log(`remainder entries already applied: ${tally.already.length}`);
  console.log(`remainder entries kept: ${tally.kept.length}`);
  console.log(`entries not found: ${tally.missing.length}`);
  if (tally.missing.length > 0) console.log(tally.missing.join("\n"));
};

const main = (): number => {
  if (showRemainder) printRemainder();
  const problems: string[] = [];
  const plan = planMoves(problems);
  const counts = new Map<string, PatternCount>();
  const contents = new Map<string, string>();
  for (const file of tracked()) {
    if (isSkipped(file)) continue;
    const text = readText(file);
    if (text === null) continue;
    for (const protection of patternProtections) {
      if (protection.file === file && !text.includes(protection.snippet)) {
        problems.push(`protection missing before patterns: ${protection.file} (${protection.reason})`);
      }
    }
    const next = applyPatterns(file, text, counts);
    const dest = relocate(file);
    if (contents.has(dest)) problems.push(`two tracked paths relocate to ${dest}`);
    contents.set(dest, next);
  }
  for (const protection of patternProtections) {
    const text = contents.get(protection.file);
    if (text === undefined) {
      problems.push(`protection file missing: ${protection.file}`);
      continue;
    }
    if (!text.includes(protection.snippet)) {
      problems.push(`protection lost: ${protection.file} snippet ${JSON.stringify(protection.snippet)}`);
    }
  }
  const tally: EntryTally = { applied: [], already: [], kept: [], missing: [] };
  applyEntries(contents, tally, problems);
  const owned = [...contents.keys()];
  const hits = unexplained(contents, owned);
  const changedPatterns = [...counts.values()].some((count) => count.replacements > 0);
  const changed = plan.pending.length > 0 || changedPatterns || tally.applied.length > 0;
  summary(plan, counts, tally);
  if (hits.length > 0) {
    console.log(`unclassified one-word hits: ${hits.length}`);
    console.log(hits.slice(0, 40).join("\n"));
  } else {
    console.log("unclassified one-word hits: 0");
  }
  if (problems.length > 0 || tally.missing.length > 0 || hits.length > 0) {
    for (const problem of problems) console.log(problem);
    return 1;
  }
  if (!changed) {
    console.log("already renamed: nothing to change");
    console.log(dryRun ? "dry-run: generators not run" : "generators skipped");
    return 0;
  }
  if (dryRun) {
    console.log("dry-run: no files written");
    console.log("a real run would run: adapters:generate, component-exports:update, root-exports:update, build, tokens:check --update");
    return 0;
  }
  for (const [from, to] of plan.pending) run("git", ["mv", from, to], false);
  for (const [file, text] of contents) {
    const current = readText(file);
    if (current !== text) writeFileSync(resolve(root, file), text);
  }
  const generators: Array<[string, string[]]> = [
    ["bun", ["run", "adapters:generate"]],
    ["bun", ["run", "component-exports:update"]],
    ["bun", ["run", "root-exports:update"]],
  ];
  for (const [command, args] of generators) {
    console.log(`generator ${args.join(" ")}`);
    run(command, args, true);
  }
  const load = waitForLoad();
  console.log(`load ${load}; generator bun run build`);
  run("bun", ["run", "build"], true);
  console.log("generator bun run tokens:check --update");
  run("bun", ["run", "tokens:check", "--update"], true);
  const after = new Map<string, string>();
  const generated: string[] = [];
  for (const file of tracked()) {
    if (handEdited.includes(file) || exemptFiles.includes(file) || untouched.includes(file)) continue;
    const generatedFile = generatedFiles.includes(file) || generatedPrefixes.some((prefix) => file.startsWith(prefix));
    if (!generatedFile) continue;
    const text = readText(file);
    if (text === null) continue;
    after.set(file, text);
    generated.push(file);
  }
  const left = unexplained(after, generated);
  if (left.length > 0) {
    console.log(`generator output still has the one-word spelling: ${left.length}`);
    console.log(left.slice(0, 40).join("\n"));
    return 1;
  }
  console.log("generators wrote their outputs; no one-word spelling left in them");
  return 0;
};

if (import.meta.main) {
  try {
    process.exit(main());
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
