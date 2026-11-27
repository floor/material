#!/usr/bin/env bun
// scripts/size.ts
/**
 * mtrl — Component size measurement + tree-shaking verification
 *
 * Builds each component the way a consumer imports it from the package entry,
 * then reports minified and gzipped size. Delta is against `core`: `pipe`,
 * `createBase` and `withElement`, the compose kernel a component starts from.
 *
 * A scenario that fails to compile or leaks unrelated components fails the
 * command. The initial and deferred gzip sizes feed the release-delta gate.
 * Brotli at quality 11 is reported alongside gzip.
 *
 * CI generates SIZES.md from the measured release candidate. The component
 * table is also available locally with the command below.
 *
 * Usage:
 *   bun run size
 *   bun run size --markdown > SIZES.md
 */

import { gzipSync } from "bun";
import { brotliCompressSync, constants } from "node:zlib";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

import type { SizeRow } from "./size-policy";

const root = process.env.MTRL_SIZE_ROOT ?? resolve(import.meta.dir, "..");

/** The commit the table was measured at, for the SIZES.md header. */
const shortCommit = (): string => {
  try {
    return execFileSync("git", ["rev-parse", "--short=8", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
};

// The bundler derives chunk names and the entry chunk's runtime id from the
// module paths it is handed, so the entry lives in a fixed scratch inside the
// checkout and every path in the bundle is relative to it: a fresh mkdtemp
// entry path moved the measured bytes a few gzipped bytes every run, and
// another checkout root moved them again, which made a row near its ceiling a
// coin flip (floor/material#131).
const scratch = join(root, "tmp", "size");

// ── Public components ─────────────────────────────────────────────
//
// One row per component folder. `imports` are the factories a consumer
// actually names. The bundle is what `import { … } from "material"` keeps.

export const COMPONENTS = [
  { name: "badge", imports: ["createBadge"] },
  { name: "bottom-app-bar", imports: ["createBottomAppBar"] },
  { name: "bottom-sheet", imports: ["createBottomSheet"] },
  { name: "side-sheet", imports: ["createSideSheet"] },
  { name: "button", imports: ["createButton"] },
  { name: "button-group", imports: ["createButtonGroup"] },
  { name: "card", imports: ["createCard"] },
  { name: "carousel", imports: ["createCarousel"] },
  { name: "checkbox", imports: ["createCheckbox"] },
  { name: "chips", imports: ["createFilterChip", "createChips"] },
  { name: "datepicker", imports: ["createDatePicker"] },
  { name: "dialog", imports: ["createDialog"] },
  { name: "divider", imports: ["createDivider"] },
  { name: "drawer", imports: ["createDrawer"] },
  { name: "fab", imports: ["createFab"] },
  { name: "fab-menu", imports: ["createFabMenu"] },
  { name: "extended-fab", imports: ["createExtendedFab"] },
  { name: "icon-button", imports: ["createIconButton"] },
  { name: "list", imports: ["createList"] },
  { name: "menu", imports: ["createMenu"] },
  { name: "navigation-bar", imports: ["createNavigationBar"] },
  { name: "navigation-rail", imports: ["createNavigationRail"] },
  { name: "progress", imports: ["createProgress"] },
  { name: "loading-indicator", imports: ["createLoadingIndicator"] },
  { name: "split-button", imports: ["createSplitButton"] },
  { name: "radios", imports: ["createRadios"] },
  { name: "search", imports: ["createSearch"] },
  { name: "select", imports: ["createSelect"] },
  { name: "slider", imports: ["createSlider"] },
  { name: "snackbar", imports: ["createSnackbar"] },
  { name: "switch", imports: ["createSwitch"] },
  { name: "tabs", imports: ["createTabs", "createTab"] },
  { name: "text-field", imports: ["createTextField"] },
  { name: "timepicker", imports: ["createTimePicker"] },
  { name: "top-app-bar", imports: ["createTopAppBar"] },
  { name: "tooltip", imports: ["createTooltip"] },
  { name: "toolbar", imports: ["createToolbar"] },
] as const;

export type ComponentName = (typeof COMPONENTS)[number]["name"];

// Static component imports. A marker from one of these may appear in the
// bundle even though the consumer did not import that component.
// Dynamic imports are not listed: progress must not be in button's entry
// chunk, and button must not be in card's.
export const KNOWN_DEPS: Partial<Record<ComponentName, readonly ComponentName[]>> = {
  "button-group": ["button", "icon-button"],
  dialog: ["button", "divider"],
  snackbar: ["button", "icon-button"],
  select: ["text-field", "menu"],
  tabs: ["button", "badge"],
  // The menu's chunk is not listed: split button loads the menu on first open
  // (menu/inner, its symbol module, is the only menu module still initial).
  "split-button": ["button"],
  toolbar: ["button", "icon-button"],
  "fab-menu": ["button", "fab"],
};

export const SCENARIO_DEFS = [
  { name: "core", imports: ["pipe", "createBase", "withElement"] },
  ...COMPONENTS.map((component) => ({ name: component.name, imports: component.imports })),
  {
    name: "all",
    imports: COMPONENTS.flatMap((component) => component.imports),
  },
  // material/core/shapes, not the package root: every Material shape by
  // name, and one shape alone, which must not carry the other 34
  { name: "shapes", imports: ["materialShapePath"] },
  { name: "shape-heart", imports: ["shapeHeart", "polygonPath"] },
  // material/components/datepicker/deferred, not the package root: the same
  // date picker with its calendar imported on the first open. Its initial
  // graph is the shell; the calendar is the deferred column.
  { name: "datepicker-deferred", imports: ["createDeferredDatePicker"] },
] as const;

export type ScenarioName = (typeof SCENARIO_DEFS)[number]["name"];

/**
 * Brotli of the initial graph at quality 11 — what a CDN serves, the setting
 * check-adapter-size.ts uses. Reported beside `gzBytes`.
 */
export const brotliBytes = (bytes: Uint8Array): number =>
  brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;

export interface SizeGateInput {
  readonly buildFailures: readonly string[];
  readonly treeShakeFailures: readonly unknown[];
}

export const sizeGateFails = (input: SizeGateInput): boolean =>
  input.buildFailures.length > 0 || input.treeShakeFailures.length > 0;

export const missingMeasuredScenarios = (
  measuredNames: readonly string[],
): readonly ScenarioName[] => {
  const measured = new Set(measuredNames);
  return SCENARIO_DEFS.map((scenario) => scenario.name).filter((name) => !measured.has(name));
};

// ── The published table (SIZES.md) ────────────────────────────────
//
// The same kernel and component rows as the console table.

export const TABLE_OPEN = "<!-- size-table -->";
export const TABLE_CLOSE = "<!-- /size-table -->";

const inTable = (name: ScenarioName): boolean =>
  name === "core" || name === "all" || COMPONENTS.some((component) => component.name === name);

const formatKB = (value: number): string => `${value.toFixed(1)} KB`;

/** The table SIZES.md commits: one row for the kernel, each component, and `all`. */
export const renderSizesTable = (results: readonly Result[]): string => {
  const lines = [
    "| Component | Minified | Gzipped | vs core | Deferred |",
    "| --- | ---: | ---: | ---: | ---: |",
  ];
  for (const result of results.filter((result) => inTable(result.name))) {
    const delta = result.name === "core"
      ? "—"
      : `${result.deltaKB >= 0 ? "+" : ""}${result.deltaKB.toFixed(1)} KB`;
    const deferred = result.deferredGzBytes === 0 ? "" : `+${formatKB(result.deferredGzBytes / 1024)}`;
    lines.push(`| ${result.name} | ${formatKB(result.minKB)} | ${formatKB(result.gzKB)} | ${delta} | ${deferred} |`);
  }
  return lines.join("\n");
};

/** The whole generated file: how it was measured, at what commit, and the table. */
export const renderSizesMarkdown = (
  results: readonly Result[],
  measuredAt: { commit: string; date: string },
): string => [
  "# Component sizes",
  "",
  "Measured by `bun run size` (scripts/size.ts). Each row imports only that",
  "component's factories from the package entry, the way a consumer does, and",
  "the numbers are what a bundler keeps. Minified and Gzipped are the initial",
  "graph — the static chunks the import pulls in before any lazy load.",
  "Deferred is the gzip of the chunks reached only through `import()`, which",
  "loads on demand. `vs core` is the gzipped delta against the `core` kernel",
  "(`pipe`, `createBase`, `withElement`) that every component starts from. A",
  "scenario that carries another component's code fails the run, not this table.",
  "",
  `Measured at ${measuredAt.commit} on ${measuredAt.date}. Regenerate with`,
  "`bun run size --markdown > SIZES.md` on the release candidate.",
  "",
  TABLE_OPEN,
  renderSizesTable(results),
  TABLE_CLOSE,
  "",
].join("\n");

// ── Markers ───────────────────────────────────────────────────────
//
// A marker is a string literal quoted by one component and by no other, which
// the minified initial graph still quotes. Three of those, preferring literals
// that name the component, are enough to notice a leaked module.

const STRING_LITERAL = /["']([^"'\\\n]{6,160})["']/g;
const TEMPLATE_LITERAL = /`([^`\\\n$]{6,160})`/g;

const readTree = (dir: string): string => {
  const parts: string[] = [];
  const walk = (current: string): void => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (name.endsWith(".ts") && !name.endsWith(".d.ts")) parts.push(readFileSync(path, "utf8"));
    }
  };
  walk(dir);
  return parts.join("\n");
};

const extractLiterals = (source: string): readonly string[] => {
  const found = new Set<string>();
  for (const pattern of [STRING_LITERAL, TEMPLATE_LITERAL]) {
    pattern.lastIndex = 0;
    let match = pattern.exec(source);
    while (match) {
      const value = match[1];
      if (
        value
        && /[a-z]/i.test(value)
        && !value.startsWith(".")
        && !value.startsWith("/")
        && !value.includes("://")
      ) {
        found.add(value);
      }
      match = pattern.exec(source);
    }
  }
  return [...found];
};

/** True when the minifier kept `marker` as its own quoted literal. */
const quotes = (text: string, marker: string): boolean =>
  text.includes(`"${marker}"`) || text.includes(`'${marker}'`) || text.includes(`\`${marker}\``);

