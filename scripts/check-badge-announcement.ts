// Run the focused badge check without a library build. Supply CSS from CI dist.
// bun scripts/check-badge-announcement.ts /path/to/ci-dist/styles/badge.css
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { checkBadgeAnnouncement } from "./check-badge-announcement-browser";
const css = await Bun.file(process.argv[2] ?? "dist/styles/badge.css").text();
const build = await Bun.build({ entrypoints: ["scripts/fixtures/badge-announcement.ts"], target: "browser" });
assert(build.success, String(build.logs));
const js = await build.outputs[0].text();
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
  return new URL(request.url).pathname === "/fixture.js"
    ? new Response(js, { headers: { "Content-Type": "text/javascript" } })
    : new Response('<!doctype html><html><head></head><body><script type="module" src="/fixture.js"></script></body></html>', { headers: { "Content-Type": "text/html" } });
} });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.port}`);
  await page.waitForFunction(() => !!(window as unknown as { registerBadgeStyles?: unknown }).registerBadgeStyles);
  await page.addStyleTag({ content: css });
  await page.evaluate(css => (window as unknown as { registerBadgeStyles(css: string): void }).registerBadgeStyles(css), css);
  console.log(`Chromium ${browser.version()}`);
  await checkBadgeAnnouncement(page, name => console.log(`PASS ${name}`));
} finally { await browser.close(); server.stop(true); }
