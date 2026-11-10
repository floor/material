#!/usr/bin/env bun
/**
 * scripts/generate-token-catalogue.ts
 *
 * Renders the versioned token catalogue: the reviewed source ledger and the
 * committed classification merged with the parsed inventory of the built CSS
 * outputs into deterministic JSON, a JSON Schema, and two generated views
 * (the complete inventory and the verified-only table). No wall clock, no
 * network, no runtime code: the same inputs and the same source commit
 * produce byte-identical output.
 *
 * Provenance rule (the commit-SHA cycle): the catalogue is generated while
 * packing, from a named implementation commit supplied by the build; nothing
 * generated is committed. The reviewed inputs carry their own digest, and CI
 * attests that the inputs match the reviewed head.
 *
 * Verification is reviewed data, not scraped: a row may claim `verified` only
 * when its committed classification names a ledger source and an independent
 * expected value, and the emitted mapping matches that expectation in every
 * emission context. A mismatch is a build error — it is never silently
 * downgraded to unverified — and the browser probe must still prove every
 * verified claim on the built inputs before CI is green.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildInventory, type Inventory } from "./token-catalogue/inventory";
import { readOutputs } from "./token-catalogue/outputs";
import { sources } from "./token-catalogue/sources";
import { checks } from "./token-catalogue/checks";
import { classify, consumerProvidedInput, minimumVerified } from "./token-catalogue/rows";
import { gaps } from "./token-catalogue/gaps";
import { sha256 } from "./token-catalogue/css";
import { catalogueSchema } from "./token-catalogue/schema";
import type { Catalogue, Emission, TokenRow } from "./token-catalogue/types";

/** The committed input files whose contents the inputs digest covers. */
export const INPUT_FILES = [
  "types.ts", "sources.ts", "expected.ts", "rows.ts", "checks.ts", "gaps.ts", "outputs.ts", "inventory.ts", "css.ts",
];

/** sha256 over the committed input files — the reviewed-inputs identity. */
export const inputsDigest = (): string =>
  sha256(INPUT_FILES.map(name => `${name}\n${readFileSync(join(dirname(fileURLToPath(import.meta.url)), "token-catalogue", name), "utf8")}`).join("\n\u0000\n"));

/** A number when both sides are one (`0` and `0px` are the same value). */
const asNumber = (value: string): number | null => {
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  const length = /^(-?\d+(?:\.\d+)?)px$/.exec(value);
  return length ? Number(length[1]) : null;
};

/** Does an emitted value match the independent expectation for this row? */
export function valueMatches(emitted: string, expected: string): boolean {
  if (emitted === expected) return true;
  const left = asNumber(emitted);
  const right = asNumber(expected);
  return left !== null && right !== null && left === right;
}

/** The stable row ID for one cssName, under its classification. */
const rowId = (cssName: string, group: string): string => {
  const rest = cssName.replace(/^--mtrl-/, "");
  if (group === "component-hook") return `library-hook-${rest}`;
  if (group === "consumer-provided") return `library-consumer-${rest}`;
  if (group === "density") return "library-density";
  return rest;
};

const buildRow = (
  cssName: string,
  input: NonNullable<ReturnType<typeof classify>>,
  inventory: Inventory,
): TokenRow => {
  const emissions = inventory.emissions.get(cssName) ?? [];
  // Only the two small verified families enumerate their emission contexts —
  // their per-context match is the verification story. Every other group
  // (colour, typescale, state, density, library hooks) carries an honest
  // summary with its denominators: counts plus bounded value samples, the
  // complete inventory staying in the build, not the shipped document.
  const summarized = input.group !== "shape" && input.group !== "typeface";
  const distinctSelectors = [...new Set(emissions.map(emission => emission.selector))].sort();
  const distinctValues = [...new Set(emissions.map(emission => emission.value))].sort();

  if (input.verification === "verified") {
    if (!input.source) throw new Error(`${cssName}: a verified row must cite a ledger source`);
    if (typeof input.expected !== "string") throw new Error(`${cssName}: a verified row must carry an independent expected value`);
    for (const emission of emissions) {
      if (!valueMatches(emission.value, input.expected)) {
        throw new Error(
          `${cssName}: emitted ${emission.value} in ${emission.export} (${emission.selector}) does not match the independent expected ${input.expected}; ` +
          "correct the source read or record the mismatch as unverified with evidence — do not regenerate the expectation from output",
        );
      }
    }
  }

  const row: TokenRow = {
    id: rowId(cssName, input.group),
    family: input.family,
    group: input.group,
    cssName,
    prefix: "mtrl",
    m3Id: input.m3Id ?? null,
    source: input.source ?? null,
    emissions: summarized ? [] : emissions,
    consumers: inventory.consumers.get(cssName) ?? { kind: "declaration-only", selectors: [], exports: [] },
    support: input.support,
    supportReason: input.supportReason,
    verification: input.verification,
    verificationReason: input.verificationReason,
    checks: input.assertions ?? [],
  };
  if (input.introduced != null) row.lifecycle = { introduced: input.introduced, deprecated: null, replacedBy: null };
  if (summarized) {
    row.emissionSummary = {
      surfaces: [...new Set(emissions.map(emission => emission.export))].length,
      selectors: distinctSelectors.length,
      values: distinctValues.length,
      valueSamples: distinctValues.slice(0, 4),
    };
  }
  if (input.verification === "verified") {
    const surfaces = [...new Set(emissions.map(emission => emission.export))].length;
    row.verificationEvidence = {
      source: input.source!,
      mapping: "matched",
      assertions: input.assertions ?? [],
      statement: `source ${input.source}, read on its ledger date; emitted mapping matched in all ${emissions.length} emission context(s) on ${surfaces} surface(s)`,
    };
  }
  return row;
};

