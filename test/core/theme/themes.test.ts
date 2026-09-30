// test/core/theme/themes.test.ts
//
// FLO-308: the generated themes, the role-to-token function they share with
// md3.io, and the checks the brief asks for: the files match a fresh
// generation, the role set is baseline's, baseline stays within ΔE00 2 of M3's
// Tonal Spot, every text pair reaches 4.5:1 (7:1 for highcontrast), each
// variant is Google's own output, and `mtrl/core` never pulls in the colour
// library.
import { describe, test, expect } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { Hct, argbFromHex } from "@material/material-color-utilities";
import { schemeToTokens, THEME_ROLES } from "../../../src/core/theme";
import { BASELINE_SEED, THEMES, renderThemes, rolesOf, schemeFor } from "../../../scripts/generate-themes";
import { themeStyles, standaloneThemes } from "../../../scripts/style-manifest";

const THEMES_DIR = "src/styles/themes";

/** A theme file's colour roles, light and dark, `-rgb` twins left out */
const parse = (name: string): { light: Record<string, string>; dark: Record<string, string> } => {
  const scss = readFileSync(`${THEMES_DIR}/_${name}.scss`, "utf8");
  const split = scss.indexOf('&[data-theme-mode="dark"]');
  const read = (text: string) => Object.fromEntries(
    [...text.matchAll(/--#\{\$prefix\}-sys-color-([a-z-]+?):\s*(#[0-9a-fA-F]{6})/g)].map(([, role, hex]) => [role, hex.toLowerCase()]),
  );
  return { light: read(split < 0 ? scss : scss.slice(0, split)), dark: read(split < 0 ? "" : scss.slice(split)) };
};

const luminance = (hex: string): number => {
  const value = parseInt(hex.slice(1), 16);
  const [r, g, b] = [16, 8, 0].map((shift) => {
    const c = ((value >> shift) & 255) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const PAIRS: [string, string][] = [
  ...["primary", "secondary", "tertiary", "error"].flatMap((role): [string, string][] => [[`on-${role}`, role], [`on-${role}-container`, `${role}-container`]]),
  ["on-surface", "surface"], ["on-surface", "surface-container-highest"],
  ["on-surface-variant", "surface"], ["on-surface-variant", "surface-container-highest"],
  ["inverse-on-surface", "inverse-surface"], ["inverse-primary", "inverse-surface"],
];

// CIEDE2000, from sRGB through CIELAB (D65)
const lab = (hex: string): [number, number, number] => {
  const value = parseInt(hex.slice(1), 16);
  const [r, g, b] = [16, 8, 0].map((shift) => {
    const c = ((value >> shift) & 255) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const xyz = [
    (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047,
    0.2126729 * r + 0.7151522 * g + 0.072175 * b,
    (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883,
  ].map((t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116));
  return [116 * xyz[1] - 16, 500 * (xyz[0] - xyz[1]), 200 * (xyz[1] - xyz[2])];
};
const deltaE00 = (x: string, y: string): number => {
  const [L1, a1, b1] = lab(x), [L2, a2, b2] = lab(y);
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const h = (a: number, b: number) => (a === 0 && b === 0 ? 0 : (Math.atan2(b, a) / rad + 360) % 360);
  const h1p = h(a1p, b1), h2p = h(a2p, b2);
  const dLp = L2 - L1, dCp = C2p - C1p;
  let dhp = h2p - h1p;
  if (C1p * C2p === 0) dhp = 0; else if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lmp = (L1 + L2) / 2, Cmp = (C1p + C2p) / 2;
  let hmp = h1p + h2p;
  if (C1p * C2p !== 0) hmp = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + 360) / 2 : (h1p + h2p) / 2;
  const T = 1 - 0.17 * Math.cos((hmp - 30) * rad) + 0.24 * Math.cos(2 * hmp * rad) + 0.32 * Math.cos((3 * hmp + 6) * rad) - 0.2 * Math.cos((4 * hmp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hmp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lmp - 50) ** 2) / Math.sqrt(20 + (Lmp - 50) ** 2);
  const Sc = 1 + 0.045 * Cmp, Sh = 1 + 0.015 * Cmp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
};

describe("schemeToTokens", () => {
  const scheme = (overrides: Record<string, string> = {}) => ({
    ...Object.fromEntries(THEME_ROLES.map((role) => [role, "#112233"])),
    "on-surface": "#010203",
    ...overrides,
  });

  test("maps every role to --mtrl-sys-color-*, with its -rgb twin", () => {
    const tokens = schemeToTokens({ light: scheme({ primary: "#6750A4" }), dark: scheme() });
    expect(tokens.light["--mtrl-sys-color-primary"]).toBe("#6750a4");
    expect(tokens.light["--mtrl-sys-color-primary-rgb"]).toBe("103, 80, 164");
    expect(Object.keys(tokens.light)).toHaveLength(THEME_ROLES.length * 2);
  });

  test("takes material-color-utilities' camelCase names too", () => {
    const camel = Object.fromEntries(Object.entries(scheme()).map(([role, hex]) => [role.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()), hex]));
    expect(schemeToTokens({ light: camel, dark: camel }).dark["--mtrl-sys-color-surface-container-highest"]).toBe("#112233");
  });

  test("a prefix, and no twins on request", () => {
    const tokens = schemeToTokens({ light: scheme(), dark: scheme() }, { prefix: "x", rgb: false });
    expect(Object.keys(tokens.light).every((name) => name.startsWith("--x-sys-color-") && !name.endsWith("-rgb"))).toBe(true);
  });

  test("light surface-rgb carries on-surface's channels, as baseline's does; dark its own", () => {
    const tokens = schemeToTokens({ light: scheme(), dark: scheme() });
    expect(tokens.light["--mtrl-sys-color-surface-rgb"]).toBe("1, 2, 3");
    expect(tokens.dark["--mtrl-sys-color-surface-rgb"]).toBe("17, 34, 51");
  });

  test("a missing role or a colour that is not #rrggbb throws", () => {
    const { primary: _, ...partial } = scheme();
    expect(() => schemeToTokens({ light: partial, dark: scheme() })).toThrow("light scheme has no primary");
    expect(() => schemeToTokens({ light: scheme({ primary: "red" }), dark: scheme() })).toThrow("not #rrggbb");
  });

  test("the roles are baseline's", () => {
    const baseline = readFileSync(`${THEMES_DIR}/_baseline.scss`, "utf8");
    const light = baseline.slice(baseline.indexOf("@mixin baseline-light-variables"), baseline.indexOf("@mixin baseline-dark-variables"));
    const roles = [...light.matchAll(/--#\{\$prefix\}-sys-color-([a-z-]+?):/g)].map(([, role]) => role).filter((role) => !role.endsWith("-rgb"));
    expect([...roles].sort()).toEqual([...THEME_ROLES].sort());
  });
});

describe("generated themes", () => {
  test("the committed files are what the generator writes now", () => {
    for (const [path, content] of Object.entries(renderThemes())) {
      expect({ path, content: readFileSync(path, "utf8") }).toEqual({ path, content });
    }
  });

  test("every theme file is in exactly one manifest list", () => {
    const files = readdirSync(THEMES_DIR).filter((file) => /^_.*\.scss$/.test(file) && !["_index.scss", "_base-theme.scss"].includes(file))
      .map((file) => file.slice(1, -".scss".length));
    for (const name of files) expect({ name, lists: [themeStyles.includes(name), standaloneThemes.includes(name)].filter(Boolean).length }).toEqual({ name, lists: 1 });
    expect([...themeStyles, ...standaloneThemes].sort()).toEqual([...files].sort());
  });

  test("the variants are standalone; the full stylesheet's set is unchanged", () => {
    expect(standaloneThemes.sort()).toEqual(THEMES.filter((spec) => spec.standalone).map((spec) => spec.name).sort());
    const index = readFileSync(`${THEMES_DIR}/_index.scss`, "utf8");
    for (const name of standaloneThemes) expect(index.includes(`"${name}"`)).toBe(false);
  });

  test("each variant is Google's output for the baseline seed", () => {
    for (const spec of THEMES.filter((theme) => theme.standalone)) {
      const file = parse(spec.name);
      for (const [mode, isDark] of [["light", false], ["dark", true]] as const) {
        expect({ name: spec.name, mode, roles: file[mode] }).toEqual({ name: spec.name, mode, roles: rolesOf(schemeFor(spec, isDark)) });
      }
    }
  });

  test("baseline stays within ΔE00 2 of M3's Tonal Spot from the baseline seed", () => {
    const tonalSpot = { name: "tonal-spot", description: "", seed: BASELINE_SEED, variant: "tonal-spot" as const };
    // baseline sets its roles in two mixins, not in a create-theme block
    const source = readFileSync(`${THEMES_DIR}/_baseline.scss`, "utf8");
    const block = (from: string, to: string) => Object.fromEntries(
      [...source.slice(source.indexOf(from), source.indexOf(to)).matchAll(/--#\{\$prefix\}-sys-color-([a-z-]+?):\s*(#[0-9a-fA-F]{6})/g)].map(([, role, hex]) => [role, hex.toLowerCase()]),
    );
    const baseline = { light: block("@mixin baseline-light-variables", "@mixin baseline-dark-variables"), dark: block("@mixin baseline-dark-variables", ":root {") };
    const roles = ["primary", "secondary", "tertiary", "surface", "primary-container", "secondary-container", "tertiary-container", "surface-container"];
    const distances = ([["light", false], ["dark", true]] as const).flatMap(([mode, isDark]) => {
      const reference = rolesOf(schemeFor(tonalSpot, isDark));
      return roles.map((role) => deltaE00(baseline[mode][role], reference[role]));
    });
    const mean = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    expect(mean).toBeLessThan(2);
  });

  test("every text pair reaches 4.5:1, and 7:1 in highcontrast", () => {
    for (const spec of THEMES) {
      const minimum = spec.name === "highcontrast" ? 7 : 4.5;
      const file = parse(spec.name);
      for (const mode of ["light", "dark"] as const) {
        for (const [fg, bg] of PAIRS) {
          const ratio = contrast(file[mode][fg], file[mode][bg]);
          expect({ theme: spec.name, mode, pair: `${fg}/${bg}`, passes: ratio >= minimum }).toEqual({ theme: spec.name, mode, pair: `${fg}/${bg}`, passes: true });
        }
      }
    }
  });

  test("a two-colour theme keeps its secondary's hue", () => {
    for (const spec of THEMES.filter((theme) => theme.secondary)) {
      const wanted = Hct.fromInt(argbFromHex(spec.secondary!)).hue;
      const got = Hct.fromInt(argbFromHex(parse(spec.name).light.secondary)).hue;
      const off = Math.min(Math.abs(wanted - got), 360 - Math.abs(wanted - got));
      expect({ theme: spec.name, near: off < 10 }).toEqual({ theme: spec.name, near: true });
    }
  });
});

describe("mtrl/core", () => {
  test("never pulls in material-color-utilities", async () => {
    const build = await Bun.build({ entrypoints: ["src/core/index.ts"], target: "browser" });
    expect(build.success).toBe(true);
    const text = await build.outputs[0].text();
    expect(text.includes("material-color-utilities")).toBe(false);
    expect(/TonalPalette|SchemeTonalSpot|DynamicScheme/.test(text)).toBe(false);
    expect(text.includes("schemeToTokens")).toBe(true);
  });
});
