/** Component token coverage against the committed conformance matrix. */
import { createHash } from "node:crypto";
import { join } from "node:path";
import reference from "../../conformance/reference.json";
import { readComposeTokens, type ComposeToken } from "./compose-tokens";

type Kind = "colour-role" | "typography-role" | "shape" | "elevation" | "dp" | "opacity" | "duration" | "easing" | "other";
type Value = { kind: Kind; value: number | string };
type TokenFile = Record<string, Value>;
type Snapshot = { compose: typeof pin; files: Record<string, TokenFile> };
type FileReview = {
  measured?: Record<string, string>;
  unmeasured?: string[];
  notApplicable?: Record<string, string>;
};
type Review = Record<string, Record<string, FileReview>>;
type Matrix = {
  references: { compose: { version: string; commit: string } };
  components: { id: string; properties: { id: string; compose: { file: string | null; symbol: string | null } }[] }[];
};
type Decision =
  | { status: "measured"; rowId: string }
  | { status: "unmeasured" }
  | { status: "not-applicable"; reason: string };
type Entry = Value & { component: string; file: string; token: string } & Decision;

const directory = join(import.meta.dir, "../../conformance");
const snapshotPath = join(directory, "compose-tokens-1.5.0.json");
const coveragePath = join(directory, "coverage.json");
const { artifact, version, commit, sources } = reference.reference.compose;
const pin = { artifact, version, commit, sha256: sources[0]!.sha256 };
const hashes: Record<string, string> = reference.tokenHashes;

const roles: Record<string, Kind> = {
  ColorSchemeKeyTokens: "colour-role",
  TypographyKeyTokens: "typography-role",
  ShapeKeyTokens: "shape",
  ShapeTokens: "shape",
  ElevationTokens: "elevation",
};

