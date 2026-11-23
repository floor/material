// test/core/placement.test.ts
//
// The one vertical placement rule the menu, the select's menu and the FAB
// menu's list share (src/core/dom/placement.ts): the preferred side while the
// list fits, otherwise the side with more room — or, with autoFlip off, still
// the preferred side — then a cap with a floor, never below the list's own
// height when the side can hold it.
import { describe, expect, test } from "bun:test";
import { fitVertically, MIN_VERTICAL_FIT } from "../../src/core/dom/placement";

describe("fitVertically", () => {
  test("a list that fits keeps its preferred side, uncapped", () => {
    expect(fitVertically({ preferred: "bottom", height: 200, above: 300, below: 400 }))
      .toEqual({ side: "bottom", maxHeight: null });
    expect(fitVertically({ preferred: "top", height: 300, above: 300, below: 400 }))
      .toEqual({ side: "top", maxHeight: null });
  });

  test("a list that does not fit takes the side with more room, capped there when that side is short too", () => {
    expect(fitVertically({ preferred: "bottom", height: 500, above: 600, below: 200 }))
      .toEqual({ side: "top", maxHeight: null });
    expect(fitVertically({ preferred: "top", height: 700, above: 200, below: 600 }))
      .toEqual({ side: "bottom", maxHeight: 600 });
  });

  test("the cap never falls below the minimum, so a short window still shows rows", () => {
    const fit = fitVertically({ preferred: "bottom", height: 500, above: 40, below: 20, minHeight: 100 });
    expect(fit).toEqual({ side: "top", maxHeight: MIN_VERTICAL_FIT });
  });

  test("autoFlip: false keeps the preferred side and caps it, even when the other side has more room", () => {
    expect(fitVertically({ preferred: "bottom", height: 500, above: 600, below: 200, autoFlip: false }))
      .toEqual({ side: "bottom", maxHeight: 200 });
    expect(fitVertically({ preferred: "top", height: 500, above: 200, below: 600, autoFlip: false }))
      .toEqual({ side: "top", maxHeight: 200 });
  });

  test("the side it keeps is capped only when it cannot hold the list at its own height", () => {
    // The preferred side does not fit, but the roomier one does: no cap.
    expect(fitVertically({ preferred: "bottom", height: 500, above: 600, below: 100 }))
      .toEqual({ side: "top", maxHeight: null });
    // With autoFlip off on a side that does hold it: no cap either.
    expect(fitVertically({ preferred: "bottom", height: 300, above: 600, below: 400 }))
      .toEqual({ side: "bottom", maxHeight: null });
  });

  test("equal room keeps the preferred side, capped to that room", () => {
    expect(fitVertically({ preferred: "bottom", height: 400, above: 200, below: 200 }))
      .toEqual({ side: "bottom", maxHeight: 200 });
  });
});
