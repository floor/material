#!/usr/bin/env bun
// scripts/serve-test-pages.ts — the component test pages' one command.
//
// Serves the built library at /dist/ and the test pages at /test/pages/,
// and answers /__commit with the commit dist was built from. A component
// page then loads the build the same way the Sound slider does:
// ../../../../dist/ from test/pages/components/<name>/. Requires
// `bun run build` first.
import { resolve } from "node:path";
import { stat } from "node:fs/promises";

const root = resolve(import.meta.dir, "..");
const pages = resolve(root, "test/pages");
const dist = resolve(root, "dist");
// Build provenance from dist: the token catalogue records the commit the
// build was made from. Absent (no catalogue, or a stale dist) shows
// "unknown" — never the checkout HEAD, which may not be what dist holds.
const headSha = (async () => {
  try {
    const catalogue = JSON.parse(await Bun.file(resolve(dist, "tokens/catalogue.json")).text());
    const sha = catalogue.sourceCommit;
    return typeof sha === "string" && sha ? sha.slice(0, 8) : "unknown";
  } catch { return "unknown"; }
})();

const types = new Map([
  ["html", "text/html; charset=utf-8"], ["css", "text/css"], ["js", "text/javascript"],
  ["mjs", "text/javascript"], ["json", "application/json"], ["svg", "image/svg+xml"],
  ["png", "image/png"], ["woff2", "font/woff2"],
]);

const inside = (file: string, base: string) => file === base || file.startsWith(`${base}/`);

const serveFile = async (file: string): Promise<Response | null> => {
  try {
    if (!(await stat(file)).isFile()) return null;
  } catch { return null; }
  const ext = file.slice(file.lastIndexOf(".") + 1);
  return new Response(Bun.file(file), { headers: { "Content-Type": types.get(ext) ?? "application/octet-stream" } });
};

const serveUnder = async (base: string, relative: string): Promise<Response | null> => {
  const file = resolve(base, relative);
  if (!inside(file, base)) return null;
  const served = await serveFile(file);
  if (served) return served;
  const index = resolve(file, "index.html");
  if (!inside(index, base)) return null;
  return serveFile(index);
};

const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/+/, "");
    if (path === "__commit") return new Response(await headSha, { headers: { "Content-Type": "text/plain" } });
    // The index is the test-pages directory. `/` opens it.
    if (path === "" || path === "test/pages") return Response.redirect(`${url.origin}/test/pages/${url.search}`, 308);
    // A directory route without its slash makes the browser resolve relative
    // references one level up; redirect it to the trailing-slash form when a
    // page is what it resolves to (and never the server's own /__commit).
    if (path.startsWith("test/pages/") && !path.endsWith("/") && !path.includes(".")) {
      const index = resolve(pages, path.slice("test/pages/".length), "index.html");
      if (inside(index, pages)) {
        const exists = await stat(index).then((entry) => entry.isFile()).catch(() => false);
        if (exists) return Response.redirect(`${url.origin}/${path}/${url.search}`, 308);
      }
    }
    // Only the test pages and the built library are served — the checkout
    // itself is not reachable.
    if (path.startsWith("test/pages/")) {
      const served = await serveUnder(pages, path.slice("test/pages/".length));
      if (served) return served;
    }
    if (path.startsWith("dist/")) {
      const served = await serveUnder(dist, path.slice("dist/".length));
      if (served) return served;
    }
    return new Response("not found", { status: 404 });
  },
});

console.log(`test pages on http://127.0.0.1:${server.port}/test/pages/ (commit ${await headSha}) — dist must be built: bun run build`);
