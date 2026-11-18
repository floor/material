/** The browser checks' shared Chromium profile, inside the worktree. */
import { join } from "node:path";

// Chromium's user data directory for every check script that launches it:
// `<repo root>/.chrome-profile`, gitignored. Without this, each launch
// writes its profile under the invoking user's home, which a seat or a
// runner may not have; with it, the browser's writes stay inside the
// checkout the script already runs from. Playwright takes a user data
// directory through launchPersistentContext -- it refuses a raw
// --user-data-dir argument -- so that is the launch every check uses.
// Concurrent invocations share the folder, as CI runs one check per job
// and local runs are one at a time.
export const chromiumProfileDir: string = join(import.meta.dir, "..", ".chrome-profile");
