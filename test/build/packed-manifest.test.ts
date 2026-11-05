// test/build/packed-manifest.test.ts
//
// The build writes dist/package.json so its module and declaration prunes can
// read the relocated export map in place. The file is not an export target and
// has no runtime role: `dist` inherits the root `type: module` and the same
// `sideEffects` patterns, and nothing resolves `material/dist/package.json`.
// The published tarball therefore must not carry it. package.json's `files`
// excludes it; the package job's size check asserts the exclusion against the
// real tarball, and this test fails as soon as either half is undone.
import { describe, expect, test } from "bun:test";

const manifest = await Bun.file("package.json").json() as { files: string[] };
const build = await Bun.file("scripts/build.ts").text();

describe("the packed tree", () => {
  test("the nested build manifest is excluded from the tarball", () => {
    expect(manifest.files).toContain("!dist/package.json");
  });

  test("the build still writes the nested manifest for its own prunes", () => {
    expect(build).toContain("writeFile(`${staging}/package.json`");
  });
});
