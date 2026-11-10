/**
 * scripts/token-catalogue/types.ts
 *
 * The data contract of the versioned token catalogue: one place for every
 * shape the generator emits, the checker validates and the schema describes.
 * The Material source of the naming taxonomy (reference, system, component
 * classes; `ref`/`sys`/`comp` prefixes) is the design tokens overview,
 * scripts/token-catalogue/sources.ts `m3-tokens-overview`, read 2026-11-10.
 */

/** A reviewed Material source the ledger retains a factual digest for. */
export interface SourceRecord {
  /** Stable ID rows and checks cite. */
  id: string;
  url: string;
  /** Section label or anchor, when the page names one. */
  section: string;
  /** ISO date the retained digest was read. Not a build date. */
  readDate: string;
  /** What generation of the source was read (rendered site text, indexed text…). */
  generation: string;
  /** `read`: the digest below was read on the page that day. `context-only`: the
   * page supplied role or naming context, no exact value. `unavailable`: shell. */
  status: "read" | "context-only" | "unavailable";
  /** The retained factual digest: the exact facts relied on, nothing else. The
   * emitted hash covers this text and only this text. */
  digest: string;
}

/** How a family of emitted custom properties relates to Material's taxonomy. */
export type TokenFamily = "reference" | "system" | "library";

/** The sub-family a row belongs to, inside its Material (or library) family. */
export type TokenGroup =
  | "typeface"
  | "shape"
  | "typescale"
  | "color"
  | "state"
  | "density"
  | "component-hook"
  | "consumer-provided";

/** Support and verification are separate axes; both carry a reason. */
export type Support = "supported" | "unsupported" | "unverified";
export type Verification = "verified" | "unverified" | "not-applicable";

/** One emitted occurrence of a custom property, by public export surface. */
export interface Emission {
  /** The public export the declaration ships in (`styles.css`, `styles/base`,
   * `themes/ocean`, `elements/css/button`, `elements/preupgrade`…). */
  export: string;
  /** Selector scope of the declaration (`:root`, `.mtrl-theme-ocean`, a host). */
  selector: string;
  /** At-rule context (for example `prefers-contrast: more`), if any. */
  conditions: string[];
  /** The emitted value or expression, verbatim. */
  value: string;
}

/** What reads a token, derived from the parsed outputs, not from prose. */
export interface Consumers {
  /** `component`: a component selector reads it. `utility`: a utility class
   * does. `declaration-only`: nothing references it in the scanned outputs.
   * `consumer-provided`: referenced with a fallback, never declared in CSS. */
  kind: "component" | "utility" | "declaration-only" | "consumer-provided";
  /** Selector contexts that reference it (bounded sample, deterministic). */
  selectors: string[];
  /** Export surfaces whose rules reference it. */
  exports: string[];
}

/** A catalogue row: one stable token identity across its emission contexts. */
export interface TokenRow {
  /** Stable logical ID (`sys.shape.corner.large`). Never reused. */
  id: string;
  family: TokenFamily;
  group: TokenGroup;
  /** The exact emitted custom property name. */
  cssName: string;
  /** The prefix every emitted name derives from a source variable, not a flag. */
  prefix: string;
  /** Material's own identifier, only where a retained source shows it. */
  m3Id: string | null;
  /** Ledger source this row's Material claim rests on, if any. */
  source: string | null;
  emissions: Emission[];
  /** For rows whose emission contexts are the theme machinery (colour), the
   * contexts are summarised with their denominators instead of enumerated. */
  emissionSummary?: { surfaces: number; selectors: number; values: number; valueSamples: string[] };
  consumers: Consumers;
  support: Support;
  supportReason: string;
  verification: Verification;
  verificationReason: string;
  /** Present exactly when `verification` is `verified`. */
  verificationEvidence?: {
    source: string;
    /** `matched`: the emitted value equals the independent expectation. */
    mapping: "matched";
    /** Assertion IDs that must pass on the claimed surface. */
    assertions: string[];
    /** Honest dating: what was read, on which date, provenance of the match. */
    statement: string;
  };
  /** Assertion IDs proving claims about this row (registry: checks). */
  checks: string[];
  /** Present only when some lifecycle fact is known: all-null is omitted. */
  lifecycle?: {
    /** Package version the token first shipped in, when the history is known. */
    introduced: string | null;
    deprecated: string | null;
    replacedBy: string | null;
  };
}

/** A Material candidate the package deliberately does not emit. */
export interface GapRow {
  id: string;
  /** Material's identifier, from a retained source. */
  m3Id: string | null;
  source: string | null;
  support: "unsupported";
  supportReason: string;
  /** Empty by definition: a gap emits nothing. */
  emissions: [];
}

/** A registry assertion a row can cite; stable ID, never a line number. */
export interface CheckRecord {
  id: string;
  /** Where the assertion lives (file path, no line numbers). */
  file: string;
  /** The selector or property it asserts on. */
  scope: string;
  /** The comparison it makes. */
  rule: string;
  /** The surface/mode combination it runs on. */
  surface: string;
  /** What kind of evidence a pass of this check produces. */
  evidence: "browser-computed" | "compile-declaration" | "inventory" | "schema";
}

/** An outcome the browser probe records per assertion, machine-read back. */
export interface EvidenceRecord {
  assertion: string;
  outcome: "pass";
  /** Executed case count; zero does not qualify as a pass. */
  cases: number;
  /** sha256 of the built CSS inputs the assertion ran against. */
  inputsDigest: string;
  /** sha256 of the generated catalogue the claims were read from. */
  catalogueDigest: string;
}

/** The generated catalogue document (schema version 1). */
export interface Catalogue {
  schemaVersion: 1;
  /** Revision of the reviewed input data; a correction is a new revision. */
  catalogueRevision: number;
  packageVersion: string;
  /** Full SHA of the implementation the catalogue was generated from. */
  sourceCommit: string;
  /** sha256 over the committed input files, attested by the checks. */
  inputsDigest: string;
  /** sha256 over the normalized built CSS the inventory parsed. */
  emissionsDigest: string;
  sources: Array<SourceRecord & { digestSha256: string }>;
  checks: CheckRecord[];
  coverage: {
    /** Every output file the inventory parsed. */
    outputs: string[];
    declarations: number;
    references: number;
    /** References with no declaration anywhere: consumer-provided by design. */
    externalReferences: string[];
    exclusions: Array<{ pattern: string; reason: string }>;
    counts: {
      rows: number;
      verified: number;
      unverified: number;
      notApplicable: number;
      gaps: number;
    };
  };
  tokens: TokenRow[];
  gaps: GapRow[];
}

/** What a classification entry in the committed row data can pin down. */
export interface RowInput {
  /** An exact cssName, or the pattern a family of names shares. */
  match: string | RegExp;
  family: TokenFamily;
  group: TokenGroup;
  support: Support;
  supportReason: string;
  verification: Verification;
  verificationReason: string;
  m3Id?: string | null;
  source?: string | null;
  /** Independent expected value; verified rows must match it exactly. */
  expected?: string | ((cssName: string) => string);
  assertions?: string[];
  introduced?: string | null;
}
