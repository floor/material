import assert from "node:assert/strict";
import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { FILES } from "./readme-blocks";
import { replaceReadmeSizes } from "./readme-sizes";
import { renderSizesMarkdown, type Result } from "./size";
import { renderSizeDeltas, sizeFailures, type SizeRow } from "./size-policy";

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
    await writeFile(join(output, "SIZES.md"), renderSizesMarkdown(head.components.results, {
      commit: revision.slice(0, 8), date: new Date().toISOString().slice(0, 10),
    }));
    for (const file of FILES) {
      const text = await Bun.file(file).text();
      await writeFile(join(output, file), replaceReadmeSizes(text, head.pack.sizes));
    }
  }
  if (failures.length) {
    for (const failure of failures) console.error(failure);
    process.exitCode = 1;
  } else {
    console.log(`Size policy passed against ${MTRL_SIZE_TAG}. ${packed}`);
  }
}

if (import.meta.main) await main();
