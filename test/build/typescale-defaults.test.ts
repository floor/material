import { afterEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkTypographyDefaults } from "../../scripts/check-typescale-defaults";

const roots: string[] = [];
function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "material-typography-defaults-"));
  roots.push(root);
  cpSync("src/styles", root, { recursive: true });
  return root;
}
function replace(root: string, file: string, before: string, after: string): void {
  const path = join(root, file), source = readFileSync(path, "utf8");
  expect(source).toContain(before);
  writeFileSync(path, source.replace(before, after));
}
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });

describe("the typography default gate", () => {
  test("accepts the existing fifteen roles in omitted, false and selected modes", () => {
    expect(() => checkTypographyDefaults()).not.toThrow();
  });

  test("allows an unrelated component CSS correction", () => {
    const root = fixture();
    replace(root, "components/_tooltip.scss", "position: absolute", "position: fixed");
    expect(() => checkTypographyDefaults(root)).not.toThrow();
  });

  test("rejects a changed role default even when selected and literal modes agree", () => {
    const root = fixture();
    replace(root, "abstract/_variables.scss", "'font-size': 57px", "'font-size': 58px");
    expect(() => checkTypographyDefaults(root)).toThrow("omitted: typography role defaults");
  });

  test("rejects accidental role token consumption in the default mode", () => {
    const root = fixture();
    replace(root, "abstract/_emit.scss", "$typescale-tokens: false !default", "$typescale-tokens: true !default");
    expect(() => checkTypographyDefaults(root)).toThrow("omitted: typography role defaults");
  });

  test("rejects a selected fallback regression without changing the literal default", () => {
    const root = fixture();
    replace(root, "abstract/_mixins.scss", "#{$property}, #{$fallback}", "#{$property}, initial");
    expect(() => checkTypographyDefaults(root)).toThrow("true: typography role defaults");
  });
});
