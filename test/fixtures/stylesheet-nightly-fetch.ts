import assert from "node:assert/strict";

Date.now = () => Date.parse("2026-11-28T08:00:00Z");

// Emulate the filtered workflow-runs response without contacting GitHub.
globalThis.fetch = Object.assign((input: Parameters<typeof fetch>[0]) => {
  const url = new URL(String(input));
  assert.equal(url.origin + url.pathname,
    "https://api.github.com/repos/floor/material/actions/workflows/combined-stylesheet-pins.yml/runs");
  assert.equal(url.searchParams.get("branch"), "main");
  assert.equal(url.searchParams.get("event"), "schedule");
  assert.equal(url.searchParams.get("status"), "success");
  assert.equal(url.searchParams.get("created"), ">=2026-11-26T20:00:00Z");
  if (process.env.FIXTURE_STYLESHEET_NIGHTLY === "unavailable") {
    return Promise.resolve(new Response(null, { status: 503 }));
  }
  return Promise.resolve(Response.json({ total_count: process.env.FIXTURE_STYLESHEET_NIGHTLY === "fresh" ? 1 : 0 }));
}, { preconnect: fetch.preconnect });
