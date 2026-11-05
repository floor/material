import { expect, test } from "bun:test";
import * as theme from "../../src/theme";
import {
  applyScheme,
  content,
  createScheme,
  expressive,
  fidelity,
  Hct,
  monochrome,
  neutral,
  tonalSpot,
  vibrant,
  type DynamicScheme,
  type SchemeFactory,
} from "../../src/theme";
import { createSchemeByName, type ThemeVariant } from "../../src/theme/variants";
import { SCHEME_ROLES } from "../../src/theme/roles";
import { MaterialDynamicColors } from "../../src/theme/vendor/dynamiccolor/material_dynamic_colors";
import { argbFromHex, hexFromArgb } from "../../src/theme/vendor/utils/string_utils";
import { SchemeContent } from "../../src/theme/vendor/scheme/scheme_content";
import { SchemeExpressive } from "../../src/theme/vendor/scheme/scheme_expressive";
import { SchemeFidelity } from "../../src/theme/vendor/scheme/scheme_fidelity";
import { SchemeMonochrome } from "../../src/theme/vendor/scheme/scheme_monochrome";
import { SchemeNeutral } from "../../src/theme/vendor/scheme/scheme_neutral";
import { SchemeTonalSpot } from "../../src/theme/vendor/scheme/scheme_tonal_spot";
import { SchemeVibrant } from "../../src/theme/vendor/scheme/scheme_vibrant";

/** A target that records the custom properties written to it, without a DOM. */
function target(): { element: Element; properties: Map<string, string> } {
  const properties = new Map<string, string>();
  const element = { style: { setProperty: (name: string, value: string) => properties.set(name, value) } } as unknown as Element;
  return { element, properties };
}

const camel = (role: string): string => role.replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());

/** The scheme's role colours, read the way applyScheme writes them. */
function rolesOf(scheme: DynamicScheme, prefix = "mtrl"): Record<string, string> {
  const { element, properties } = target();
  applyScheme(scheme, element, { prefix });
  const colors = new MaterialDynamicColors() as unknown as Record<string, () => { getArgb(scheme: DynamicScheme): number }>;
  const roles: Record<string, string> = {};
  for (const role of SCHEME_ROLES) {
    expect(properties.get(`--${prefix}-sys-color-${role}`)).toBe(hexFromArgb(colors[camel(role)]().getArgb(scheme)));
    roles[role] = properties.get(`--${prefix}-sys-color-${role}`)!;
  }
  return roles;
}

const VARIANTS: Record<ThemeVariant, SchemeFactory> = {
  "tonal-spot": tonalSpot,
  vibrant,
  expressive,
  fidelity,
  content,
  neutral,
  monochrome,
};

/** The reference: the ported scheme classes, called directly. */
const SCHEME_CLASSES: Record<ThemeVariant, new (source: Hct, dark: boolean, contrast: number, specVersion?: string) => DynamicScheme> = {
  "tonal-spot": SchemeTonalSpot,
  vibrant: SchemeVibrant,
  expressive: SchemeExpressive,
  fidelity: SchemeFidelity,
  content: SchemeContent,
  neutral: SchemeNeutral,
  monochrome: SchemeMonochrome,
};

test("every variant, mode and contrast level matches the reference constructor call", () => {
  const seeds = ["#6750a4", "#b3261e", "#00696d"];
  const contrasts = [-1, -0.5, 0, 0.5, 1];
  let compared = 0;
  for (const seed of seeds) {
    const source = Hct.fromInt(argbFromHex(seed));
    for (const [name, Scheme] of Object.entries(SCHEME_CLASSES)) {
      for (const mode of ["light", "dark"] as const) {
        for (const contrast of contrasts) {
          const expected = new Scheme(source, mode === "dark", contrast);
          const named = rolesOf(createSchemeByName(seed, { variant: name as ThemeVariant, mode, contrast }));
          const direct = rolesOf(createScheme(seed, { variant: VARIANTS[name as ThemeVariant], mode, contrast }));
          expect(named, `${seed} ${name} ${mode} ${contrast}`).toEqual(rolesOf(expected));
          expect(direct, `${seed} ${name} ${mode} ${contrast}`).toEqual(named);
          compared += 1;
        }
      }
    }
  }
  expect(compared).toBe(210);
});

