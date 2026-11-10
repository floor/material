// test/token-catalogue/catalogue.test.ts
//
// The catalogue generator's honesty gates, driven without a build: a fixture
// stylesheet is derived from the independent ledger (expected.ts) — never from
// production output — and fed through the real inventory and the real
// generator. The fixture passing is the generator accepting outputs that match
// the ledger; each mutation below is a way a dishonest catalogue could otherwise
// be produced, and each must fail generation instead.
import { describe, expect, test } from "bun:test";
import { buildInventory, type OutputFile } from "../../scripts/token-catalogue/inventory";
import { shapeScale, typescale, typefaceDefault } from "../../scripts/token-catalogue/expected";
import { UNCONSUMED_STEPS } from "../../scripts/token-catalogue/rows";
import { catalogueSchema, validateAgainst, type Json } from "../../scripts/token-catalogue/schema";
import { buildCatalogue, projectLean, renderCatalogue, renderFullCatalogue, valueMatches } from "../../scripts/generate-token-catalogue";
import { REASONS } from "../../scripts/token-catalogue/types";
import type { Catalogue } from "../../scripts/token-catalogue/types";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";

/** The fixture's :root declarations: exactly the ledger's expected values. */
const rootDeclarations = [
  ...Object.entries(shapeScale).map(([step, value]) =>
    `--mtrl-sys-shape-corner-${step}:${"fullyRounded" in value ? "9999px" : `${value.dp}px`}`),
  `--mtrl-ref-typeface-brand:${typefaceDefault}`,
  `--mtrl-ref-typeface-plain:${typefaceDefault}`,
  ...Object.entries(typescale).flatMap(([role, entry]) => [
    `--mtrl-sys-typescale-${role}-font:var(--mtrl-ref-typeface-${entry.face})`,
    `--mtrl-sys-typescale-${role}-font-size:${entry.size}px`,
    `--mtrl-sys-typescale-${role}-line-height:${entry.lineHeight}px`,
    `--mtrl-sys-typescale-${role}-letter-spacing:${entry.tracking}px`,
    `--mtrl-sys-typescale-${role}-font-weight:${entry.weight}`,
  ]),
].join(";");

/** One consumer rule per consumed step, so the attribution citation is true. */
const consumerRules = Object.keys(shapeScale)
  .filter(step => !UNCONSUMED_STEPS.has(step))
  .map(step => `.mtrl-probe-${step}{border-radius:var(--mtrl-sys-shape-corner-${step})}`)
  .join("\n");

const fixtureCss = `:root{${rootDeclarations}}\n${consumerRules}`;
const fixtureOutputs = (css: string = fixtureCss): OutputFile[] => [{ export: "styles.css", css }];
const catalogueOf = (css?: string): Catalogue => buildCatalogue(buildInventory(fixtureOutputs(css)), "0.0.0", COMMIT);

describe("the catalogue generator", () => {
  test("accepts a ledger-matching fixture, schema-valid and deterministic", () => {
    const catalogue = catalogueOf();
    expect(validateAgainst(JSON.parse(renderCatalogue(catalogue)) as unknown as Json, catalogueSchema() as unknown as Json)).toEqual([]);
    // 10 shape steps, 2 typefaces, 15 roles x 5 axes; every row verified.
    expect(catalogue.coverage.counts).toMatchObject({ rows: 87, verified: 87, unverified: 0, notApplicable: 0 });
    expect(catalogue.tokens.every(row => row.verification === "verified")).toBe(true);
    // Determinism covers the whole pipeline: inventory, rows, document bytes.
    const first = renderCatalogue(catalogueOf());
    expect(renderCatalogue(catalogueOf())).toBe(first);
    expect(first).toContain(`"sourceCommit": "${COMMIT}"`);
  });

  test("rejects an emitted name no classification covers", () => {
    // An uppercase segment escapes every committed pattern: nothing under the
    // prefix may be emitted unclassified, whatever it is called.
    expect(() => catalogueOf(`:root{${rootDeclarations};--mtrl-Unclassified:1px}`))
      .toThrow(/unclassified/);
  });

  test("rejects an emission that contradicts the independent expected value", () => {
    // The ledger says large is 16dp; output claiming 17px must fail the build,
    // never silently downgrade the row to unverified.
    expect(() => catalogueOf(fixtureCss.replace("--mtrl-sys-shape-corner-large:16px", "--mtrl-sys-shape-corner-large:17px")))
      .toThrow(/does not match the independent expected/);
  });

  test("rejects a fixture missing the minimum verified set", () => {
    const withoutTypefaces = `:root{${rootDeclarations.replace(`--mtrl-ref-typeface-brand:${typefaceDefault};--mtrl-ref-typeface-plain:${typefaceDefault}`, "")}}\n${consumerRules}`;
    expect(() => catalogueOf(withoutTypefaces)).toThrow(/minimum verified set is not met.*--mtrl-ref-typeface-brand/);
  });

  test("rejects an attribution citation with no consumer to attribute", () => {
    // Declarations only, no references: the shape rows still cite the
    // consumer-attribution assertion, and a mapping that does not exist is a
    // claim the row may not make — generation fails, the row is corrected.
    expect(() => catalogueOf(`:root{${rootDeclarations}}`)).toThrow(/shape\.corner\.consumer-attribution/);
  });
});

