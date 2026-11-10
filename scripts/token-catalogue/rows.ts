/**
 * scripts/token-catalogue/rows.ts
 *
 * The committed classification: how an emitted custom-property name becomes a
 * catalogue row — its family in Material's taxonomy (reference, system, or a
 * library-specific property that is not a Material token), its support, and
 * what its verification claim rests on. The generator turns this plus the
 * parsed inventory into the emitted rows; nothing here invents a Material
 * identifier (rows without a retained source carry `null`).
 *
 * The minimum verified set names what the catalogue must prove before it can
 * be published: the shape scale, the baseline typescale and the two reference
 * typefaces, each against the source ledger and the browser probe. Removing a
 * row from it, or marking it unverified, fails the checks.
 */
import { shapeScale, typescale, typefaceDefault, TYPE_SCALE_SOURCE, SHAPE_SOURCE } from "./expected";
import type { RowInput, TokenGroup, TokenFamily } from "./types";

const shapeSteps = Object.keys(shapeScale);
const roles = Object.keys(typescale);

/** Two scale steps no shipped component reads yet. They stay verified for
 * their emitted dp value, but citing the consumer-attribution assertion would
 * claim a mapping that does not exist, so those rows do not cite it. */
export const UNCONSUMED_STEPS = new Set(["extra-large-increased", "extra-extra-large"]);

/** The row inputs, by exact cssName where the name is knowable, else pattern. */
export const rowInputs: RowInput[] = [
  // The two reference typefaces. The page states Roboto as the default for
  // both faces and names the split by example; the library's assignment of
  // title styles to the brand face extends the page's example, and each
  // verified row's statement says so.
  {
    match: "--mtrl-ref-typeface-brand",
    family: "reference", group: "typeface",
    support: "supported", supportReason: "set once on :root; every brand-faced role follows it",
    verification: "verified",
    verificationReason: "value and role semantics read from the type-scale page",
    m3Id: null, source: TYPE_SCALE_SOURCE,
    expected: typefaceDefault,
    assertions: ["typeface.ref.defaults", "typeface.ref.override-consumption", "typeface.mixins.fallback"],
    introduced: null,
  },
  {
    match: "--mtrl-ref-typeface-plain",
    family: "reference", group: "typeface",
    support: "supported", supportReason: "set once on :root; every plain-faced role follows it",
    verification: "verified",
    verificationReason: "value and role semantics read from the type-scale page",
    m3Id: null, source: TYPE_SCALE_SOURCE,
    expected: typefaceDefault,
    assertions: ["typeface.ref.defaults", "typeface.ref.override-consumption", "typeface.mixins.fallback"],
    introduced: null,
  },
  // The corner scale. The rendered page shows the ten steps and their dp
  // values but no md.* identifiers, so m3Id stays null: the step names and
  // values are the retained fact.
  ...shapeSteps.map((step): RowInput => ({
    match: `--mtrl-sys-shape-corner-${step}`,
    family: "system" as TokenFamily, group: "shape" as TokenGroup,
    support: "supported",
    supportReason: UNCONSUMED_STEPS.has(step)
      ? "emitted on :root as part of the scale; no shipped stylesheet reads this step yet"
      : "emitted on :root and read through corner() by the components that follow the scale",
    verification: "verified",
    verificationReason:
      step === "full"
        ? "the page defines Full as fully rounded corners, no dp value; 9999px is the library's CSS realization, recorded as a transformation"
        : "the step's dp value read from the corner radius scale page, realized 1dp = 1px",
    m3Id: null, source: SHAPE_SOURCE,
    expected: step === "full" ? "9999px" : `${(shapeScale[step] as { dp: number }).dp}px`,
    assertions: UNCONSUMED_STEPS.has(step)
      ? ["shape.corner.root-defaults", "shape.scale.emitted-set"]
      : ["shape.corner.root-defaults", "shape.corner.consumer-attribution", "shape.scale.emitted-set", "tokens.render.override-response"],
    introduced: null,
  })),
  // The baseline typescale: five axes per role. The page names the baseline
  // token set (md.sys.typescale.display-large shown as the naming example);
  // per-role identifiers follow that page-stated pattern, recorded as such.
  ...roles.flatMap((role): RowInput[] => [
    {
      match: `--mtrl-sys-typescale-${role}-font`,
      family: "system", group: "typescale",
      support: "supported", supportReason: "emitted on :root and read by the role's utility class and the typography mixin",
      verification: "verified",
      verificationReason: "the role's face assignment read from the type-scale page's face guidance",
      m3Id: `md.sys.typescale.${role}.font`,
      source: TYPE_SCALE_SOURCE,
      expected: `var(--mtrl-ref-typeface-${typescale[role]!.face})`,
      assertions: ["typescale.role.root-defaults", "typescale.baseline.emitted", "typeface.ref.override-consumption"],
      introduced: null,
    },
    {
      match: `--mtrl-sys-typescale-${role}-font-size`,
      family: "system", group: "typescale",
      support: "supported", supportReason: "emitted on :root and read by the role's utility class",
      verification: "verified", verificationReason: "the role's size read from the expanded token module",
      m3Id: `md.sys.typescale.${role}.font-size`,
      source: TYPE_SCALE_SOURCE,
      expected: `${typescale[role]!.size}px`,
      assertions: ["typescale.role.root-defaults", "typescale.role.override-consumption", "typescale.baseline.emitted"],
      introduced: null,
    },
    {
      match: `--mtrl-sys-typescale-${role}-line-height`,
      family: "system", group: "typescale",
      support: "supported", supportReason: "emitted on :root and read by the role's utility class",
      verification: "verified", verificationReason: "the role's line height read from the expanded token module",
      m3Id: `md.sys.typescale.${role}.line-height`,
      source: TYPE_SCALE_SOURCE,
      expected: `${typescale[role]!.lineHeight}px`,
      assertions: ["typescale.role.root-defaults", "typescale.baseline.emitted"],
      introduced: null,
    },
    {
      match: `--mtrl-sys-typescale-${role}-letter-spacing`,
      family: "system", group: "typescale",
      support: "supported", supportReason: "emitted on :root (full set) and read by the role's utility class",
      verification: "verified", verificationReason: "the role's tracking read from the expanded token module",
      m3Id: `md.sys.typescale.${role}.letter-spacing`,
      source: TYPE_SCALE_SOURCE,
      expected: `${typescale[role]!.tracking}px`,
      assertions: ["typescale.role.root-defaults", "typescale.baseline.emitted"],
      introduced: null,
    },
    {
      match: `--mtrl-sys-typescale-${role}-font-weight`,
      family: "system", group: "typescale",
      support: "supported", supportReason: "emitted on :root (full set) and read by the role's utility class",
      verification: "verified", verificationReason: "the role's weight read from the expanded token module",
      m3Id: `md.sys.typescale.${role}.font-weight`,
      source: TYPE_SCALE_SOURCE,
      expected: String(typescale[role]!.weight),
      assertions: ["typescale.role.root-defaults", "typescale.baseline.emitted"],
      introduced: null,
    },
  ]),
  // Colour roles: emitted per theme and mode. The color page states roles and
  // pairing semantics, not universal values, so the rows carry the context and
  // stay unverified — never a claim of exact canonical hex values.
  {
    match: /^--mtrl-sys-color-[a-z-]+$/,
    family: "system", group: "color",
    support: "supported", supportReason: "emitted per theme, mode and contrast context and read across the components",
    verification: "unverified",
    verificationReason:
      "role semantics retained from the color system page (context-only source); values are generated per theme, so no universal value is claimed and none is verified",
    source: "m3-color-roles",
    introduced: null,
  },
  // State layers: emitted opacities, no same-day source read for their values.
  {
    match: /^--mtrl-sys-state-[a-z-]+$/,
    family: "system", group: "state",
    support: "supported", supportReason: "emitted and read by the state-layer mixins",
    verification: "unverified",
    verificationReason: "no specification page for the state-layer opacities has been read; recorded emitted, not verified",
    source: null,
    introduced: null,
  },
  // The library's own density property: registered so it stays an integer as
  // it inherits. Explicitly library, not a Material token.
  {
    match: "--mtrl-density",
    family: "library", group: "density",
    support: "supported", supportReason: "set by the density classes and the components that opt in, read through f.density",
    verification: "not-applicable",
    verificationReason: "library-internal property; no Material claim is made about it",
    source: null,
    introduced: null,
  },
  // Everything else the library emits under its prefix: component-private
  // hooks and animation coordinates. Naming does not make them Material
  // tokens; they stay visible with their reason.
  {
    match: /^--mtrl-[a-z0-9-]+$/,
    family: "library", group: "component-hook",
    support: "supported", supportReason: "a library-specific override hook emitted by a component sheet",
    verification: "not-applicable",
    verificationReason: "library-internal property; no Material claim is made about it",
    source: null,
    introduced: null,
  },
];

