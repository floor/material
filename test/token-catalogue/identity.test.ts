// test/token-catalogue/identity.test.ts
//
// The identity gate compares two packed tarballs member by member. These tests
// drive scripts/check-catalogue-identity.ts itself, on synthetic npm-style
// tarballs, so the gate's own rules are what fails when they break: what a
// data-only change may add, and where the allowance stops.
import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

const script = join(import.meta.dir, "..", "..", "scripts", "check-catalogue-identity.ts");

/** An npm-style tarball of the files: every member under package/, as npm pack writes. */
const pack = (root: string, name: string, files: Record<string, string>): string => {
  const source = join(root, `${name}-src`);
  for (const [member, body] of Object.entries(files)) {
    const target = join(source, "package", member);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  }
  const tgz = join(root, `${name}.tgz`);
  execFileSync("tar", ["-czf", tgz, "-C", source, "package"]);
  return tgz;
};

/** The gate's verdict on one tarball pair: exit code and combined output. */
const runGate = (branch: string, base: string): { code: number; out: string } => {
  const proc = Bun.spawnSync(["bun", "run", script, branch, base]);
  const text = (bytes: Uint8Array | undefined): string => (bytes ?? new Uint8Array()).toString();
  return { code: proc.exitCode, out: text(proc.stdout) + text(proc.stderr) };
};

const readMe = ["# Fixture", "", "Docs.", ""].join("\n");
const manifest = (extra: Record<string, unknown> = {}): string =>
  JSON.stringify({ name: "fixture", version: "1.0.0", exports: { ".": "./index.js" }, ...extra });
const defaults = { "package.json": manifest(), "README.md": readMe, "dist/module.js": "export {};\n" };

describe("catalogue identity gate", () => {
  test("identical tarballs pass", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const a = pack(root, "a", defaults);
      const b = pack(root, "b", defaults);
      const gate = runGate(b, a);
      expect(gate.code).toBe(0);
      expect(gate.out).toContain("byte-identical");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("new dist/tokens data and its export key pass", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", defaults);
      const branch = pack(root, "branch", {
        ...defaults,
        "package.json": manifest({ exports: { ".": "./index.js", "./tokens/catalogue.json": "./dist/tokens/catalogue.json" } }),
        "dist/tokens/catalogue.json": '{"rows":[]}\n',
      });
      const gate = runGate(branch, base);
      expect(gate.code).toBe(0);
      expect(gate.out).toContain("dist/tokens/catalogue.json");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("README.md may change by whole-line additions only", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const withSection = ["# Fixture", "", "Docs.", "", "### Token catalogue", "", "New data.", ""].join("\n");
      const rewritten = ["# Fixture", "", "Documentation.", ""].join("\n");
      const added = pack(root, "added", { ...defaults, "README.md": withSection });
      const edited = pack(root, "edited", { ...defaults, "README.md": rewritten });
      const base = pack(root, "base", defaults);
      expect(runGate(added, base).code).toBe(0);
      const gate = runGate(edited, base);
      expect(gate.code).toBe(1);
      expect(gate.out).toContain("README.md beyond whole-line additions");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a changed default member fails with the member named", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", defaults);
      const branch = pack(root, "branch", { ...defaults, "dist/module.js": "export { x };\n" });
      const gate = runGate(branch, base);
      expect(gate.code).toBe(1);
      expect(gate.out).toContain("changed member dist/module.js");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a removed member fails", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", defaults);
      const { "dist/module.js": _removed, ...without } = defaults;
      const branch = pack(root, "branch", without);
      const gate = runGate(branch, base);
      expect(gate.code).toBe(1);
      expect(gate.out).toContain("removed member dist/module.js");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
