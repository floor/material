#!/usr/bin/env bun
// scripts/check-dist-tags.ts
/**
 * Fails when npm's `next` dist-tag for material points at a version that sorts
 * below `latest`: then `npm install material@next` gives an older build than
 * `npm install material`, and nobody meant that.
 *
 *   bun run scripts/check-dist-tags.ts
 *
 * Exit 1 with one clear line when `next` exists and is older than `latest`;
 * exit 0 otherwise, printing the tags. The comparison is semver, so a
 * prerelease is read properly: `3.0.0-next.1` is below `3.0.5`, and
 * `3.0.6-next.0` is above it. A missing `next` (or a missing `latest`) is not
 * a failure: the tag may simply not exist yet.
 *
 * The tags come from the registry's abbreviated packument, the same metadata
 * `npm dist-tag` and `npm install` read; no npm CLI is needed.
 */

export interface DistTags {
  latest?: string;
  next?: string;
  [tag: string]: string | undefined;
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

/** The package's dist-tags, read from the registry the way the npm CLI reads them. */
export const readDistTags = async (name = "material"): Promise<DistTags> => {
  const response = await fetch(`https://registry.npmjs.org/${name}`, {
    headers: { accept: "application/vnd.npm.install-v1+json" },
  });
  if (!response.ok) throw new Error(`The registry answered ${response.status} for ${name}`);
  const packument = await response.json() as { "dist-tags"?: DistTags };
  return packument["dist-tags"] ?? {};
};

if (import.meta.main) {
  const tags = await readDistTags();
  console.log(`dist-tags: ${JSON.stringify(tags)}`);
  const problem = nextBehindLatest(tags);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
}
