import { describe, expect, test } from "bun:test";
import { cases } from "../../scripts/fixtures/preupgrade-cases";
import { markOf, validateKnownMoves, type KnownSiblingMove } from "../../scripts/preupgrade-moves";

const row = (inlineY = 1.296875, blockX = 0, inlineX = 0) => ({
  name: "pinned fixture", score: 0.0001,
  knownMoves: [{ sibling: "#inline", axis: "y" as const, value: 1.296875, reason: "Synthetic baseline defect." }],
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
  for (const filter of [[], ["pinned fixture"]]) {
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
  test("a full run has no remaining global exceptions", () => {
    expect(() => validateKnownMoves([], [])).not.toThrow();
  });
  test("the button group no longer has a baseline exception", () => {
    expect(markOf({ ...row(), name: "button-group", knownMoves: undefined }, true).mark).toBe("FAIL");
    expect(markOf({ ...row(0), name: "button-group", knownMoves: undefined }, true).mark).toBe("ok");
  });
  test("ordinary movements use the same exact half-pixel boundary", () => {
    expect(markOf({ ...row(.5), name: "switch", knownMoves: undefined }, true).mark).toBe("ok");
    expect(markOf({ ...row(.515625), name: "switch", knownMoves: undefined }, true).mark).toBe("FAIL");
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

const widthReason = "Extra-small button group width follows the platform font: floor/material#49 (main baseline).";
const sizeReason = "Extra-small button group size reservation: floor/material#49 (main baseline).";
const siblingPin = (axis: "x" | "y", value: number, tolerance?: number): KnownSiblingMove => ({
  sibling: "#inline", axis, value, ...(tolerance === undefined ? {} : { tolerance }),
  reason: axis === "x" ? widthReason : sizeReason,
});
const xsRow = (dx: number, dy = -2.703125, blockY = -8) => ({
  name: "button-group [size=xs; ltr; default]", score: 0.0058,
  moves: [{ dx, dy }, { dx: 0, dy: blockY }],
  knownMoves: [
    siblingPin("x", -0.40625, 0.375),
    siblingPin("y", -2.703125),
    { sibling: "#block", axis: "y" as const, value: -8, reason: sizeReason },
  ],
});

describe("a pin with its own tolerance", () => {
  test("accepts both platform readings of the extra-small inline shift", () => {
    for (const dx of [-0.0625, -0.75]) {
      const result = markOf(xsRow(dx), true);
      expect(result.mark).toBe("known");
      expect(result.note).toContain(`#inline x ${dx.toFixed(6)}px: known; ${widthReason}`);
    }
    const rtl = markOf({
      ...xsRow(0.75),
      moves: [{ dx: 0.0625, dy: -2.703125 }, { dx: 0, dy: -8 }],
      knownMoves: [siblingPin("x", 0.40625, 0.375), siblingPin("y", -2.703125),
        { sibling: "#block", axis: "y" as const, value: -8, reason: sizeReason }],
    }, true);
    expect(rtl.mark).toBe("known");
    const linuxRtl = markOf({
      ...xsRow(0.75),
      knownMoves: [siblingPin("x", 0.40625, 0.375), siblingPin("y", -2.703125),
        { sibling: "#block", axis: "y" as const, value: -8, reason: sizeReason }],
    }, true);
    expect(linuxRtl.mark).toBe("known");
  });
  test("the default half-pixel rule still calls the smaller reading a disappeared defect", () => {
    const knownMoves = [siblingPin("x", -0.75)];
    const result = markOf({ ...xsRow(-0.0625), knownMoves }, true);
    expect(result.mark).toBe("FAIL");
    expect(result.note).toContain("defect disappeared");
  });
  test("a reading one pixel past either platform fails, and so does a vanished move", () => {
    for (const dx of [-0.0625 - 1, -0.75 - 1]) {
      const result = markOf(xsRow(dx), true);
      expect(result.mark).toBe("FAIL");
      expect(result.note).toContain("expected -0.40625px ± 0.375px");
    }
    const gone = markOf(xsRow(0), true);
    expect(gone.mark).toBe("FAIL");
    expect(gone.note).toContain("#inline x 0.000000px: defect disappeared; remove its exception");
  });
  test("the named band does not widen the other axis", () => {
    const result = markOf(xsRow(-0.0625, -2.703125 - 1), true);
    expect(result.mark).toBe("FAIL");
    expect(result.note).toContain("#inline y -3.703125px: expected -2.703125px ± 0.5px");
    expect(result.note).not.toContain("± 0.375px");
  });
  test("the extra-small rows carry that band, and only on inline x", () => {
    const rows = cases.filter(row => row.element === "button-group" && row.variant.startsWith("size=xs"));
    expect(rows.map(row => row.variant)).toEqual(["size=xs; ltr; default", "size=xs; rtl; default"]);
    for (const row of rows) {
      const pins = (row.knownMoves ?? []).filter((pin): pin is KnownSiblingMove => "sibling" in pin);
      const x = pins.filter(pin => pin.axis === "x");
      expect(x).toEqual([{
        sibling: "#inline", axis: "x",
        value: row.variant.includes("ltr") ? -0.40625 : 0.40625,
        tolerance: 0.375, reason: widthReason,
      }]);
      expect(pins.filter(pin => pin.tolerance !== undefined)).toEqual(x);
      expect(pins.some(pin => pin.axis === "y" && pin.tolerance === undefined)).toBe(true);
    }
  });
});

const quiet = { score: 0.002, moves: [{ dx: 0, dy: 0 }, { dx: 0, dy: 0 }] };
const buttonGrowth = ["#inline", "#block"].map(sibling => ({
  sibling, axis: "y" as const, value: 8,
  reason: "Button host grows at 24px/2: floor/material#42.",
}));
const hostGrowth = (value = 8) => ({
  subject: true as const, value,
  reason: "Button host grows at 24px/2: floor/material#42.",
});
const pinnedButton = (subjectMove: number, value = 8) => ({
  name: "button [ltr; 24/2]", score: 0.001,
  moves: [{ dx: 0, dy: 8 }, { dx: 0, dy: 8 }],
  knownMoves: [...buttonGrowth, hostGrowth(value)],
  subjectMove,
});

describe("preupgrade button subject", () => {
  test("a button box at 0.5px fails", () => {
    const result = markOf({ ...quiet, name: "button [variant=text icon]", subjectMove: 0.5 }, true);
    expect(result.mark).toBe("FAIL");
    expect(result.note).toContain("host moved or resized 0.500000px; at least 0.5px");
  });
  test("a button box under 0.5px passes, including a sibling sitting on the limit", () => {
    expect(markOf({ ...quiet, name: "button", moves: [{ dx: 0.5, dy: 0 }, { dx: 0, dy: 0 }], subjectMove: 0.499 }, true).mark).toBe("ok");
  });
  test("the pinned 24px line-height 2 growth stays a known sibling move", () => {
    const result = markOf({
      name: "button [ltr; 24/2]", score: 0.001,
      moves: [{ dx: 0, dy: 8 }, { dx: 0, dy: 8 }],
      knownMoves: [...buttonGrowth, hostGrowth()], subjectMove: 8,
    }, true);
    expect(result.mark).toBe("known");
    expect(result.note).toContain("host 8.000000px: known; Button host grows at 24px/2: floor/material#42.");
    expect(result.note).not.toContain("host moved");
  });
  test("a pinned button whose measured sibling move changed fails as changed", () => {
    const result = markOf({
      name: "button [ltr; 24/2]", score: 0.001,
      moves: [{ dx: 0, dy: 12 }, { dx: 0, dy: 8 }],
      knownMoves: [...buttonGrowth, hostGrowth()], subjectMove: 8,
    }, true);
    expect(result.mark).toBe("FAIL");
    expect(result.note).toContain("expected 8px ± 0.5px");
    expect(result.note).not.toContain("host moved");
  });
  test("a score over the threshold still names the button box", () => {
    const result = markOf({
      name: "button [variant=text size=m icon]", score: 0.017,
      moves: [{ dx: 24, dy: 0 }, { dx: 0, dy: 0 }], subjectMove: 24,
    }, true);
    expect(result.mark).toBe("FAIL");
    expect(result.note).toContain("layout-shift score over threshold");
    expect(result.note).toContain("host moved or resized 24.000000px; at least 0.5px");
  });
  test("a sibling moved 3px fails on the sibling policy", () => {
    const result = markOf({ name: "switch", score: 0.0001, moves: [{ dx: 0, dy: 3 }, { dx: 0, dy: 0 }] }, true);
    expect(result.mark).toBe("FAIL");
    expect(result.note).toContain("#inline y 3.000000px: over 0.5px");
    expect(result.note).not.toContain("host moved");
  });
  test("the missing-styles mutation does not apply the button box check", () => {
    expect(markOf({ ...quiet, name: "button [variant=text icon]", subjectMove: 4 }, false).mark).toBe("ok");
    expect(markOf(pinnedButton(20), false).mark).toBe("ok");
  });
  test("a pinned row whose subject moves a different amount from the pin fails", () => {
    const result = markOf(pinnedButton(20), true);
    expect(result.mark).toBe("FAIL");
    expect(result.note).toContain("host 20.000000px: expected 8px ± 0.5px");
  });
  test("a pinned row whose subject moves the pinned amount stays known", () => {
    expect(markOf(pinnedButton(8), true).mark).toBe("known");
    expect(markOf(pinnedButton(8.5), true).mark).toBe("known");
    expect(markOf(pinnedButton(7.5), true).mark).toBe("known");
    const matched = markOf(pinnedButton(8), true);
    expect(matched.note).toContain("host 8.000000px: known; Button host grows at 24px/2: floor/material#42.");
    const drifted = markOf(pinnedButton(8.515625), true);
    expect(drifted.mark).toBe("FAIL");
    expect(drifted.note).toContain("host 8.515625px: expected 8px ± 0.5px");
    expect(markOf(pinnedButton(-8, -8), true).mark).toBe("known");
    expect(markOf(pinnedButton(-8.5, -8), true).mark).toBe("known");
    expect(markOf(pinnedButton(-8.515625, -8), true).mark).toBe("FAIL");
    const opposite = markOf(pinnedButton(8, -8), true);
    expect(opposite.mark).toBe("FAIL");
    expect(opposite.note).toContain("host 8.000000px: expected -8px ± 0.5px");
  });
  test("an unpinned button whose box moves at least 0.5px fails", () => {
    const result = markOf({ ...quiet, name: "button [variant=text icon]", subjectMove: 4 }, true);
    expect(result.mark).toBe("FAIL");
    expect(result.note).toContain("host moved or resized 4.000000px; at least 0.5px");
  });
  test("a subject pin whose defect has gone fails as stale", () => {
    const result = markOf(pinnedButton(0), true);
    expect(result.mark).toBe("FAIL");
    expect(result.note).toContain("host 0.000000px: defect disappeared; remove its exception");
    const atLimit = markOf(pinnedButton(0.5), true);
    expect(atLimit.mark).toBe("FAIL");
    expect(atLimit.note).toContain("host 0.500000px: defect disappeared; remove its exception");
    expect(() => validateKnownMoves([pinnedButton(0)], ["button"])).toThrow(/defect disappeared/);
  });
  test("a subject pin with no measurement fails", () => {
    const result = markOf({
      name: "button", score: 0.001, moves: [{ dx: 0, dy: 0 }, { dx: 0, dy: 0 }],
      knownMoves: [hostGrowth()],
    }, true);
    expect(result.mark).toBe("FAIL");
    expect(result.note).toContain("missing known subject");
  });
  test("sibling pins do not exempt the button box", () => {
    const result = markOf({
      name: "button [ltr; 24/2]", score: 0.001,
      moves: [{ dx: 0, dy: 8 }, { dx: 0, dy: 8 }],
      knownMoves: buttonGrowth, subjectMove: 20,
    }, true);
    expect(result.mark).toBe("FAIL");
    expect(result.note).toContain("host moved or resized 20.000000px; at least 0.5px");
  });
});
