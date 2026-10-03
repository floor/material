import assert from "node:assert/strict";

export const THRESHOLD = 0.01;
// Permit sub-pixel rounding; a one-pixel movement must fail regardless of CLS.
export const MOVE_LIMIT = 0.5;
export const SIBLINGS = ["#inline", "#block"] as const;
export interface KnownMove {
  sibling: string;
  axis: "x" | "y";
  value: number;
  /** The component that owns the follow-up and why this move is not fixed here. */
  reason: string;
}
export interface MoveResult {
  name: string;
  score: number;
  moves: { dx: number; dy: number }[];
  siblings?: readonly string[];
  knownMoves?: readonly KnownMove[];
  /**
   * How far the button's own box moved or resized, in px. Set only for a
   * button row. A known sibling pin (the host's growth at 24px / line-height 2)
   * stays the record of that row; every other button fails at MOVE_LIMIT.
   */
  subjectMove?: number;
}
const KNOWN_MOVES: Record<string, readonly KnownMove[]> = {
  "button-group": [{ sibling: "#inline", axis: "y", value: 1.296875,
    reason: "Button group pre-upgrade baseline: floor/material#44." }],
};
type Mark = { mark: "ok" | "known" | "FAIL"; note: string };

/**
 * The button's own box. Absent when this row is not a button, when moves are
 * not being checked, or when the row already pins a known sibling move.
 */
const buttonSubjectFailure = (r: MoveResult, checkMoves: boolean): string | undefined => {
  if (!checkMoves || r.subjectMove === undefined || r.subjectMove < MOVE_LIMIT) return undefined;
  if (r.knownMoves?.length) return undefined;
  return `host moved or resized ${r.subjectMove.toFixed(6)}px; at least ${MOVE_LIMIT}px`;
};

/** Every present row uses the same policy, including in a filtered run. */
export const markOf = (r: MoveResult, checkMoves: boolean): Mark => {
  const host = buttonSubjectFailure(r, checkMoves);
  if (r.score >= THRESHOLD) {
    return {
      mark: "FAIL",
      note: host ? `  (layout-shift score over threshold; ${host})` : "  (layout-shift score over threshold)",
    };
  }
  if (!checkMoves) return { mark: "ok", note: "" };
  const siblings = r.siblings ?? SIBLINGS;
  const known = r.knownMoves ?? KNOWN_MOVES[r.name] ?? [];
  const failures: string[] = [];
  const notes: string[] = [];
  for (const expected of known) {
    if (!siblings.includes(expected.sibling) || !r.moves[siblings.indexOf(expected.sibling)]) {
      failures.push(`missing known sibling ${expected.sibling}`);
    }
  }
  r.moves.forEach((move, i) => {
    const sibling = siblings[i] ?? `sibling ${i}`;
    for (const axis of ["x", "y"] as const) {
      const value = axis === "x" ? move.dx : move.dy;
      const expected = known.find(k => k.sibling === sibling && k.axis === axis);
      const where = `${sibling} ${axis} ${value.toFixed(6)}px`;
      if (expected) {
        if (Math.abs(value) <= MOVE_LIMIT) failures.push(`${where}: defect disappeared; remove its exception`);
        else if (Math.abs(value - expected.value) > MOVE_LIMIT) {
          failures.push(`${where}: expected ${expected.value}px ± ${MOVE_LIMIT}px`);
        } else notes.push(`${where}: known; ${expected.reason}`);
      } else if (Math.abs(value) > MOVE_LIMIT) failures.push(`${where}: over ${MOVE_LIMIT}px`);
    }
  });
  if (host) failures.push(host);
  if (failures.length) return { mark: "FAIL", note: `  (${failures.join("; ")})` };
  return notes.length ? { mark: "known", note: `  (${notes.join("; ")})` } : { mark: "ok", note: "" };
};

/** Missing rows are checked only in full runs; present rows are always checked. */
export const validateKnownMoves = (rows: MoveResult[], only: string[]): void => {
  if (!only.length) {
    for (const name of Object.keys(KNOWN_MOVES)) {
      assert(rows.some(row => row.name === name), `Known movement names a missing row: ${name}`);
    }
  }
  for (const row of rows) {
    if (!(row.knownMoves ?? KNOWN_MOVES[row.name])?.length) continue;
    const result = markOf(row, true);
    assert(result.mark !== "FAIL", `${row.name}${result.note}`);
  }
};