/** Classification for consumer-provided references (declared nowhere). */
export const consumerProvidedInput: Omit<RowInput, "match"> = {
  family: "library",
  group: "consumer-provided",
  support: "supported",
  supportReason:
    "referenced with a fallback and set at runtime — by the component's JavaScript or by the application — and never declared in a stylesheet",
  verification: "not-applicable",
  verificationReason: "library-specific property provided at runtime; no Material claim is made about it",
  source: null,
};

/** The named minimum verified set: the catalogue's acceptance core. */
export const minimumVerified = {
  shape: shapeSteps.map(step => `--mtrl-sys-shape-corner-${step}`),
  typefaces: ["--mtrl-ref-typeface-brand", "--mtrl-ref-typeface-plain"],
  typescale: roles.flatMap(role => [
    `--mtrl-sys-typescale-${role}-font`,
    `--mtrl-sys-typescale-${role}-font-size`,
    `--mtrl-sys-typescale-${role}-line-height`,
    `--mtrl-sys-typescale-${role}-letter-spacing`,
    `--mtrl-sys-typescale-${role}-font-weight`,
  ]),
};

/** Match one cssName against the committed classification, first hit wins. */
export function classify(cssName: string): RowInput | null {
  for (const input of rowInputs) {
    if (input.match instanceof RegExp ? input.match.test(cssName) : input.match === cssName) return input;
  }
  return null;
}
