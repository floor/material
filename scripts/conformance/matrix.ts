import { dirname, join, resolve } from "node:path";
import { createRequire } from "node:module";
import pin from "../../conformance/reference.json";
import { bindings } from "./matrix-bindings";
import { matrixTokens } from "./matrix-reference";
import type { CaseResult, PartResult } from "./measure";
import type { ComposeReference, Override, Probe, RowBinding, SpecReference, Status } from "./matrix-types";

const root = resolve(import.meta.dir, "../..");
const engines = ["chromium", "webkit"] as const;
type Engine = typeof engines[number];
const composeRelease = "https://developer.android.com/jetpack/androidx/releases/compose-material3#1.5.0";
const kotlin = "compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3";

const urlId = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;
const rowId = (component: string, key: string) => /^(?:top-app-bar|bottom-app-bar)\/[^/]+\/[^/]+\/[^/]+$/.test(key)
  ? key : `${component}/${key}`;
const hex = /#[A-F\d]{6}\b/i;
const colorMatch = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/;
const asHex = (r: string, g: string, b: string) =>
  "#" + [r, g, b].map(value => Number(value).toString(16).padStart(2, "0")).join("").toUpperCase();

function colorValue(value: string): string | undefined {
  const rgb = colorMatch.exec(value);
  const srgb = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(value);
  if (!rgb && !srgb) return /^(?:\w+ )?(#[A-F\d]{6})$/i.exec(value)?.[1]?.toUpperCase();
  const color = rgb ?? srgb!;
  const alpha = Number(color[4] ?? 1);
  if (alpha === 0) return "transparent";
  const channel = (index: number) => rgb ? color[index]! : String(Math.round(Number(color[index]) * 255));
  const packed = asHex(channel(1), channel(2), channel(3));
  return alpha === 1 ? packed : `${packed} at ${alpha} opacity`;
}

function cssValue(value: string): string {
  return value
    .replace(/(-?[\d.]+) (px|dp|sp|ms)\b/g, "$1$2")
    .replace(/^(-?[\d.]+)px$/, (_, magnitude: string) => `${Math.round(Number(magnitude) * 100) / 100}px`);
}

function comparable(value: string): string {
  const color = colorValue(value);
  if (color) return color;
  const length = /^(-?[\d.]+)\s*(?:px|dp|sp)(?: all corners| corner size)?$/.exec(value);
  if (length) return `length:${Number(length[1])}`;
  const time = /^(-?[\d.]+)\s*(ms|s)$/.exec(value);
  if (time) return `time:${Number(time[1]) * (time[2] === "s" ? 1000 : 1)}`;
  if (/^-?[\d.]+$/.test(value)) return Number(value).toString();
  return value.toLowerCase().replace(/(-?[\d.]+)\s*(?:dp|sp)\b/g, "$1px");
}

function getPart(row: CaseResult, name: string, id: string): PartResult {
  const part = row.parts[name];
  if (!part) throw new Error(`${id}: missing part ${name} in ${row.id}`);
  return part;
}

function visibleRect(part: PartResult): PartResult["rect"] {
  const clip = /^inset\(0px ([\d.]+)px(?: round .*)?\)$/.exec(part.style.clipPath ?? "");
  if (!clip) return part.rect;
  const inset = Number(clip[1]);
  return { ...part.rect, x: part.rect.x + inset, width: part.rect.width - 2 * inset };
}

const decimal = (value: number) => Math.round(value * 100) / 100;

function readProbe(cases: ReadonlyMap<string, CaseResult>, row: CaseResult, probe: Probe, id: string, roleFor: (value: string) => string): string {
  if ("read" in probe && probe.read === "present") {
    if (!Object.hasOwn(row.parts, probe.part)) throw new Error(`${id}: missing presence probe ${probe.part}`);
    return row.parts[probe.part] ? "Present" : "Absent";
  }
  const part = getPart(row, probe.part, id);
  const { style } = part;
  const rect = visibleRect(part);
  const px = (value: number) => `${decimal(value)}px`;
  if ("read" in probe) {
    if (probe.read === "opacity") {
      const background = colorMatch.exec(style.backgroundColor ?? "");
      if (!background || !style.opacity) throw new Error(`${id}: missing state layer background or opacity`);
      return String(decimal(Number(style.opacity) * Number(background[4] ?? 1)));
    }
    if (probe.read === "translateX") {
      const matrix = /^matrix\(([^)]+)\)$/.exec(style.transform ?? "");
      const translated = matrix ? Number(matrix[1]!.split(",")[4]) : 0;
      return px(translated + (parseFloat(style.translate ?? "") || 0));
    }
    if (!style.boxShadow) throw new Error(`${id}: missing box shadow`);
    if (style.boxShadow === "none") return "Level 0";
    const shadow = style.boxShadow.replace(/rgba?\([^)]*\)\s*/g, "");
    if (shadow === "0px 1px 2px 0px, 0px 1px 3px 1px") return "Level 1";
    return cssValue(style.boxShadow);
  }
  if ("gap" in probe) {
    const other = visibleRect(getPart(row, probe.relativeTo, id));
    return px(probe.gap === "right" ? other.x - rect.x - rect.width : other.y - rect.y - rect.height);
  }
  if ("sideInsets" in probe) {
    const other = getPart(row, probe.sideInsets, id).rect;
    return `${px(rect.x - other.x)} / ${px(other.x + other.width - rect.x - rect.width)}`;
  }
  if ("different" in probe) {
    const other = visibleRect(getPart(row, probe.relativeTo, id));
    const size = (box: typeof rect) => probe.different === "aspectRatio" ? box.width / box.height : box[probe.different];
    return Math.abs(size(rect) - size(other)) > 0.01 ? "Present" : "Absent";
  }
  if ("widthPair" in probe) {
    const other = cases.get(probe.widthPair);
    if (!other) throw new Error(`${id}: missing width comparison ${probe.widthPair}`);
    return `${px(rect.width)} / ${px(getPart(other, probe.part, id).rect.width)}`;
  }
  if ("box" in probe) return px(rect[probe.box]);
  if ("inset" in probe) {
    const reference = getPart(row, probe.relativeTo, id).rect;
    const distances = {
      left: rect.x - reference.x,
      right: reference.x + reference.width - rect.x - rect.width,
      top: rect.y - reference.y,
      bottom: reference.y + reference.height - rect.y - rect.height,
    };
    return px(distances[probe.inset]);
  }
  if ("outline" in probe) {
    if (!style.outlineStyle || !style.outlineWidth || !style.outlineColor || !style.outlineOffset) {
      throw new Error(`${id}: the fixture did not read the outline`);
    }
    if (style.outlineStyle === "none") return "No outline";
    return `${cssValue(style.outlineWidth)} ${style.outlineStyle} ${roleFor(style.outlineColor)} at ${cssValue(style.outlineOffset)}`;
  }
  const value = style[probe.style];
  if (!value) throw new Error(`${id}: missing ${probe.style} in ${row.id}/${probe.part}`);
  return colorValue(value) ? roleFor(value) : cssValue(value);
}

