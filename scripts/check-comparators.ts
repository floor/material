/** CI-only packed comparator fixture. Local source checks never install/build it. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createPackageFixture } from "./package-fixture";

assert.equal(process.env.GITHUB_ACTIONS, "true", "comparators:check runs only in GitHub CI");
const fixture = await createPackageFixture();
try {
  assert.deepEqual(fixture.pack.files.filter((file: { path: string }) => /comparators|node_modules|beercss|material-inspired-component-library/.test(file.path)), [],
    "comparator tooling/dependencies must never enter the published tarball");
  await symlink(fixture.installed, resolve("scripts/fixtures/comparators/node_modules/material"), "dir");
  const child = Bun.spawn(["node", resolve("scripts/fixtures/comparators/run.mjs")], {
    env: { ...process.env, COMPARATOR_PACK: JSON.stringify({
      sha256: createHash("sha256").update(await readFile(join(fixture.directory, fixture.pack.filename))).digest("hex"),
      integrity: fixture.pack.integrity, size: fixture.pack.size, unpackedSize: fixture.pack.unpackedSize,
    }), COMPARATOR_HEAD: (await Bun.$`git rev-parse HEAD`.text()).trim() }, stdout: "inherit", stderr: "inherit",
  });
  assert.equal(await child.exited, 0, "rendered comparator failed; inspect analysis/comparators artifacts");
} finally {
  // CI's temporary fixture is owned by this check; no worktree source is removed.
  await fixture.cleanup();
}
