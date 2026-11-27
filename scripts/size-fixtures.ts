import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import type { SizeRow } from "./size-policy";

/** The error text reached only through the 2025 colour spec entry. */
const SPEC_2025_MARKER = "Attempting to extend color";

export async function measureConsumerSizes(directory: string) {
  const { build } = await import("vite");
  // Library mode retains exports for measurement; an HTML fixture below tests
  // actual application mode, CSS extraction, network loading, and rendering.
  const rows: SizeRow[] = [];
  const sizes: Record<string, { initialGzip: number; totalGzip: number }> = {};
  for (const [name, code] of [
    ["addClass", "export { addClass } from 'material/core/dom';"],
    ["text-field", "export { createTextField } from 'material';"],
    ["button", "export { createButton } from 'material';"],
    // Runtime colour: the scheme alone, and the scheme with the image path a
    // page also asks for when its source colour comes from an image.
    ["theme", "export { createScheme, applyScheme } from 'material/theme';"],
    ["theme-image", "export { createScheme, applyScheme } from 'material/theme';\nexport { sourceColorFromImage } from 'material/theme/image';"],
    // The opt-in 2025 colour spec: the same scheme, from its own entry.
    ["theme-2025", "export { createScheme, applyScheme } from 'material/theme/2025';"],
    ["theme-2025-image", "export { createScheme, applyScheme } from 'material/theme/2025';\nexport { sourceColorFromImage } from 'material/theme/image';"],
  ] as const) {
    const entry = join(directory, `${name}.ts`);
    await writeFile(entry, code);
    const result = await build({
      root: directory, configFile: false, envFile: false, logLevel: "error",
      build: { write: false, minify: true, lib: { entry, formats: ["es"] } },
    });
    assert(!("on" in result), "Unexpected Vite watcher");
    const outputs = (Array.isArray(result) ? result : [result]).flatMap(output => output.output);
    const chunks = outputs.filter(output => output.type === "chunk");
    const initial = new Set<string>();
    const visit = function visit(filename: string) {
      if (initial.has(filename)) return;
      initial.add(filename);
      const chunk = chunks.find(chunk => chunk.fileName === filename);
      assert(chunk, `Missing Vite chunk: ${filename}`);
      chunk.imports.forEach(visit);
    }
    chunks.filter(chunk => chunk.isEntry).forEach(chunk => visit(chunk.fileName));
    sizes[name] = { initialGzip: 0, totalGzip: 0 };
    for (const chunk of chunks) {
      const size = gzipSync(chunk.code, { level: 9 }).length;
      sizes[name].totalGzip += size;
      if (initial.has(chunk.fileName)) sizes[name].initialGzip += size;
    }
    rows.push({ name: `Vite ${name} initial gzip`, bytes: sizes[name].initialGzip });
    // The plain entry must not ship the 2025 spec, and the 2025 entry must: a
    // tree-shaking regression and a broken registration read the same in the
    // size row otherwise. The marker is spec_extensions.js's own error text,
    // which only the 2025 role table reaches.
    const chunkText = chunks.map(chunk => chunk.code).join("\n");
    if (name === "theme") assert(!chunkText.includes(SPEC_2025_MARKER), "the plain theme entry ships the 2025 colour spec");
    if (name === "theme-2025") assert(chunkText.includes(SPEC_2025_MARKER), "the 2025 theme entry does not ship the 2025 colour spec");
    if (name === "button") assert(chunks.some(chunk => !initial.has(chunk.fileName)), "Vite did not split lazy progress");
  }
  console.log("Vite packed-consumer sizes:");
  console.table(sizes);
  return { rows, sizes };
}

/** The source bundle injected by the slider browser check. */
export async function measureSlider() {
  const bundle = await Bun.build({ entrypoints: [resolve("src/components/slider/index.ts")], minify: true, target: "browser" });
  assert(bundle.success, String(bundle.logs));
  const js = await bundle.outputs[0].text();
  return { js, size: { raw: Buffer.byteLength(js), gzip: gzipSync(js, { level: 9 }).length } };
}
