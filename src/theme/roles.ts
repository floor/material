// src/theme/roles.ts
import type { DynamicColor } from "./vendor/dynamiccolor/dynamic_color";
import type { DynamicScheme } from "./vendor/dynamiccolor/dynamic_scheme";
import { MaterialDynamicColors } from "./vendor/dynamiccolor/material_dynamic_colors";
import { Hct } from "./vendor/hct/hct";
import { TonalPalette } from "./vendor/palettes/tonal_palette";

/** The six semantic status colour roles added alongside M3's scheme roles. */
export const STATUS_ROLES = [
  "success",
  "on-success",
  "warning",
  "on-warning",
  "info",
  "on-info",
] as const;

/**
 * The role table a runtime scheme writes: the roles the stylesheet reads.
 *
 * The theme partials declare 46 M3 scheme roles, but twelve of them — the
 * `*-fixed*` family — are never read outside those declarations:
 *
 *   grep -rn 'fixed' src --include='*.ts' --include='*.scss' \
 *     | grep -v 'src/styles/themes/' | grep -ci 'sys-color'   # 0
 *
 * No component, base or utility style reads one, so {@link applyScheme} leaves
 * them at the Sass theme's value and spends nothing on them. The 34 remaining
 * M3 roles and the 6 harmonised status roles — 40 roles in all — are written.
 */
export const SCHEME_ROLES = [
  "primary",
  "on-primary",
  "primary-container",
  "on-primary-container",
  "secondary",
  "on-secondary",
  "secondary-container",
  "on-secondary-container",
  "tertiary",
  "on-tertiary",
  "tertiary-container",
  "on-tertiary-container",
  "error",
  "on-error",
  "error-container",
  "on-error-container",
  "surface",
  "surface-dim",
  "surface-bright",
  "surface-container-lowest",
  "surface-container-low",
  "surface-container",
  "surface-container-high",
  "surface-container-highest",
  "surface-variant",
  "on-surface",
  "on-surface-variant",
  "outline",
  "outline-variant",
  "shadow",
  "scrim",
  "inverse-surface",
  "inverse-on-surface",
  "inverse-primary",
  "success",
  "on-success",
  "warning",
  "on-warning",
  "info",
  "on-info",
] as const;

export type SchemeRole = (typeof SCHEME_ROLES)[number];

/** `on-surface-variant` back to `onSurfaceVariant`, the library's spelling. */
export const camel = (role: string): string => role.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

/**
 * Harmonises the three semantic status seeds (`#007B5A`, `#DD6D06`, `#0061A4`)
 * toward each scheme's primary (`Blend.harmonize`, capped at 15° HCT hue shift)
 * and resolves `X` and `on-X` through `MaterialDynamicColors`'s `error` /
 * `onError` contrast curves (`ContrastCurve(3, 4.5, 7, 7)` against
 * `highestSurface`, and `ContrastCurve(4.5, 7, 11, 21)` for `on-X` against `X`).
 *
 * Material source: m3.material.io/styles/color/advanced/define-new-colors
 * and m3.material.io/styles/color/advanced/adjust-existing-colors.
 */
const proto = MaterialDynamicColors.prototype as unknown as Record<string, () => DynamicColor>;
SCHEME_ROLES.slice(34).forEach((k, i) => {
  const f = Hct.fromInt([0x7b5a, 0xdd6d06, 0x61a4][i >> 1]!);
  proto[camel(k)] = () =>
    ({
      getArgb: (s: DynamicScheme) =>
        proto[i & 1 ? "onError" : "error"]!().getArgb({
          __proto__: s,
          errorPalette: TonalPalette.fromInt(
            Hct.from(
              f.hue + Math.max(-15, Math.min(15, (((s.variant && Hct.fromInt(s.primaryPalette.tone(40)).hue) - f.hue + 540) % 360 - 180) * 0.5)),
              f.chroma,
              f.tone,
            ).toInt(),
          ),
        } as unknown as DynamicScheme),
    }) as DynamicColor;
});

/** Resolves the six harmonised status roles (`success` through `on-info`) as ARGB integers for any scheme. */
export function statusRolesArgb(scheme: DynamicScheme, primaryArgb?: number): Record<(typeof STATUS_ROLES)[number], number> {
  const s = primaryArgb !== undefined ? ({ __proto__: scheme, primaryPalette: { tone: () => primaryArgb } } as unknown as DynamicScheme) : scheme;
  return Object.fromEntries(STATUS_ROLES.map((r) => [r, proto[camel(r)]!().getArgb(s)])) as Record<(typeof STATUS_ROLES)[number], number>;
}