const uniqueLiterals = (
  name: ComponentName,
  sources: ReadonlyMap<ComponentName, string>,
  coreSource: string,
): readonly string[] => {
  const own = extractLiterals(sources.get(name) ?? "");
  const unique: string[] = [];
  for (const value of own) {
    // Quoted, not a bare substring: "FAB creation error:" sits inside
    // extended-fab's "Extended FAB creation error:" and must still count as fab's.
    if (quotes(coreSource, value)) continue;
    let shared = false;
    for (const [other, source] of sources) {
      if (other !== name && quotes(source, value)) {
        shared = true;
        break;
      }
    }
    if (!shared) unique.push(value);
  }
  return unique.sort((a, b) => b.length - a.length);
};

const allowed = (name: ComponentName): ReadonlySet<ComponentName> => {
  const names = new Set<ComponentName>([name]);
  const deps = KNOWN_DEPS[name];
  if (deps) for (const dep of deps) names.add(dep);
  return names;
};

/** A scenario whose entry is a component's own module, not the package root. */
const SCENARIO_COMPONENTS: Partial<Record<ScenarioName, ComponentName>> = {
  "datepicker-deferred": "datepicker",
};

// ── Build & measure ───────────────────────────────────────────────

interface Scenario {
  name: ScenarioName;
  imports: readonly string[];
}