test("the entry exports variant factories, not the scheme classes", () => {
  expect(Object.keys(theme).filter((name) => /^Scheme/.test(name))).toEqual([]);
  for (const name of Object.values(VARIANTS)) expect(typeof name).toBe("function");
});

test("every factory produces a scheme pinned to the 2021 colour spec", () => {
  for (const [name, factory] of Object.entries(VARIANTS)) {
    const scheme = factory(Hct.fromInt(argbFromHex("#6750a4")), false, 0);
    expect((scheme as DynamicScheme & { specVersion: string }).specVersion, name).toBe("2021");
  }
});

test("the seed may be a hex string, an ARGB integer or an Hct", () => {
  const expected = rolesOf(createScheme("#6750a4"));
  expect(rolesOf(createScheme(0xff6750a4))).toEqual(expected);
  expect(rolesOf(createScheme(Hct.fromInt(0xff6750a4)))).toEqual(expected);
  expect(rolesOf(createSchemeByName("#6750A4"))).toEqual(expected);
});

test("the defaults are Material's: tonal spot, light, standard contrast", () => {
  expect(rolesOf(createScheme("#6750a4"))).toEqual(rolesOf(new SchemeTonalSpot(Hct.fromInt(0xff6750a4), false, 0)));
  expect(rolesOf(createSchemeByName("#6750a4"))).toEqual(rolesOf(createScheme("#6750a4")));
});

test("the prefix option renames every token it writes", () => {
  const { element, properties } = target();
  applyScheme(createScheme("#6750a4"), element, { prefix: "acme" });
  expect(properties.size).toBe(SCHEME_ROLES.length);
  for (const role of SCHEME_ROLES) expect(properties.has(`--acme-sys-color-${role}`)).toBe(true);
  expect([...properties.keys()].some((name) => name.startsWith("--mtrl-"))).toBe(false);
});

// Pinned output of material-color-utilities 0.4.0 for the default seed: the
// light primary is the value Material Theme Builder reports for #6750a4.
const REFERENCE: Record<"light" | "dark", Record<string, string>> = {
  light: {
    primary: "#65558f", "on-primary": "#ffffff", "primary-container": "#e9ddff", "on-primary-container": "#4d3d75",
    secondary: "#625b71", "on-secondary": "#ffffff", "secondary-container": "#e8def8", "on-secondary-container": "#4a4458",
    tertiary: "#7e5260", "on-tertiary": "#ffffff", "tertiary-container": "#ffd9e3", "on-tertiary-container": "#633b48",
    error: "#ba1a1a", "on-error": "#ffffff", "error-container": "#ffdad6", "on-error-container": "#93000a",
    surface: "#fdf7ff", "surface-dim": "#ded8e0", "surface-bright": "#fdf7ff", "surface-container-lowest": "#ffffff",
    "surface-container-low": "#f8f2fa", "surface-container": "#f2ecf4", "surface-container-high": "#ece6ee",
    "surface-container-highest": "#e6e0e9", "surface-variant": "#e7e0eb", "on-surface": "#1d1b20",
    "on-surface-variant": "#49454e", outline: "#7a757f", "outline-variant": "#cac4cf", shadow: "#000000",
    scrim: "#000000", "inverse-surface": "#322f35", "inverse-on-surface": "#f5eff7", "inverse-primary": "#cfbdfe",
    success: "#006b5e", "on-success": "#ffffff", warning: "#a73a10", "on-warning": "#ffffff", info: "#375ba9", "on-info": "#ffffff",
  },
  dark: {
    primary: "#cfbdfe", "on-primary": "#36275d", "primary-container": "#4d3d75", "on-primary-container": "#e9ddff",
    secondary: "#cbc2db", "on-secondary": "#332d41", "secondary-container": "#4a4458", "on-secondary-container": "#e8def8",
    tertiary: "#efb8c8", "on-tertiary": "#4a2532", "tertiary-container": "#633b48", "on-tertiary-container": "#ffd9e3",
    error: "#ffb4ab", "on-error": "#690005", "error-container": "#93000a", "on-error-container": "#ffdad6",
    surface: "#141218", "surface-dim": "#141218", "surface-bright": "#3b383e", "surface-container-lowest": "#0f0d13",
    "surface-container-low": "#1d1b20", "surface-container": "#211f24", "surface-container-high": "#2b292f",
    "surface-container-highest": "#36343a", "surface-variant": "#49454e", "on-surface": "#e6e0e9",
    "on-surface-variant": "#cac4cf", outline: "#948f99", "outline-variant": "#49454e", shadow: "#000000",
    scrim: "#000000", "inverse-surface": "#e6e0e9", "inverse-on-surface": "#322f35", "inverse-primary": "#65558f",
    success: "#7ad7c6", "on-success": "#003730", warning: "#ffb59d", "on-warning": "#5d1800", info: "#b1c5ff", "on-info": "#002c70",
  },
};

