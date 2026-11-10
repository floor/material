#!/usr/bin/env bun
/** CI-only worker proof using the published tarball and a separately locked runtime. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { build } from "vite";
import { compile } from "svelte/compiler";
import { createPackageFixture, run } from "./package-fixture";

const fixture = await createPackageFixture();
const { directory, installed } = fixture;
const tooling = resolve("scripts/fixtures/ssr-worker");
const artifacts = resolve("analysis/ssr-worker");
await mkdir(artifacts, { recursive: true });
try {
  const peers = ["react", "react-dom", "svelte", "vue", "solid-js"];
  for (const peer of peers) await symlink(join(tooling, "node_modules", peer), join(directory, "node_modules", peer), "dir");
  for (const file of ["realm.js", "worker.js", "bootstrap.js", "frameworks.js", "SvelteApp.svelte"]) await copyFile(join(tooling, file), join(directory, file));
  await writeFile(join(directory, "node-parity.js"), 'export { renderElement } from "material/ssr"; export { renderFrameworks } from "./frameworks.js";');
  const expected = new Map([
    ["material/ssr", "index.js"], ["material/ssr/react", "react.js"],
    ["material/ssr/svelte", "svelte.js"], ["material/ssr/vue", "vue.js"],
    ["material/ssr/solid", "solid.js"],
  ]);
  const resolved: Record<string, string> = {};
  const loaded = new Set<string>();
  const bundle = async (entry: string) => build({
    root: directory, configFile: false, envFile: false, logLevel: "error",
    plugins: [{
      name: "packed-worker-targets", enforce: "pre",
      async resolveId(id, importer, options) {
        if (!expected.has(id)) return;
        assert(options?.ssr, `${id}: SSR resolver`);
        const target = await this.resolve(id, importer, { skipSelf: true });
        assert(target, id);
        assert.equal(target.id, join(installed, "dist/ssr", expected.get(id)!), id);
        resolved[id] = target.id;
        return target;
      },
      load(id) { loaded.add(id); },
      transform(code, id) {
        if (id.endsWith(".svelte")) return compile(code, { filename: id, generate: "server", dev: false }).js;
      },
    }],
    ssr: { target: "webworker", noExternal: ["material"], external: peers, resolve: { conditions: ["workerd", "worker", "browser"] } },
    build: { ssr: join(directory, entry), write: false, minify: false },
  });
  const result = await bundle("worker.js");
  assert(!("on" in result));
  const chunks = (Array.isArray(result) ? result : [result]).flatMap(item => item.output).filter(item => item.type === "chunk");
  assert.equal(chunks.length, 1);
  assert.equal(Object.keys(resolved).length, 5);
  for (const path of Object.values(resolved)) assert(loaded.has(path), `${path}: actually loaded`);
  const code = chunks[0].code;
  assert.doesNotMatch(code, /material\/ssr is server-only/);
  await writeFile(join(directory, "worker-bundle.mjs"), code);
  await writeFile(join(artifacts, "worker-bundle.mjs"), code);
  const parity = await bundle("node-parity.js");
  assert(!("on" in parity));
  const parityChunks = (Array.isArray(parity) ? parity : [parity]).flatMap(item => item.output).filter(item => item.type === "chunk");
  assert.equal(parityChunks.length, 1);
  await writeFile(join(directory, "node-parity.mjs"), parityChunks[0].code);
  await writeFile(join(artifacts, "resolution.json"), JSON.stringify({
    commit: (await run(["git", "rev-parse", "HEAD"])).trim(),
    reviewHead: process.env.SSR_WORKER_REVIEW_HEAD,
    conditions: ["workerd", "worker", "browser"], resolved, loaded: [...loaded].sort(),
    tarballSha256: createHash("sha256").update(await readFile(join(directory, fixture.pack.filename))).digest("hex"),
    toolingLockSha256: createHash("sha256").update(await readFile(join(tooling, "package-lock.json"))).digest("hex"),
    viteBundleSha256: createHash("sha256").update(code).digest("hex"),
  }, null, 2) + "\n");
  console.log(await run(["node", join(tooling, "run.mjs"), directory, artifacts]));
} finally { await fixture.cleanup(); }
