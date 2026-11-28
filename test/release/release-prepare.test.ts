import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { buildReleaseTables, tableDiffs, tableRowDiffs } from "../../scripts/release-tables";
import { README_SIZE_ROWS } from "../../scripts/readme-sizes";

const rows = README_SIZE_ROWS.length;
const sizeBlock = ["<!-- sizes -->", "| Bundle | Size |", "| --- | ---: |",
  ...README_SIZE_ROWS.map((name) => `| \`${name}\` | 1.0 kB |`), "<!-- /sizes -->"].join("\n");
const readme = `# Fixture\n\n${sizeBlock}\n`;

const sizes = Object.fromEntries(README_SIZE_ROWS.map((name, index) => [name, { gzip: (index + 1) * 1000 }]));

const prepareScript = resolve(import.meta.dir, "../../scripts/release-prepare.ts");
const workflowFixture = resolve(import.meta.dir, "../fixtures/stylesheet-nightly-fetch.ts");
const spawnPrepare = (root: string, args: string[], nightly: "fresh" | "stale" | "unavailable" = "fresh") =>
  Bun.spawn(["bun", "--preload", workflowFixture, prepareScript, "--root", root, ...args], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, FIXTURE_STYLESHEET_NIGHTLY: nightly },
  });

const fixture = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "release-prepare-"));
  await mkdir(join(root, ".changes"), { recursive: true });
  await mkdir(join(root, "conformance"), { recursive: true });
  await mkdir(join(root, "analysis"), { recursive: true });
  await writeFile(join(root, "package.json"), `${JSON.stringify({ name: "fixture", version: "1.0.0" }, null, 2)}\n`);
  await writeFile(join(root, "CHANGELOG.md"), [
    "# Changelog", "", "## [Unreleased]", "", "## [1.0.0] - 2026-01-01", "", "First.", "",
    "[Unreleased]: https://github.com/floor/material/compare/v1.0.0...HEAD",
    "[1.0.0]: https://github.com/floor/material/compare/v0.9.0...v1.0.0", "",
  ].join("\n"));
  await writeFile(join(root, "conformance/matrix.json"), `${JSON.stringify({ schema: 1, material: "1.0.0" }, null, 2)}\n`);
  await writeFile(join(root, ".changes/one.md"), "Section: Fixed\n\n**A fixture change.** It assembles.\n");
  await writeFile(join(root, "README.md"), readme);
  await writeFile(join(root, "npm-readme.md"), readme);
  await writeFile(join(root, "SIZES.md"), [
    "# Component sizes", "", "Measured at 0000000 on 2026-01-01. Regenerate with", "",
    "| Component | Minified | Gzipped | vs core | Deferred |", "| --- | ---: | ---: | ---: | ---: |",
    "| core | 1.0 KB | 0.9 KB | — |  |", "",
  ].join("\n"));
  await writeFile(join(root, "analysis/component-size.json"), JSON.stringify({
    rows: [],
    results: [{ name: "core", minBytes: 1024, gzBytes: 900, brBytes: 800, deferredGzBytes: 0, minKB: 1, gzKB: 0.9, deltaKB: 0 }],
  }));
  await writeFile(join(root, "analysis/package-size.json"), JSON.stringify({ rows: [], sizes, package: { size: 1000 } }));
  return root;
};

