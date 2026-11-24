#!/usr/bin/env bun
import { launchChromium } from "./browser-profile";
const server = Bun.serve({ hostname: "127.0.0.1", port: 0, fetch(request) {
  const path = new URL(request.url).pathname;
  if (path === "/styles.css") return new Response(Bun.file("dist/styles.css"), { headers: { "Content-Type": "text/css" } });
  if (path.startsWith("/dist/")) return new Response(Bun.file(path.slice(1)), { headers: { "Content-Type": "text/javascript" } });
  return new Response(`<!doctype html><html data-theme="baseline"><head><link rel="stylesheet" href="/styles.css"><style>body{margin:0}</style></head><body>
  <button id="open-menu">Open the menu</button>
  <script type="module">
  </script></body></html>`, { headers: { "Content-Type": "text/html" } });
} });
const browser = await launchChromium({ headless: true });
try {
  const page = await browser.browser()!.newPage({ viewport: { width: 800, height: 600 } });
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.port}/`);
  await page.evaluate(async () => {
    const { createMenu } = await import("/dist/components/menu/index.js");
    (window as unknown as { menu: unknown }).menu = createMenu({ opener: "#open-menu", items: [{ id: "a", text: "Alpha" }, { id: "b", text: "Beta" }] });
  }).catch(e => errors.push(String(e)));
  await page.evaluate(() => document.getElementById("open-menu")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(400);
  const opened = await page.evaluate(() => !!document.querySelector(".mtrl-menu"));
  // Synthetic click on the opener:
  await page.evaluate(() => document.getElementById("open-menu")!.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  await page.waitForTimeout(300);
  const afterSynthetic = await page.evaluate(() => ({ menuPresent: !!document.querySelector(".mtrl-menu"), visibleClass: document.querySelector(".mtrl-menu")?.className }));
  // Real click on the opener:
  await page.click("#open-menu");
  await page.waitForTimeout(300);
  const afterReal = await page.evaluate(() => ({ menuPresent: !!document.querySelector(".mtrl-menu"), visibleClass: document.querySelector(".mtrl-menu")?.className ?? "gone" }));
  console.log(JSON.stringify({ opened, afterSynthetic, afterReal, errors: errors.join("|") || "none" }));
} finally { await browser.close(); server.stop(true); }