export interface Result {
  name: ScenarioName;
  minBytes: number;
  gzBytes: number;
  /** Brotli (quality 11) of the same initial graph `gzBytes` measures. */
  brBytes: number;
  /** Gzip of extra JS chunks. Dynamic imports land here, not in `gzBytes`. */
  deferredGzBytes: number;
  minKB: number;
  gzKB: number;
  deltaKB: number;
}

interface TreeShakeFailure {
  scenario: string;
  leaked: string;
  marker: string;
}

interface BuiltChunk {
  readonly path: string;
  readonly kind: string;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
}

interface ChunkEdges {
  readonly staticDeps: readonly string[];
  readonly dynamicDeps: readonly string[];
}

/** Initial chunks (static imports) and every chunk reached only through import(). */
const chunkGraph = async (
  chunks: readonly BuiltChunk[],
): Promise<{ initial: readonly string[]; deferred: readonly string[] } | string> => {
  const byPath = new Map(chunks.map((chunk) => [chunk.path, chunk]));
  const entryChunk = chunks.find((chunk) => chunk.kind === "entry-point") ?? chunks[0];
  if (!entryChunk) return "build produced no JavaScript";

  const edgesOf = async (path: string): Promise<ChunkEdges | string> => {
    const output = byPath.get(path);
    if (!output) return `missing chunk ${path}`;
    const file = ts.createSourceFile(path, await output.text(), ts.ScriptTarget.Latest, true);
    const staticDeps: string[] = [];
    const dynamicDeps: string[] = [];
    const walk = (node: ts.Node): void => {
      if (
        (ts.isImportDeclaration(node) || ts.isExportDeclaration(node))
        && node.moduleSpecifier
        && ts.isStringLiteral(node.moduleSpecifier)
      ) {
        staticDeps.push(resolve(dirname(path), node.moduleSpecifier.text));
      }
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
        const specifier = node.arguments[0];
        if (specifier && ts.isStringLiteral(specifier)) {
          dynamicDeps.push(resolve(dirname(path), specifier.text));
        }
      }
      ts.forEachChild(node, walk);
    };
    walk(file);
    return { staticDeps, dynamicDeps };
  };

  const initial: string[] = [];
  const deferred = new Set<string>();

  const visit = async (path: string): Promise<string | undefined> => {
    if (initial.includes(path)) return undefined;
    const edges = await edgesOf(path);
    if (typeof edges === "string") return edges;
    initial.push(path);
    for (const dependency of edges.dynamicDeps) deferred.add(dependency);
    for (const dependency of edges.staticDeps) {
      const missing = await visit(dependency);
      if (missing) return missing;
    }
    return undefined;
  };

  const missing = await visit(entryChunk.path);
  if (missing) return missing;

  // A lazy chunk can import() further chunks (card → button → progress).
  // Those stay out of the initial graph and join the deferred total.
  const lazy: string[] = [];
  const queue = [...deferred].filter((path) => !initial.includes(path));
  let cursor = queue.pop();
  while (cursor !== undefined) {
    if (!lazy.includes(cursor) && !initial.includes(cursor)) {
      const edges = await edgesOf(cursor);
      if (typeof edges === "string") return edges;
      lazy.push(cursor);
      for (const dependency of [...edges.staticDeps, ...edges.dynamicDeps]) {
        if (!initial.includes(dependency) && !lazy.includes(dependency)) queue.push(dependency);
      }
    }
    cursor = queue.pop();
  }

  return { initial, deferred: lazy };
};