describe("valueMatches", () => {
  test("treats a bare number and its px form as one value", () => {
    expect(valueMatches("0", "0px")).toBe(true);
    expect(valueMatches("16px", "16")).toBe(true);
    expect(valueMatches("400", "400")).toBe(true);
  });
  test("everything else compares exactly", () => {
    expect(valueMatches("9999px", "9998px")).toBe(false);
    expect(valueMatches("#ffffff", "0px")).toBe(false);
    expect(valueMatches("Roboto", "Roboto, sans-serif")).toBe(false);
    expect(valueMatches("var(--mtrl-ref-typeface-brand)", "var(--mtrl-ref-typeface-brand)")).toBe(true);
  });
});

describe("the catalogue schema", () => {
  const valid = JSON.parse(renderCatalogue(catalogueOf())) as unknown as Json;
  const errorsOf = (mutate: (document: Json) => void): string[] => {
    const document = structuredClone(valid) as Json;
    mutate(document);
    return validateAgainst(document, catalogueSchema() as unknown as Json);
  };

  test("accepts its own generated document and tolerates unknown fields", () => {
    expect(validateAgainst(valid, catalogueSchema() as unknown as Json)).toEqual([]);
    expect(errorsOf(document => { (document as Record<string, unknown>).futureField = 1; })).toEqual([]);
  });

  test("rejects a misspelled verification state", () => {
    expect(errorsOf(document => {
      ((document as { tokens: Json[] }).tokens[0] as Record<string, unknown>).verification = "Verified";
    }).join("\n")).toContain("verification");
  });

  test("rejects a reason code outside the legend's closed set", () => {
    expect(errorsOf(document => {
      ((document as { tokens: Json[] }).tokens[0] as Record<string, unknown>).reason = "close-enough";
    }).join("\n")).toContain("reason");
  });

  test("rejects a row missing its reason code", () => {
    expect(errorsOf(document => {
      delete ((document as { tokens: Json[] }).tokens[0] as Record<string, unknown>).reason;
    }).join("\n")).toContain("reason");
  });

  test("rejects a misspelled source status", () => {
    expect(errorsOf(document => {
      ((document as { sources: Record<string, unknown>[] }).sources[0] as Record<string, unknown>).status = "reviwed";
    }).join("\n")).toContain("status");
  });

  test("rejects a short source commit", () => {
    expect(errorsOf(document => {
      (document as Record<string, unknown>).sourceCommit = "abc123";
    }).join("\n")).toContain("sourceCommit");
  });

  test("rejects a gap that claims emissions", () => {
    expect(errorsOf(document => {
      ((document as { gaps: Record<string, unknown>[] }).gaps[0] as Record<string, unknown>).emissions = ["styles.css"];
    }).join("\n")).toMatch(/gaps\[0\]\.emissions/);
  });

  test("rejects a token row named outside the library prefix", () => {
    expect(errorsOf(document => {
      ((document as { tokens: Record<string, unknown>[] }).tokens[0] as Record<string, unknown>).cssName = "--other-library-primary";
    }).join("\n")).toContain("cssName");
  });
});

describe("the packed projection", () => {
  test("ships the mapping, states and reason codes, and no wiring", () => {
    const packed = projectLean(catalogueOf()) as unknown as Record<string, unknown>;
    expect(packed.schemaVersion).toBe(2);
    // The heavy wiring stays in the analysis document, not the tarball.
    for (const absent of ["checks", "coverage", "emissions", "emissionSummary", "consumers", "support", "supportReason", "verificationReason", "verificationEvidence", "prefix"]) {
      expect(packed).not.toHaveProperty(absent);
      for (const row of packed.tokens as Array<Record<string, unknown>>) expect(row).not.toHaveProperty(absent);
    }
    expect((packed.tokens as Array<Record<string, unknown>>)[0]).not.toHaveProperty("id");
  });

  test("carries the full reason legend, and every row resolves through it", () => {
    const packed = projectLean(catalogueOf());
    expect(packed.reasons).toEqual(REASONS.map(reason => ({ ...reason })));
    const codes = new Set(packed.reasons.map(reason => reason.code));
    for (const row of packed.tokens) expect(codes.has(row.reason)).toBe(true);
  });

  test("fails generation on a verification reason outside the closed set", () => {
    const bogus = catalogueOf();
    (bogus.tokens[0] as { verificationReason: string }).verificationReason = "an unreviewed sentence";
    expect(() => projectLean(bogus)).toThrow(/no stable code/);
  });

  test("keeps the full wiring in the analysis document", () => {
    const full = JSON.parse(renderFullCatalogue(catalogueOf())) as { tokens: Array<Record<string, unknown>> };
    expect(full.tokens.every(row => Array.isArray(row.emissions) && "consumers" in row)).toBe(true);
    const verified = full.tokens.find(row => row.verification === "verified")!;
    expect(verified.verificationEvidence).toBeDefined();
  });
});
