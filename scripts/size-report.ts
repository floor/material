import assert from "node:assert/strict";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FILES } from "./readme-blocks";
import { replaceReadmeSizes } from "./readme-sizes";
import { renderSizesMarkdown, type Result } from "./size";
import { renderSizeDeltas, sizeFailures, type SizeRow } from "./size-policy";
import { tableDiffs } from "./release-tables";

interface PackageMeasurements {
  rows: SizeRow[];
  sizes: Record<string, { gzip: number }>;
  package: { size: number };
}

interface ComponentMeasurements {
  rows: SizeRow[];
  results: Result[];
}

async function measurements(root: string) {
  const [pack, components] = await Promise.all([
    Bun.file(join(root, "analysis/package-size.json")).json() as Promise<PackageMeasurements>,
    Bun.file(join(root, "analysis/component-size.json")).json() as Promise<ComponentMeasurements>,
  ]);
  assert(pack.rows.length && components.rows.length, "Missing size measurements");
  return { pack, components, rows: [...pack.rows, ...components.rows] };
}

async function main() {
  const { MTRL_SIZE_BASE, MTRL_SIZE_TAG, MTRL_SIZE_RELEASE, GITHUB_EVENT_PATH, GITHUB_SHA, GITHUB_STEP_SUMMARY } = process.env;
  assert(MTRL_SIZE_BASE && MTRL_SIZE_TAG, "Supply the checkout and tag of the previous release");
  const [base, head] = await Promise.all([measurements(MTRL_SIZE_BASE), measurements(".")]);
  const event = GITHUB_EVENT_PATH ? await Bun.file(GITHUB_EVENT_PATH).json() as {
    pull_request?: { body: string | null; head: { sha: string } };
  } : {};
  const revision = event.pull_request?.head.sha ?? GITHUB_SHA;
  const pushBody = Bun.file("analysis/size-push-pr-body.txt");
  const body = event.pull_request?.body ?? (await pushBody.exists() ? await pushBody.text() : "");
  const failures = sizeFailures(base.rows, head.rows, body);
  let releaseTableDiffs: string[] = [];
  const signed = (bytes: number) => `${bytes > 0 ? "+" : ""}${bytes.toLocaleString("en-US")} B`;
  const packed = `${head.pack.package.size.toLocaleString("en-US")} B packed (${signed(head.pack.package.size - base.pack.package.size)} since ${MTRL_SIZE_TAG}).`;
  const report = ["<!-- material-ci-size-report -->", "### Package size", "", packed,
    `Head \`${revision?.slice(0, 8) ?? "local"}\`. Base release \`${MTRL_SIZE_TAG}\`.`, "",
    renderSizeDeltas(base.rows, head.rows), "", ...failures.map(line => `- ${line}`), ""].join("\n");
  await writeFile("analysis/size-report.md", report);
  if (GITHUB_STEP_SUMMARY) await appendFile(GITHUB_STEP_SUMMARY, report);
  if (MTRL_SIZE_RELEASE === "true") {
    assert(revision, "Missing release revision");
    const output = "analysis/release-sizes";
    await mkdir(output, { recursive: true });
    const measured: Record<string, string> = {
      "SIZES.md": renderSizesMarkdown(head.components.results, {
        commit: revision.slice(0, 8), date: new Date().toISOString().slice(0, 10),
      }),
    };
    for (const file of FILES) {
      measured[file] = replaceReadmeSizes(await Bun.file(file).text(), head.pack.sizes);
    }
    for (const [file, text] of Object.entries(measured)) await writeFile(join(output, file), text);
    // `release:prepare` pre-fills the tables from a local measurement; this
    // run is the gate. A committed table that differs from the measurement
    // fails the release pull request, whatever wrote it.
    const committed: Record<string, string | undefined> = {};
    for (const file of Object.keys(measured)) {
      committed[file] = await Bun.file(file).text().catch(() => undefined);
    }
    releaseTableDiffs = tableDiffs(measured, committed);
  }
  if (failures.length) {
    for (const failure of failures) console.error(failure);
    process.exitCode = 1;
  } else {
    console.log(`Size policy passed against ${MTRL_SIZE_TAG}. ${packed}`);
  }
  if (releaseTableDiffs.length) {
    console.error("The committed release size tables differ from this run's measurement:");
    for (const diff of releaseTableDiffs) console.error(`- ${diff}`);
    process.exitCode = 1;
  }
}

if (import.meta.main) await main();