const concatBytes = async (paths: readonly string[], byPath: ReadonlyMap<string, BuiltChunk>): Promise<Uint8Array> => {
  const parts: Uint8Array[] = [];
  let length = 0;
  for (const path of paths) {
    const chunk = byPath.get(path);
    if (!chunk) continue;
    const bytes = new Uint8Array(await chunk.arrayBuffer());
    parts.push(bytes);
    length += bytes.byteLength;
  }
  const joined = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.byteLength;
  }
  return joined;
};

const scenarioSource = (scenario: Scenario, projectRoot: string, scratch: string): string => {
  const specifier = (target: string): string => relative(scratch, target).replaceAll("\\", "/");
  if (scenario.name === "core") {
    return `import { pipe, createBase, withElement } from "${specifier(join(projectRoot, "src/core/compose/index.ts"))}"; globalThis._v = [pipe, createBase, withElement];`;
  }
  const imports = scenario.imports.join(", ");
  const from = scenario.name === "shapes" || scenario.name === "shape-heart"
    ? specifier(join(projectRoot, "src/core/shapes/index.ts"))
    : scenario.name === "datepicker-deferred"
      ? specifier(join(projectRoot, "src/components/datepicker/deferred.ts"))
      : specifier(join(projectRoot, "src/index.ts"));
  return `import { ${imports} } from "${from}"; globalThis._v = [${imports}];`;
};

export interface ScenarioBuild {
  readonly initialBytes: Uint8Array;
  readonly deferredBytes: Uint8Array;
  readonly texts: readonly string[];
}

/**
 * Build one scenario and return its initial and deferred chunks. The entry is
 * written into a fixed scratch and addressed relatively, and every import in
 * the generated source is relative to it, so the bytes depend only on the
 * source tree — not on the checkout path or a per-run temporary directory
 * (floor/material#131). The scratch must live inside `projectRoot`.
 */
