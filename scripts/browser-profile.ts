/** The browser checks' Chromium launches, each with its own worktree profile. */
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type BrowserContext, type LaunchOptions } from "playwright";

// Chromium's user data directory stays inside the worktree —
// `<repo root>/.chrome-profile/run-<unique>/`, gitignored — so the browser's
// writes never reach the invoking user's home, which a seat or a runner may
// not have. Playwright takes a user data directory through
// launchPersistentContext; it refuses a raw `--user-data-dir` launch
// argument, so that is the launch used here.
//
// Every launch gets its own directory, created before the launch and removed
// when the browser closes (context or browser handle, whichever the script
// holds), so concurrent or back-to-back runs never contend for one folder
// and no storage, cache or permission state crosses a run. A run that dies
// before closing leaves its directory behind; it sits ignored under
// `.chrome-profile/` until cleaned.
const profileRoot = join(import.meta.dir, "..", ".chrome-profile");

const closeRemovesDir = <T extends { close: () => Promise<unknown> }>(handle: T, dir: string): T => {
  const close = handle.close.bind(handle);
  handle.close = async () => {
    await close();
    await rm(dir, { recursive: true, force: true });
  };
  return handle;
};

/**
 * Launch Chromium with its profile inside the worktree.
 *
 * @param options - Launch options, exactly as `chromium.launch` took them
 * @returns The persistent context; its `close()` (and the browser's) removes
 *   the launch's profile directory
 */
export const launchChromium = async (options?: LaunchOptions): Promise<BrowserContext> => {
  await mkdir(profileRoot, { recursive: true });
  const dir = await mkdtemp(join(profileRoot, "run-"));
  const context = await chromium.launchPersistentContext(dir, options);
  const browser = context.browser();
  if (browser) closeRemovesDir(browser, dir);
  return closeRemovesDir(context, dir);
};
