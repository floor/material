// test/scripts/check-dist-tags.test.ts
//
// `npm install material@next` must never install an older build than
// `npm install material`: scripts/check-dist-tags.ts fails the run when the
// registry's `next` dist-tag sorts below `latest` (the publish workflow runs
// it right after `npm publish`). The comparison is semver, prereleases
// included.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkTags, nextBehindLatest } from "../../scripts/check-dist-tags";

/** The registry state of 2026-10-16 morning: next behind latest. */
const MORNING = { legacy: "1.0.4", next: "3.0.0-next.1", latest: "3.0.5" };

/** No real waiting in a test. */
const noSleep = (): Promise<void> => Promise.resolve();

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

describe("the CLI with --tags", () => {
  test("reads the fixture and exits 1 on the morning state, without the registry", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dist-tags-"));
    const file = join(dir, "morning.json");
    writeFileSync(file, JSON.stringify(MORNING));
    const root = new URL("../..", import.meta.url).pathname;
    const proc = Bun.spawn(["bun", "run", "scripts/check-dist-tags.ts", "--tags", file], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [code, out, err] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    expect(code).toBe(1);
    expect(out).toContain(file);
    expect(err).toContain("next (3.0.0-next.1) is behind latest (3.0.5)");
  });
});

describe("checkTags retries a lagging registry", () => {
  test("a stale read then a fresh one passes, after two reads", async () => {
    const answers = [MORNING, { legacy: "1.0.4", next: "3.0.6-next.0", latest: "3.0.5" }];
    const result = await checkTags(async () => answers.shift() ?? answers[0]!, { tries: 5, sleep: noSleep });
    expect(result.problem).toBeUndefined();
    expect(result.reads).toBe(2);
    expect(result.tags.next).toBe("3.0.6-next.0");
  });

  test("a registry that stays stale fails after the last read, not the first", async () => {
    let calls = 0;
    const result = await checkTags(async () => (calls++, MORNING), { tries: 3, sleep: noSleep });
    expect(result.problem).toContain("next (3.0.0-next.1) is behind latest (3.0.5)");
    expect(calls).toBe(3);
    expect(result.reads).toBe(3);
  });

  test("one read, no retry, when tries is 1 (the fixture path)", async () => {
    let calls = 0;
    const result = await checkTags(async () => (calls++, MORNING), { tries: 1, sleep: noSleep });
    expect(result.problem).toBeDefined();
    expect(calls).toBe(1);
  });
});
