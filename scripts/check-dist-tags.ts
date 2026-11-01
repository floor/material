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
 *   bun run scripts/check-dist-tags.ts <version>
 *   bun run scripts/check-dist-tags.ts --tags <file.json>
 *
 * Exit 1 with one clear line when the tags are misleading; exit 0 otherwise,
 * printing the tags. The comparison is semver, so a prerelease is read
 * properly: `3.0.0-next.1` is below `3.0.5`, and `3.0.6-next.0` is above it.
 * A missing `next` (or a missing `latest`) is not a failure: the tag may
 * simply not exist yet.
 *
 * With `<version>`, the version the run just published, `next` is judged
 * against the higher of `latest` and that version: a registry that still
 * answers with the previous `latest` cannot make a stale `next` look fine, and
 * a behind `next` fails without the stale exemption — after a stable publish
 * the tag belongs on that stable, which the publish job moves it to. The retry
 * loop then waits for the move to reach this reader instead of passing on the
 * first stale read.
 *
 * With `--tags`, the tags come from that JSON file — read once, with no retry,
 * and with no versions to judge by: a `next` behind the higher of `latest` and
 * `<version>` fails, as it always has. Without it, they come from the registry's
 * abbreviated packument, the same metadata `npm dist-tag` and `npm install`
 * read (no npm CLI needed), whose version keys tell whether a prerelease above
 * `latest` exists. The registry can answer with the previous tags for many
 * minutes after a publish (a 2026-10-19 release took about twelve), so the
 * registry path re-reads for up to fifteen minutes and fails only when the
 * tags are still misleading after the last read.
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

/**
 * The one line a failing run prints, or undefined when the tags are in order.
 * `version` is the version the run just published, when there is one: the
 * comparison is then against the higher of `latest` and it, because a fresh
 * publish takes minutes to show as `latest` on the registry and the tag must
 * not lag the version npm already has.
 */
export const nextBehindLatest = (tags: DistTags, version?: string): string | undefined => {
  const { latest, next } = tags;
  if (!next) return undefined;
  const target = version !== undefined && (latest === undefined || Bun.semver.order(version, latest) > 0) ? version : latest;
  if (target === undefined) return undefined;
  if (Bun.semver.order(next, target) < 0) {
    const against = target === latest
      ? `latest (${latest})`
      : latest === undefined
        ? `${version}, the version just published`
        : `${version}, the version just published (latest still shows ${latest})`;
    return `npm dist-tag next (${next}) is behind ${against}: \`material@next\` installs an older build than \`material\` — move the tag on npmjs.com.`;
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
 *
 * `version`, the version this run published, turns that around: `next` below
 * it is the tag the publish is meant to move, so it fails without the stale
 * exemption and the retry loop keeps reading until the move reaches this
 * reader. Waiting is exactly what tells a registry still propagating the move
 * apart from one that refused it.
 */
export const judgeNext = (tags: DistTags, versions: readonly string[], version?: string): NextVerdict => {
  const problem = nextBehindLatest(tags, version);
  if (!problem) return {};
  if (version !== undefined) return { problem };
  const { latest, next } = tags;
  if (latest === undefined || next === undefined) return {};
  if (versions.some(prerelease => isPrerelease(prerelease) && Bun.semver.order(prerelease, latest) > 0)) return { problem };
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
  /** The wait between reads; the default keeps sixteen reads over fifteen minutes. */
  waitMs?: number;
  /** Injectable so a test does not wait. */
  sleep?: (ms: number) => Promise<void>;
  /** The version this run published: `next` is judged against the higher of `latest` and it. */
  version?: string;
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
 * `waitMs` between reads; the defaults re-read for fifteen minutes, because a
 * publish can take that long to become visible. Failing on the first stale
 * read would fail a good publish; a `next` that is still behind after the last
 * read fails with the same message as before. A behind `next` that the
 * packument shows is stale passes at once: waiting cannot make it misleading.
 * With `version`, a behind `next` is never stale — the publish job moves it,
 * and the reads wait for the move — so the stale path is not taken.
 */
export const checkTags = async (read: () => Promise<Packument>, options: CheckOptions = {}): Promise<CheckResult> => {
  const { tries = 16, waitMs = 60_000, sleep: wait = sleep, version } = options;
  let reads = 0;
  for (;;) {
    const packument = await read();
    reads++;
    const { problem, skip } = packument.versions
      ? judgeNext(packument.tags, packument.versions, version)
      : { problem: nextBehindLatest(packument.tags, version), skip: undefined };
    if (!problem || reads >= tries) return { tags: packument.tags, problem, skip, reads };
    await wait(waitMs);
  }
};

/** The line the registry path prints; the propagation note appears only after a re-read. */
export const summaryLine = (result: CheckResult): string =>
  `dist-tags: ${JSON.stringify(result.tags)}${result.reads > 1 ? ` (${result.reads} reads: the registry was still propagating)` : ""}`;

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
  let version: string | undefined;
  let tagsPath: string | undefined;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === "--tags" && tagsPath === undefined && args[index + 1] !== undefined) {
      tagsPath = args[++index]!;
    } else if (!arg.startsWith("-") && version === undefined) {
      version = arg;
    } else {
      console.error("Usage: check-dist-tags.ts [<version>] [--tags <file.json>]");
      process.exit(2);
    }
  }
  if (tagsPath !== undefined) {
    const tags = await readTagsFile(tagsPath);
    console.log(`dist-tags (${tagsPath}): ${JSON.stringify(tags)}`);
    const problem = nextBehindLatest(tags, version);
    if (problem) {
      console.error(problem);
      process.exit(1);
    }
  } else {
    const result = await checkTags(readPackument, { version });
    console.log(summaryLine(result));
    if (result.skip) console.log(result.skip);
    if (result.problem) {
      console.error(result.problem);
      process.exit(1);
    }
  }
}
