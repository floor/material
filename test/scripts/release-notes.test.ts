// test/scripts/release-notes.test.ts
//
// The GitHub Release's notes come from CHANGELOG.md (publish.yml): each
// version's section, wherever it sits, and a loud failure when there is none.
import { describe, expect, test } from "bun:test";
import { changelogSection, releaseNotes } from "../../scripts/release-notes";

const CHANGELOG = `# Changelog

Intro.

## [Unreleased]

### Added

- Coming.

## [1.0.0-next.1] - 2026-10-02

The first pre-release.

## [0.10.5] - 2026-10-02

Text field accessibility.

### Added

- The asterisk.

## [0.10.4] - 2026-10-01

### Fixed

- The range band.
`;

describe("changelogSection", () => {
  test("the first section after Unreleased, a pre-release", () => {
    expect(changelogSection(CHANGELOG, "1.0.0-next.1")).toBe("The first pre-release.");
  });

  test("a middle section, its heading left out and its subsections kept", () => {
    expect(changelogSection(CHANGELOG, "0.10.5")).toBe("Text field accessibility.\n\n### Added\n\n- The asterisk.");
  });

  test("the last section, to the end of the file", () => {
    expect(changelogSection(CHANGELOG, "0.10.4")).toBe("### Fixed\n\n- The range band.");
  });

  test("a version with no section fails loudly", () => {
    expect(() => changelogSection(CHANGELOG, "0.10.6")).toThrow("CHANGELOG.md has no section for 0.10.6");
  });

  test("an empty section fails too, and a version is not matched by a prefix", () => {
    expect(() => changelogSection("## [1.0.0]\n\n## [0.9.0]\n\n- x\n", "1.0.0")).toThrow("is empty");
    expect(() => changelogSection(CHANGELOG, "0.10")).toThrow("no section");
  });

  test("a section that still parks an earlier release's entries fails: they are not this release's notes", () => {
    const parked = "## [1.0.0] - 2026-10-09\n\n### Added\n\n- New.\n\n### Also in 0.10.5\n\n- Shipped before.\n\n## [0.10.4]\n\n- x\n";
    expect(() => changelogSection(parked, "1.0.0")).toThrow('still has "### Also in 0.10.5"');
    expect(() => releaseNotes(parked, "1.0.0")).toThrow("replace that block");
    // Only a heading counts: a sentence that mentions the block does not
    expect(changelogSection("## [1.0.0]\n\nSee ### Also in 0.10.5 below.\n", "1.0.0")).toBe("See ### Also in 0.10.5 below.");
    expect(changelogSection(parked, "0.10.4")).toBe("- x");
  });

  const section = (line: string): string => `## [1.0.0]\n\n### Added\n\n- New.\n\n${line}\n\n- Shipped before.\n`;
  for (const heading of [
    "### Also in 0.10.5", "#### Also in 0.10.5", "## Also in 0.10.5", "###  Also in 0.10.5", "### also in 0.10.5",
    "### Also In 0.10.5", " ### Also in 0.10.5", "### **Also in 0.10.5**", "**Also in 0.10.5**", "__Also in 0.10.5__",
  ]) {
    test(`the parked block is refused however its heading is written: ${JSON.stringify(heading)}`, () => {
      expect(() => changelogSection(section(heading), "1.0.0")).toThrow(`still has "${heading.trim()}"`);
    });
  }

  for (const prose of ["Also in this release, the docs moved.", "- Also in 0.10.5: nothing.", "**Also in** the menu, focus returns.", "### Alsoin 0.10.5", "##### Also in 0.10.5"]) {
    test(`a line that is not that heading passes: ${JSON.stringify(prose)}`, () => {
      expect(changelogSection(section(prose), "1.0.0")).toContain(prose);
    });
  }
});

test("releaseNotes ends the section with the npm, docs and history footer", () => {
  expect(releaseNotes(CHANGELOG, "0.10.4")).toBe(
    "### Fixed\n\n- The range band.\n\n---\n\n" +
      "npm: [`material@0.10.4`](https://www.npmjs.com/package/material/v/0.10.4) · Docs: [md3.io](https://md3.io) · " +
      "Full history: [CHANGELOG.md](https://github.com/floor/material/blob/main/CHANGELOG.md)\n\n" +
      "The history before 3.0.0 was developed in `floor/mtrl`; `#numbers` in commit subjects before 3.0.0 refer to " +
      "[pull requests there](https://github.com/floor/mtrl/pulls?q=is%3Apr+is%3Aclosed).\n",
  );
});

test("the real CHANGELOG has a section for the package's version", async () => {
  const pkg = await Bun.file(new URL("../../package.json", import.meta.url)).json();
  const changelog = await Bun.file(new URL("../../CHANGELOG.md", import.meta.url)).text();
  expect(changelogSection(changelog, pkg.version).length).toBeGreaterThan(0);
});

test("3.0.0 includes every prerelease entry exactly once by its bold opening sentence", async () => {
  const changelog = await Bun.file(new URL("../../CHANGELOG.md", import.meta.url)).text();
  const openings = (section: string): string[] =>
    [...section.matchAll(/^[ \t]*- \*\*([\s\S]*?)\*\*/gm)].map(match => match[1].replace(/\s+/g, " "));
  const stable = openings(changelogSection(changelog, "3.0.0"));
  const entries = ["3.0.0-next.0", "3.0.0-next.1"].flatMap(version =>
    openings(changelogSection(changelog, version)).map(opening => ({ version, opening })),
  );
  expect(entries.length).toBeGreaterThan(0);
  const missingOrRepeated = entries.flatMap(({ version, opening }) => {
    const count = stable.filter(candidate => candidate === opening).length;
    return count === 1 ? [] : [{ version, opening, count }];
  });
  expect(missingOrRepeated).toEqual([]);
});

