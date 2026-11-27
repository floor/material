#!/usr/bin/env bun
/**
 * `release:prepare`: one command writes one release commit.
 *
 * It holds the version bump, the assembled changelog, the conformance
 * version, and the size tables — SIZES.md, README.md and npm-readme.md —
 * filled from a measurement of this tree. CI on the release pull request
 * measures the same tree again and fails when a committed value differs
 * (scripts/size-report.ts, release mode), so the tables are a pre-fill, not
 * the gate.
 *
 *   bun run release:prepare --version 3.16.11 --trailer "Agent: …"
 *   bun run release:prepare --version 3.16.11 --dry-run
 *
 * A dry run is plan-only: it prints the files it would write and the tables'
 * difference from the committed ones, writes nothing, and does not measure —
 * the size commands write scratch under the checkout. It needs the analysis a
 * previous `bun run size` and `bun run size:check` left in `analysis/`, or
 * `--analysis <dir>`. `--skip-measure` does the same for a real run.
 */
import assert from "node:assert/strict";
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { assemble, FRAGMENT_DIR, parseFragment, type Fragment } from "./changelog-fragments";
import { buildReleaseTables, tableDiffs } from "./release-tables";

interface Options {
  version: string;
  date: string;
  dryRun: boolean;
  root: string;
  analysis: string;
  trailer?: string;
  measure: boolean;
}

const usage = (message: string): never => {
  throw new Error(`${message}\n\nusage: bun run release:prepare --version <x.y.z> [--date <YYYY-MM-DD>] [--dry-run] [--skip-measure] [--trailer "Agent: …"] [--root <dir>] [--analysis <dir>]`);
};

const parseArguments = (argv: readonly string[]): Options => {
  const values = new Map<string, string | true>();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]!;
    if (!argument.startsWith("--")) usage(`unexpected argument ${JSON.stringify(argument)}`);
    const [name, inline] = argument.slice(2).split("=", 2);
    if (name === "dry-run" || name === "skip-measure") {
      values.set(name, true);
      continue;
    }
    const value = inline ?? argv[++index];
    if (value === undefined) usage(`--${name} needs a value`);
    values.set(name!, value);
  }
  const text = (name: string): string | undefined => {
    const value = values.get(name);
    return typeof value === "string" ? value : undefined;
  };
  const version = text("version") ?? usage("--version is required");
  const date = text("date") ?? new Date().toISOString().slice(0, 10);
  const root = resolve(text("root") ?? ".");
  const analysis = resolve(text("analysis") ?? join(root, "analysis"));
  const trailer = text("trailer");
  const dryRun = values.get("dry-run") === true;
  if (!dryRun && trailer === undefined) usage("a real run needs --trailer, the commit signature line");
  return {
    version,
    date,
    dryRun,
    root,
    analysis,
    trailer,
    measure: values.get("skip-measure") !== true,
  };
};

const run = async (command: string[], cwd: string, env: Record<string, string> = {}): Promise<void> => {
  const child = Bun.spawn(command, { cwd, stdout: "inherit", stderr: "inherit", env: { ...process.env, ...env } });
  const code = await child.exited;
  if (code !== 0) throw new Error(`${command.join(" ")} failed with exit code ${code}`);
};

/** The fragments of `root`, parsed, in the assembler's order. */
const readFragments = async (root: string): Promise<Fragment[]> => {
  const directory = join(root, FRAGMENT_DIR);
  const names = (await readdir(directory).catch(() => [] as string[])).filter((name) => name.endsWith(".md")).sort();
  return Promise.all(names.map(async (name) => {
    const path = join(FRAGMENT_DIR, name);
    return parseFragment(path, await readFile(join(directory, name), "utf8"));
  }));
};