export const buildScenario = async (
  projectRoot: string,
  scenario: Scenario,
  scratch = join(projectRoot, "tmp", "size"),
): Promise<ScenarioBuild | string> => {
  const stem = scenario.name.replace(/[^a-zA-Z0-9]/g, "_");
  mkdirSync(scratch, { recursive: true });
  const entryFile = join(scratch, `${stem}.ts`);
  await Bun.write(entryFile, scenarioSource(scenario, projectRoot, scratch));
  const entryPath = relative(projectRoot, entryFile).replaceAll("\\", "/");

  const previousCwd = process.cwd();
  process.chdir(projectRoot);
  try {
    const build = await Bun.build({
      entrypoints: [entryPath],
      outdir: join(scratch, "out", stem),
      minify: true,
      splitting: true,
      target: "browser",
      format: "esm",
      define: {
        "process.env.NODE_ENV": '"production"',
      },
    });

    if (!build.success) {
      return `build failed\n${build.logs.map((log) => `   ${log}`).join("\n")}`;
    }

    const chunks = build.outputs.filter((output): output is typeof output & BuiltChunk =>
      output.path.endsWith(".js"),
    );
    const byPath = new Map(chunks.map((chunk) => [chunk.path, chunk]));
    const graph = await chunkGraph(chunks);
    if (typeof graph === "string") return graph;

    const initialBytes = await concatBytes(graph.initial, byPath);
    const deferredBytes = await concatBytes(graph.deferred, byPath);
    const texts: string[] = [];
    for (const path of graph.initial) {
      const chunk = byPath.get(path);
      if (chunk) texts.push(await chunk.text());
    }
    return { initialBytes, deferredBytes, texts };
  } finally {
    process.chdir(previousCwd);
  }
};

