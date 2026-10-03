// test/scripts/readme-links.test.ts
/**
 * npmjs.com answers a burst of `--online` fetches with Cloudflare's challenge:
 * a 403 that says nothing about the link. It must be unverifiable — reported,
 * counted apart, and neither passing nor failing — while every other 403 still
 * fails. The classification is pure, so this does not touch the network.
 */

import { describe, expect, test } from "bun:test";

import { classifyLink } from "../../scripts/readme-links";

const headers = (init: Record<string, string> = {}): Headers => new Headers(init);

describe("classifyLink", () => {
  test("200 passes, npm or not", () => {
    expect(classifyLink("https://www.npmjs.com/package/material", 200, headers())).toBe("ok");
    expect(classifyLink("https://example.com/", 200, headers())).toBe("ok");
  });

  test("npm's Cloudflare challenge 403 is unverifiable", () => {
    expect(classifyLink("https://www.npmjs.com/package/material", 403,
      headers({ "cf-mitigated": "challenge" }))).toBe("unverifiable");
    expect(classifyLink("https://npmjs.com/package/material", 403,
      headers({ server: "cloudflare" }))).toBe("unverifiable");
    expect(classifyLink("https://www.npmjs.com/package/material", 403,
      headers({ "cf-mitigated": "Challenge", server: "Cloudflare" }))).toBe("unverifiable");
  });

  test("an npm 403 without the challenge fails", () => {
    expect(classifyLink("https://www.npmjs.com/package/material", 403, headers())).toBe("failed");
    expect(classifyLink("https://www.npmjs.com/package/material", 403, headers({ server: "nginx" }))).toBe("failed");
  });

  test("a 403 from another host fails, even behind Cloudflare", () => {
    expect(classifyLink("https://example.com/", 403, headers({ server: "cloudflare" }))).toBe("failed");
    expect(classifyLink("https://docs.npmjs.com/", 403,
      headers({ "cf-mitigated": "challenge", server: "cloudflare" }))).toBe("failed");
  });

  test("the challenge only excuses a 403", () => {
    expect(classifyLink("https://www.npmjs.com/package/material", 503, headers({ server: "cloudflare" }))).toBe("failed");
  });
});
