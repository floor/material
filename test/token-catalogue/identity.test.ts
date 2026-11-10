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
import { filledSmallRoundCss } from "../../scripts/button-style-profile";
import { profileStyleModule } from "../../scripts/optional-style-profiles";

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
const buttonCss = '@layer mtrl.button{.mtrl-button{height:40px}.mtrl-button--m{height:56px}}';
const withButton = { ...defaults, "dist/styles/button.css": buttonCss,
  "dist/styles/progress.js": 'import "./progress.css";\n', "dist/styles/progress.css": '.mtrl-progress{display:block}' };
const optionalPair = { "dist/styles/button-filled-small-round.css": filledSmallRoundCss(buttonCss),
  "dist/styles/button-filled-small-round.js": profileStyleModule("button-filled-small-round", ["progress"]) };

describe("catalogue identity gate", () => {
  test("only the new validated profile may add its exact build parser and check script", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const devDependencies = { sass: "1.85.1" };
      const base = pack(root, "base", { ...withButton, "package.json": manifest({ devDependencies }) });
      const additions = { devDependencies: { ...devDependencies, postcss: "8.5.28" },
        scripts: { "button-profile:check": "bun run scripts/check-button-profile.ts" } };
      expect(runGate(pack(root, "valid", { ...withButton, ...optionalPair, "package.json": manifest(additions) }), base).code).toBe(0);
      expect(runGate(pack(root, "no-profile", { ...withButton, "package.json": manifest(additions) }), base).code).toBe(1);
      const wrongParser = runGate(pack(root, "parser", { ...withButton, ...optionalPair,
        "package.json": manifest({ ...additions, devDependencies: { ...devDependencies, postcss: "9.0.0" } }) }), base);
      expect(wrongParser.code).toBe(1);
      expect(wrongParser.out).toContain("package.json field devDependencies changed");
      const compiler = runGate(pack(root, "compiler", { ...withButton, ...optionalPair,
        "package.json": manifest({ ...additions, devDependencies: { sass: "2.0.0", postcss: "8.5.28" } }) }), base);
      expect(compiler.code).toBe(1);
      const script = runGate(pack(root, "script", { ...withButton, ...optionalPair,
        "package.json": manifest({ ...additions, scripts: { "button-profile:check": "bun run unrelated.ts" } }) }), base);
      expect(script.code).toBe(1);
      expect(script.out).toContain("new script button-profile:check outside the catalogue gate allowlist");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("only the validated additive optional stylesheet pair passes", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", withButton);
      expect(runGate(pack(root, "valid", { ...withButton, ...optionalPair }), base).code).toBe(0);
      const missing = runGate(pack(root, "missing", { ...withButton,
        "dist/styles/button-filled-small-round.css": optionalPair["dist/styles/button-filled-small-round.css"] }), base);
      expect(missing.code).toBe(1);
      expect(missing.out).toContain("both optional CSS and JS files must ship");
      const altered = runGate(pack(root, "altered", { ...withButton, ...optionalPair,
        "dist/styles/button-filled-small-round.css": ".wrong{}" }), base);
      expect(altered.code).toBe(1);
      expect(altered.out).toContain("CSS differs from the reviewed projection");
      const imports = runGate(pack(root, "imports", { ...withButton, ...optionalPair,
        "dist/styles/button-filled-small-round.js": 'import "./button-filled-small-round.css";\n' }), base);
      expect(imports.code).toBe(1);
      expect(imports.out).toContain("dependency imports changed");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  test("the profile allowance never admits changes to existing or undeclared styles", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", withButton);
      const changed = runGate(pack(root, "changed", { ...withButton, ...optionalPair,
        "dist/module.js": "export const changed=true;" }), base);
      expect(changed.code).toBe(1);
      expect(changed.out).toContain("changed member dist/module.js");
      const unknown = runGate(pack(root, "unknown", { ...withButton, ...optionalPair,
        "dist/styles/button-other.css": ".other{}" }), base);
      expect(unknown.code).toBe(1);
      expect(unknown.out).toContain("added member dist/styles/button-other.css outside the allowlist");
      const existing = pack(root, "existing", { ...withButton, ...optionalPair });
      const css = buttonCss.replace("40px", "41px");
      const changedProfile = runGate(pack(root, "changed-profile", { ...withButton, ...optionalPair,
        "dist/styles/button.css": css, "dist/styles/button-filled-small-round.css": filledSmallRoundCss(css) }), existing);
      expect(changedProfile.code).toBe(1);
      expect(changedProfile.out).toContain("changed member dist/styles/button-filled-small-round.css");
      expect(changedProfile.out).toContain("changed member dist/styles/button.css");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

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

  test("catalogue data already in main is the merged state, not a violation", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      // Since the catalogue merged, both sides of the comparison carry the
      // data files and their export keys: identical tarballs must pass, and a
      // regenerated catalogue document is the sanctioned data change — while
      // a moved byte in any default member still fails.
      const merged = {
        ...defaults,
        "package.json": manifest({ exports: { ".": "./index.js", "./tokens/catalogue.json": "./dist/tokens/catalogue.json", "./tokens/catalogue.schema.json": "./dist/tokens/catalogue.schema.json" } }),
        "dist/tokens/catalogue.json": '{"rows":[]}\n',
        "dist/tokens/catalogue.schema.json": '{"type":"object"}\n',
      };
      const base = pack(root, "base", merged);
      expect(runGate(pack(root, "identical", merged), base).code).toBe(0);
      expect(runGate(pack(root, "regenerated", { ...merged, "dist/tokens/catalogue.json": '{"rows":[1]}\n' }), base).code).toBe(0);
      const touched = pack(root, "touched", { ...merged, "dist/module.js": "export { y };\n" });
      expect(runGate(touched, base).out).toContain("changed member dist/module.js");
      expect(runGate(touched, base).code).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a removed export key fails", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", defaults);
      const branch = pack(root, "branch", {
        ...defaults,
        "package.json": manifest({ exports: { "./other": "./other.js" } }),
      });
      const gate = runGate(branch, base);
      expect(gate.code).toBe(1);
      expect(gate.out).toContain('export key . was removed');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a changed field outside the allowlist fails (type, sideEffects, added field)", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const base = pack(root, "base", {
        ...defaults,
        "package.json": manifest({ type: "module", sideEffects: ["**/*.css"] }),
      });
      const type = pack(root, "type", { ...defaults, "package.json": manifest({ type: "commonjs", sideEffects: ["**/*.css"] }) });
      const sideEffects = pack(root, "effects", { ...defaults, "package.json": manifest({ type: "module", sideEffects: false }) });
      const added = pack(root, "added", { ...defaults, "package.json": manifest({ type: "module", sideEffects: ["**/*.css"], browser: "./browser.js" }) });
      expect(runGate(type, base).out).toContain("package.json field type changed");
      expect(runGate(sideEffects, base).out).toContain("package.json field sideEffects changed");
      expect(runGate(added, base).out).toContain("package.json field browser was added");
      expect(runGate(type, base).code).toBe(1);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("scripts: catalogue gates may be added, nothing else may move", () => {
    const root = mkdtempSync(join(tmpdir(), "mtrl-identity-"));
    try {
      const withScript = { ...defaults, "package.json": manifest({ scripts: { build: "bun run build" } }) };
      const base = pack(root, "base", withScript);
      const addedGate = pack(root, "gate", {
        ...withScript,
        "package.json": manifest({ scripts: { build: "bun run build", "tokens:catalogue:check": "bun run scripts/check-token-catalogue.ts" } }),
      });
      expect(runGate(addedGate, base).code).toBe(0);
      const changed = pack(root, "changed", { ...withScript, "package.json": manifest({ scripts: { build: "bun run x" } }) });
      const removed = pack(root, "removed", { ...withScript, "package.json": manifest({ scripts: {} }) });
      const foreign = pack(root, "foreign", { ...withScript, "package.json": manifest({ scripts: { build: "bun run build", lint: "eslint" } }) });
      expect(runGate(changed, base).out).toContain("script build changed");
      expect(runGate(removed, base).out).toContain("script build was removed");
      expect(runGate(foreign, base).out).toContain("new script lint outside the catalogue gate allowlist");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
