// test/scripts/changelog-fragments.test.ts
import { describe, expect, test } from "bun:test";
import {
  assemble,
  SECTION_ORDER,
  lintChanges,
  parseFragment,
  renderSection,
  type Change,
  type Fragment,
} from "../../scripts/changelog-fragments";

const fragment = (path: string, section: Fragment["section"], text: string, migration?: string): Fragment => ({
  path,
  section,
  text,
  ...(migration === undefined ? {} : { migration }),
});

const CHANGELOG = [
  "# Changelog",
  "",
  "## [Unreleased]",
  "",
  "## [3.14.1] - 2026-11-13",
  "",
  "Summary sentence.",
  "",
  "### Fixed",
  "",
  "- **Older fix.** Body.",
  "",
  "[Unreleased]: https://github.com/floor/material/compare/v3.14.1...HEAD",
  "[3.14.1]: https://github.com/floor/material/compare/v3.14.0...v3.14.1",
  "[3.14.0]: https://github.com/floor/material/compare/v3.13.1...v3.14.0",
  "",
].join("\n");

describe("a fragment", () => {
  test("reads a section, an optional migration and one paragraph", () => {
    const parsed = parseFragment(".changes/fix.md", [
      "Section: Fixed",
      "Migration: Replace the old call.",
      "",
      "**A fix.** It does the thing.",
    ].join("\n"));
    expect(parsed).toEqual({
      path: ".changes/fix.md",
      section: "Fixed",
      text: "**A fix.** It does the thing.",
      migration: "Replace the old call.",
    });
  });

  test("rejects what the assembler cannot render predictably", () => {
    const cases: [string, RegExp][] = [
      ["**No header.** Body.", /expected "Section:"/],
      ["Section: Fixed", /the bullet text is empty/],
      ["Section: Removed\n\nBody.", /Section must be one of Added, Changed, Deprecated, Fixed/],
      ["Section: Fixed\nMigration: \n\nBody.", /Migration is empty/],
      ["Section: Fixed\n\n- a list already", /starts with a list marker/],
      ["Section: Fixed\n\nOne.\n\nTwo.", /one paragraph per fragment/],
      ["Why: Fixed\n\nBody.", /expected "Section:"/],
    ];
    for (const [source, message] of cases) expect(() => parseFragment(".changes/x.md", source)).toThrow(message);
  });
});