async function readFixture(entry: string, ids: string[], engine: Engine): Promise<Map<string, CaseResult>> {
  const command = [process.execPath, join(import.meta.dir, `${entry}.ts`), `--cases=${JSON.stringify(ids)}`];
  if (ids.length === 1 && ids[0] === "behavior") command.push("--matrix-behavior");
  if (engine === "webkit") command.push("--webkit");
  const child = Bun.spawn(command, { cwd: root, stdout: "pipe", stderr: "pipe" });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited, new Response(child.stdout).text(), new Response(child.stderr).text(),
  ]);
  if (exitCode) throw new Error(`${entry} (${engine}) exited ${exitCode}\n${stderr}`);
  const result = JSON.parse(stdout) as { source: string; engine: string; rows: CaseResult[] };
  if (result.source !== "dist" || result.engine !== engine) {
    throw new Error(`${entry}: expected ${engine} against dist, got ${result.engine} against ${result.source}`);
  }
  const rows = new Map(result.rows.map(row => [row.id, row]));
  if (rows.size !== ids.length || ids.some(id => !rows.has(id))) {
    throw new Error(`${entry}: fixture did not return the requested cases`);
  }
  return rows;
}

export async function generateMatrix(entries: ReadonlyMap<string, string>, check: boolean): Promise<void> {
  const started = performance.now();
  if (!await Bun.file(join(root, "dist", "index.js")).exists()) {
    throw new Error("Build the package with bun run build before generating the conformance matrix");
  }
  const overrides: Record<string, Override> = await Bun.file(join(root, "conformance", "overrides.json")).json();
  const ids = new Set<string>();
  const fixtures = new Set<string>();
  const files = new Set<string>();
  for (const binding of bindings) {
    if (!entries.has(binding.fixture) || fixtures.has(binding.fixture)) {
      throw new Error(`Unknown or repeated conformance fixture ${binding.fixture}`);
    }
    fixtures.add(binding.fixture);
    for (const row of binding.rows) {
      const id = rowId(binding.id, row.key);
      if (!urlId.test(id) || ids.has(id)) throw new Error(`Invalid or repeated row id ${id}`);
      ids.add(id);
      if (!overrides[id]?.compose && row.token) files.add(row.token.split(".")[0]!);

    }
  }
  if (fixtures.size !== entries.size) throw new Error("Every conformance fixture must participate in the matrix");
  for (const [id, override] of Object.entries(overrides)) {
    if (!ids.has(id)) throw new Error(`Unknown override ${id}`);
    if (override.compose && !override.reason?.trim()) throw new Error(`Compose override ${id} needs a reason`);
  }
  const tokens = await matrixTokens(root, files);
  const lookup = new Map(tokens.map(row => [`${row.file}.${row.token}`, row]));
  const roles = new Map<string, string>();
  for (const token of tokens.filter(row => row.file === "ColorLightTokens")) {
    const palette = lookup.get(token.raw);
    if (!palette) continue;
    const bytes = /^Color\(red = (\d+), green = (\d+), blue = (\d+)\)$/.exec(palette.raw);
    const color = bytes ? asHex(bytes[1]!, bytes[2]!, bytes[3]!) : /^Color\(0xFF([A-F\d]{6})\)$/i.exec(palette.raw)?.[1];
    if (color) {
      const key = color.startsWith("#") ? color : `#${color.toUpperCase()}`;
      if (!roles.has(key)) roles.set(key, token.token);
    }
  }

  const specDefault: SpecReference = {
    value: null, url: pin.reference.m3Site.url, section: "", read: pin.reference.m3Site.read,
  };
  const composeDefault: ComposeReference = { value: null, file: null, symbol: null, line: null, url: composeRelease };

  function composeFor(id: string, binding: RowBinding): ComposeReference {
    if (overrides[id]?.compose) return overrides[id]!.compose!;
    if (!binding.token) return composeDefault;
    const token = lookup.get(binding.token);
    if (!token) throw new Error(`${id}: no released token ${binding.token}`);
    const role = /^ColorSchemeKeyTokens\.(\w+)$/.exec(token.raw)?.[1];
    const light = hex.exec(token.resolved)?.[0];
    const file = `${token.file}.kt`;
    const line = Number(token.source.split(":")[1]);
    return {
      value: role && light ? `${role} ${light}` : cssValue(token.resolved),
      file, symbol: token.token, line,
      url: `https://github.com/androidx/androidx/blob/${pin.reference.compose.commit}/${kotlin}/tokens/${file}#L${line}`,
    };
  }

  type MatrixRow = {
    id: string; property: string; aspect: RowBinding["aspect"]; variant?: string; state: string;
    density: number; spec: SpecReference; compose: ComposeReference;
    material: { value: string; engines: Record<Engine, string> | null };
    status: { spec: Status; compose: Status }; note: string; issue: null;
  };
  const components = new Map<string, { id: string; name: string; properties: MatrixRow[] }>();
  for (const binding of bindings) {
    const entry = entries.get(binding.fixture)!;
    const cases = [...new Set(binding.rows.flatMap(row => "widthPair" in row.probe
      ? [row.case, row.probe.widthPair] : [row.case]))];
    const regular = cases.filter(id => id !== "behavior");
    const chromium = await readFixture(entry, regular, "chromium");
    const webkit = await readFixture(entry, regular, "webkit");
    if (cases.includes("behavior")) {
      for (const [engine, measurements] of [["chromium", chromium], ["webkit", webkit]] as const) {
        const extra = await readFixture(entry, ["behavior"], engine);
        measurements.set("behavior", extra.get("behavior")!);
      }
    }
    const component = components.get(binding.id) ?? { id: binding.id, name: binding.name, properties: [] };
    for (const row of binding.rows) {
      const id = rowId(binding.id, row.key);
      const spec = overrides[id]?.spec ?? specDefault;
      const compose = composeFor(id, row);
      const forRole = (value: string) => {
        const normalized = colorValue(value) ?? value;
        const referenceColor = [spec.value, compose.value].find(value =>
          value && /^\w+ (#[A-F\d]{6})$/i.exec(value)?.[1] === normalized);
        if (referenceColor) return referenceColor;
        const role = roles.get(normalized);
        return role ? `${role} ${normalized}` : normalized;
      };
      const left = chromium.get(row.case)!;
      const right = webkit.get(row.case)!;
      if (left.state !== right.state || left.density !== right.density) throw new Error(`${id}: fixture metadata differs by engine`);
      const values = {
        chromium: readProbe(chromium, left, row.probe, id, forRole),
        webkit: readProbe(webkit, right, row.probe, id, forRole),
      };
      const status = (reference: string | null): Status => {
        if (reference === null) return "no-value";
        const target = comparable(reference);
        const agrees = (value: string) => {
          if (reference === "Visible keyboard focus ring") {
            return Number(/^([\d.]+)px (?:solid|double|dotted|dashed) /.exec(value)?.[1] ?? 0) > 0;
          }
          if (reference === "Visible state layer") return Number(value) > 0;
          if (reference === "Raised") return /^Level [1-5]$/.test(value);
          const limit = /^([\d.]+)dp (minimum|maximum)$/.exec(reference);
          if (limit && value.endsWith("px")) {
            const amount = Number.parseFloat(value);
            return limit[2] === "minimum" ? amount >= Number(limit[1]) : amount <= Number(limit[1]);
          }
          return comparable(value) === target;
        };
        return engines.every(engine => agrees(values[engine])) ? "match" : "drift";
      };
      const segments = id.split("/");
      const hasFixtureState = segments.length === 4 && !/^(?:xs|s|m|l|xl)$/.test(segments[3]!);
      const variant = hasFixtureState ? segments[2] : undefined;
      const state = hasFixtureState ? segments[3] : left.state;
      component.properties.push({
        id, property: row.property, aspect: row.aspect,
        variant: row.variant ?? variant, state, density: left.density,
        spec, compose,
        material: { value: values.chromium, engines: values.chromium === values.webkit ? null : values },
        status: { spec: status(spec.value), compose: status(compose.value) },
        note: overrides[id]?.reason ?? "", issue: null,
      });
    }
    components.set(binding.id, component);
    console.error(`Measured ${binding.fixture} (${cases.length} cases per engine)`);
  }
  const sorted = [...components.values()].sort((a, b) => a.id.localeCompare(b.id, "en"));
  const version: { version: string } = await Bun.file(join(root, "package.json")).json();
  const packageFile = createRequire(import.meta.url).resolve("playwright-core/package.json");
  const web: { browsers: { name: string; browserVersion?: string }[] } = await Bun.file(join(dirname(packageFile), "browsers.json")).json();
  const versionOf = (name: Engine) => {
    const found = web.browsers.find(browser => browser.name === name)?.browserVersion;
    if (!found) throw new Error(`Playwright did not declare a version for ${name}`);
    return found;
  };
  const matrix = {
    schema: 1, material: version.version, commit: pin.materialCommit, measured: pin.measured,
    references: {
      spec: { name: "Material 3 specification", ...pin.reference.m3Site },
      compose: {
        name: "Jetpack Compose Material 3", version: pin.reference.compose.version,
        commit: pin.reference.compose.commit, date: pin.reference.compose.released, url: composeRelease,
      },
    },
    method: {
      browsers: engines, engines: { chromium: versionOf("chromium"), webkit: versionOf("webkit") },
      note: "Both engines measure every value. Separate engine values appear where they differ.",
    },
    components: sorted.map(component => ({
      ...component, properties: component.properties.sort((a, b) => a.id.localeCompare(b.id, "en")),
    })),
  };
  const destination = join(root, "conformance", "matrix.json");
  const json = JSON.stringify(matrix, null, 2) + "\n";
  if (check) {
    if (await Bun.file(destination).text() !== json) {
      const actual = join(root, "analysis", "conformance-matrix-actual.json");
      await Bun.write(actual, json);
      const diff = Bun.spawnSync(["git", "diff", "--no-index", "--", "conformance/matrix.json", "analysis/conformance-matrix-actual.json"], { cwd: root, stdout: "inherit" });
      throw new Error(`The regenerated conformance matrix differs from the committed copy (diff exit ${diff.exitCode})`);
    }
  } else {
    await Bun.write(destination, json);
  }
  console.log(`Conformance matrix: ${ids.size} rows across ${sorted.length} pages in ${Math.round((performance.now() - started) / 1000)}s`);
}
