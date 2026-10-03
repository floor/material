import { describe, expect, test } from "bun:test";
import { markOf, validateKnownMoves } from "../../scripts/preupgrade-moves";

const row = (inlineY = 1.296875, blockX = 0, inlineX = 0) => ({
  name: "button-group", score: 0.0001,
  moves: [{ dx: inlineX, dy: inlineY }, { dx: blockX, dy: 0 }],
});

describe("preupgrade sibling exceptions", () => {
  test("the measured defect stays visible as known", () => {
    expect(markOf(row(), true).mark).toBe("known");
  });
  test("a new movement on a previously stationary sibling fails", () => {
    expect(markOf(row(1.296875, 1.25), true).mark).toBe("FAIL");
  });
  test("the signed direction matters", () => {
    expect(markOf(row(-1.296875), true).mark).toBe("FAIL");
  });
  test("moving a different axis fails", () => {
    expect(markOf(row(0, 0, 1.296875), true).mark).toBe("FAIL");
  });
  test("the recorded value has a half-pixel tolerance", () => {
    expect(markOf(row(1.796875), true).mark).toBe("known");
    expect(markOf(row(1.8125), true).mark).toBe("FAIL");
  });
  test("a small change within tolerance is allowed without rounding", () => {
    expect(markOf(row(1.34375), true).mark).toBe("known");
  });
  test("a disappeared defect requires removing the exception", () => {
    expect(markOf(row(0), true).mark).toBe("FAIL");
  });
  for (const filter of [[], ["button-group"]]) {
    test(`oversized known movement fails with filter ${JSON.stringify(filter)}`, () => {
      const r = row(4.296875);
      expect(markOf(r, true).mark).toBe("FAIL");
      expect(() => validateKnownMoves([r], filter)).toThrow();
    });
    test(`fixed known movement fails with filter ${JSON.stringify(filter)}`, () => {
      expect(() => validateKnownMoves([row(0)], filter)).toThrow();
    });
  }
  test("a filtered run need not contain excluded rows", () => {
    expect(() => validateKnownMoves([], ["switch"])).not.toThrow();
  });
  test("a full run rejects a stale row name", () => {
    expect(() => validateKnownMoves([], [])).toThrow();
  });
  test("ordinary movements use the same exact half-pixel boundary", () => {
    expect(markOf({ ...row(.5), name: "switch" }, true).mark).toBe("ok");
    expect(markOf({ ...row(.515625), name: "switch" }, true).mark).toBe("FAIL");
  });
  test("negative expected moves keep their sign and tolerance", () => {
    const knownMoves = [{ sibling: "#inline", axis: "y" as const, value: -7, reason: "button baseline" }];
    expect(markOf({ ...row(-7.5), knownMoves }, true).mark).toBe("known");
    expect(markOf({ ...row(-7.515625), knownMoves }, true).mark).toBe("FAIL");
    expect(markOf({ ...row(7), knownMoves }, true).mark).toBe("FAIL");
  });
  test("a known sibling cannot silently disappear from the measurement", () => {
    expect(markOf({ ...row(), siblings: ["#renamed", "#block"] }, true).mark).toBe("FAIL");
  });
  test("the missing-styles mutation does not enforce exceptions", () => {
    expect(markOf(row(-16), false).mark).toBe("ok");
  });
});