describe("the assembled section", () => {
  test("sorts by section order, then by filename, whatever the input order", () => {
    const a = fragment(".changes/b-changed.md", "Changed", "Second.");
    const b = fragment(".changes/a-fixed.md", "Fixed", "Third.", "Do the thing.");
    const c = fragment(".changes/c-added.md", "Added", "First.");
    const forward = renderSection([a, b, c]);
    const backward = renderSection([c, b, a]);
    expect(forward).toBe(backward);
    expect(forward).toBe([
      "### Added",
      "",
      "- First.",
      "",
      "### Changed",
      "",
      "- Second.",
      "",
      "### Fixed",
      "",
      "- Third. Migration: Do the thing.",
    ].join("\n"));
    expect(SECTION_ORDER).toEqual(["Added", "Changed", "Deprecated", "Fixed"]);
  });

  test("keeps a multi-line bullet inside one list item", () => {
    expect(renderSection([fragment(".changes/x.md", "Fixed", "One line,\nand its continuation.")]))
      .toBe("### Fixed\n\n- One line,\n  and its continuation.");
  });

  test("inserts the dated section after Unreleased and moves the comparison links", () => {
    const { changelog, section } = assemble(CHANGELOG, [
      fragment(".changes/a.md", "Fixed", "**A fix.** Body."),
      fragment(".changes/b.md", "Added", "**An addition.** Body."),
    ], "3.14.2", "2026-11-16");
    expect(section).toBe([
      "### Added",
      "",
      "- **An addition.** Body.",
      "",
      "### Fixed",
      "",
      "- **A fix.** Body.",
    ].join("\n"));
    const lines = changelog.split("\n");
    expect(lines.slice(lines.indexOf("## [Unreleased]"), lines.indexOf("## [Unreleased]") + 10)).toEqual([
      "## [Unreleased]",
      "",
      "## [3.14.2] - 2026-11-16",
      "",
      "### Added",
      "",
      "- **An addition.** Body.",
      "",
      "### Fixed",
      "",
    ]);
    expect(changelog).toContain("[Unreleased]: https://github.com/floor/material/compare/v3.14.2...HEAD");
    expect(changelog).toContain("[3.14.2]: https://github.com/floor/material/compare/v3.14.1...v3.14.2");
    expect(changelog).toContain("[3.14.1]: https://github.com/floor/material/compare/v3.14.0...v3.14.1");
  });

  test("refuses an empty set, a duplicate version and a malformed date", () => {
    expect(() => assemble(CHANGELOG, [], "3.14.2", "2026-11-16")).toThrow(/no fragments/);
    expect(() => assemble(CHANGELOG, [fragment(".changes/a.md", "Fixed", "x")], "3.14.1", "2026-11-16")).toThrow(/already has a section/);
    expect(() => assemble(CHANGELOG, [fragment(".changes/a.md", "Fixed", "x")], "3.14.2", "16/11/2026")).toThrow(/not a date/);
  });

  test("reproduces today's 3.14.1 section", async () => {
    const current = await Bun.file("CHANGELOG.md").text();
    const lines = current.split("\n");
    const start = lines.indexOf("## [3.14.1] - 2026-11-13");
    expect(start).toBeGreaterThan(-1);
    const end = lines.findIndex((line, index) => index > start && line.startsWith("## ["));
    const released = lines.slice(start, end === -1 ? undefined : end).join("\n");
    const fixed = released.slice(released.indexOf("### Fixed"), released.indexOf("### Size")).trimEnd();
    const bullet = fixed.split("\n").find(line => line.startsWith("- "))!;
    const text = bullet.slice(2);
    expect(renderSection([fragment(".changes/busy-button.md", "Fixed", text)])).toBe(fixed);

    // The same fragment assembles into the heading the file already carries,
    // above today's Size section (which a release author writes by hand).
    const without = lines.slice(0, start).concat(lines.slice(end)).join("\n");
    const { changelog } = assemble(without, [fragment(".changes/busy-button.md", "Fixed", text)], "3.14.1", "2026-11-13");
    expect(changelog).toContain(`## [3.14.1] - 2026-11-13\n\n### Fixed\n\n${bullet}`);
  });
});

describe("the pull request rules", () => {
  const change = (status: string, path: string): Change => ({ status, path });
  const rules = (branch: string, changes: Change[], fragments = new Map<string, string>()): string[] =>
    lintChanges({ branch, changes, fragments });

  test("a src/ change needs a fragment", () => {
    expect(rules("feat/x", [change("M", "src/components/button/button.ts")]))
      .toEqual(["src/: a change under src/ needs one .changes/<slug>.md fragment"]);
    expect(rules("feat/x", [
      change("M", "src/components/button/button.ts"),
      change("A", ".changes/button.md"),
    ], new Map([[".changes/button.md", "Section: Fixed\n\nBody."]]))).toEqual([]);
  });

  test("only a release branch edits CHANGELOG.md", () => {
    expect(rules("feat/x", [change("M", "CHANGELOG.md")])).toEqual([
      "CHANGELOG.md: a pull request adds .changes/<slug>.md instead; only release/* branches edit CHANGELOG.md",
    ]);
    expect(rules("release/3.14.2", [change("M", "CHANGELOG.md"), change("D", ".changes/a.md")])).toEqual([]);
  });

  test("a fragment is added and valid, never deleted, by an ordinary pull request", () => {
    expect(rules("fix/x", [change("D", ".changes/a.md")]))
      .toEqual([".changes/a.md: fragments are deleted by the release assembler, not by a pull request"]);
    expect(rules("fix/x", [change("A", ".changes/bad.md")], new Map([[".changes/bad.md", "No header."]])))
      .toEqual(['.changes/bad.md: expected "Section:" or "Migration:" on line 1, got "No header."']);
  });
});
