// test/build/pins-update.test.ts
//
// The pins `bun run pins:update` moves (scripts/pins-update.ts): which built
// files count as moved, and what the fixture's map becomes.
import { describe, expect, test } from "bun:test";
import { applyMoves, movedPins } from "../../scripts/pins-update";
import { defaultPayloadDrift } from "../../scripts/stylesheet-pins";

const pinned = {
  "components/button.js": "a".repeat(64),
  "core/dom/direction.js": "b".repeat(64),
  "elements/styles.js": "c".repeat(64),
  "gone.js": "d".repeat(64),
  "styles.css": "e".repeat(64),
};
const built = {
  "components/button.js": "a".repeat(64),
  "core/dom/direction.js": "1".repeat(64),
  "added.js": "2".repeat(64),
  // The two combined stylesheet payloads have their own check and pins.
  "elements/styles.js": "3".repeat(64),
  "styles.css": "4".repeat(64),
};

describe("pins:update", () => {
  test("a changed hash, a new file and a file that is gone move; an unchanged one and the combined payloads do not", () => {
    expect(movedPins(built, pinned)).toEqual([
      { path: "added.js", was: undefined, now: "2".repeat(64) },
      { path: "core/dom/direction.js", was: "b".repeat(64), now: "1".repeat(64) },
      { path: "gone.js", was: "d".repeat(64), now: undefined },
    ]);
    expect(movedPins(pinned, pinned)).toEqual([]);
  });

  test("it moves exactly what the package job would refuse", () => {
    const refused = defaultPayloadDrift(built, pinned).map((line) => line.split(/[ :]/)[1]);
    expect(movedPins(built, pinned).map((pin) => pin.path)).toEqual(refused);
  });

  test("the applied pins satisfy the package job, sorted, with the combined pins untouched", () => {
    const next = applyMoves(pinned, movedPins(built, pinned));
    expect(defaultPayloadDrift(built, next)).toEqual([]);
    expect(Object.keys(next)).toEqual(["added.js", "components/button.js", "core/dom/direction.js", "elements/styles.js", "styles.css"]);
    expect(next["styles.css"]).toBe(pinned["styles.css"]);
    expect(next["elements/styles.js"]).toBe(pinned["elements/styles.js"]);
    // The input is left as it was.
    expect(Object.keys(pinned)).toContain("gone.js");
  });

  test("a pin that moves keeps its line, in a fixture whose lines are not in order", () => {
    const unordered = { "z.js": "a".repeat(64), "b.js": "b".repeat(64), "m.js": "c".repeat(64) };
    const next = applyMoves(unordered, [
      { path: "b.js", was: "b".repeat(64), now: "9".repeat(64) },
      { path: "c.js", now: "8".repeat(64) },
      { path: "zz.js", now: "7".repeat(64) },
    ]);
    expect(Object.keys(next)).toEqual(["c.js", "z.js", "b.js", "m.js", "zz.js"]);
    expect(next["b.js"]).toBe("9".repeat(64));
  });
});