const main = async (): Promise<void> => {
  // `--markdown` writes the SIZES.md content to standard output, so everything
  // else the run says goes to standard error and the file holds only the table.
  const markdown = process.argv.includes("--markdown");
  const report = markdown ? console.error : console.log;
  const coreSource = readTree(join(root, "src/core"));
  const sources = new Map<ComponentName, string>();
  for (const component of COMPONENTS) {
    sources.set(component.name, readTree(join(root, "src/components", component.name)));
  }
  const candidates = new Map<ComponentName, readonly string[]>();
  for (const component of COMPONENTS) {
    candidates.set(component.name, uniqueLiterals(component.name, sources, coreSource));
  }

  // A fixed scratch and a relative entrypoint keep the emitted bytes the same
  // on every run and in every checkout; tmp/ is ignored by git.
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(scratch, { recursive: true });
  const results: Result[] = [];
  const bundles = new Map<ScenarioName, string>();
  const buildFailures: ScenarioName[] = [];
  const scenarios: readonly Scenario[] = SCENARIO_DEFS;

  for (const scenario of scenarios) {
    const built = await buildScenario(root, scenario, scratch);
    if (typeof built === "string") {
      console.error(`  ✗ ${scenario.name} — ${built}`);
      buildFailures.push(scenario.name);
      continue;
    }

    const { initialBytes, deferredBytes, texts } = built;
    const gzBytes = gzipSync(initialBytes).byteLength;
    const brBytes = brotliBytes(initialBytes);
    const deferredGzBytes = deferredBytes.byteLength === 0 ? 0 : gzipSync(deferredBytes).byteLength;

    bundles.set(scenario.name, texts.join("\n"));
    results.push({
      name: scenario.name,
      minBytes: initialBytes.byteLength,
      gzBytes,
      brBytes,
      deferredGzBytes,
      minKB: initialBytes.byteLength / 1024,
      gzKB: gzBytes / 1024,
      deltaKB: 0,
    });
  }

  const markers = new Map<ComponentName, readonly string[]>();
  const coreBundle = bundles.get("core") ?? "";
  for (const component of COMPONENTS) {
    const bundle = bundles.get(component.name);
    const pool = candidates.get(component.name) ?? [];
    const surviving = bundle
      ? pool.filter((marker) => quotes(bundle, marker) && !quotes(coreBundle, marker))
      : [];
    const named = surviving.filter((marker) => marker.includes(component.name));
    markers.set(component.name, (named.length > 0 ? named : surviving).slice(0, 3));
  }

  const treeShakeFailures: TreeShakeFailure[] = [];

  for (const component of COMPONENTS) {
    if ((markers.get(component.name) ?? []).length > 0) continue;
    if (!bundles.has(component.name)) continue;
    treeShakeFailures.push({
      scenario: component.name,
      leaked: component.name,
      marker: "(no surviving marker)",
    });
  }

  for (const scenario of scenarios) {
    if (scenario.name === "all") continue;
    const bundle = bundles.get(scenario.name);
    if (!bundle) continue;
    // core and the shapes scenarios may carry no component at all
    const keep =
      scenario.name === "core" || scenario.name === "shapes" || scenario.name === "shape-heart"
        ? new Set<ComponentName>()
        : allowed(SCENARIO_COMPONENTS[scenario.name] ?? scenario.name as ComponentName);
    for (const component of COMPONENTS) {
      if (keep.has(component.name)) continue;
      for (const marker of markers.get(component.name) ?? []) {
        if (quotes(bundle, marker)) {
          treeShakeFailures.push({ scenario: scenario.name, leaked: component.name, marker });
          break;
        }
      }
    }
  }

  const coreGz = results.find((result) => result.name === "core")?.gzKB ?? 0;
  for (const result of results) result.deltaKB = result.gzKB - coreGz;

  const COL_NAME = 20;
  const COL_MIN = 10;
  const COL_GZ = 9;
  const COL_BR = 9;
  const COL_DELTA = 12;
  const COL_DEFERRED = 12;
  const showDeferred = results.some((result) => result.deferredGzBytes > 0);
  const LINE_W = COL_NAME + COL_MIN + COL_GZ + COL_BR + COL_DELTA + (showDeferred ? COL_DEFERRED : 0) + (showDeferred ? 6 : 4);

  const pad = (value: string, width: number): string => value.padStart(width);
  const sep = "─".repeat(LINE_W);

  report("");
  report("  mtrl — Component Sizes");
  report("");
  const header = `  ${"Component".padEnd(COL_NAME)}  ${"Minified".padStart(COL_MIN)}  ${"Gzipped".padStart(COL_GZ)}  ${"Brotli".padStart(COL_BR)}  ${"vs core".padStart(COL_DELTA)}`;
  report(showDeferred ? `${header}  ${"Deferred".padStart(COL_DEFERRED)}` : header);
  report(`  ${sep}`);

  for (const result of results) {
    const min = `${result.minKB.toFixed(1)} KB`;
    const gz = `${result.gzKB.toFixed(1)} KB`;
    const br = `${(result.brBytes / 1024).toFixed(1)} KB`;
    const delta = result.name === "core"
      ? ""
      : `${result.deltaKB >= 0 ? "+" : ""}${result.deltaKB.toFixed(1)} KB`;
    const line = `  ${result.name.padEnd(COL_NAME)}  ${pad(min, COL_MIN)}  ${pad(gz, COL_GZ)}  ${pad(br, COL_BR)}  ${pad(delta, COL_DELTA)}`;
    if (!showDeferred) {
      report(line);
      continue;
    }
    const deferred = result.deferredGzBytes === 0
      ? ""
      : `+${(result.deferredGzBytes / 1024).toFixed(1)} KB`;
    report(`${line}  ${pad(deferred, COL_DEFERRED)}`);
  }

  report(`  ${sep}`);
  report("");

  if (buildFailures.length > 0) {
    report(`  ✗ Build: ${buildFailures.length} scenario(s) failed to compile`);
    for (const name of buildFailures) report(`    ${name}`);
    report("");
  }

  if (treeShakeFailures.length === 0) {
    const checked = results.filter((result) => result.name !== "all").length;
    const expected = scenarios.length - 1;
    report(
      checked === expected
        ? `  ✓ Tree-shaking: all ${expected} scenarios clean — unused components excluded`
        : `  ✓ Tree-shaking: ${checked} measured scenario(s) clean`,
    );
  } else {
    report(`  ✗ Tree-shaking: ${treeShakeFailures.length} leak(s) detected`);
    report("");
    for (const failure of treeShakeFailures) {
      report(`    ${failure.scenario}: leaked ${failure.leaked} (marker: "${failure.marker}")`);
    }
  }

  report("");

  if (markdown) {
    process.stdout.write(renderSizesMarkdown(results, { commit: shortCommit(), date: new Date().toISOString().slice(0, 10) }));
  }

  rmSync(scratch, { recursive: true, force: true });

  for (const name of missingMeasuredScenarios(results.map((result) => result.name))) {
    if (!buildFailures.includes(name)) buildFailures.push(name);
  }

  if (sizeGateFails({ buildFailures, treeShakeFailures })) process.exit(1);

  const rows: SizeRow[] = results.flatMap(result => [
    { name: `Component ${result.name} gzip`, gate: "component-gzip", bytes: result.gzBytes },
    { name: `Component ${result.name} deferred gzip`, gate: "component-gzip", bytes: result.deferredGzBytes },
  ]);
  const analysis = join(root, "analysis");
  mkdirSync(analysis, { recursive: true });
  writeFileSync(join(analysis, "component-size.json"), JSON.stringify({ rows, results }) + "\n");

};

if (import.meta.main) {
  await main();
}