test("the default seed's scheme matches the pinned reference values", () => {
  for (const mode of ["light", "dark"] as const) {
    const roles = rolesOf(createSchemeByName("#6750a4", { mode }));
    expect(roles, mode).toEqual(REFERENCE[mode]);
    expect(Object.keys(roles).sort()).toEqual(Object.keys(REFERENCE[mode]).sort());
  }
});

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

const contrastRatio = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

test("runtime status roles reach 4.5:1 at standard/medium and 7:1 at high while keeping warning inside 36.5–66.4°", () => {
  const seeds = ["#6750a4", "#006493", "#9a7a3e", "#2e6c00", "#984816", "#006e2b", "#4196cb", "#8f4e00", "#3e2723", "#7d8c73", "#2b4d56"];
  for (const seed of seeds) {
    for (const variant of Object.keys(VARIANTS) as ThemeVariant[]) {
      for (const mode of ["light", "dark"] as const) {
        for (const contrast of [0, 0.5, 1]) {
          const minimum = contrast === 1 ? 7 : 4.5;
          const roles = rolesOf(createSchemeByName(seed, { variant, mode, contrast }));
          for (const pair of ["success", "warning", "info"] as const) {
            expect(contrastRatio(roles[`on-${pair}`]!, roles[pair]!)).toBeGreaterThanOrEqual(minimum);
          }
          if (mode === "light" || contrast === 0) {
            const warningHue = Hct.fromInt(argbFromHex(roles.warning!)).hue;
            expect(warningHue).toBeGreaterThanOrEqual(36.5);
            expect(warningHue).toBeLessThanOrEqual(66.4);
          }
        }
      }
    }
  }
});

test("status role resolution leaves error, on-error, error-container and on-error-container untouched across all parity seeds, variants and contrasts", () => {
  const seeds = ["#6750a4", "#b3261e", "#00696d"];
  const contrasts = [-1, -0.5, 0, 0.5, 1];
  const colors = new MaterialDynamicColors();
  for (const seed of seeds) {
    const source = Hct.fromInt(argbFromHex(seed));
    for (const [name, Scheme] of Object.entries(SCHEME_CLASSES)) {
      for (const mode of ["light", "dark"] as const) {
        for (const contrast of contrasts) {
          const fresh = new Scheme(source, mode === "dark", contrast);
          const expectedError = {
            error: hexFromArgb(colors.error().getArgb(fresh)),
            "on-error": hexFromArgb(colors.onError().getArgb(fresh)),
            "error-container": hexFromArgb(colors.errorContainer().getArgb(fresh)),
            "on-error-container": hexFromArgb(colors.onErrorContainer().getArgb(fresh)),
          };

          const first = createScheme(seed, { variant: VARIANTS[name as ThemeVariant], mode, contrast });
          const originalPalette = first.errorPalette;
          const firstRoles = rolesOf(first);
          expect(first.errorPalette).toBe(originalPalette);
          expect({
            error: firstRoles.error,
            "on-error": firstRoles["on-error"],
            "error-container": firstRoles["error-container"],
            "on-error-container": firstRoles["on-error-container"],
          }, `${seed} ${name} ${mode} ${contrast} first`).toEqual(expectedError);

          // A second scheme built and applied immediately after gives identical error roles.
          const second = createScheme(seed, { variant: VARIANTS[name as ThemeVariant], mode, contrast });
          const secondRoles = rolesOf(second);
          expect({
            error: secondRoles.error,
            "on-error": secondRoles["on-error"],
            "error-container": secondRoles["error-container"],
            "on-error-container": secondRoles["on-error-container"],
          }, `${seed} ${name} ${mode} ${contrast} second`).toEqual(expectedError);
        }
      }
    }
  }
});
