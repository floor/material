// test/conformance/issues-export.test.ts
//
// The conformance issues export, against a synthetic Linear response. No key
// and no network: `issuesFromResponse` takes the saved response.
import { describe, expect, test } from "bun:test";

import { personaNames } from "../../scripts/public-names";
import {
  buildFile,
  canceled,
  guard,
  issuesFromResponse,
  kindOf,
  mapIssues,
  rowsOf,
  serialize,
  slugBaseOf,
  statusOf,
  typeOf,
} from "../../scripts/conformance-issues";

const node = (overrides: Record<string, unknown>) => ({
  id: "id-0",
  title: "Issue",
  description: "",
  updatedAt: "2026-11-26T09:00:00.000Z",
  state: { name: "Backlog", type: "backlog" },
  labels: { nodes: [{ name: "drift-spec" }] },
  projectMilestone: null,
  ...overrides,
});

const RESPONSE = {
  data: {
    issues: {
      nodes: [
        node({
          id: "L-1",
          title: "Card: focus elevation rises on focus",
          description: "The focused filled card rises to Level 1.\n\nMatrix rows: card/focus-elevation/filled/focus",
          labels: { nodes: [{ name: "conformance" }, { name: "drift-compose" }, { name: "component/card" }, { name: "aspect/elevation" }, { name: "aspect/colour" }] },
          state: { name: "In Progress", type: "started" },
          projectMilestone: { name: "Next patch: 3.16.8" },
        }),
        node({
          id: "L-2",
          title: "Card: hover layer is missing",
          description: "Matrix rows: card/hover-layer/elevated/hover",
          labels: { nodes: [{ name: "drift-both" }, { name: "component/card" }, { name: "aspect/colour" }] },
          state: { name: "Done", type: "completed" },
        }),
        node({
          id: "L-3",
          title: "Card: dragged layer",
          description: "Matrix rows: card/dragged-layer/outlined/dragged",
          labels: { nodes: [{ name: "drift-spec" }, { name: "component/card" }, { name: "aspect/colour" }] },
          state: { name: "Done", type: "completed" },
        }),
        node({
          id: "L-4",
          title: "Button: radius disagrees",
          description: "Matrix rows: button/container-radius/filled/rest",
          labels: { nodes: [{ name: "reference-conflict" }, { name: "component/button" }, { name: "aspect/shape" }] },
          state: { name: "Decision needed", type: "backlog" },
        }),
        node({
          id: "L-5",
          title: "All: motion tokens differ",
          description: "",
          labels: { nodes: [{ name: "deviation" }, { name: "all" }, { name: "aspect/motion" }] },
          state: { name: "Backlog", type: "backlog" },
        }),
        node({
          id: "L-6",
          title: "Button: split button is missing",
          description: "No matrix row holds it.",
          labels: { nodes: [{ name: "api-gap" }, { name: "component/button" }, { name: "aspect/behaviour" }] },
          state: { name: "Backlog", type: "backlog" },
        }),
        node({
          id: "L-7",
          title: "A bug, not a drift",
          labels: { nodes: [{ name: "bug" }, { name: "component/card" }] },
        }),
        node({
          id: "L-8",
          title: "Card: canceled drift",
          description: "Matrix rows: card/hover-layer/elevated/hover",
          labels: { nodes: [{ name: "drift-spec" }, { name: "component/card" }] },
          state: { name: "Canceled", type: "canceled" },
        }),
        node({
          id: "L-9",
          title: "Button: a feature request",
          labels: { nodes: [{ name: "feature" }, { name: "component/button" }] },
        }),
        node({
          id: "L-10",
          title: "Tooling: an improvement",
          labels: { nodes: [{ name: "improvement" }] },
        }),
      ],
    },
  },
};

