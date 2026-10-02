import assert from "node:assert/strict";
export const THRESHOLD = 0.01;
// A case's siblings must not move on upgrade, whatever the score says. The
// score's own 0.5px floor (`shiftOf`) is for sub-pixel rounding, and it let
// the switch's unlabelled rows move an inline sibling 16.0px on a score of
// 0.0017 and 11.0px on 0.0009, and the button group's 1.3px on 0.0001. Over
// every row that moved a sibling at all, the moves were 16.0, 11.0 and 1.3px;
// nothing measured between 0 and 1.3. 0.5px passes sub-pixel rounding and
// fails a one-pixel move.
export const MOVE_LIMIT = 0.5;

// The rows this branch does not fix. Each entry is a row's name and the move
// it is known for today, in px on its largest axis: a defect waiting for its
// own fix, in the component's own branch. The check prints a listed row as
// `known` on every run instead of failing it, and it fails if the row moves
// more than its recorded value (the defect got worse) or if the row no longer
// moves past MOVE_LIMIT (its fix landed: remove the entry then).
const KNOWN_MOVES: Record<string, number> = {
  // The pre-upgrade button group's inline sibling sits 1.3px lower than the
  // element's box does after upgrade; the score, 0.0001, cannot see it.
  "button-group": 1.3,
};

/** The siblings after each case's host, as `measure` selects them. */
export const SIBLINGS = ["#inline", "#block"] as const;

/** One decimal place, as the report prints moves. */
const round1 = (value: number): number => Math.round(value * 10) / 10;


export interface MoveResult { name: string; score: number; moves: { dx: number; dy: number }[]; }
/** The largest move over a row's siblings, and which sibling and axis it is. */
const largestMove = (moves: MoveResult["moves"]): { sibling: string; axis: string; value: number } | null => {
  let worst: { sibling: string; axis: string; value: number } | null = null;
  moves.forEach(({ dx, dy }, i) => {
    for (const [axis, value] of [["x", dx], ["y", dy]] as const) {
      if (Math.abs(value) > (worst?.value ?? 0)) worst = { sibling: SIBLINGS[i] ?? `sibling ${i}`, axis, value: Math.abs(value) };
    }
  });
  return worst;
};

/**
 * A row's mark: the score's threshold, then the move limit, which the score
 * cannot see. A listed move prints as `known`; any other move past the limit
 * fails, and the failing line names the row, the sibling and the move.
 */
export const markOf = (r: MoveResult, checkMoves: boolean): { mark: "ok" | "known" | "FAIL"; note: string } => {
  if (r.score >= THRESHOLD) return { mark: "FAIL", note: "" };
  if (!checkMoves) return { mark: "ok", note: "" };
  const worst = largestMove(r.moves);
  if (!worst || worst.value <= MOVE_LIMIT) return { mark: "ok", note: "" };
  const where = `${worst.sibling} moved ${worst.value.toFixed(1)}px on ${worst.axis}`;
  if (KNOWN_MOVES[r.name] !== undefined) return { mark: "known", note: `  (${where}; known, waiting for its own fix)` };
  return { mark: "FAIL", note: `  (${where}; over the ${MOVE_LIMIT}px limit, whatever the score)` };
};


export const validateKnownMoves = (withStyles: MoveResult[], only: string[]): void => {
  // Every listed row has to still show its defect: moving past the limit, and
  // no further than the value it is known for. (Not in `only` mode, where the
  // run holds a subset of the rows.)
  if (!only.length) {
    for (const [name, recorded] of Object.entries(KNOWN_MOVES)) {
      const row = withStyles.find((r) => r.name === name);
      assert(row, `KNOWN_MOVES names a row that is not a case: ${name}`);
      const move = round1(largestMove(row.moves)?.value ?? 0);
      assert(move > MOVE_LIMIT, `${name} no longer moves a sibling past ${MOVE_LIMIT}px (${move.toFixed(1)}px): its fix landed, remove it from KNOWN_MOVES`);
      assert(move <= recorded, `${name} moved a sibling ${move.toFixed(1)}px, more than the ${recorded}px it is known for`);
    }
  }

};
