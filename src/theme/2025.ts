// src/theme/2025.ts
/**
 * `material/theme/2025`: the 2025 colour spec as a deliberate entry.
 *
 * The same API as `material/theme`, with a `spec` option on `createScheme`,
 * each factory and `createSchemeByName`; the default is `"2021"` everywhere,
 * so importing this entry changes no output until a call asks for `"2025"`.
 * A page that imports only `material/theme` carries none of the 2025 code.
 *
 * @module theme/2025
 */

export {
  content,
  createScheme,
  createSchemeByName,
  expressive,
  fidelity,
  Hct,
  monochrome,
  neutral,
  tonalSpot,
  vibrant,
  type DynamicScheme,
  type Spec2025Factory,
  type Spec2025NamedOptions,
  type Spec2025Options,
  type SpecVersion,
  type ThemeVariant,
} from "./spec2025";
export { applyScheme, type ApplyOptions } from "./index";
