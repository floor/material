#!/usr/bin/env bun
// scripts/check-dist-tags.ts
/**
 * Fails when npm's `next` dist-tag for material points at a version that sorts
 * below `latest` while the packument lists a prerelease above `latest`: then
 * `material@next` misses the newer prerelease that `next` exists to carry.
 * A `next` below `latest` with no such prerelease is stale, not misleading,
 * and passes with a printed skip line.
 *
 *   bun run scripts/check-dist-tags.ts
 *   bun run scripts/check-dist-tags.ts --tags <file.json>
 *
 * Exit 1 with one clear line when the tags are misleading; exit 0 otherwise,
 * printing the tags. The comparison is semver, so a prerelease is read
 * properly: `3.0.0-next.1` is below `3.0.5`, and `3.0.6-next.0` is above it.
 * A missing `next` (or a missing `latest`) is not a failure: the tag may
 * simply not exist yet.
 *
 * With `--tags`, the tags come from that JSON file — read once, with no retry,
 * and with no versions to judge by: a `next` behind `latest` fails, as it
 * always has. Without it, they come from the registry's abbreviated
 * packument, the same metadata `npm dist-tag` and `npm install` read (no npm
 * CLI needed), whose version keys tell whether a prerelease above `latest`
 * exists. The registry can still answer with the previous tags right after a
 * publish, so the registry path re-reads a few times with a wait between and
 * fails only when the tags are still misleading after the last read; the total
 * wait stays under about two minutes.
 */

export interface DistTags {
  latest?: string;
  next?: string;
  [tag: string]: string | undefined;
}

/** One registry read: the tags, and the versions the abbreviated packument lists (its keys). */
export interface Packument {
  tags: DistTags;
  /** The packument's version keys; omitted by a fixture that carries only tags. */
  versions?: readonly string[];
}

/** The one line a failing run prints, or undefined when the tags are in order. */
export const nextBehindLatest = (tags: DistTags): string | undefined => {
  const { latest, next } = tags;
  if (!next || !latest) return undefined;
  if (Bun.semver.order(next, latest) < 0) {
    return `npm dist-tag next (${next}) is behind latest (${latest}): \`material@next\` installs an older build than \`material\` — move the tag on npmjs.com.`;
  }
  return undefined;
};

/** True for a version with a prerelease part (`3.3.0-next.0`), build metadata ignored. */
const isPrerelease = (version: string): boolean => version.split("+")[0].includes("-");

/** What the tags say once the packument's versions are known. */
export interface NextVerdict {
  /** The failure line, when `next` is behind and a prerelease above latest exists. */
  problem?: string;
  /** The printed line when a behind `next` is stale, not misleading. */
  skip?: string;
}

/**
 * Judges a behind `next` against the packument's versions. It fails only when
 * a prerelease above `latest` exists: `next` exists to carry a newer
 * prerelease, so a behind tag then means `material@next` misses it. Without
 * one, a behind `next` is stale, not misleading — it is skipped with a line,
 * because waiting cannot turn it into a failure.
 */
export const judgeNext = (tags: DistTags, versions: readonly string[]): NextVerdict => {
  const problem = nextBehindLatest(tags);
  const { latest, next } = tags;
  if (!problem || latest === undefined || next === undefined) return {};
  if (versions.some(version => isPrerelease(version) && Bun.semver.order(version, latest) > 0)) return { problem };
  return { skip: `next (${next}) is behind latest (${latest}), and the packument lists no prerelease above latest: stale, not misleading — skipped.` };
};

/** The package's tag and version metadata, read the way the npm CLI reads it. */
export const readPackument = async (name = "material"): Promise<Packument> => {
  const response = await fetch(`https://registry.npmjs.org/${name}`, {
    headers: { accept: "application/vnd.npm.install-v1+json" },
  });
  if (!response.ok) throw new Error(`The registry answered ${response.status} for ${name}`);
  const packument = await response.json() as { "dist-tags"?: DistTags; versions?: Record<string, unknown> };
  return { tags: packument["dist-tags"] ?? {}, versions: Object.keys(packument.versions ?? {}) };
};

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

export interface CheckOptions {
  /** Reads in all, counting the first: 1 is "no retry" (the fixture path). */
  tries?: number;
  /** The wait between reads; the default keeps five reads under two minutes. */
  waitMs?: number;
  /** Injectable so a test does not wait. */
  sleep?: (ms: number) => Promise<void>;
}

export interface CheckResult {
  /** The last tags read. */
  tags: DistTags;
  /** The failure line for those tags, or undefined when they are in order. */
  problem: string | undefined;
  /** The printed line when a behind `next` was skipped as stale. */
  skip: string | undefined;
  /** How many reads it took. */
  reads: number;
}

/**
 * Reads the packument until the tags are in order, at most `tries` times with
 * `waitMs` between reads. Right after `npm publish` the registry can answer
 * with the previous tags for a short while, and failing on that first stale
 * read would fail a good publish; a `next` that is still behind after the last
 * read fails with the same message as before. A behind `next` that the
 * packument shows is stale passes at once: waiting cannot make it misleading.
 */
export const checkTags = async (read: () => Promise<Packument>, options: CheckOptions = {}): Promise<CheckResult> => {
  const { tries = 5, waitMs = 20_000, sleep: wait = sleep } = options;
  let reads = 0;
  for (;;) {
    const packument = await read();
    reads++;
    const { problem, skip } = packument.versions
      ? judgeNext(packument.tags, packument.versions)
      : { problem: nextBehindLatest(packument.tags), skip: undefined };
    if (!problem || reads >= tries) return { tags: packument.tags, problem, skip, reads };
    await wait(waitMs);
  }
};

/** A dist-tags JSON file, read once: a fixture is the whole answer, so no retry. */
export const readTagsFile = async (path: string): Promise<DistTags> => {
  const parsed = await Bun.file(path).json() as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new TypeError(`Not a dist-tags JSON object: ${path}`);
  }
  return parsed as DistTags;
};

if (import.meta.main) {
  const args = process.argv.slice(2);
  if (args.length !== 0 && !(args.length === 2 && args[0] === "--tags" && args[1])) {
    console.error("Usage: check-dist-tags.ts [--tags <file.json>]");
    process.exit(2);
  }
  if (args.length === 2) {
    const tags = await readTagsFile(args[1]);
    console.log(`dist-tags (${args[1]}): ${JSON.stringify(tags)}`);
    const problem = nextBehindLatest(tags);
    if (problem) {
      console.error(problem);
      process.exit(1);
    }
  } else {
    const result = await checkTags(readPackument);
    console.log(`dist-tags: ${JSON.stringify(result.tags)}${result.reads > 1 ? ` (${result.reads} reads: the registry was still propagating)` : ""}`);
    if (result.skip) console.log(result.skip);
    if (result.problem) {
      console.error(result.problem);
      process.exit(1);
    }
  }
}