/** Build the catalogue document from an inventory. */
export function buildCatalogue(
  inventory: Inventory,
  packageVersion: string,
  sourceCommit: string,
): Catalogue {
  const rows: TokenRow[] = [];
  for (const cssName of inventory.declaredNames) {
    const input = classify(cssName);
    if (!input) throw new Error(`${cssName}: emitted but unclassified — add a classification or an exclusion, never let output pass uncategorized`);
    rows.push(buildRow(cssName, input, inventory));
  }
  for (const cssName of [...inventory.external.keys()].sort()) {
    const emissionsReferenced: Emission[] = [];
    const row = buildRow(cssName, { match: cssName, ...consumerProvidedInput }, {
      ...inventory,
      emissions: new Map([[cssName, emissionsReferenced]]),
    });
    row.consumers = { kind: "consumer-provided", selectors: inventory.external.get(cssName)!.selectors, exports: inventory.external.get(cssName)!.exports };
    rows.push(row);
  }
  rows.sort((a, b) => a.id.localeCompare(b.id));

  const ids = rows.map(row => row.id);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) throw new Error(`duplicate row id ${duplicate}`);

  const sourceIds = new Set(sources.map(source => source.id));
  const checkIds = new Set(checks.map(check => check.id));
  for (const row of rows) {
    if (row.source && !sourceIds.has(row.source)) throw new Error(`${row.id}: cites unknown source ${row.source}`);
    for (const check of row.checks) if (!checkIds.has(check)) throw new Error(`${row.id}: cites unknown check ${check}`);
    // A consumer claim must have a consumer: if a refactor removes the last
    // reference to a step, this row's citation becomes a lie and generation
    // fails — the row is corrected, never the gate.
    if (row.group === "shape" && row.checks.includes("shape.corner.consumer-attribution") && !inventory.consumers.has(row.cssName)) {
      throw new Error(`${row.id}: cites shape.corner.consumer-attribution but nothing in the outputs references it`);
    }
  }
  for (const gap of gaps) {
    if (gap.emissions.length !== 0) throw new Error(`${gap.id}: a gap emits nothing`);
    if (gap.source && !sourceIds.has(gap.source)) throw new Error(`${gap.id}: cites unknown source ${gap.source}`);
  }

  const verified = rows.filter(row => row.verification === "verified").map(row => row.cssName);
  const required = [...minimumVerified.shape, ...minimumVerified.typefaces, ...minimumVerified.typescale];
  const missing = required.filter(name => !verified.includes(name));
  if (missing.length) {
    throw new Error(`the minimum verified set is not met: ${missing.join(", ")} — the catalogue cannot publish without it`);
  }

  return {
    schemaVersion: 1,
    catalogueRevision: 1,
    packageVersion,
    sourceCommit,
    inputsDigest: inputsDigest(),
    emissionsDigest: inventory.digest,
    sources: sources.map(source => ({ ...source, digestSha256: sha256(source.digest) })),
    checks,
    coverage: {
      outputs: inventory.files,
      declarations: inventory.declarationCount,
      references: inventory.referenceCount,
      externalReferences: [...inventory.external.keys()],
      exclusions: [],
      counts: {
        rows: rows.length,
        verified: verified.length,
        unverified: rows.filter(row => row.verification === "unverified").length,
        notApplicable: rows.filter(row => row.verification === "not-applicable").length,
        gaps: gaps.length,
      },
    },
    tokens: rows,
    gaps,
  };
}

/** The generated catalogue as the exact bytes written to disk. */
export function renderCatalogue(catalogue: Catalogue): string {
  return `${JSON.stringify(catalogue, null, 1)}\n`;
}

