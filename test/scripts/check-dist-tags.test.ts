// test/scripts/check-dist-tags.test.ts
//
// `npm install material@next` must never install an older build than
// `npm install material`: scripts/check-dist-tags.ts fails the run when the
// registry's `next` dist-tag sorts below `latest` (the publish workflow runs
// it right after `npm publish`). The comparison is semver, prereleases
// included.
import { describe, expect, test } from "bun:test";
import { nextBehindLatest } from "../../scripts/check-dist-tags";

describe("nextBehindLatest", () => {
  test("flags a next that sorts below latest", () => {
    expect(nextBehindLatest({ latest: "3.0.5", next: "3.0.0-next.1" })).toContain("next (3.0.0-next.1) is behind latest (3.0.5)");
    expect(nextBehindLatest({ latest: "3.0.5", next: "3.0.4" })).toBeDefined();
    expect(nextBehindLatest({ latest: "3.1.0", next: "3.1.0-next.0" })).toBeDefined();
  });

  test("passes when next and latest are the same version", () => {
    expect(nextBehindLatest({ latest: "3.0.5", next: "3.0.5" })).toBeUndefined();
  });

  test("passes when next is a newer prerelease than latest", () => {
    expect(nextBehindLatest({ latest: "3.0.5", next: "3.0.6-next.0" })).toBeUndefined();
    expect(nextBehindLatest({ latest: "3.0.5", next: "4.0.0-next.1" })).toBeUndefined();
  });

  test("passes when there is no next tag, or no latest", () => {
    expect(nextBehindLatest({ latest: "3.0.5" })).toBeUndefined();
    expect(nextBehindLatest({ next: "3.0.6-next.0" })).toBeUndefined();
    expect(nextBehindLatest({})).toBeUndefined();
  });
});
