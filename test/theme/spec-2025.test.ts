import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as base from "../../src/theme";
import * as spec2025 from "../../src/theme/2025";
import { Hct, type DynamicScheme, type SchemeFactory } from "../../src/theme";
import { SCHEME_ROLES, STATUS_ROLES } from "../../src/theme/roles";
import { MaterialDynamicColors } from "../../src/theme/vendor/dynamiccolor/material_dynamic_colors";
import { argbFromHex, hexFromArgb } from "../../src/theme/vendor/utils/string_utils";
import type { ThemeVariant } from "../../src/theme/variants";

/**
 * The reference values: `test/theme/fixtures/spec-2025.json`, generated from
 * `cf89214f^` (the pre-cut port that shipped the 2025 spec) with
 * `/tmp/spec2025-gen.ts`. Importing `material/theme/2025` above registers the
 * 2025 delegates for the whole process; a 2021 scheme is unaffected because
 * the dispatch reads `scheme.specVersion`.
 */
interface Fixture {
  oracle: string;
  generated: string;
  note: string;
  roles: string[];
  schemes: Array<{ variant: string; seed: string; mode: "light" | "dark"; contrast: number; values: string[] }>;
}

const fixture = JSON.parse(readFileSync(join(import.meta.dir, "fixtures", "spec-2025.json"), "utf8")) as Fixture;

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
  base.applyScheme(scheme, element, { prefix });
  const colors = new MaterialDynamicColors() as unknown as Record<string, () => { getArgb(scheme: DynamicScheme): number }>;
  const roles: Record<string, string> = {};
  for (const role of SCHEME_ROLES) {
    expect(properties.get(`--${prefix}-sys-color-${role}`)).toBe(hexFromArgb(colors[camel(role)]().getArgb(scheme)));
    roles[role] = properties.get(`--${prefix}-sys-color-${role}`)!;
  }
  return roles;
}

const SPEC_FACTORIES: Record<ThemeVariant, spec2025.Spec2025Factory> = {
  "tonal-spot": spec2025.tonalSpot,
  vibrant: spec2025.vibrant,
  expressive: spec2025.expressive,
  fidelity: spec2025.fidelity,
  content: spec2025.content,
  neutral: spec2025.neutral,
  monochrome: spec2025.monochrome,
};

const BASE_FACTORIES: Record<ThemeVariant, SchemeFactory> = {
  "tonal-spot": base.tonalSpot,
  vibrant: base.vibrant,
  expressive: base.expressive,
  fidelity: base.fidelity,
  content: base.content,
  neutral: base.neutral,
  monochrome: base.monochrome,
};

const SPEC_2025_VARIANTS = ["tonal-spot", "vibrant", "expressive", "neutral"] as const;
const FALLBACK_VARIANTS = ["fidelity", "content", "monochrome"] as const;
const SEEDS = ["#6750a4", "#a86c00"] as const;
const MODES = ["light", "dark"] as const;
const CONTRASTS = [-1, 0, 0.5, 1] as const;

test("the frozen fixture covers 34 reference roles alongside six runtime status roles", () => {
  expect(fixture.roles).toHaveLength(34);
  expect([...SCHEME_ROLES]).toEqual([...fixture.roles, ...STATUS_ROLES]);
  expect(fixture.schemes).toHaveLength(64);
  expect(fixture.schemes.reduce((total, row) => total + row.values.length, 0)).toBe(2176);
});

test("every 2025 scheme matches the pre-cut port, value for value", () => {
  let compared = 0;
  for (const row of fixture.schemes) {
    const factory = SPEC_FACTORIES[row.variant as ThemeVariant];
    expect(factory, row.variant).toBeDefined();
    const source = Hct.fromInt(argbFromHex(row.seed));
    const scheme = factory(source, row.mode === "dark", row.contrast, "2025");
    const expected = Object.fromEntries(fixture.roles.map((role, index) => [role, row.values[index]]));
    const applied = rolesOf(scheme);
    // The pre-cut oracle predates the six status roles on main. Keep every
    // original reference value; rolesOf also checks all 40 applied roles.
    const referenceRoles = Object.fromEntries(fixture.roles.map((role) => [role, applied[role]]));
    expect(referenceRoles, `${row.variant} ${row.seed} ${row.mode} ${row.contrast}`).toEqual(expected);
    compared += row.values.length;
  }
  expect(compared).toBe(2176);
});