/** The verified-only view: every verified claim with its statement. */
export function renderVerifiedView(catalogue: Catalogue): string {
  const lines = [
    "# Verified tokens",
    "",
    `Generated from the token catalogue. Every row below cites a retained Material`,
    `source digest with its read date, an emitted mapping that matched in every`,
    `emission context, and assertions the CI browser probe runs on the built`,
    `stylesheets. Verification means: verified against that source generation,`,
    `read on that date — nothing stronger. ${catalogue.coverage.counts.verified} of`,
    `${catalogue.coverage.counts.rows} rows are verified; the complete inventory,`,
    `including every unverified and not-applicable row, is in catalogue.json and`,
    `catalogue.md.`,
    "",
    "| Token | Expected | Source | Read | Assertions |",
    "| --- | --- | --- | --- | --- |",
  ];
  const bySource = new Map(catalogue.sources.map(source => [source.id, source]));
  for (const row of catalogue.tokens) {
    if (row.verification !== "verified") continue;
    const source = bySource.get(row.verificationEvidence!.source);
    // Summarized verified rows carry their emitted value as a sample; every
    // verified row has exactly one distinct value, so the sample is the match.
    const expected = row.emissionSummary?.valueSamples[0] ?? row.emissions[0]?.value ?? "";
    lines.push(`| \`${row.cssName}\` | \`${expected}\` | ${source?.id ?? ""} | ${source?.readDate ?? ""} | ${row.checks.join(", ")} |`);
  }
  return `${lines.join("\n")}\n`;
}

/** The complete view: every row with its status, visible with its reason. */
export function renderCompleteView(catalogue: Catalogue): string {
  const lines = [
    "# Token catalogue",
    "",
    `Generated from the built stylesheets. ${catalogue.coverage.counts.rows} token rows`,
    `(${catalogue.coverage.counts.verified} verified, ${catalogue.coverage.counts.unverified} unverified,`,
    `${catalogue.coverage.counts.notApplicable} not applicable) and ${catalogue.coverage.counts.gaps} gaps,`,
    `over ${catalogue.coverage.outputs.length} CSS outputs: ${catalogue.coverage.declarations} declarations`,
    `and ${catalogue.coverage.references} references, every one resolved to a row or a recorded`,
    `consumer-provided entry. Verification states are honest: unverified rows say why.`,
    "",
    "| Token | Family | Support | Verification | Reason |",
    "| --- | --- | --- | --- | --- |",
  ];
  for (const row of catalogue.tokens) {
    lines.push(`| \`${row.cssName}\` | ${row.family}/${row.group} | ${row.support} | ${row.verification} | ${row.verificationReason} |`);
  }
  lines.push("", "## Gaps", "", "| Candidate | Reason |", "| --- | --- |");
  for (const gap of catalogue.gaps) lines.push(`| ${gap.m3Id ?? gap.id} | ${gap.supportReason} |`);
  return `${lines.join("\n")}\n`;
}

/**
 * Generate the catalogue. The packed artefacts are `catalogue.json` and
 * `catalogue.schema.json` in `<outdir>/tokens`; the two markdown views are
 * review surfaces, not data — `viewsDir` (the CI analysis upload) receives
 * them when given, otherwise they land beside the JSON for local inspection
 * and never cost the tarball a byte.
 */
export async function generateTokenCatalogue(
  outdir: string,
  packageVersion: string,
  viewsDir?: string,
): Promise<{ raw: number; gzip: number }> {
  const inventory = buildInventory(readOutputs(outdir));
  const sourceCommit = process.env.MTRL_CATALOGUE_COMMIT
    ?? (await Bun.$`git rev-parse HEAD`.text()).trim();
  if (!/^[0-9a-f]{40}$/.test(sourceCommit)) throw new Error(`source commit ${sourceCommit} is not a full SHA`);
  const catalogue = buildCatalogue(inventory, packageVersion, sourceCommit);
  const document = renderCatalogue(catalogue);
  const target = `${outdir}/tokens`;
  const views = viewsDir ?? target;
  await Bun.$`mkdir -p ${target} ${views}`;
  await Bun.write(`${target}/catalogue.json`, document);
  await Bun.write(`${target}/catalogue.schema.json`, `${JSON.stringify(catalogueSchema(), null, 1)}\n`);
  await Bun.write(`${views}/catalogue.md`, renderCompleteView(catalogue));
  await Bun.write(`${views}/verified.md`, renderVerifiedView(catalogue));
  const gzip = Bun.gzipSync(new Uint8Array(await Bun.file(`${target}/catalogue.json`).bytes()));
  return { raw: document.length, gzip: gzip.length };
}

if (import.meta.main) {
  const outdir = process.argv[2] ?? "dist";
  const pkg = await Bun.file("package.json").json();
  const sizes = await generateTokenCatalogue(outdir, pkg.version);
  console.log(`token catalogue: ${sizes.raw} B raw, ${sizes.gzip} B gzip -> ${outdir}/tokens/`);
}