/** Compare the highest versions, as numbers, to reject a downgrade. */
const newerThan = (next: string, current: string): boolean => {
  const parse = (version: string): number[] => version.split(/[.-]/).slice(0, 3).map((part) => Number(part) || 0);
  const [a, b] = [parse(next), parse(current)];
  for (let index = 0; index < 3; index += 1) {
    if ((a[index] ?? 0) !== (b[index] ?? 0)) return (a[index] ?? 0) > (b[index] ?? 0);
  }
  return false;
};

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  if (!/^\d+\.\d+\.\d+$/.test(options.version)) usage(`not a release version: ${JSON.stringify(options.version)}`);

  const paths = {
    manifest: join(options.root, "package.json"),
    changelog: join(options.root, "CHANGELOG.md"),
    matrix: join(options.root, "conformance/matrix.json"),
  };
  // The release commit is `git add` + `git commit` over the files this command
  // writes. Anything else already staged or modified would ride along, so a
  // real run refuses a tree that is not clean.
  if (!options.dryRun) {
    const status = (await new Command("git", ["status", "--porcelain"], options.root).text()).trim();
    if (status) {
      throw new Error(`release:prepare needs a clean index and worktree; these are not clean:\n${status}\nCommit or stash them, then run it again.`);
    }
  }

  const manifest = JSON.parse(await readFile(paths.manifest, "utf8")) as { version?: string };
  assert(manifest.version, "package.json has no version");
  if (!newerThan(options.version, manifest.version)) {
    throw new Error(`the tree is at ${manifest.version}; ${options.version} is not newer`);
  }

  const fragments = await readFragments(options.root);
  if (fragments.length === 0) throw new Error(`${FRAGMENT_DIR}/ has no fragments to assemble`);
  const changelog = assemble(await readFile(paths.changelog, "utf8"), fragments, options.version, options.date);
  const matrix = JSON.parse(await readFile(paths.matrix, "utf8")) as { material?: string };
  assert(matrix.material, "conformance/matrix.json has no material version");

  // A dry run is plan-only: the size commands write scratch under the
  // checkout (tmp/size, analysis/), and a plan must not touch it. The analysis
  // has to be there already — from a previous `bun run size` and
  // `bun run size:check`, or the --analysis directory.
  if (options.dryRun) {
    for (const file of ["component-size.json", "package-size.json"]) {
      if (!(await Bun.file(join(options.analysis, file)).exists())) {
        throw new Error(`a dry run writes nothing, measurement included: ${join(options.analysis, file)} is missing. Run \`bun run size\` and \`bun run size:check\` first, or pass --analysis, then run the dry run again.`);
      }
    }
  } else if (options.measure) {
    await run(["bun", "run", "size"], options.root);
    await run(["bun", "run", "size:check"], options.root);
  }
  const commit = await new Command("git", ["rev-parse", "--short", "HEAD"], options.root).text().catch(() => "local");
  const tables = await buildReleaseTables(options.root, options.analysis, { commit: commit.trim() || "local", date: options.date });

  const committed: Record<string, string | undefined> = {};
  for (const path of Object.keys(tables)) {
    committed[path] = await readFile(join(options.root, path), "utf8").catch(() => undefined);
  }
  const diffs = tableDiffs(tables, committed);

  const changes = [
    `package.json: version ${manifest.version} → ${options.version}`,
    `CHANGELOG.md: a ${options.version} section from ${fragments.length} fragment(s), and ${fragments.map((fragment) => fragment.path).join(", ")} deleted`,
    `conformance/matrix.json: material ${matrix.material} → ${options.version}`,
    ...Object.keys(tables).map((path) => `${path}: ${committed[path] === undefined ? "created" : diffs.some((diff) => diff.startsWith(`${path}:`)) ? "changed" : "unchanged"} from the local measurement`),
  ];
  console.log(`release:prepare ${options.version}${options.dryRun ? " (dry run)" : ""}\n`);
  for (const change of changes) console.log(`  ${change}`);
  for (const diff of diffs) console.log(`  measurement vs commit: ${diff}`);

  if (options.dryRun) {
    console.log("\ndry run: no file written, no fragment deleted, no commit made");
    return;
  }

  const nextManifest = `${JSON.stringify({ ...manifest, version: options.version }, null, 2)}\n`;
  await writeFile(paths.manifest, nextManifest);
  await writeFile(paths.changelog, changelog.changelog);
  await writeFile(paths.matrix, `${JSON.stringify({ ...matrix, material: options.version }, null, 2)}\n`);
  for (const [path, text] of Object.entries(tables)) await writeFile(join(options.root, path), text);
  for (const fragment of fragments) await rm(join(options.root, fragment.path));

  const staged = ["package.json", "CHANGELOG.md", "conformance/matrix.json", ...Object.keys(tables), ...fragments.map((fragment) => fragment.path)];
  await run(["git", "add", "--", ...staged], options.root);
  await run(["git", "commit", "-m", `release: bump material to ${options.version}`, "-m", options.trailer!], options.root);
  const head = (await new Command("git", ["log", "-1", "--oneline"], options.root).text()).trim();
  console.log(`\nrelease:prepare wrote ${head}`);
}

/** A git invocation in `root`, with a readable failure. */
class Command {
  constructor(private readonly command: string, private readonly args: string[], private readonly cwd: string) {}

  async text(): Promise<string> {
    const child = Bun.spawn([this.command, ...this.args], { cwd: this.cwd, stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    if (code !== 0) throw new Error(`${this.command} ${this.args.join(" ")} failed: ${stderr.trim()}`);
    return stdout;
  }
}

if (import.meta.main) await main();
