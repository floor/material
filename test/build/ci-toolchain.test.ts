// test/build/ci-toolchain.test.ts
import { describe, expect, test } from "bun:test";
import { Glob } from "bun";

// Nothing CI runs on may move without a commit. A version that floats ("1.4",
// `@v4`, `ubuntu-latest`) resolves to something new the day upstream releases,
// and main turns red with no change in the repository: bun 1.4.3 grew the
// whole-library bundle by 2,410 bytes gzipped on the day it came out. So every
// tool is named exactly, and moving one is a change that CI runs on.
const files: Record<string, string> = {};
for (const pattern of [".github/workflows/*.yml", ".github/actions/*/action.yml"]) {
  for await (const path of new Glob(pattern).scan({ dot: true })) files[path] = await Bun.file(path).text();
}

// Every `key: value` line of that key, as [file, value] with quotes and comments off.
const values = (key: string): [string, string][] =>
  Object.entries(files).flatMap(([path, text]) =>
    [...text.matchAll(new RegExp(`^\\s*(?:- )?${key}:[ \\t]*(.*)$`, "gm"))].map(
      (match): [string, string] => [path, match[1].replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "")],
    ),
  );

const EXACT = /^\d+\.\d+\.\d+$/;

describe("the CI toolchain is pinned", () => {
  test("the workflows and the composite actions are read", () => {
    expect(Object.keys(files).sort()).toEqual([
      ".github/actions/browsers/action.yml",
      ".github/workflows/cache.yml",
      ".github/workflows/ci.yml",
      ".github/workflows/evidence-flaky-551.yml",
      ".github/workflows/publish.yml",
    ]);
  });

  for (const key of ["bun-version", "node-version"]) {
    test(`${key} is one exact version everywhere`, () => {
      const found = values(key);
      expect(found.length).toBeGreaterThan(0);
      expect(found.filter(([, value]) => !EXACT.test(value))).toEqual([]);
      expect([...new Set(found.map(([, value]) => value))]).toHaveLength(1);
    });
  }

  test("every action is a commit, with its version in a comment", () => {
    const lines = Object.entries(files).flatMap(([path, text]) =>
      [...text.matchAll(/^\s*(?:- )?uses:[ \t]*(.*)$/gm)].map((match) => `${path}: ${match[1]}`),
    );
    expect(lines.length).toBeGreaterThan(0);
    const pinned = /: (?:\.\/\S+|[\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+)$/;
    expect(lines.filter((line) => !pinned.test(line))).toEqual([]);
  });

  test("every job names its runner image", () => {
    const found = values("runs-on");
    expect(found.length).toBeGreaterThan(0);
    expect(found.filter(([, value]) => !/^ubuntu-\d+\.\d+$/.test(value))).toEqual([]);
  });

  test("npm for the publish is an exact version", () => {
    const installs = [...files[".github/workflows/publish.yml"].matchAll(/npm install -g npm@(\S+)/g)].map((match) => match[1]);
    expect(installs.length).toBeGreaterThan(0);
    expect(installs.filter((version) => !EXACT.test(version))).toEqual([]);
  });
});
