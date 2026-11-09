// test/types/theme-origins.fixture.ts
//
// A type consumer of the theme-origin metadata on material/core/theme: the
// records are readonly and their literals narrow, the authored nulls
// discriminate, every export the entry already had still imports, and an
// application theme name is not a BuiltInThemeName. Compiled only.
import {
  BASELINE_SEED,
  THEME_ORIGINS,
  cornerToken,
  schemeToTokens,
  THEME_ROLES,
  type BuiltInThemeName,
  type ThemeOrigin,
  type ThemeOriginVariant,
  type ThemeRole,
  type SchemeRoles,
  type SchemeToTokensOptions,
  type ThemeTokens,
  type ShapeStep,
} from "../../src/core/theme";

// Every export the entry already carried still imports, value and type.
export const roles: readonly string[] = THEME_ROLES;
export const toTokens = schemeToTokens;
export const corner = cornerToken("large", 16);
export type Existing = [ThemeRole, SchemeRoles, SchemeToTokensOptions, ThemeTokens, ShapeStep];

// The baseline seed is the documented literal, lowercase.
export const baselineSeed: "#6750a4" = BASELINE_SEED;

// Literal narrowing: the high-contrast input is 1, not a number that happens
// to hold 1; the two-colour and variant recipes narrow to their own slugs.
export const highContrastInput: 1 = THEME_ORIGINS.highcontrast.contrast;
export const desertVariant: "tonal-spot" = THEME_ORIGINS.desert.variant;
export const fruitSaladVariant: "fruit-salad" = THEME_ORIGINS["fruit-salad"].variant;

// The variant union is the nine recipes; a made-up one is not assignable.
export const tonalSpot: ThemeOriginVariant = "tonal-spot";
// @ts-expect-error a variant is one of the nine generated recipes
export const bogusVariant: ThemeOriginVariant = "spectrum";

// Nullable authored fields discriminate on kind.
export const seedOf = (origin: ThemeOrigin): string | null =>
  origin.kind === "authored" ? origin.seed : origin.seed;
export const authoredVariant = (origin: ThemeOrigin): null =>
  origin.kind === "authored" ? origin.variant : null;

// Indexing by a built-in name yields the union; an application theme name is
// not a BuiltInThemeName and has no synthesized record.
export const originOf = (name: BuiltInThemeName): ThemeOrigin => THEME_ORIGINS[name];
// @ts-expect-error an application theme name is not a BuiltInThemeName
export const notBuiltIn: BuiltInThemeName = "brand-marketing";
// @ts-expect-error an unknown theme has no synthesized record
export const noRecord: ThemeOrigin = THEME_ORIGINS.brandnew;

// The records are readonly.
// @ts-expect-error records are readonly
THEME_ORIGINS.desert.seed = "#000000";
// @ts-expect-error the map is readonly
THEME_ORIGINS.extra = null;