function tokenValue({ token, raw }: ComposeToken): Value {
  const role = /^(\w+Tokens)\.(\w+)$/.exec(raw);
  if (role && roles[role[1]!]) return { kind: roles[role[1]!]!, value: role[2]! };
  const number = /^(-?\d+(?:\.\d+)?)(f|\.dp|\.ms)?$/.exec(raw);
  if (number) {
    const [, value, unit] = number;
    if (unit === ".dp") return { kind: "dp", value: Number(value) };
    if (unit === ".ms" || token.includes("Duration")) return { kind: "duration", value: Number(value) };
    if (token.includes("Opacity")) return { kind: "opacity", value: Number(value) };
    return { kind: "other", value: Number(value) };
  }
  if (/Easing\(/.test(raw)) return { kind: "easing", value: raw };
  if (/(?:Shape|CornerSize)\(/.test(raw)) return { kind: "shape", value: raw };
  return { kind: "other", value: raw };
}

/** Refresh the snapshot from the flat token directory of the pinned JAR. */
async function snapshot(directory: string, files: string[]): Promise<Snapshot> {
  for (const file of files) {
    const bytes = await Bun.file(join(directory, file)).arrayBuffer();
    const hash = createHash("sha256").update(new Uint8Array(bytes)).digest("hex");
    if (hash !== hashes[file]) throw new Error(`Compose source checksum mismatch for ${file}`);
  }
  const tokens = readComposeTokens(directory).rows;
  const inventory: Snapshot["files"] = {};
  for (const file of files) {
    const rows = tokens.filter(row => `${row.file}.kt` === file);
    if (!rows.length) throw new Error(`No Compose tokens in ${file}`);
    const values = Object.fromEntries(rows.map(row => [row.token, tokenValue(row)]));
    if (Object.keys(values).length !== rows.length) throw new Error(`Duplicate token in ${file}`);
    inventory[file] = values;
  }
  return { compose: pin, files: inventory };
}

function reviewFile(review: FileReview, rowIds: Set<string>, name: string): Map<string, Decision> {
  const decisions = new Map<string, Decision>();
  const add = (token: string, decision: Decision) => {
    if (decisions.has(token)) throw new Error(`${name}.${token} has multiple reviewed decisions`);
    decisions.set(token, decision);
  };
  for (const [token, rowId] of Object.entries(review.measured ?? {})) {
    if (!rowIds.has(rowId)) throw new Error(`${name}.${token} names a row outside this component: ${rowId}`);
    add(token, { status: "measured", rowId });
  }
  for (const token of review.unmeasured ?? []) add(token, { status: "unmeasured" });
  for (const [token, reason] of Object.entries(review.notApplicable ?? {})) {
    if (!reason.trim() || /[\r\n]/.test(reason)) throw new Error(`${name}.${token} needs a one-line reason`);
    add(token, { status: "not-applicable", reason });
  }
  return decisions;
}

function totals(entries: Entry[]) {
  const measured = entries.filter(entry => entry.status === "measured").length;
  const unmeasured = entries.filter(entry => entry.status === "unmeasured").length;
  const applicable = measured + unmeasured;
  return {
    tokens: entries.length,
    measured,
    unmeasured,
    notApplicable: entries.length - applicable,
    coveragePercent: applicable ? Math.round(10_000 * measured / applicable) / 100 : null,
  };
}

function coverage(matrix: Matrix, inventory: Snapshot, review: Review) {
  for (const key of Object.keys(pin) as (keyof typeof pin)[]) {
    if (inventory.compose[key] !== pin[key]) throw new Error(`Compose snapshot ${key} differs from the pin`);
  }
  if (matrix.references.compose.version !== version || matrix.references.compose.commit !== commit) {
    throw new Error("The matrix and coverage snapshot use different Compose pins");
  }
  const matrixIds = new Set(matrix.components.map(component => component.id));
  if (matrixIds.size !== Object.keys(review).length || Object.keys(review).some(id => !matrixIds.has(id))) {
    throw new Error("Review files must be assigned for every matrix component");
  }
  const unusedFiles = new Set(Object.keys(inventory.files));
  const entries: Entry[] = [];
  const components = matrix.components.map(({ id, properties }) => {
    const componentEntries: Entry[] = [];
    const files = review[id]!;
    const automatic = new Map<string, string>();
    for (const { id: rowId, compose: { file, symbol } } of properties) {
      if (!file || !symbol || !Object.hasOwn(inventory.files[file] ?? {}, symbol)) continue;
      if (!Object.hasOwn(files, file)) throw new Error(`${rowId} references ${file} outside its coverage scope`);
      const key = `${file}:${symbol}`;
      // A token can be measured by several variants. Keep the first published row.
      if (!automatic.has(key)) automatic.set(key, rowId);
    }
    const rowIds = new Set(properties.map(row => row.id));
    for (const file of Object.keys(files).sort()) {
      const tokens = inventory.files[file];
      if (!hashes[file] || !tokens || !Object.keys(tokens).length) throw new Error(`No pinned tokens for ${id}/${file}`);
      unusedFiles.delete(file);
      const name = `${id}/${file}`;
      const decisions = reviewFile(files[file]!, rowIds, name);
      for (const token of Object.keys(tokens).sort()) {
        const rowId = automatic.get(`${file}:${token}`);
        const reviewed = decisions.get(token);
        if (rowId && reviewed) throw new Error(`${name}.${token} already has an exact matrix reference`);
        const decision: Decision | undefined = rowId ? { status: "measured", rowId } : reviewed;
        if (!decision) throw new Error(`${name}.${token} needs a reviewed decision`);
        decisions.delete(token);
        componentEntries.push({ component: id, file, token, ...tokens[token]!, ...decision });
      }
      if (decisions.size) throw new Error(`${name} has unknown tokens: ${[...decisions.keys()].join(", ")}`);
    }
    entries.push(...componentEntries);
    return { component: id, ...totals(componentEntries) };
  });
  if (unusedFiles.size) throw new Error(`Snapshot files without matrix components: ${[...unusedFiles].join(", ")}`);

  const summary = JSON.stringify({ schema: 1, compose: pin, totals: totals(entries), components }, null, 2);
  const records = entries.map(entry => `    ${JSON.stringify(entry)}`).join(",\n");
  return `${summary.slice(0, -2)},\n  "entries": [\n${records}\n  ]\n}\n`;
}

const review = await Bun.file(join(directory, "coverage-map.json")).json() as Review;
const [command, source, ...remaining] = process.argv.slice(2);
if (command === "--snapshot" && source && !remaining.length) {
  const files = [...new Set(Object.values(review).flatMap(Object.keys))].sort();
  const data = await snapshot(source, files);
  await Bun.write(snapshotPath, JSON.stringify(data, null, 2) + "\n");
  console.log(`Wrote ${files.length} pinned Compose token files to the coverage snapshot`);
} else if ((!command || command === "--check") && !source) {
  const matrix = await Bun.file(join(directory, "matrix.json")).json() as Matrix;
  const inventory = await Bun.file(snapshotPath).json() as Snapshot;
  const generated = coverage(matrix, inventory, review);
  if (command === "--check") {
    const committed = Bun.file(coveragePath);
    if (!(await committed.exists()) || await committed.text() !== generated) {
      throw new Error("conformance/coverage.json is stale. Run bun run scripts/conformance/coverage.ts");
    }
    console.log("Compose token coverage matches conformance/coverage.json");
  } else {
    await Bun.write(coveragePath, generated);
    console.log("Wrote conformance/coverage.json");
  }
} else {
  throw new Error("Usage: bun run scripts/conformance/coverage.ts [--check | --snapshot <token directory>]");
}
