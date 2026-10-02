import { describe, expect, test } from "bun:test";

// The opt-in JSX entries (FLO-333): each fixture compiles on its own, since an
// augmentation, once imported, applies to the whole program.
const tsc = (file: string, jsx: string[]): { code: number; output: string } => {
  const result = Bun.spawnSync([
    "bunx", "tsc", "--noEmit", "--strict", "--skipLibCheck", "--moduleResolution", "bundler", "--module", "esnext",
    "--target", "es2022", "--lib", "es2022,dom", ...jsx, file,
  ], { stdout: "pipe", stderr: "pipe" });
  return { code: result.exitCode, output: result.stdout.toString() + result.stderr.toString() };
};
const REACT = ["--jsx", "react-jsx"];
const SOLID = ["--jsx", "preserve", "--jsxImportSource", "solid-js"];

describe("material/react/jsx and material/solid/jsx", () => {
  for (const [name, flags] of [["react", REACT], ["solid", SOLID]] as const) {
    test(`${name}: the bare tags type-check with the entry imported`, () => {
      const { code, output } = tsc(`test/types/jsx/${name}-with.tsx`, [...flags]);
      expect(output).toBe("");
      expect(code).toBe(0);
    }, 60_000);

    test(`${name}: and are unknown without it`, () => {
      const { code, output } = tsc(`test/types/jsx/${name}-without.tsx`, [...flags]);
      expect(code).not.toBe(0);
      expect(output).toContain("m-switch");
    }, 60_000);
  }
});
