#!/usr/bin/env bun
// scripts/pins-update.ts
//
// Moves the per-file payload pins a change moves, from the local build, and
// prints each one, so the pin edit is in the same push as the change and a
// reviewer sees which files it touched:
//
//   bun run build && bun run pins:update
//
// The pins (`payloads` in scripts/fixtures/sass-config-baseline.json) hold one
// hash for every default JS and CSS file the package ships. A change to a
// source file moves the hash of what it builds to, and the package job
// (scripts/check-styles-package.ts) fails until the pin holds the new one. An
// author used to learn that hash from the failing job: one whole CI run spent
// on every source change to read a value. A local build gives the same bytes.
// The first time this was checked, every one of the 913 pinned hashes, and the
// legacy bottom app bar entry's byte count, matched what CI had measured.
//
// CI's check is unchanged and stays the gate: a pin written from a build that
// differs from CI's fails there exactly as a stale pin does.
//
// `--check` prints what would move and writes nothing; it exits 1 when a pin
// is stale.
import { mkdtemp, mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { optionalStyleFiles } from "./optional-style-profiles";
import { combinedStylesheetPayloads, stylesheetPayloadDigest } from "./stylesheet-pins";

const FIXTURE = "scripts/fixtures/sass-config-baseline.json";
const LEGACY_CHECK = "scripts/check-bottom-app-bar-toolbar.ts";

export interface MovedPin {
  path: string;
  /** The pinned hash; none for a file the package now ships and the pins do not list. */
  was?: string;
  /** The built file's hash; none for a pinned file the build no longer produces. */
  now?: string;
}

/**
 * The pins a build moves: a hash that changed, a file that is new, a file that
 * is gone. The two combined stylesheet payloads have their own check and their
 * own pins (scripts/check-combined-stylesheet-pins.ts): a changed hash there is
 * not this command's to move, as it is not the package job's to refuse.
 */
export const movedPins = (built: Record<string, string>, pinned: Record<string, string>): MovedPin[] => {
  const moved: MovedPin[] = [];
  for (const path of [...new Set([...Object.keys(pinned), ...Object.keys(built)])].sort()) {
    const was = pinned[path];
    const now = built[path];
    if (was === now) continue;
    if (was !== undefined && now !== undefined && combinedStylesheetPayloads.some((combined) => combined === path)) continue;
    moved.push({ path, was, now });
  }
  return moved;
};

/**
 * The pins with the moves applied. A pin that moves keeps its line, so the
 * edit is the lines that moved and nothing else; a new file takes the line
 * before the first path that sorts after it.
 */
export const applyMoves = (pinned: Record<string, string>, moved: MovedPin[]): Record<string, string> => {
  const entries = Object.entries(pinned);
  for (const { path, now } of moved) {
    const at = entries.findIndex(([key]) => key === path);
    if (now === undefined) {
      if (at >= 0) entries.splice(at, 1);
    } else if (at >= 0) {
      entries[at] = [path, now];
    } else {
      const after = entries.findIndex(([key]) => key > path);
      entries.splice(after < 0 ? entries.length : after, 0, [path, now]);
    }
  }
  return Object.fromEntries(entries);
};

const builtPayloads = async (dist: string): Promise<Record<string, string>> => {
  const optional = new Set<string>(optionalStyleFiles);
  const payloads: Record<string, string> = {};
  const walk = async (relative = ""): Promise<void> => {
    for (const entry of await readdir(join(dist, relative), { withFileTypes: true })) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path);
      else if (/\.(?:js|css)$/.test(path) && !optional.has(path)) {
        payloads[path] = stylesheetPayloadDigest(await readFile(join(dist, path), "utf8"));
      }
    }
  };
  await walk();
  return payloads;
};

/** The legacy bottom app bar entry's raw bytes, bundled as scripts/check-bottom-app-bar-toolbar.ts bundles it. */
const legacyEntryBytes = async (root: string): Promise<number> => {
  const scratch = await mkdtemp(join(tmpdir(), "material-pins-"));
  try {
    await mkdir(join(scratch, "node_modules"), { recursive: true });
    await symlink(root, join(scratch, "node_modules/material"), "dir");
    await writeFile(join(scratch, "package.json"), '{"type":"module"}');
    const entry = join(scratch, "all-js.ts");
    await writeFile(entry, "export * from 'material/components/bottom-app-bar';\n");
    const result = await Bun.build({ entrypoints: [entry], target: "browser", format: "esm", minify: true });
    if (!result.success) throw new Error(String(result.logs));
    return (await result.outputs[0]!.arrayBuffer()).byteLength;
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
};

if (import.meta.main) {
  const root = process.cwd();
  const check = process.argv.includes("--check");
  const text = await readFile(join(root, FIXTURE), "utf8");
  const fixture = JSON.parse(text) as { payloads: Record<string, string> };
  const built = await builtPayloads(join(root, "dist")).catch(() => {
    console.error("pins:update: no build to read. Run `bun run build` first.");
    process.exit(1);
  });
  const moved = movedPins(built, fixture.payloads);
  for (const { path, was, now } of moved) {
    if (now === undefined) console.log(`- ${path}: no longer built (was ${was})`);
    else if (was === undefined) console.log(`+ ${path}: ${now}`);
    else console.log(`~ ${path}: ${was} -> ${now}`);
  }
  const total = Object.keys(fixture.payloads).length;
  if (moved.length && !check) {
    fixture.payloads = applyMoves(fixture.payloads, moved);
    await writeFile(join(root, FIXTURE), `${JSON.stringify(fixture, null, 2)}\n`);
  }
  console.log(`pins:update: ${moved.length} of ${total} payload pins ${check ? "would move" : "moved"}${moved.length && !check ? `; ${FIXTURE} written` : ""}.`);

  // The byte pin is a literal in its check, beside the note of where it was
  // measured: report it, and leave the edit and its note to the author.
  const pinned = /legacyAfter\.length === ([\d_]+)/.exec(await readFile(join(root, LEGACY_CHECK), "utf8"));
  const bytes = await legacyEntryBytes(root);
  const pinnedBytes = pinned ? Number(pinned[1]!.replace(/_/g, "")) : NaN;
  const stale = bytes !== pinnedBytes;
  console.log(`pins:update: the legacy bottom app bar entry is ${bytes} raw bytes, pinned at ${pinnedBytes}` +
    (stale ? `: edit the pin and its note in ${LEGACY_CHECK}.` : "."));
  if (check && (moved.length || stale)) process.exit(1);
}
