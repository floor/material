#!/usr/bin/env bun
// scripts/conformance/compose-tokens.ts
/**
 * The M3 column of a conformance table, generated from the library's own
 * Compose token files instead of typed by hand.
 *
 *   bun run scripts/conformance/compose-tokens.ts button
 *   bun run scripts/conformance/compose-tokens.ts button --files
 *   bun run scripts/conformance/compose-tokens.ts --only ButtonSmallTokens,ButtonMediumTokens
 *   bun run scripts/conformance/compose-tokens.ts button-group --json
 *
 * It reads the version named in docs/projects/material/library/compose-tokens/
 * current.json, finds the token files whose name matches the component, and
 * prints every `val Name = value` with its raw value, the value resolved
 * through the theme, shape and type aliases (the colour scheme for light and
 * dark, the shape tokens, the elevation levels, the type scale), and the
 * file:line where each is written. Nothing here is measured: the "ours" column
 * of the table is a browser measurement on origin/main.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "..", "..");

/** The library's token folder: found by walking up from the repo, or given. */
const findLibrary = (): string => {
  const given = process.env.COMPOSE_TOKENS_DIR;
  if (given) return given;
  let at = root;
  for (let i = 0; i < 8; i++) {
    const candidate = join(at, "docs", "projects", "material", "library", "compose-tokens");
    if (readdirSync(at).includes("docs")) {
      try {
        readFileSync(join(candidate, "current.json"));
        return candidate;
      } catch {
        // keep walking
      }
    }
    at = join(at, "..");
  }
  throw new Error("compose-tokens not found; set COMPOSE_TOKENS_DIR");
};
const library = findLibrary();
const versionFile = join(library, "current.json");

type Token = { name: string; raw: string; line: number; file: string };
type Resolved = { text: string; chain: string };

const readVersion = (): string => JSON.parse(readFileSync(versionFile, "utf8")).version as string;
/** `<library>/<version>/files/…/tokens`, or a folder of `.kt` files given as the library. */
let tokensDir = "";
const tokenDir = (version: string): string =>
  join(library, version, "files", "compose", "material3", "material3", "src", "commonMain", "kotlin", "androidx", "compose", "material3", "tokens");
const tokenFiles = (): string[] => readdirSync(tokensDir).filter((name) => name.endsWith(".kt"));

/**
 * Every token in a file. Two forms are read: `val Name = value`, and the
 * androidx-main form `inline val Name: Type` with `get() = value` on the
 * following lines. A value that opens a call or is written on the next line
 * runs until its own parens close.
 */
const parseTokens = (path: string, file: string): Token[] => {
  const lines = readFileSync(path, "utf8").split("\n");
  const tokens: Token[] = [];
  const depth = (text: string) => (text.match(/\(/g)?.length ?? 0) - (text.match(/\)/g)?.length ?? 0);
  const continues = (line: string | undefined) =>
    line !== undefined && !/^\s*(val |inline val |const val |object |enum |class |\})/.test(line);
  for (let i = 0; i < lines.length; i++) {
    const inline = /^\s*(?:(?:inline|const)\s+)*val (\w+)(?:\s*:\s*[\w.]+)?(?:\s*=\s*(.*))?$/.exec(lines[i]!);
    if (!inline) continue;
    const name = inline[1]!;
    let raw = (inline[2] ?? "").trim();
    let end = i;
    let opened = raw === "" ? 1 : depth(raw);
    if (raw === "" ) {
      // `get() = value` on the following lines
      const getter = /^\s*get\(\)\s*=\s*(.*)$/.exec(lines[i + 1] ?? "");
      if (getter) {
        end = i + 1;
        raw = getter[1]!.trim();
        opened = raw === "" ? 1 : depth(raw);
      }
    }
    while (opened > 0 && continues(lines[end + 1])) {
      end += 1;
      const next = lines[end]!.trim();
      raw = raw === "" ? next : `${raw} ${next}`;
      opened += depth(next);
      if (raw !== "" && opened <= 0) break;
    }
    if (raw !== "") tokens.push({ name, raw: raw.replace(/\s+/g, " ").trim(), line: i + 1, file });
    i = end;
  }
  return tokens;
};

const index = (version: string) => {
  const files = tokenFiles();
  const byName = new Map<string, Token[]>();
  for (const file of files) {
    const parsed = parseTokens(join(tokensDir, file), file);
    if (parsed.length) byName.set(file.replace(/\.kt$/, ""), parsed);
  }
  return { files, byName };
};

