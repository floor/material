import { relative, resolve, sep } from "node:path";

/** Dist-relative output paths and the repository source files used to emit them. */
export type CatalogueInputGraph = Map<string, Set<string>>;

export function recordCatalogueInputs(graph: CatalogueInputGraph, output: string, inputs: Iterable<string>): void {
  const sources = graph.get(output) ?? new Set<string>();
  for (const input of inputs) {
    const source = relative(process.cwd(), resolve(input)).split(sep).join("/");
    if (source.startsWith("src/")) sources.add(source);
  }
  if (sources.size) graph.set(output, sources);
}