describe("conformance issues export", () => {
  test("reads the issues out of a saved response", () => {
    const issues = issuesFromResponse(RESPONSE);
    expect(issues).toHaveLength(10);
    expect(issues[0]!.labels).toContain("drift-compose");
    expect(rowsOf(issues[0]!)).toEqual(["card/focus-elevation/filled/focus"]);
  });

  test("every issue is exported, bugs included, and the canceled one is dropped", () => {
    const issues = issuesFromResponse(RESPONSE);
    expect(canceled(issues.find((issue) => issue.id === "L-8")!)).toBe(true);
    const entries = mapIssues(issues);
    expect(entries).toHaveLength(9);
    expect(entries.some((entry) => entry.title.includes("canceled"))).toBe(false);
    const bug = entries.find((entry) => entry.title === "A bug, not a drift")!;
    expect(bug.type).toBe("bug");
    expect(bug.kind).toBeNull();
    expect(bug.rows).toEqual([]);
  });

  test("its type stands beside its kind", () => {
    const issues = issuesFromResponse(RESPONSE);
    expect(typeOf(issues[0]!)).toBe("conformance");
    expect(kindOf(issues[0]!)).toBe("drift-compose");
    expect(typeOf(issues.find((issue) => issue.id === "L-7")!)).toBe("bug");
    expect(typeOf(issues.find((issue) => issue.id === "L-9")!)).toBe("feature");
    expect(typeOf(issues.find((issue) => issue.id === "L-10")!)).toBe("improvement");
    expect(kindOf(issues.find((issue) => issue.id === "L-9")!)).toBeNull();
  });

  test("each kind maps to its entry", () => {
    const entries = mapIssues(issuesFromResponse(RESPONSE));
    const byKind = Object.fromEntries(entries.filter((entry) => entry.kind !== null).map((entry) => [entry.kind!, entry]));
    expect(byKind["drift-compose"]!.status).toBe("in-progress");
    expect(byKind["drift-compose"]!.target).toBe("next-patch");
    expect(byKind["drift-compose"]!.id).toBe("card/focus-elevation");
    expect(byKind["drift-spec"]!.status).toBe("fixed");
    expect(byKind["reference-conflict"]!.status).toBe("decision-needed");
    expect(byKind["deviation"]!.status).toBe("kept");
    expect(byKind["deviation"]!.component).toBe("all");
    expect(byKind["api-gap"]!.rows).toEqual([]);
    expect(byKind["api-gap"]!.id).toBe("button/split-button-is-missing");
  });

  test("rows are plain data, kept as the issue lists them", () => {
    const issues = issuesFromResponse(RESPONSE);
    const twoRows = { ...issues[0]!, description: "Matrix rows: card/hover-layer/elevated/hover, card/focus-elevation/filled/focus" };
    expect(mapIssues([twoRows])[0]!.rows).toEqual(["card/focus-elevation/filled/focus", "card/hover-layer/elevated/hover"]);
  });

  test("a fixed issue carries its version when a label names one", () => {
    const issues = issuesFromResponse(RESPONSE);
    const withRelease = { ...issues[2]!, labels: [...issues[2]!.labels, "release/3.16.8"] };
    expect(statusOf(withRelease, "drift-spec")).toBe("fixed");
    const entries = mapIssues([withRelease]);
    expect(entries[0]!.fixed).toEqual({ version: "3.16.8" });
  });

  test("no tracker id and no person name leaves the file", () => {
    const issues = issuesFromResponse(RESPONSE);
    // Built from parts so this test file does not itself spell either one.
    const tracker = ["FLO", "1234"].join("-");
    const person = personaNames[0]!;
    const leaky = {
      ...issues[0]!,
      title: `Card: focus elevation (${tracker}, asked by ${person})`,
      description: `Matrix rows: card/focus-elevation/filled/focus\n\nReported by ${person}, ${tracker}.`,
    };
    expect(() => guard(serialize(buildFile([leaky], "3.16.7", "2026-11-26T00:00:00.000Z")))).toThrow();
    const clean = buildFile([{ ...leaky, title: "Card: focus elevation" }], "3.16.7", "2026-11-26T00:00:00.000Z");
    expect(() => guard(serialize(clean))).not.toThrow();
    expect(serialize(clean)).not.toContain("Matrix rows");
    expect(serialize(clean)).not.toContain("L-1");
  });

  test("the slug survives a title change", () => {
    const issues = issuesFromResponse(RESPONSE);
    const before = slugBaseOf(issues[0]!, rowsOf(issues[0]!));
    const after = slugBaseOf({ ...issues[0]!, title: "Card: the focus elevation, renamed" }, rowsOf(issues[0]!));
    expect(after).toBe(before);
    expect(before).toBe("card/focus-elevation");
  });

  test("two issues on one row get a stable suffix", () => {
    const issues = issuesFromResponse(RESPONSE);
    const twin = { ...issues[0]!, id: "L-0" };
    const entries = mapIssues([issues[0]!, twin]);
    expect(entries.map((entry) => entry.id)).toEqual(["card/focus-elevation", "card/focus-elevation-2"]);
  });

  test("the file is deterministic apart from the timestamp", () => {
    const issues = issuesFromResponse(RESPONSE);
    const first = serialize(buildFile(issues, "3.16.7", "2026-11-26T00:00:00.000Z"));
    const second = serialize(buildFile(issues, "3.16.7", "2026-11-26T00:00:00.000Z"));
    expect(first).toBe(second);
    const later = buildFile(issues, "3.16.7", "2026-11-27T00:00:00.000Z");
    expect(serialize(later).replace(/"2026-11-27[^"]*"/, "\"X\"")).toBe(first.replace(/"2026-11-26T00:00:00.000Z"/, "\"X\""));
    const counts = JSON.parse(first).counts;
    expect(counts.types).toEqual({ bug: 1, conformance: 6, feature: 1, improvement: 1 });
    expect(counts.kinds).toEqual({ "api-gap": 1, "drift-both": 1, "drift-compose": 1, "drift-spec": 1, deviation: 1, "reference-conflict": 1 });
    expect(counts.statuses).toEqual({ "decision-needed": 1, fixed: 2, "in-progress": 1, kept: 1, open: 4 });
  });
});