type Lookup = { tokens: Map<string, Map<string, Token>> };

/** A token of a named object, wherever that object's file is. */
const tokenOf = (lookup: Lookup, object: string, name: string): Token | undefined =>
  lookup.tokens.get(object)?.get(name);

/** `Color(red = 103, green = 80, blue = 164)` as #6750A4. */
const colorHex = (raw: string): string | null => {
  const match = /Color\(red = (\d+), green = (\d+), blue = (\d+)/.exec(raw);
  if (!match) return null;
  const hex = (value: string) => Number(value).toString(16).padStart(2, "0");
  return `#${hex(match[1]!)}${hex(match[2]!)}${hex(match[3]!)}`.toUpperCase();
};

const shapeText = (raw: string): string => {
  if (/CircleShape/.test(raw)) return "circle (CornerFull)";
  if (/RectangleShape/.test(raw)) return "square (RectangleShape)";
  const rounded = /RoundedCornerShape\((\d+(?:\.\d+)?)\.dp\)/.exec(raw);
  if (rounded) return `${rounded[1]} dp all corners`;
  const corners = ["topStart", "topEnd", "bottomEnd", "bottomStart"]
    .map((corner) => {
      const value = new RegExp(`${corner} = (\\d+(?:\\.\\d+)?)\\.dp`).exec(raw);
      return value ? `${corner} ${value[1]} dp` : null;
    })
    .filter(Boolean);
  return corners.length ? corners.join(", ") : raw.slice(0, 60);
};

/** Resolve one token through the scheme, shape, elevation and type aliases. */
const resolve = (token: Token, lookup: Lookup): Resolved => {
  const raw = token.raw;
  const where = (other: Token | undefined) => (other ? ` → ${other.file.replace(/\.kt$/, "")}:${other.line}` : "");

  const color = /^ColorSchemeKeyTokens\.(\w+)/.exec(raw);
  if (color) {
    const name = color[1]!;
    const light = tokenOf(lookup, "ColorLightTokens", name);
    const dark = tokenOf(lookup, "ColorDarkTokens", name);
    const palette = (found: Token | undefined) => {
      const next = found && /^PaletteTokens\.(\w+)/.exec(found.raw);
      return next ? tokenOf(lookup, "PaletteTokens", next[1]!) : undefined;
    };
    const lightPalette = palette(light);
    const darkPalette = palette(dark);
    const lightHex = lightPalette ? colorHex(lightPalette.raw) : null;
    const darkHex = darkPalette ? colorHex(darkPalette.raw) : null;
    if (lightHex) {
      const chain = `${where(light)}${where(lightPalette)}`;
      return { text: darkHex && darkHex !== lightHex ? `light ${lightHex} / dark ${darkHex}` : lightHex, chain };
    }
    return { text: `scheme role ${name}`, chain: "" };
  }

  const shape = /^ShapeKeyTokens\.(\w+)/.exec(raw);
  if (shape) {
    const found = tokenOf(lookup, "ShapeTokens", shape[1]!);
    return { text: found ? shapeText(found.raw) : `shape role ${shape[1]}`, chain: where(found) };
  }

  // androidx-main writes spacing through measurement tokens: resolve them.
  const measure = /^MeasurementTokens\.(\w+)/.exec(raw);
  if (measure) {
    const found = tokenOf(lookup, "MeasurementTokens", measure[1]!);
    return { text: found ? found.raw.replace(/\.dp$/, " dp") : `measurement ${measure[1]}`, chain: where(found) };
  }

  // A direct shape value (`ShapeTokens.CornerValueSmall`) resolves in place.
  const shapeValue = /^ShapeTokens\.(\w+)/.exec(raw);
  if (shapeValue) {
    const found = tokenOf(lookup, "ShapeTokens", shapeValue[1]!);
    const dp = found ? /CornerSize\((\d+(?:\.\d+)?)\.dp\)/.exec(found.raw) : null;
    return { text: dp ? `${dp[1]} dp corner size` : (found?.raw ?? raw), chain: where(found) };
  }

  const elevation = /^ElevationTokens\.(\w+)/.exec(raw);
  if (elevation) {
    const found = tokenOf(lookup, "ElevationTokens", elevation[1]!);
    return { text: found ? found.raw.replace(/\.dp$/, " dp") : `elevation ${elevation[1]}`, chain: where(found) };
  }

  const type = /^TypographyKeyTokens\.(\w+)/.exec(raw);
  if (type) {
    const found = tokenOf(lookup, "TypographyTokens", type[1]!);
    if (!found) return { text: `type role ${type[1]}`, chain: "" };
    const scale = (field: string) => {
      const part = new RegExp(`${field}\\s*=\\s*TypeScaleTokens\\.(\\w+)`).exec(found.raw);
      return part ? tokenOf(lookup, "TypeScaleTokens", part[1]!)?.raw : undefined;
    };
    const font = scale("fontFamily");
    const weight = scale("fontWeight");
    const size = scale("fontSize");
    const lineHeight = scale("lineHeight");
    const tracking = scale("letterSpacing");
    const face = font ? (/TypefaceTokens\.(\w+)/.exec(font)?.[1] ?? font) : "?";
    const weightName = weight ? (/TypefaceTokens\.(\w+)/.exec(weight)?.[1] ?? weight) : "?";
    return {
      text: `${size?.replace(/\.sp$/, " sp") ?? "?"} / ${lineHeight?.replace(/\.sp$/, " sp") ?? "?"} line, ${weightName}, ${face}, tracking ${tracking?.replace(/\.sp$/, " sp") ?? "?"}`,
      chain: where(found),
    };
  }

  const plain = /^(\d+(?:\.\d+)?)\.(dp|sp)$/.exec(raw);
  if (plain) return { text: `${plain[1]} ${plain[2]}`, chain: "" };
  const fraction = /^(\d+(?:\.\d+)?)f$/.exec(raw);
  if (fraction) return { text: fraction[1]!, chain: "" };
  return { text: raw.slice(0, 80), chain: "" };
};

// ── The command line ────────────────────────────────────────────

const args = process.argv.slice(2);
const json = args.includes("--json");
const listFiles = args.includes("--files");
const only = args.find((arg) => arg.startsWith("--only="))?.slice("--only=".length).split(",").map((name) => name.trim());
const component = args.find((arg) => !arg.startsWith("--")) ?? "";

const version = readVersion();
tokensDir = existsSync(join(library, version)) ? tokenDir(version) : library;
const lookupIndex = index(version);
const lookup: Lookup = { tokens: new Map([...lookupIndex.byName].map(([file, tokens]) => [file, new Map(tokens.map((token) => [token.name, token]))])) };
const wanted = (file: string): boolean => {
  if (only?.length) return only.includes(file.replace(/\.kt$/, ""));
  if (!component) return false;
  const name = file.replace(/\.kt$/, "").toLowerCase();
  const needle = component.toLowerCase().replace(/[^a-z]/g, "");
  return name.includes(needle);
};
const chosen = lookupIndex.files.filter(wanted);

if (listFiles) {
  console.log(`compose tokens ${version}: ${chosen.length} file(s) matching ${JSON.stringify(component)}`);
  for (const file of chosen) console.log(`  ${file}`);
  process.exit(0);
}
if (chosen.length === 0) {
  console.error(`no token file matches ${JSON.stringify(component)}; --files lists what does`);
  process.exit(1);
}

const rows: { file: string; token: string; raw: string; resolved: string; chain: string; source: string }[] = [];
for (const file of chosen) {
  const tokens = lookupIndex.byName.get(file.replace(/\.kt$/, "")) ?? [];
  for (const token of tokens) {
    const resolved = resolve(token, lookup);
    rows.push({
      file: file.replace(/\.kt$/, ""),
      token: token.name,
      raw: token.raw,
      resolved: resolved.text,
      chain: resolved.chain,
      source: `${file.replace(/\.kt$/, "")}:${token.line}`,
    });
  }
}

if (json) {
  console.log(JSON.stringify({ version, component, files: chosen, rows }, null, 2));
  process.exit(0);
}

console.log(`Compose tokens ${version} — ${chosen.length} file(s) for ${component || only?.join(", ")}`);
console.log("");
console.log("| Object | Token | Raw | Resolved | Source |");
console.log("| --- | --- | --- | --- | --- |");
for (const row of rows) {
  console.log(`| ${row.file} | ${row.token} | \`${row.raw.replace(/\|/g, "\\|")}\` | ${row.resolved.replace(/\|/g, "\\|")}${row.chain} | ${row.source} |`);
}
console.log("");
console.log(`${rows.length} tokens.`);