describe("release:prepare dry run", () => {
  test("a recent successful scheduled run keeps the plan quiet and writes nothing", async () => {
    const root = await fixture();
    try {
      const child = spawnPrepare(root, ["--analysis", join(root, "analysis"),
        "--version", "1.1.0", "--date", "2026-11-28", "--dry-run", "--skip-measure"]);
      const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      expect(stderr).toBe("");
      expect(code).toBe(0);
      expect(stdout).toContain("release:prepare 1.1.0 (dry run)");
      for (const path of ["package.json", "CHANGELOG.md", "conformance/matrix.json", "SIZES.md", "README.md", "npm-readme.md"]) {
        expect(stdout).toContain(path);
      }
      expect(stdout).toContain("no file written");
      // Nothing written, nothing deleted.
      expect(JSON.parse(await readFile(join(root, "package.json"), "utf8")).version).toBe("1.0.0");
      expect(await readFile(join(root, "CHANGELOG.md"), "utf8")).not.toContain("## [1.1.0]");
      expect(await readFile(join(root, ".changes/one.md"), "utf8")).toContain("A fixture change.");
      expect(JSON.parse(await readFile(join(root, "conformance/matrix.json"), "utf8")).material).toBe("1.0.0");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("unavailable workflow history produces a warning and leaves the plan usable", async () => {
    const root = await fixture();
    try {
      const child = spawnPrepare(root, ["--version", "1.1.0", "--dry-run"], "unavailable");
      const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      expect(code).toBe(0);
      expect(stderr).toContain("Could not verify the combined stylesheet nightly on main");
      expect(stdout).toContain("no file written");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

const analysis = (root: string) => ({
  rows: [{ name: "Packed", gate: "packed", bytes: 1000 }],
  sizes,
  package: { size: 1000 },
});

/** A tree with the two analysis files a size run leaves. */
const measuredTree = async (wrong: boolean): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "release-gate-"));
  await mkdir(join(root, "analysis"), { recursive: true });
  await writeFile(join(root, "analysis/package-size.json"), JSON.stringify(analysis(root)));
  await writeFile(join(root, "analysis/component-size.json"), JSON.stringify({
    rows: [{ name: "Component core gzip", gate: "component-gzip", bytes: 900 }],
    results: [{ name: "core", minBytes: 1024, gzBytes: 900, brBytes: 800, deferredGzBytes: 0, minKB: 1, gzKB: 0.9, deltaKB: 0 }],
  }));
  const committed = wrong ? readme.replace("| 1.0 kB |", "| 9.9 kB |") : readme;
  await writeFile(join(root, "README.md"), committed);
  await writeFile(join(root, "npm-readme.md"), readme);
  await writeFile(join(root, "SIZES.md"), "");
  return root;
};

const runReleaseSizeReport = async (base: string, head: string) => {
  const script = resolve(import.meta.dir, "../../scripts/size-report.ts");
  const child = Bun.spawn(["bun", script], {
    cwd: head,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      MTRL_SIZE_BASE: base, MTRL_SIZE_TAG: "v1.0.0", MTRL_SIZE_RELEASE: "true",
      GITHUB_SHA: "abc1234", GITHUB_EVENT_PATH: "", GITHUB_STEP_SUMMARY: "",
    },
  });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  return { stdout, stderr, code };
};

const sizeTableMeta = { commit: "abc1234", date: "2026-01-01" };
const sizeTableCases: { name: string; change: (text: string) => string; code: number }[] = [
  { name: "an added blank line", change: text => text + "\n", code: 1 },
  { name: "a missing final newline", change: text => text.slice(0, -1), code: 1 },
  { name: "a trailing space", change: text => text.replace(/^# Component sizes$/m, "$& "), code: 1 },
  {
    name: "a different Measured-at line",
    change: text => text.replace(/^Measured at .*$/m, "Measured at def5678 on 2026-02-01. Regenerate with"),
    code: 0,
  },
];

describe("the release run gates the committed tables", () => {
  test("a wrong committed size fails the release run", async () => {
    const base = await measuredTree(false);
    const head = await measuredTree(true);
    try {
      const { stdout, stderr, code } = await runReleaseSizeReport(base, head);
      expect(code).toBe(1);
      const output = `${stdout}\n${stderr}`;
      expect(output).toContain("differ from this run's measurement");
      expect(output).toContain("Replace them with this run's files from the package-sizes artifact");
      expect(output).toContain("do not re-measure locally");
      expect(output).toContain("README.md");
      expect(output).toContain("measured:");
      expect(output).toContain("9.9 kB");
    } finally {
      await rm(base, { recursive: true, force: true });
      await rm(head, { recursive: true, force: true });
    }
  });

  for (const { name, change, code } of sizeTableCases) {
    test(`SIZES.md with ${name} exits ${code}`, async () => {
      const root = await measuredTree(false);
      try {
        const tables = await buildReleaseTables(root, join(root, "analysis"), sizeTableMeta);
        const measured = tables["SIZES.md"]!;
        expect(measured.endsWith("\n")).toBe(true);
        const changed = change(measured);
        expect(changed).not.toBe(measured);
        await Promise.all(Object.entries({ ...tables, "SIZES.md": changed })
          .map(([file, text]) => writeFile(join(root, file), text)));

        const result = await runReleaseSizeReport(root, root);
        expect(result.code).toBe(code);
        if (code === 1) {
          expect(result.stderr).toContain("The committed release size tables differ");
          expect(result.stderr.match(/^- .* — /gm)).toEqual(["- SIZES.md — "]);
        } else {
          expect(result.stderr).toBe("");
        }
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    });
  }
});

const git = async (root: string, ...args: string[]): Promise<string> => {
  const child = Bun.spawn(["git", ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  if (code !== 0) throw new Error(`git ${args.join(" ")} failed: ${stderr}`);
  return stdout;
};

describe("release:prepare refuses to write outside its own files", () => {
  test("a dry run does not measure at all, and the checkout's scratch survives it", async () => {
    const root = await fixture();
    try {
      // Markers prove whether the size commands ran, and a sentinel in the
      // size scratch proves the checkout is untouched.
      await mkdir(join(root, "tools"), { recursive: true });
      await mkdir(join(root, "tmp/size"), { recursive: true });
      await writeFile(join(root, "tmp/size/sentinel.txt"), "survives a dry run\n");
      await writeFile(join(root, "tools/size.ts"), `import { writeFileSync } from "node:fs";\nwriteFileSync("size-ran.txt", "the dry run measured");\n`);
      await writeFile(join(root, "package.json"), `${JSON.stringify({
        name: "fixture", version: "1.0.0",
        scripts: { size: "bun run ./tools/size.ts", "size:check": "bun run ./tools/size.ts" },
      }, null, 2)}\n`);

      const child = spawnPrepare(root, ["--analysis", join(root, "analysis"),
        "--version", "1.1.0", "--date", "2026-11-28", "--dry-run"]);
      const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      expect(code).toBe(0);
      expect(stdout).toContain("(dry run)");
      expect(stdout).toContain("no file written");
      expect(stderr).toBe("");
      expect(await readFile(join(root, "tmp/size/sentinel.txt"), "utf8")).toBe("survives a dry run\n");
      expect(await readFile(join(root, "size-ran.txt"), "utf8").catch(() => null)).toBeNull();
      expect(JSON.parse(await readFile(join(root, "package.json"), "utf8")).version).toBe("1.0.0");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("a dry run without a measurement says how to make one", async () => {
    const root = await fixture();
    try {
      await rm(join(root, "analysis"), { recursive: true, force: true });
      const child = spawnPrepare(root, ["--analysis", join(root, "analysis"),
        "--version", "1.1.0", "--date", "2026-11-28", "--dry-run"]);
      const [, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      expect(code).not.toBe(0);
      expect(stderr).toContain("a dry run writes nothing, measurement included");
      expect(stderr).toContain("bun run size");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("a staged unrelated file refuses the release commit", async () => {
    const root = await fixture();
    try {
      await git(root, "init", "-q");
      await git(root, "config", "user.email", "fixture@example.com");
      await git(root, "config", "user.name", "Fixture");
      await git(root, "add", "-A");
      await git(root, "commit", "-q", "-m", "fixture");
      await writeFile(join(root, "unrelated.txt"), "staged by mistake\n");
      await git(root, "add", "unrelated.txt");

      const child = spawnPrepare(root, ["--analysis", join(root, "analysis"),
        "--version", "1.1.0", "--date", "2026-11-28", "--skip-measure", "--trailer", "Agent: fixture"]);
      const [, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      expect(code).not.toBe(0);
      expect(stderr).toContain("needs a clean index and worktree");
      expect(stderr).toContain("unrelated.txt");
      expect((await git(root, "log", "--oneline")).trim().split("\n")).toHaveLength(1);
      expect(JSON.parse(await readFile(join(root, "package.json"), "utf8")).version).toBe("1.0.0");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("a clean tree warns about a missing recent nightly and writes one release commit", async () => {
    const root = await fixture();
    try {
      await git(root, "init", "-q");
      await git(root, "config", "user.email", "fixture@example.com");
      await git(root, "config", "user.name", "Fixture");
      await git(root, "add", "-A");
      await git(root, "commit", "-q", "-m", "fixture");

      const child = spawnPrepare(root, ["--analysis", join(root, "analysis"),
        "--version", "1.1.0", "--date", "2026-11-28", "--skip-measure", "--trailer", "Agent: fixture"], "stale");
      const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
      expect(stderr).toContain("No successful scheduled combined stylesheet pin run on main in the last 36 hours");
      expect(code).toBe(0);
      expect(stdout).toContain("release:prepare wrote");
      expect((await git(root, "rev-list", "--count", "HEAD")).trim()).toBe("2");
      const log = await git(root, "log", "-1", "--format=%s%n%b");
      expect(log).toContain("release: bump material to 1.1.0");
      expect(log).toContain("Agent: fixture");
      expect(JSON.parse(await readFile(join(root, "package.json"), "utf8")).version).toBe("1.1.0");
      expect(await readFile(join(root, "CHANGELOG.md"), "utf8")).toContain("## [1.1.0] - 2026-11-28");
      expect(await readFile(join(root, ".changes/one.md"), "utf8").catch(() => null)).toBeNull();
      expect(JSON.parse(await readFile(join(root, "conformance/matrix.json"), "utf8")).material).toBe("1.1.0");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("release table comparison", () => {
  test("identical tables produce no difference", () => {
    expect(tableDiffs({ "README.md": readme, "SIZES.md": "Measured at abc on 2026-01-01. Regenerate with\nx" }, {
      "README.md": readme, "SIZES.md": "Measured at abc on 2026-01-01. Regenerate with\nx",
    })).toEqual([]);
  });

  test("the measured-at line is provenance, not a size", () => {
    expect(tableDiffs({ "SIZES.md": "Measured at abc on 2026-01-01. Regenerate with\nx" }, {
      "SIZES.md": "Measured at def1234 on 2026-11-28. Regenerate with\nx",
    })).toEqual([]);
  });

  test("a wrong committed size fails, naming the line", () => {
    const wrong = readme.replace("| 1.0 kB |", "| 9.9 kB |");
    const diffs = tableDiffs({ "README.md": readme }, { "README.md": wrong });
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toContain("README.md");
    expect(diffs[0]).toContain("line");
    expect(diffs[0]).toContain("9.9 kB");
  });

  test("the row diff names each row, its measured and its committed value", () => {
    const wrong = readme.replace("| 1.0 kB |", "| 9.9 kB |");
    const rows = tableRowDiffs({ "README.md": readme }, { "README.md": wrong });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.file).toBe("README.md");
    expect(rows[0]!.row).toContain("`" + README_SIZE_ROWS[0] + "`");
    expect(rows[0]!.measured).toContain("1.0 kB");
    expect(rows[0]!.committed).toContain("9.9 kB");
  });

  test("a trailing space in a committed row is a difference", () => {
    const spaced = readme.replace("| 1.0 kB |\n", "| 1.0 kB | \n");
    expect(spaced).not.toBe(readme);
    const diffs = tableDiffs({ "README.md": readme }, { "README.md": spaced });
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toContain("README.md");
    const rows = tableRowDiffs({ "README.md": readme }, { "README.md": spaced });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.row).toContain("`" + README_SIZE_ROWS[0] + "`");
    expect(rows[0]!.measured).toBe("| `" + README_SIZE_ROWS[0] + "` | 1.0 kB |");
    expect(rows[0]!.committed).toBe("| `" + README_SIZE_ROWS[0] + "` | 1.0 kB | ");
  });

  test("a missing final newline is a difference", () => {
    const trimmed = readme.replace(/\n$/, "");
    expect(tableDiffs({ "README.md": readme }, { "README.md": trimmed })).toHaveLength(1);
  });

  for (const { name, change, code } of sizeTableCases) {
    test(`the row diff for SIZES.md with ${name}`, () => {
      const measured = "# Component sizes\n\nMeasured at abc1234 on 2026-01-01. Regenerate with\n\n| core | 0.9 KB |\n";
      const changed = change(measured);
      expect(changed).not.toBe(measured);
      const differences = tableRowDiffs({ "SIZES.md": measured }, { "SIZES.md": changed });
      expect(differences.map(diff => diff.file)).toEqual(code === 1 ? ["SIZES.md"] : []);
    });
  }

  test("a missing committed table fails", () => {
    expect(tableDiffs({ "SIZES.md": "x" }, {})).toEqual(["SIZES.md: the tree has no table at this path"]);
  });

  test(`the fixture table has ${rows} rows`, () => {
    expect((readme.match(/\| [\d.]+ kB \|$/gm) ?? []).length).toBe(rows);
  });
});
