#!/usr/bin/env bun
/**
 * scripts/check-token-catalogue.ts
 *
 * The offline gate over the generated catalogue, run in CI where the built
 * dist is present. It re-derives everything it can: the shipped catalogue
 * must be byte-identical to a regeneration from the committed inputs (no
 * staleness, no hand edits), generation must be deterministic, the inventory
 * must cover every CSS file in the package with nothing undeclared, the
 * document must validate against its own schema with exact enums, and every
 * verified row must cite a retained source and at least one assertion from
 * the check registry. Finally the packed tarball is read the way a consumer
 * sees it: the data files ship, resolve through the package exports, and carry
 * the exact bytes validated here. A catalogue that cannot prove these things
 * fails the build; nothing downgrades silently.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { buildInventory } from "./token-catalogue/inventory";
import { readOutputs, outputsComplete } from "./token-catalogue/outputs";
import { sources } from "./token-catalogue/sources";
import { checks } from "./token-catalogue/checks";
import { minimumVerified } from "./token-catalogue/rows";
import { catalogueSchema, validateAgainst, type Json } from "./token-catalogue/schema";
import { createPackageFixture } from "./package-fixture";
import {
  buildCatalogue, renderCatalogue, inputsDigest, INPUT_FILES,
} from "./generate-token-catalogue";
import type { PackedCatalogue } from "./token-catalogue/types";

const problems: string[] = [];
const fail = (message: string): void => {
  problems.push(message);
};

const outdir = process.argv[2] ?? "dist";
const sourceCommit = process.env.MTRL_CATALOGUE_COMMIT;
if (!sourceCommit || !/^[0-9a-f]{40}$/.test(sourceCommit)) {
  fail("MTRL_CATALOGUE_COMMIT must carry the exact full SHA the dist was built from; without it a stale catalogue cannot be told apart from a fresh one");
}

// 1. Coverage: every shipped CSS file is declared, every declared file exists.
for (const problem of outputsComplete(outdir)) fail(problem);

// 2. Regenerate from the committed inputs; the shipped document must match.
// The shipped catalogue is the lean projection; `full` below is the same
// generation with its wiring intact, which is what the row-level honesty
// assertions read — the shipped document is held to its schema and digests.
const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };
const inventory = buildInventory(readOutputs(outdir));
const full = buildCatalogue(inventory, pkg.version, sourceCommit ?? "0".repeat(40));
const regenerated = renderCatalogue(full);
const shippedPath = join(outdir, "tokens/catalogue.json");
if (!existsSync(shippedPath)) {
  fail(`${shippedPath} is missing: the build did not generate the catalogue`);
} else {
  const shipped = readFileSync(shippedPath, "utf8");
  if (shipped !== regenerated) {
    fail("the shipped catalogue.json is not what the committed inputs generate (stale or hand-edited); regenerate it with the same build inputs and commit");
  }
  const schemaPath = join(outdir, "tokens/catalogue.schema.json");
  if (!existsSync(schemaPath)) {
    fail(`${schemaPath} is missing`);
  } else if (readFileSync(schemaPath, "utf8") !== `${JSON.stringify(catalogueSchema(), null, 1)}\n`) {
    fail("the shipped catalogue.schema.json differs from the schema the generator emits");
  }

  // 3. Determinism: the same inputs and commit produce identical bytes.
  const again = renderCatalogue(buildCatalogue(buildInventory(readOutputs(outdir)), pkg.version, sourceCommit ?? "0".repeat(40)));
  if (again !== regenerated) fail("catalogue generation is not deterministic: the same inputs produced different bytes");

  // 4. Strict schema validation, exact enums.
  const document = JSON.parse(shipped) as PackedCatalogue;
  const failures = validateAgainst(document as unknown as Json, catalogueSchema() as unknown as Json);
  if (failures.length) fail(`the catalogue does not validate against its own schema:\n${failures.join("\n")}`);

  const sourceIds = new Set(sources.map(source => source.id));
  const checkIds = new Set(checks.map(check => check.id));
  const verifiedNames = document.tokens.filter(row => row.verification === "verified").map(row => row.cssName);

  // 5. Verified rows prove themselves: retained source, registered assertions.
  for (const row of full.tokens) {
    if (row.verification !== "verified") continue;
    if (!row.source || !sourceIds.has(row.source)) fail(`${row.id}: verified without a retained source`);
    if (!row.verificationEvidence?.assertions.length) fail(`${row.id}: verified without assertions from the check registry`);
    for (const assertion of row.verificationEvidence?.assertions ?? []) {
      if (!checkIds.has(assertion)) fail(`${row.id}: cites unknown assertion ${assertion}`);
    }
    if (row.support !== "supported") fail(`${row.id}: verified but not supported — the states disagree`);
    if (!row.emissions.length) fail(`${row.id}: verified with no emission context — the mapping it claims verified was never emitted`);
  }

  // 6. The minimum verified set, re-derived from the document itself.
  const missing = [...minimumVerified.shape, ...minimumVerified.typefaces, ...minimumVerified.typescale]
    .filter(name => !verifiedNames.includes(name));
  if (missing.length) fail(`the minimum verified set is not met by the shipped document: ${missing.join(", ")}`);

  // 7. Honest denominators: the coverage counts match the inventory.
  const counts = full.coverage.counts;
  const recount = {
    rows: document.tokens.length,
    verified: document.tokens.filter(row => row.verification === "verified").length,
    unverified: document.tokens.filter(row => row.verification === "unverified").length,
    notApplicable: document.tokens.filter(row => row.verification === "not-applicable").length,
    gaps: document.gaps.length,
  };
  for (const key of Object.keys(recount) as Array<keyof typeof recount>) {
    if (counts[key] !== recount[key]) fail(`coverage.counts.${key} says ${counts[key]}, the document holds ${recount[key]}`);
  }
  if (counts.rows !== inventory.declaredNames.length + inventory.external.size) {
    fail(`coverage.counts.rows says ${counts.rows}, the inventory holds ${inventory.declaredNames.length} declared and ${inventory.external.size} consumer-provided names`);
  }
  if (full.coverage.declarations !== inventory.declarationCount) fail("coverage.declarations does not match the parsed inventory");
  if (full.coverage.references !== inventory.referenceCount) fail("coverage.references does not match the parsed inventory");

  // 8. Every emitted row maps to a name the inventory saw, and vice versa.
  const names = new Set(document.tokens.map(row => row.cssName));
  for (const name of [...inventory.declaredNames, ...inventory.external.keys()]) {
    if (!names.has(name)) fail(`${name}: in the built outputs but absent from the catalogue`);
  }
  for (const row of document.tokens) {
    if (inventory.emissions.has(row.cssName) || inventory.external.has(row.cssName)) continue;
    fail(`${row.cssName}: in the catalogue but not in the built outputs`);
  }

  // 9. Gap rows emit nothing and cite retained sources.
  for (const gap of document.gaps) {
    if (gap.emissions.length) fail(`${gap.id}: a gap cannot emit`);
    if (gap.source && !sourceIds.has(gap.source)) fail(`${gap.id}: cites unknown source ${gap.source}`);
  }

  // 10. The digests identify the inputs and the built CSS the claims cover.
  if (document.sourceCommit !== sourceCommit) {
    fail(`the catalogue records source commit ${document.sourceCommit} but was checked against ${sourceCommit}`);
  }
  if (document.emissionsDigest !== inventory.digest) {
    fail("the emissions digest does not match the built CSS being checked — the catalogue was generated from different outputs");
  }
  if (document.inputsDigest !== inputsDigest()) {
    fail(`the catalogue records an inputs digest for other committed input files (${INPUT_FILES.join(", ")}) — the tree being checked is not the tree it was generated from`);
  }

  // 11. The packed consumer: the tarball ships the data, the exports resolve
  // it by specifier, and the bytes a consumer reads are the bytes validated
  // here. The identity gate allowlists additions, so it alone could not catch
  // a catalogue that fails to ship at all; this closes that.
  const fixture = await createPackageFixture();
  try {
    const packed = new Set<string>(fixture.pack.files.map((file: { path: string }) => file.path));
    for (const member of ["dist/tokens/catalogue.json", "dist/tokens/catalogue.schema.json"]) {
      if (!packed.has(member)) fail(`${member} is not in the packed tarball: the exports point at data that would not ship`);
    }
    for (const specifier of ["material/tokens/catalogue.json", "material/tokens/catalogue.schema.json"]) {
      const resolved = Bun.resolveSync(specifier, fixture.directory);
      const expected = join(outdir, specifier.endsWith("schema.json") ? "tokens/catalogue.schema.json" : "tokens/catalogue.json");
      if (readFileSync(resolved, "utf8") !== readFileSync(expected, "utf8")) {
        fail(`${specifier} resolves to ${resolved}, whose bytes differ from ${expected}: a consumer would read different data than this check validated`);
      }
    }
  } finally {
    await fixture.cleanup();
  }
}

if (problems.length) {
  console.error(`token catalogue check failed (${problems.length} problem(s)):`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(`token catalogue check passed: ${readOutputs(outdir).length} outputs, ${inventory.declaredNames.length} declared names, ${inventory.external.size} consumer-provided`);
