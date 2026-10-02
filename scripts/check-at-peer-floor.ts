#!/usr/bin/env bun
// scripts/check-at-peer-floor.ts
/**
 * Runs a check on the lowest version of a peer dependency that package.json
 * allows, then puts the installed version back.
 *
 *   bun run scripts/check-at-peer-floor.ts <peer> [companion…] -- <script>
 *   bun run scripts/check-at-peer-floor.ts vue @vue/server-renderer -- vue-ssr:check
 *
 * The floor is read from `peerDependencies` (`>=3.3` is 3.3.0), so the check
 * follows the range when it changes. Companions are packages that must match the
 * peer's version. Nothing is saved: package.json and the lockfile are not touched.
 * Whether the check passed, failed or was interrupted (Ctrl-C, SIGTERM),
 * `bun install --frozen-lockfile` puts the lockfile's versions back and the packages
 * that only the floor version brought in are removed, so whatever runs next sees
 * the tree it would have seen without this run. A SIGKILL cannot be caught: after
 * one, run `bun install --frozen-lockfile` yourself.
 */
import { readdir, rm } from "node:fs/promises";

/** The lowest version a `>=` range allows: `>=1.8` is `1.8.0`. */
export const floorOf = (range: string): string => {
  const match = /^>=\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(range.trim());
  if (!match) throw new TypeError(`Not a ">=" range, so it has no single floor: ${range}`);
  return [match[1], match[2] ?? "0", match[3] ?? "0"].join(".");
};

const installed = async (name: string): Promise<string> =>
  (await Bun.file(`node_modules/${name}/package.json`).json() as { version: string }).version;

let running: ReturnType<typeof Bun.spawn> | undefined;
const run = async (command: string[]): Promise<number> => {
  running = Bun.spawn(command, { stdout: "inherit", stderr: "inherit" });
  try { return await running.exited; } finally { running = undefined; }
};

/** Every package directory in node_modules: `vue`, `@vue/server-renderer`. */
const packageDirectories = async (): Promise<string[]> => {
  const names: string[] = [];
  for (const entry of await readdir("node_modules", { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    if (!entry.name.startsWith("@")) names.push(entry.name);
    else for (const scoped of await readdir(`node_modules/${entry.name}`)) names.push(`${entry.name}/${scoped}`);
  }
  return names;
};

if (import.meta.main) {
  const args = process.argv.slice(2);
  const split = args.indexOf("--");
  const packages = args.slice(0, split);
  const script = args[split + 1];
  if (split < 1 || !script || args.length !== split + 2) {
    console.error("Usage: check-at-peer-floor.ts <peer> [companion…] -- <script>");
    process.exit(2);
  }
  const manifest = await Bun.file("package.json").json() as { peerDependencies?: Record<string, string>; scripts: Record<string, string> };
  const range = manifest.peerDependencies?.[packages[0]];
  if (!range) throw new TypeError(`${packages[0]} is not a peer dependency`);
  if (!(script in manifest.scripts)) throw new TypeError(`package.json has no script "${script}"`);
  const floor = floorOf(range);
  const before = await Promise.all(packages.map(installed));
  const present = new Set(await packageDirectories());

  let restoring: Promise<boolean> | undefined;
  /** The lockfile's versions, and nothing the floor brought with it; true when it is all back. */
  const restore = (): Promise<boolean> => restoring ??= (async () => {
    const reinstalled = await run(["bun", "install", "--frozen-lockfile"]);
    // A frozen install does not remove what the lockfile does not know.
    const extra = (await packageDirectories()).filter(name => !present.has(name));
    for (const name of extra) await rm(`node_modules/${name}`, { recursive: true, force: true });
    const after = await Promise.all(packages.map(installed));
    console.log(`Restored: ${packages.map((name, i) => `${name}@${after[i]}`).join(", ")}${extra.length ? `; removed ${extra.join(", ")}` : ""}`);
    const same = reinstalled === 0 && after.every((version, i) => version === before[i]);
    if (!same) console.error(`The installed versions were not restored (before: ${before.join(", ")}; after: ${after.join(", ")})`);
    return same;
  })();
  // `finally` does not run when the process is interrupted.
  for (const [signal, status] of [["SIGINT", 130], ["SIGTERM", 143]] as const) {
    process.on(signal, async () => {
      // A signal sent to this process alone leaves the check running: stop it first.
      const check = running;
      check?.kill();
      await check?.exited;
      await restore();
      process.exit(status);
    });
  }

  let code = 1;
  try {
    console.log(`${script} at the peer floor: ${packages.map(name => `${name}@${floor}`).join(", ")} (peerDependencies: ${packages[0]} ${range})`);
    if (await run(["bun", "add", "--no-save", "--ignore-scripts", ...packages.map(name => `${name}@${floor}`)]) !== 0) {
      throw new Error("Could not install the floor versions");
    }
    for (const name of packages) {
      const version = await installed(name);
      if (version !== floor) throw new Error(`${name} is ${version} after the install, not ${floor}`);
    }
    code = await run(["bun", "run", script]);
  } finally {
    if (!await restore()) code = code || 1;
  }
  process.exit(code);
}
