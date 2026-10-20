// test/scripts/check-dist-tags.test.ts
//
// `npm install material@next` must never install an older build than
// `npm install material` while a newer prerelease exists: scripts/check-dist-tags.ts
// fails the run when the registry's `next` dist-tag sorts below `latest` and
// the packument lists a prerelease above `latest` (the publish workflow runs
// it right after `npm publish`). A behind `next` with no such prerelease is
// stale, not misleading, and is skipped with a printed line. The comparison
// is semver, prereleases included.
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkTags, judgeNext, nextBehindLatest, summaryLine } from "../../scripts/check-dist-tags";

/** The registry state of 2026-10-16 morning: next behind latest. */
const MORNING = { legacy: "1.0.4", next: "3.0.0-next.1", latest: "3.0.5" };

/** The registry state of 2026-10-19 evening: next behind latest, nothing newer on offer. */
const EVENING = { next: "3.1.0", latest: "3.2.1" };
const EVENING_VERSIONS = ["3.0.0", "3.1.0", "3.2.0", "3.2.1"];

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

describe("judgeNext skips a behind next with no newer prerelease", () => {
  test("the 2026-10-19 evening state is skipped, not failed", () => {
    const verdict = judgeNext(EVENING, EVENING_VERSIONS);
    expect(verdict.problem).toBeUndefined();
    expect(verdict.skip).toContain("next (3.1.0) is behind latest (3.2.1)");
    expect(verdict.skip).toContain("skipped");
  });

  test("a prerelease above latest makes the behind next a failure", () => {
    const verdict = judgeNext(EVENING, [...EVENING_VERSIONS, "3.3.0-next.0"]);
    expect(verdict.problem).toContain("next (3.1.0) is behind latest (3.2.1)");
    expect(verdict.skip).toBeUndefined();
  });

  test("a prerelease below latest does not count", () => {
    expect(judgeNext(EVENING, [...EVENING_VERSIONS, "3.2.0-next.5"]).skip).toContain("skipped");
  });

  test("tags in order need neither line", () => {
    expect(judgeNext({ next: "3.2.1", latest: "3.2.1" }, EVENING_VERSIONS)).toEqual({});
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

  test("the fixture path keeps its contract: no versions, so the evening state fails too", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dist-tags-"));
    const file = join(dir, "evening.json");
    writeFileSync(file, JSON.stringify(EVENING));
    const root = new URL("../..", import.meta.url).pathname;
    const proc = Bun.spawn(["bun", "run", "scripts/check-dist-tags.ts", "--tags", file], {
      cwd: root,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [code, err] = await Promise.all([proc.exited, new Response(proc.stderr).text()]);
    expect(code).toBe(1);
    expect(err).toContain("next (3.1.0) is behind latest (3.2.1)");
  });
});

describe("checkTags retries a lagging registry", () => {
  test("a stale read then a fresh one passes, after two reads", async () => {
    const answers = [MORNING, { legacy: "1.0.4", next: "3.0.6-next.0", latest: "3.0.5" }];
    const result = await checkTags(async () => ({ tags: answers.shift() ?? answers[0]! }), { tries: 5, sleep: noSleep });
    expect(result.problem).toBeUndefined();
    expect(result.skip).toBeUndefined();
    expect(result.reads).toBe(2);
    expect(result.tags.next).toBe("3.0.6-next.0");
  });

  test("a registry that stays stale fails after the last read, not the first", async () => {
    let calls = 0;
    const result = await checkTags(async () => (calls++, { tags: MORNING }), { tries: 3, sleep: noSleep });
    expect(result.problem).toContain("next (3.0.0-next.1) is behind latest (3.0.5)");
    expect(calls).toBe(3);
    expect(result.reads).toBe(3);
  });

  test("one read, no retry, when tries is 1 (the fixture path)", async () => {
    let calls = 0;
    const result = await checkTags(async () => (calls++, { tags: MORNING }), { tries: 1, sleep: noSleep });
    expect(result.problem).toBeDefined();
    expect(calls).toBe(1);
  });

  test("a skip ends the check on its first read: waiting cannot make it misleading", async () => {
    let calls = 0;
    const result = await checkTags(
      async () => (calls++, { tags: EVENING, versions: EVENING_VERSIONS }),
      { tries: 5, sleep: noSleep },
    );
    expect(result.skip).toContain("skipped");
    expect(result.problem).toBeUndefined();
    expect(calls).toBe(1);
    expect(result.reads).toBe(1);
  });
});

describe("the propagation window", () => {
  test("the default re-reads for fifteen minutes", async () => {
    let calls = 0;
    const waits: number[] = [];
    const result = await checkTags(async () => (calls++, { tags: MORNING }), {
      sleep: async ms => {
        waits.push(ms);
      },
    });
    expect(result.problem).toBeDefined();
    expect(calls).toBe(16);
    expect(waits).toEqual(Array(15).fill(60_000));
    expect(waits.reduce((total, ms) => total + ms, 0)).toBe(15 * 60_000);
  });

  test("the summary keeps the propagation note only after a re-read", () => {
    const base = { tags: MORNING, problem: undefined, skip: undefined };
    expect(summaryLine({ ...base, reads: 1 })).not.toContain("reads:");
    expect(summaryLine({ ...base, reads: 3 })).toContain("(3 reads: the registry was still propagating)");
  });
});