test("the spec defaults to 2021 on the entry and on every factory", () => {
  const source = Hct.fromInt(argbFromHex("#6750a4"));
  type Versioned = DynamicScheme & { specVersion: string };
  for (const [name, factory] of Object.entries(SPEC_FACTORIES)) {
    expect((factory(source, false, 0) as Versioned).specVersion, name).toBe("2021");
  }
  expect((spec2025.createScheme("#6750a4") as Versioned).specVersion).toBe("2021");
  expect((spec2025.createSchemeByName("#6750a4") as Versioned).specVersion).toBe("2021");
});

test("a 2021 request through the 2025 entry equals the base entry, for every variant", () => {
  let compared = 0;
  for (const name of Object.keys(SPEC_FACTORIES) as ThemeVariant[]) {
    for (const seed of SEEDS) {
      const source = Hct.fromInt(argbFromHex(seed));
      for (const mode of MODES) {
        for (const contrast of CONTRASTS) {
          const through2025 = rolesOf(SPEC_FACTORIES[name](source, mode === "dark", contrast, "2021"));
          const fromBase = rolesOf(BASE_FACTORIES[name](source, mode === "dark", contrast));
          expect(through2025, `${name} ${seed} ${mode} ${contrast}`).toEqual(fromBase);
          compared += 1;
        }
      }
    }
  }
  expect(compared).toBe(112);
});

test("fidelity, content and monochrome fall back from 2025 to 2021", () => {
  for (const name of FALLBACK_VARIANTS) {
    for (const seed of SEEDS) {
      const source = Hct.fromInt(argbFromHex(seed));
      for (const mode of MODES) {
        const requested = SPEC_FACTORIES[name](source, mode === "dark", 0, "2025");
        expect((requested as DynamicScheme & { specVersion: string }).specVersion, name).toBe("2021");
        expect(rolesOf(requested), `${name} ${seed} ${mode}`).toEqual(rolesOf(BASE_FACTORIES[name](source, mode === "dark", 0)));
      }
    }
  }
});

test("the four spec versions that differ, differ", () => {
  for (const name of SPEC_2025_VARIANTS) {
    const source = Hct.fromInt(argbFromHex("#6750a4"));
    const requested = rolesOf(SPEC_FACTORIES[name](source, false, 0, "2025"));
    const standard = rolesOf(BASE_FACTORIES[name](source, false, 0));
    expect(requested, name).not.toEqual(standard);
  }
});

test("the pinned examples from the design note", () => {
  const light = rolesOf(spec2025.createScheme("#6750a4", { spec: "2025" }));
  expect(light.primary).toBe("#655789");
  expect(light["on-surface"]).toBe("#34313a");
  expect(light["primary-container"]).toBe("#d4c3fd");
  expect(light.error).toBe("#a8364b");
  expect(rolesOf(spec2025.createScheme("#6750a4", { variant: spec2025.vibrant, spec: "2025" })).primary).toBe("#6935d9");
  expect(rolesOf(spec2025.createScheme("#6750a4", { variant: spec2025.expressive, spec: "2025" })).primary).toBe("#6850a5");
  expect(rolesOf(spec2025.createScheme("#6750a4", { variant: spec2025.neutral, spec: "2025" })).primary).toBe("#615d66");
  // The base entry still pins 2021, with or without the 2025 entry imported.
  const standard = rolesOf(base.createScheme("#6750a4"));
  expect(standard.primary).toBe("#65558f");
  expect(standard["on-surface"]).toBe("#1d1b20");
});


const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

test("2025 requests retain the runtime status-role contrast floors", () => {
  for (const seed of SEEDS) {
    const source = Hct.fromInt(argbFromHex(seed));
    for (const [name, factory] of Object.entries(SPEC_FACTORIES)) {
      for (const mode of MODES) {
        for (const contrast of [0, 0.5, 1]) {
          const roles = rolesOf(factory(source, mode === "dark", contrast, "2025"));
          for (const status of ["success", "warning", "info"] as const) {
            const [hi, lo] = [luminance(roles[status]!), luminance(roles[`on-${status}`]!)].sort((a, b) => b - a);
            expect((hi! + 0.05) / (lo! + 0.05), `${name} ${seed} ${mode} ${contrast} ${status}`)
              .toBeGreaterThanOrEqual(contrast === 1 ? 7 : 4.5);
          }
        }
      }
    }
  }
});
