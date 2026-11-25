#!/usr/bin/env bun
// scripts/serve-test-pages.ts — the component test pages' one command.
//
// Serves the built library (dist/) and the test pages (test/pages/) from
// the repo root and answers /__commit with the commit dist was built
// from. Requires `bun run build`
// first; the pages load the component factories from dist/components.
import { resolve } from "node:path";
import { stat } from "node:fs/promises";

const root = resolve(import.meta.dir, "..");
const pages = resolve(root, "test/pages");
// Build provenance from dist: the token catalogue records the commit the
// build was made from. Absent (no catalogue, or a stale dist) shows
// "unknown" — never the checkout HEAD, which may not be what dist holds.
const headSha = (async () => {
  try {
    const catalogue = JSON.parse(await Bun.file(resolve(root, "dist/tokens/catalogue.json")).text());
    const sha = catalogue.sourceCommit;
    return typeof sha === "string" && sha ? sha.slice(0, 8) : "unknown";
  } catch { return "unknown"; }
})();

const types = new Map([
  ["html", "text/html; charset=utf-8"], ["css", "text/css"], ["js", "text/javascript"],
  ["mjs", "text/javascript"], ["json", "application/json"], ["svg", "image/svg+xml"],
  ["png", "image/png"], ["woff2", "font/woff2"],
]);

const serveFile = async (file: string): Promise<Response | null> => {
  try {
    if (!(await stat(file)).isFile()) return null;
  } catch { return null; }
  const ext = file.slice(file.lastIndexOf(".") + 1);
  return new Response(Bun.file(file), { headers: { "Content-Type": types.get(ext) ?? "application/octet-stream" } });
};

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, "");
    if (path === "__commit") return new Response(await headSha, { headers: { "Content-Type": "text/plain" } });
    // Only the test pages and the built library are served — the checkout
    // itself is not reachable. The pages reference the build only through the
    // /dist/ prefix: a path outside it never reaches the build directory, so
    // nothing there is reachable under an unprefixed alias.
    const candidates = [resolve(pages, path)];
    if (path.startsWith("dist/")) candidates.push(resolve(root, "dist", path.slice("dist/".length)));
    for (const file of candidates) {
      const base = file.startsWith(pages) ? pages : resolve(root, "dist");
      if (!file.startsWith(base)) continue;
      const served = await serveFile(file);
      if (served) return served;
      const index = await serveFile(resolve(file, "index.html"));
      if (index) return index;
    }
    return new Response("not found", { status: 404 });
  },
});

console.log(`test pages on http://127.0.0.1:${server.port}/ (commit ${await headSha}) — dist must be built: bun run build`);
