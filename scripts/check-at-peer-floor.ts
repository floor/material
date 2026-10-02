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
 *
 * Afterwards `bun install --frozen-lockfile` puts the lockfile's versions back, and
 * whatever the floor install left in node_modules that was not there before is
 * removed, so the next command sees the tree it would have seen without this run.
 * That holds when the check passes or fails, and when this script is interrupted
 * (SIGINT, SIGTERM) at any point: during the floor install, the check or the
 * restore itself. An interrupt stops the install or the check and everything it
 * started; it never stops the restore, which is retried once if it fails. The exit
 * status is then 130 or 143. A SIGKILL cannot be caught: after one, run
 * `bun install --frozen-lockfile` yourself.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { readdir, rm } from "node:fs/promises";

/** The lowest version a `>=` range allows: `>=1.8` is `1.8.0`. */
export const floorOf = (range: string): string => {
  const match = /^>=\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?$/.exec(range.trim());
  if (!match) throw new TypeError(`Not a ">=" range, so it has no single floor: ${range}`);
  return [match[1], match[2] ?? "0", match[3] ?? "0"].join(".");
};

const installed = async (name: string): Promise<string> =>
  (await Bun.file(`node_modules/${name}/package.json`).json() as { version: string }).version;

/**
 * Runs a command in a process group of its own. A Ctrl-C in the terminal then
 * reaches this script only, which decides what to stop: the whole group of the
 * install or the check (`stopWork`), never the restore.
 */
const start = (command: string[]): { child: ChildProcess; exited: Promise<number> } => {
  const child = spawn(command[0], command.slice(1), { stdio: "inherit", detached: true });
  const exited = new Promise<number>(resolve => {
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
    child.on("error", () => resolve(1));
  });
  return { child, exited };
};
let work: ReturnType<typeof start> | undefined;
/** The floor install or the check: the only commands an interrupt stops. */
const runWork = async (command: string[]): Promise<number> => {
  work = start(command);
  try { return await work.exited; } finally { work = undefined; }
};
const stopWork = async (): Promise<void> => {
  const current = work;
  if (!current?.child.pid) return;
  // The group, not the process: `bun run <script>` has children of its own.
  const group = -current.child.pid;
  const alive = (): boolean => { try { process.kill(group, 0); return true; } catch { return false; } };
  try { process.kill(group, "SIGTERM"); } catch { /* already gone */ }
  await current.exited;
  // The script a `bun run` started can outlive it by seconds: give the group two, then end it.
  for (const end = Date.now() + 2000; Date.now() < end && alive();) await new Promise(resolve => setTimeout(resolve, 50));
  if (alive()) try { process.kill(group, "SIGKILL"); } catch { /* gone in the meantime */ }
};

/** Everything directly in node_modules, and in its scopes: `vue`, `@vue/server-renderer`, `.old-…`. */
const entries = async (): Promise<string[]> => {
  const names: string[] = [];
  for (const entry of await readdir("node_modules", { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith("@")) {
      for (const scoped of await readdir(`node_modules/${entry.name}`)) names.push(`${entry.name}/${scoped}`);
    } else names.push(entry.name);
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
  const present = new Set(await entries());

  /** The lockfile's versions, and nothing the floor install left behind; true when it is all back. */
  const restoreOnce = async (): Promise<boolean> => {
    const reinstalled = await start(["bun", "install", "--frozen-lockfile"]).exited;
    // A frozen install does not remove what the lockfile does not know: packages
    // only the floor version depends on, and the copy bun parks when it is stopped.
    const extra = (await entries()).filter(name => !present.has(name));
    for (const name of extra) await rm(`node_modules/${name}`, { recursive: true, force: true });
    const after = await Promise.all(packages.map(name => installed(name).catch(() => "missing")));
    const same = reinstalled === 0 && after.every((version, i) => version === before[i]);
    if (same) console.log(`Restored: ${packages.map((name, i) => `${name}@${after[i]}`).join(", ")}${extra.length ? `; removed ${extra.join(", ")}` : ""}`);
    else console.error(`Not restored (before: ${before.join(", ")}; now: ${after.join(", ")}; bun install exited ${reinstalled})`);
    return same;
  };
  let restoring: Promise<boolean> | undefined;
  const restore = (): Promise<boolean> => restoring ??= (async () => await restoreOnce() || await restoreOnce())();

  // `finally` does not run when the process is killed by a signal, so the signal is
  // caught: it stops the install or the check, and the flow below goes on to its
  // `finally`. During the restore there is nothing to stop, and it is left alone.
  let interrupted: number | undefined;
  let stopping: Promise<void> | undefined;
  for (const [signal, status] of [["SIGINT", 130], ["SIGTERM", 143]] as const) {
    process.on(signal, () => {
      interrupted ??= status;
      stopping ??= stopWork();
    });
  }

  let code = 1;
  try {
    console.log(`${script} at the peer floor: ${packages.map(name => `${name}@${floor}`).join(", ")} (peerDependencies: ${packages[0]} ${range})`);
    if (interrupted !== undefined) throw new Error("Interrupted before the floor install");
    if (await runWork(["bun", "add", "--no-save", "--ignore-scripts", ...packages.map(name => `${name}@${floor}`)]) !== 0) {
      throw new Error(interrupted ? "Interrupted during the floor install" : "Could not install the floor versions");
    }
    if (interrupted === undefined) {
      for (const name of packages) {
        const version = await installed(name);
        if (version !== floor) throw new Error(`${name} is ${version} after the install, not ${floor}`);
      }
      code = await runWork(["bun", "run", script]);
    }
  } catch (error) {
    console.error(String(error));
  } finally {
    // Nothing of the check may still be running when node_modules changes under it.
    await stopping;
    const restored = await restore();
    if (!restored) code = code || 1;
    else if (interrupted !== undefined) code = interrupted;
  }
  process.exit(code);
}
