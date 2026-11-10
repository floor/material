import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { assetRecord, isCssImportBridge, resolveCssChunks, staticClosure, declaredClosure, startupClosure, totals, phaseSets, coverage, digest } from "../../scripts/comparators/accounting.mjs";

const root = "scripts/fixtures/comparators";
const contract = JSON.parse(readFileSync(join(root, "contract.json"), "utf8"));
describe("comparator accounting and fixture contract", () => {
  test("deduplicates shared initial dependencies but includes startup dynamic requests", () => {
    const rows = [assetRecord("index.html", "page", ["a.js", "b.js"]), assetRecord("a.js", "a", ["shared.js"]),
      assetRecord("b.js", "b", ["shared.js"]), assetRecord("shared.js", "shared"), assetRecord("cold.js", "dynamic")];
    const initial = staticClosure(rows, ["index.html"]);
    expect(initial).toEqual(["a.js", "b.js", "index.html", "shared.js"]);
    const phases = phaseSets(initial, ["index.html", "cold.js"], ["cold.js"], rows.map(row => row.file));
    expect(phases.initial).toContain("cold.js");
    expect(phases.interactionOnly).toEqual([]);
    expect(totals(rows, [...initial, "shared.js"]).files).toBe(4);
  });
  test("cannot drop an unresolved import or a request outside the emitted ledger", () => {
    expect(() => staticClosure([assetRecord("a.js", "a", ["missing.css"])], ["a.js"])).toThrow("unaccounted static");
    expect(() => phaseSets(["a.js"], ["font.woff2"], [], ["a.js"])).toThrow("unaccounted request");
    expect(() => staticClosure([assetRecord("a.js", "a"), assetRecord("a.js", "b")], ["a.js"])).toThrow("duplicate");
  });
  test("reconciles removed CSS-only placeholders without dropping missing JavaScript", () => {
    const rows = [assetRecord("main.js", "entry", [], ["style-placeholder.js"]), assetRecord("style.css", "style")];
    const aliases = new Map([["style-placeholder.js", { modules: ["/installed/style.css"], imports: ["style.css"], dynamicImports: [] }]]);
    const resolved = resolveCssChunks(rows, aliases);
    expect(declaredClosure(resolved.records, ["main.js"])).toEqual(["main.js", "style.css"]);
    expect(resolved.collapsedCssChunks.map(row => row.file)).toEqual(["style-placeholder.js"]);
    expect(() => resolveCssChunks(rows, new Map())).toThrow("unaccounted emitted reference");
    const bridge = new Map([["style-placeholder.js", { modules: ["/installed/style.js"], cssImportBridges: { "/installed/style.js": 'import "./style.css";' }, imports: ["style.css"], dynamicImports: [] }]]);
    expect(declaredClosure(resolveCssChunks(rows, bridge).records, ["main.js"])).toEqual(["main.js", "style.css"]);
    expect(isCssImportBridge('/* public CSS entry */\nimport "./style.css";')).toBe(true);
    expect(isCssImportBridge('import "./style.css"; console.log("not a CSS bridge");')).toBe(false);
    aliases.get("style-placeholder.js")!.modules = ["/installed/missing.js"];
    expect(() => resolveCssChunks(rows, aliases)).toThrow("unaccounted emitted reference");
  });
  test("full declared closure follows lazy edges and their shared styles once", () => {
    const rows = [assetRecord("main.js", "entry", [], ["lazy.js"]), assetRecord("lazy.js", "lazy", ["shared.css"]), assetRecord("shared.css", "style"), assetRecord("unused.js", "unreachable")];
    expect(declaredClosure(rows, ["main.js"])).toEqual(["lazy.js", "main.js", "shared.css"]);
    expect(() => declaredClosure([assetRecord("main.js", "entry", [], ["absent.js"])], ["main.js"])).toThrow("unaccounted static");
  });
  test("does not pretend every declared font-face is fetched before readiness", () => {
    const rows = [assetRecord("index.html", "page", ["style.css"]), assetRecord("style.css", "font-face", ["unused.woff2"]), assetRecord("unused.woff2", new Uint8Array([1]))];
    expect(staticClosure(rows, ["index.html"])).toContain("unused.woff2");
    expect(startupClosure(rows, ["index.html"])).not.toContain("unused.woff2");
    expect(phaseSets(startupClosure(rows, ["index.html"]), ["unused.woff2"], [], rows.map(row => row.file)).initial).toContain("unused.woff2");
  });
  test("counts binary transfers as raw bytes, not a fictional gzip text gain", () => {
    const font = assetRecord("font.woff2", new Uint8Array([1, 2, 3, 4]));
    expect(font.gzip).toBeNull();
    expect(totals([font], [font.file])).toEqual({ files: 1, raw: 4, gzipTextPlusRawBinary: 4, brotliTextPlusRawBinary: 4 });
  });
  test("missing capabilities prevent full comparison and cannot be replaced by arbitrary markup", () => {
    expect(coverage(["button", "tabs"], ["tabs"], { button: { status: "pass" } }).comparableFullApp).toBe(false);
    expect(() => coverage(["button", "tabs"], ["tabs"], { button: { status: "pass" }, tabs: { status: "pass" } })).toThrow("substituted");
    expect(() => coverage(["button"], [], { button: { status: "fail" } })).toThrow("did not pass");
  });
  test("freezes accepted identities and the complete app denominator", () => {
    expect(contract.version).toBe(3);
    expect(contract.toolchain.vite).toBe("8.2.4");
    expect(contract.roles).toHaveLength(16);
    expect(contract.adapters.m3e.package).toBe("@m3e/web");
    expect(contract.adapters.m3e.version).toBe("2.12.0");
    expect(contract.adapters.beercss.version).toBe("5.0.3");
    expect(contract.adapters.micl.version).toBe("10.0.0");
    expect(contract.adapters.micl.missing).toEqual(["tabs", "fab"]);
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    expect(pkg.private).toBe(true);
    expect(pkg.dependencies.vite).toBe(contract.toolchain.vite);
    const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
    expect(lock.packages[""].dependencies).toEqual(pkg.dependencies);
    expect(lock.packages["node_modules/vite"].version).toBe(contract.toolchain.vite);
    for (const [name, version] of Object.entries(pkg.dependencies)) expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    const publicPkg = JSON.parse(readFileSync("package.json", "utf8"));
    for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
      for (const name of ["@m3e/web", "beercss", "material-inspired-component-library"]) expect(publicPkg[field]?.[name]).toBeUndefined();
    }
  });
  test("keeps every historical input and result byte-identical", () => {
    const legacy = join(root, "legacy-import-closure");
    const frozen = JSON.parse(readFileSync(join(legacy, "sha256.json"), "utf8")) as Record<string, string>;
    expect(Object.keys(frozen)).toHaveLength(19);
    for (const [file, expected] of Object.entries(frozen)) expect(digest(readFileSync(join(legacy, file)))).toBe(expected);
    // Independent identity pin: changing the legacy hash manifest is also a review-visible failure.
    expect(digest(readFileSync(join(legacy, "provenance.json")))).toBe("5eb3c2bc445c69adbb15106b97057856134705702b27b4d0d201ffce9c0575b2");
    const row = JSON.parse(readFileSync(join(legacy, "results/button-material-web.json"), "utf8"));
    expect(row.materialWeb).toBe("2.5.0");
    expect(row.commit).toBe("a99486250a38f94905ebd138488cafdb1634cf3d");
  });
});
