/**
 * Public selective CSS entries. Keep dependency order consistent with main.scss.
 *
 * An `optIn` entry ships as `material/styles/<name>` and nothing else: it joins
 * neither the full stylesheet nor the shared layer order, so no default asset's
 * bytes move. The catalogue still parses it like every other declared output.
 */
export const componentStyles: Record<
  string,
  {
    source: string;
    dependencies: string[];
    optIn?: boolean;
    /**
     * Modules of another component this entry may retain at runtime without
     * that component's sheet (`<name>/<path>`, no extension). Each one must be
     * a leaf that carries no styles; the build fails on any other retained
     * module under `components/<other>`, so an implementation import cannot
     * hide behind a declared leaf.
     */
    sharedLeaves?: string[];
  }
> = {
  "text-field": { source: "components/text-field", dependencies: [] },
  badge: { source: "components/badge", dependencies: [] },
  "bottom-app-bar": { source: "components/bottom-app-bar", dependencies: [] },
  "bottom-app-bar-toolbar": {
    source: "components/bottom-app-bar", dependencies: ["toolbar"], optIn: true,
    sharedLeaves: ["bottom-app-bar/config", "bottom-app-bar/constants"],
  },
  "bottom-sheet": { source: "components/bottom-sheet", dependencies: [] },
  "side-sheet": { source: "components/side-sheet", dependencies: [] },
  menu: { source: "components/menu", dependencies: [] },
  slider: { source: "components/slider", dependencies: [] },
  switch: { source: "components/switch", dependencies: [] },
  select: { source: "components/select", dependencies: ["text-field", "menu"] },
  tabs: { source: "components/tabs", dependencies: ["badge", "button"] },
  "top-app-bar": { source: "components/top-app-bar", dependencies: [] },
  button: { source: "components/button", dependencies: ["progress"] },
  "button-group": { source: "components/button-group", dependencies: ["button", "icon-button"] },
  fab: { source: "components/fab", dependencies: [] },
  "fab-menu": { source: "components/fab-menu", dependencies: ["fab", "menu"] },
  "extended-fab": { source: "components/extended-fab", dependencies: [] },
  "icon-button": { source: "components/icon-button", dependencies: [] },
  card: { source: "components/card", dependencies: ["button"] },
  carousel: { source: "components/carousel", dependencies: [] },
  checkbox: { source: "components/checkbox", dependencies: [] },
  chips: { source: "components/chips", dependencies: [] },
  dialog: { source: "components/dialog", dependencies: ["button", "divider"] },
  divider: { source: "components/divider", dependencies: [] },
  drawer: { source: "components/drawer", dependencies: [] },
  progress: { source: "components/progress", dependencies: [] },
  "loading-indicator": { source: "components/loading-indicator", dependencies: [] },
  "split-button": { source: "components/split-button", dependencies: ["menu", "button"] },
  radios: { source: "components/radios", dependencies: [] },
  datepicker: { source: "components/datepicker", dependencies: [] },
  timepicker: { source: "components/timepicker", dependencies: [] },
  search: { source: "components/search", dependencies: [] },
  snackbar: { source: "components/snackbar", dependencies: ["button", "icon-button"] },
  "navigation-bar": { source: "components/navigation-bar", dependencies: [] },
  "navigation-rail": { source: "components/navigation-rail", dependencies: [] },
  list: { source: "components/list", dependencies: [] },
  tooltip: { source: "components/tooltip", dependencies: [] },
  toolbar: { source: "components/toolbar", dependencies: ["button", "icon-button"] },
  // The lean selection popup: `material/styles/listbox` is the only sheet that
  // carries it. It is not in main.scss, so it never reaches `material/styles`.
  // It claims the root-menu registry slot so a popup and a menu never share the
  // page, but it imports that leaf only: the menu sheet stays out of its CSS.
  listbox: { source: "components/listbox", dependencies: [], optIn: true, sharedLeaves: ["menu/features/registry"] },
};

// All shipped components have selective CSS entries.
export const fullOnlyStyles: string[] = [];

// Optional factory profiles never enter the full sheet, layer order, or shadow
// stylesheet family. Each is projected from its unchanged general stylesheet.
export const optionalStyleProfiles = {
  "button-filled-small-round": { parent: "button", dependencies: ["progress"] },
};

// Themes in the full stylesheet, each also shipped as `material/themes/<name>`.
// 3.0.0 removed the material, winter, browngreen and legacy themes.
export const themeStyles = [
  "baseline", "ocean", "desert", "forest", "sunset", "spring", "summer",
  "autumn", "brownbeige", "sageivory", "tealcaramel", "highcontrast",
];

// Themes shipped only as `material/themes/<name>`, outside the full stylesheet, so
// an app pays for one only by importing it: the M3 scheme variants generated
// by scripts/generate-themes.ts. Every theme file is in exactly one
// of the two lists (test/core/theme).
export const standaloneThemes = [
  "neutral", "vibrant", "expressive", "fidelity", "content", "monochrome",
  "rainbow", "fruit-salad",
];

export const baseStyles = [
  "themes/baseline", "base/foundation", "base/reset",
  "utilities/ripple", "base/document",
];

// Element roots adopt their own ripple sheet. Keep every other full-base
// rule, including reset and system contrast, for element applications.
export const baseElementsStyles = baseStyles.filter(source => source !== "utilities/ripple");

// The opt-in theme-only base (`material/styles/base-lite`): the baseline roles
// in light and dark, the shape and typeface tokens, the global reduced-motion
// switch and the body theme, without the contrast modes, the reset, or the
// ripple. The build emits it with `$contrast-emit: none`; `base/reduced-motion`
// is the switch on its own (the reset includes the same mixin in place).
export const baseLiteStyles = [
  "themes/baseline", "base/foundation", "base/reduced-motion", "base/body-theme",
];

// Opt-in explicit contrast for the baseline theme (`material/styles/contrast`).
// Emitted in the base cascade layer, beside typography. A theme's own file is
// `material/themes/<name>-contrast`.
export const contrastStyle = "contrast";

// The type classes, text utilities, heading styles and typescale tokens that
// left the base. Emitted in the base cascade layer: see build-styles.
export const typographyStyles = [
  "base/typescale", "base/typography",
];
// What `material/styles/typography`'s module imports first, as a component's
// imports its dependencies. The sheet has to come after the base: both are in
// mtrl.base, and its `margin-bottom` on h1 to h6 and p has the specificity of
// the reset's `margin: 0`, so the later one wins.
export const typographyDependencies = ["base"];
export const utilityStyles = [
  "utilities/spacing", "utilities/visibility", "utilities/colors",
  "utilities/flexbox", "utilities/typography", "utilities/layout",
];

/** Resolve dependencies once in order; reject missing entries and cycles. */
export function resolveStyleDependencies(
  names: string[],
  manifest = componentStyles,
): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const active = new Set<string>();
  function visit(name: string) {
    if (active.has(name)) throw new Error(`CSS dependency cycle at ${name}`);
    if (visited.has(name)) return;
    if (!Object.hasOwn(manifest, name)) throw new Error(`Unknown CSS dependency: ${name}`);
    active.add(name);
    for (const dependency of manifest[name].dependencies) visit(dependency);
    active.delete(name);
    visited.add(name);
    result.push(name);
  }
  for (const name of names) visit(name);
  return result;
}
