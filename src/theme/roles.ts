// src/theme/roles.ts
/**
 * The role table a runtime scheme writes: the roles the stylesheet reads.
 *
 * The theme partials declare 46 roles, but twelve of them — the `*-fixed*`
 * family — are never read outside those declarations:
 *
 *   grep -rn 'fixed' src --include='*.ts' --include='*.scss' \
 *     | grep -v 'src/styles/themes/' | grep -ci 'sys-color'   # 0
 *
 * No component, base or utility style reads one, so {@link applyScheme} leaves
 * them at the Sass theme's value and spends nothing on them. Everything else
 * Material Dynamic Colors computes — 34 roles — is written.
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
] as const;
