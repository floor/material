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
 * peer's version. Nothing is saved: package.json and the lockfile are not touched,
 * and `bun install --frozen-lockfile` restores node_modules whether the check
 * passed or failed, so whatever runs next sees the versions the lockfile pins.
 */

/** The lowest version a `>=` range allows: `>=1.8` is `1.8.0`. */
export const floorOf = (range: string): string => {
  const match = /^>=\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(range.trim());
  if (!match) throw new TypeError(`Not a ">=" range, so it has no single floor: ${range}`);
  return [match[1], match[2] ?? "0", match[3] ?? "0"].join(".");
};

const installed = async (name: string): Promise<string> =>
  (await Bun.file(`node_modules/${name}/package.json`).json() as { version: string }).version;

const run = async (command: string[]): Promise<number> =>
  Bun.spawn(command, { stdout: "inherit", stderr: "inherit" }).exited;

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
    // The lockfile's versions, for whatever runs after this.
    const restored = await run(["bun", "install", "--frozen-lockfile"]);
    const after = await Promise.all(packages.map(installed));
    const same = after.every((version, i) => version === before[i]);
    console.log(`Restored: ${packages.map((name, i) => `${name}@${after[i]}`).join(", ")}`);
    if (restored !== 0 || !same) {
      console.error(`The installed versions were not restored (before: ${before.join(", ")}; after: ${after.join(", ")})`);
      code = code || 1;
    }
  }
  process.exit(code);
}
