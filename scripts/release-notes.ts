#!/usr/bin/env bun
/**
 * A release's notes, from CHANGELOG.md: the version's section without its
 * heading, and the footer the GitHub Releases carry (the release workflow).
 *
 *   bun scripts/release-notes.ts 0.10.5 > notes.md
 *
 * A version with no section, or an empty one, fails: a release without notes
 * is a CHANGELOG that was not updated, which is worth stopping for. So does a
 * section that still holds an `### Also in <version>` block: those entries
 * shipped in an earlier release and are parked there until that release's own
 * section joins the file, so they must not go out as this release's notes.
 * The block is recognised by its heading, however it is written: two to four
 * `#`, any case and spacing, with or without emphasis, or a line that is only
 * a bold "Also in …" label. A sentence that starts "Also in" is prose.
 */

/** A line that opens a parked block: an "Also in" heading, or a bold label on a line of its own */
const PARKED = /^\s*#{2,4}\s+[*_]{0,2}also in\b|^\s*(?:\*\*|__)also in\b[^*_]*(?:\*\*|__)\s*$/i;

/** The version's section of the changelog, its `## [x.y.z]` heading left out */
export function changelogSection(changelog: string, version: string): string {
  const lines = changelog.split("\n");
  const heading = `## [${version}]`;
  const start = lines.findIndex((line) => line === heading || line.startsWith(`${heading} `));
  if (start === -1) throw new Error(`CHANGELOG.md has no section for ${version}`);
  const next = lines.findIndex((line, index) => index > start && line.startsWith("## ["));
  const body = lines.slice(start + 1, next === -1 ? undefined : next).join("\n").trim();
  if (!body) throw new Error(`CHANGELOG.md's section for ${version} is empty`);
  const parked = body.split("\n").find((line) => PARKED.test(line));
  if (parked) throw new Error(`CHANGELOG.md's section for ${version} still has "${parked.trim()}": replace that block with the earlier release's own section first`);
  return body;
}

/**
 * The section and the footer: npm, the docs, the full history, and where the
 * history before 3.0.0 lives (the same sentence README.md's "Where this came
 * from" carries). Large bodies keep whole subsections below 125,000 characters
 * and name omitted subsections before the tag-specific link and normal footer. Security
 * is mandatory: keep the prefix through it even when that exceeds the cap.
 */
export function releaseNotes(changelog: string, version: string): string {
  const footer = [
    `npm: [\`material@${version}\`](https://www.npmjs.com/package/material/v/${version})`,
    "Docs: [md3.io](https://md3.io)",
    "Full history: [CHANGELOG.md](https://github.com/floor/material/blob/main/CHANGELOG.md)",
  ].join(" · ");
  const history =
    "The history before 3.0.0 was developed in `floor/mtrl`; `#numbers` in commit subjects before 3.0.0 refer to " +
    "[pull requests there](https://github.com/floor/mtrl/pulls?q=is%3Apr+is%3Aclosed).";
  const section = changelogSection(changelog, version);
  const normalFooter = `\n\n---\n\n${footer}\n\n${history}\n`;
  const complete = section + normalFooter;
  const cap = 125_000;
  if (complete.length < cap) return complete;

  // Keep whole subsections, reserving space for the omission notice, link and footer.
  // A heading in a fenced code example is not a safe place to cut Markdown.
  const link = `Full release notes: [CHANGELOG.md](https://github.com/floor/material/blob/v${version}/CHANGELOG.md)`;
  const subsections: { offset: number; name: string; entries: number }[] = [];
  let offset = 0;
  let fence: { marker: string; length: number } | undefined;
  for (const line of section.split("\n")) {
    const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (delimiter) {
      const marker = delimiter[1][0];
      if (!fence) fence = { marker, length: delimiter[1].length };
      else if (marker === fence.marker && delimiter[1].length >= fence.length && !delimiter[2].trim()) fence = undefined;
    } else if (!fence && /^ {0,3}###\s+\S/.test(line)) {
      // Deeper headings belong to this subsection; they cannot split it.
      const name = line.replace(/^ {0,3}###\s+/, "").replace(/\s+#+\s*$/, "").trim();
      subsections.push({ offset, name, entries: 0 });
    } else if (!fence && /^[-*+]\s+/.test(line) && subsections.length) {
      subsections[subsections.length - 1].entries += 1;
    }
    offset += line.length + 1;
  }
  let requiredEnd = 0;
  for (const [index, subsection] of subsections.entries()) {
    if (/^Security$/i.test(subsection.name)) requiredEnd = subsections[index + 1]?.offset ?? section.length;
  }
  const capped = (end: number): string => {
    const head = section.slice(0, end).trimEnd();
    const dropped = subsections.filter(subsection => subsection.offset >= end);
    const counts = dropped.map(({ name, entries }) => `\`### ${name}\`, ${entries} ${entries === 1 ? "entry" : "entries"}`).join("; ");
    const subject = dropped.length === 1 && dropped[0].name === "Fixed" ? "The fixes" : "The subsections";
    const notice = dropped.length
      ? `${subject} (${counts}) are not shown here: GitHub limits a release to 125,000 characters.\n\n`
      : !head ? "The release summary is not shown here: GitHub limits a release to 125,000 characters.\n\n" : "";
    return (head ? `${head}\n\n` : "") + notice + link + normalFooter;
  };
  let result = capped(requiredEnd);
  for (const subsection of subsections) {
    if (subsection.offset < requiredEnd) continue;
    const candidate = capped(subsection.offset);
    if (candidate.length < cap) result = candidate;
  }
  return result;
}

if (import.meta.main) {
  const version = process.argv[2];
  if (!version) throw new Error("usage: bun scripts/release-notes.ts <version>");
  const changelog = await Bun.file(new URL("../CHANGELOG.md", import.meta.url)).text();
  process.stdout.write(releaseNotes(changelog, version));
}