describe("release body size", () => {
  const fixture = Bun.file(new URL("../fixtures/release-notes-large.md", import.meta.url));
  const legacyFooter = (version: string): string =>
    "\n\n---\n\n" +
    `npm: [\`material@${version}\`](https://www.npmjs.com/package/material/v/${version}) · Docs: [md3.io](https://md3.io) · ` +
    "Full history: [CHANGELOG.md](https://github.com/floor/material/blob/main/CHANGELOG.md)\n\n" +
    "The history before 3.0.0 was developed in `floor/mtrl`; `#numbers` in commit subjects before 3.0.0 refer to " +
    "[pull requests there](https://github.com/floor/mtrl/pulls?q=is%3Apr+is%3Aclosed).\n";

  test("real release notes over the cap end at the last complete subsection and link to the requested tag", async () => {
    // A copy of the 3.0.0 notes, with internal ticket references removed.
    const section = changelogSection(await fixture.text(), "3.0.0");
    expect(section.length).toBeGreaterThan(130_000);
    expect(section.length).toBeLessThan(140_000);
    for (const version of ["3.0.0", "3.1.0-next.2"]) {
      const output = releaseNotes(`## [${version}]\n\n${section}\n`, version);
      const link = `Full release notes: [CHANGELOG.md](https://github.com/floor/material/blob/v${version}/CHANGELOG.md)\n`;
      const cut = section.indexOf("\n### Fixed");
      expect(cut).toBeGreaterThan(100_000);
      expect(output).toBe(section.slice(0, cut).trimEnd() + "\n\n" + link);
      const security = section.slice(section.indexOf("### Security"), section.indexOf("### Migrating"));
      expect(security).toContain("(#53)");
      expect(output).toContain(security);
      expect([...output.matchAll(/^### (.+)$/gm)].map(match => match[1])).toEqual([
        "Security", "Migrating from 0.10.x", "Changed (breaking)", "Removed", "Added", "Changed",
      ]);
      expect(output.length).toBeLessThan(125_000);
      expect(output.trimEnd().split("\n").at(-1)).toBe(link.trimEnd());
      // The omitted suffix starts at a heading; including its entire subsection is too large.
      expect(section.slice(cut).trimStart()).toStartWith("### Fixed\n");
      expect((section + "\n\n" + link).length).toBeGreaterThanOrEqual(125_000);
    }
  });

  test("the same real fixture below the cap keeps today's output byte for byte", async () => {
    const section = changelogSection(await fixture.text(), "3.0.0");
    const under = section.slice(0, section.indexOf("\n### Fixed")).trimEnd();
    const expected = under + legacyFooter("3.0.0");
    expect(expected.length).toBeLessThan(125_000);
    expect(releaseNotes(`## [3.0.0]\n\n${under}\n`, "3.0.0")).toBe(expected);
  });

  test("the cap is strict and includes the footer, retaining the full section when the shorter link fits", () => {
    const heading = "### Added\n\n";
    const section = heading + "x".repeat(125_000 - legacyFooter("3.0.0").length - heading.length);
    expect((section + legacyFooter("3.0.0")).length).toBe(125_000);
    const output = releaseNotes(`## [3.0.0]\n\n${section}\n`, "3.0.0");
    expect(output.length).toBeLessThan(125_000);
    expect(output).toBe(section + "\n\nFull release notes: [CHANGELOG.md](https://github.com/floor/material/blob/v3.0.0/CHANGELOG.md)\n");
  });

  test("an oversized subsection falls back to the link, never a heading inside a fenced example", () => {
    const section = "### Added\n\n" + "x".repeat(120_000) + "\n\n~~~markdown\n### Example heading\n" + "y".repeat(10_000) + "\n~~~";
    const output = releaseNotes(`## [3.0.0]\n\n${section}\n`, "3.0.0");
    expect(output).toBe("Full release notes: [CHANGELOG.md](https://github.com/floor/material/blob/v3.0.0/CHANGELOG.md)\n");
  });

  test("Security stays whole when it and the summary exceed the cap, then the notes cut after it", () => {
    const summary = "First stable release.\n\n";
    const security = "### Security\n\n- " + "x".repeat(125_000) + "\n\n#### Mitigation\n\n- Upgrade to the fixed release.";
    const section = summary + security + "\n\n### Changed\n\n- A small change.";
    const output = releaseNotes(`## [3.0.0]\n\n${section}\n`, "3.0.0");
    expect(output).toBe(summary + security + "\n\nFull release notes: [CHANGELOG.md](https://github.com/floor/material/blob/v3.0.0/CHANGELOG.md)\n");
    expect(output.length).toBeGreaterThan(125_000);
  });

  test("a nested heading never lets the cap retain only part of a subsection", () => {
    const kept = "Summary.\n\n### Security\n\n- Upgrade.";
    const section = kept + "\n\n### Changed\n\n- A small change.\n\n#### Details\n\n" + "x".repeat(125_000);
    expect(releaseNotes(`## [3.0.0]\n\n${section}\n`, "3.0.0")).toBe(
      kept + "\n\nFull release notes: [CHANGELOG.md](https://github.com/floor/material/blob/v3.0.0/CHANGELOG.md)\n",
    );
  });

  test("Security at the end cannot be dropped to satisfy the cap", () => {
    const section = "Summary.\n\n### Changed\n\n" + "x".repeat(125_000) + "\n\n### Security\n\n- Upgrade.";
    expect(releaseNotes(`## [3.0.0]\n\n${section}\n`, "3.0.0")).toBe(
      section + "\n\nFull release notes: [CHANGELOG.md](https://github.com/floor/material/blob/v3.0.0/CHANGELOG.md)\n",
    );
  });
});
