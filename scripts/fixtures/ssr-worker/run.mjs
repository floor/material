// Wrangler only serves a local worker; it never deploys or reads account data.
import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const [directory, artifacts] = process.argv.slice(2);
const configHome = join(directory, "config");
await mkdir(configHome, { recursive: true });
process.env.XDG_CONFIG_HOME = configHome;
process.env.WRANGLER_SEND_METRICS = "false";
process.env.CLOUDFLARE_CF_FETCH_ENABLED = "false";
process.env.WRANGLER_LOG_PATH = join(artifacts, "wrangler.log");
process.env.NODE_ENV = "production";
for (const key of ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_API_KEY", "CLOUDFLARE_EMAIL", "CLOUDFLARE_ACCOUNT_ID"]) delete process.env[key];
process.chdir(directory);
const { unstable_startWorker } = await import("wrangler");
const require = createRequire(import.meta.url);
const versions = Object.fromEntries(["wrangler", "workerd", "miniflare", "react", "react-dom", "vue", "svelte", "solid-js"].map(name => [name, require(name + "/package.json").version]));
const compatibilityDate = "2026-11-10";
// Wrangler/workerd enable Node compatibility by default on recent dates.
// An empty flag list would silently test the wrong runtime contract.
const compatibilityFlags = ["no_nodejs_compat", "no_nodejs_compat_v2"];
const define = { __VUE_OPTIONS_API__: "true", __VUE_PROD_DEVTOOLS__: "false", __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false" };
const config = join(directory, "wrangler.json");
await writeFile(config, JSON.stringify({ name: "material-ssr-proof", compatibility_date: compatibilityDate, compatibility_flags: compatibilityFlags, define }));
await writeFile(join(artifacts, "runtime-config.json"), JSON.stringify({ versions, compatibilityDate, compatibilityFlags, define, remote: false }, null, 2) + "\n");
const worker = await unstable_startWorker({
  config, entrypoint: join(directory, "bootstrap.js"),
  dev: { remote: false, watch: false, server: { hostname: "127.0.0.1", port: 0 }, inspector: false, persist: false, logLevel: "error" },
});
try {
  let timer;
  try {
    await Promise.race([worker.ready, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("worker startup timed out")), 45000); })]);
  } finally { clearTimeout(timer); }
  assert.equal(worker.config.build.nodejsCompatMode, null, "Wrangler Node compatibility disabled");
  const rows = [];
  for (const phase of ["/success", "/failure", "/partial-install", "/later-request"]) {
    const response = await worker.fetch("http://localhost" + phase);
    const text = await response.text();
    assert.equal(response.status, 200, text);
    const row = JSON.parse(text);
    assert.equal(row.requests, rows.length + 1, "same cold realm services later requests");
    rows.push(row);
  }
  // Compare seeded output with the same packed core renderer in ordinary Node.
  const ssr = await import(pathToFileURL(join(directory, "node-parity.mjs")));
  const random = Math.random;
  Math.random = () => 0.123456;
  let inline, link, frameworks;
  try {
    inline = ssr.renderElement("m-button", { variant: "filled" }, "Save");
    link = ssr.renderElement("m-button", { variant: "filled" }, "Save", { styles: "link", cssBase: "/assets/css" });
    frameworks = await ssr.renderFrameworks();
  } finally { Math.random = random; }
  for (const row of rows) {
    assert.equal(row.inline, inline, row.phase + ": Node/worker inline parity");
    assert.equal(row.link, link, row.phase + ": Node/worker link parity");
    assert.deepEqual(row.frameworks, frameworks, row.phase + ": Node/worker framework DSD parity");
  }
  const report = { versions, compatibilityDate, compatibilityFlags, define, nodejsCompatMode: worker.config.build.nodejsCompatMode, node: process.version, rows };
  await writeFile(join(artifacts, "runtime.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`workerd ${versions.workerd}: cold imports, four bridges, success/failure/partial-install rollback, later request and seeded inline/link parity passed`);
} finally { await worker.dispose(); }
