import assert from "node:assert/strict";

export const THRESHOLD = 0.01;
// Permit sub-pixel rounding; a one-pixel movement must fail regardless of CLS.
export const MOVE_LIMIT = 0.5;
export const SIBLINGS = ["#inline", "#block"] as const;
export interface KnownSiblingMove {
  sibling: string;
  axis: "x" | "y";
  value: number;
  /** The component that owns the follow-up and why this move is not fixed here. */
  reason: string;
}
/** The subject's own box. The same rule as a sibling pin: a signed value, within 0.5px. */
export interface KnownSubjectMove {
  subject: true;
  value: number;
  reason: string;
}
export type KnownMove = KnownSiblingMove | KnownSubjectMove;
export interface MoveResult {
  name: string;
  score: number;
  moves: { dx: number; dy: number }[];
  siblings?: readonly string[];
  knownMoves?: readonly KnownMove[];
  /**
   * How far the button's own box moved or resized, in px. Set only for a
   * button row. A subject pin records the expected change; every other button
   * fails at MOVE_LIMIT.
   */
  subjectMove?: number;
}
const KNOWN_MOVES: Record<string, readonly KnownMove[]> = {};
type Mark = { mark: "ok" | "known" | "FAIL"; note: string };
type Verdict = { fail?: string; note?: string };

const isSiblingMove = (move: KnownMove): move is KnownSiblingMove => "sibling" in move;
const isSubjectMove = (move: KnownMove): move is KnownSubjectMove => "subject" in move;

/** A pinned measurement: the signed value, still present, within half a pixel. */
const pinned = (where: string, value: number, expected: number, reason: string): Verdict => {
  if (Math.abs(value) <= MOVE_LIMIT) return { fail: `${where}: defect disappeared; remove its exception` };
  if (Math.abs(value - expected) > MOVE_LIMIT) return { fail: `${where}: expected ${expected}px ± ${MOVE_LIMIT}px` };
  return { note: `${where}: known; ${reason}` };
};

/** The button's own box. A subject pin uses the sibling rule; nothing else is exempt. */
const subjectCheck = (r: MoveResult, known: readonly KnownMove[]): Verdict => {
  const pins = known.filter(isSubjectMove);
  if (!pins.length) {
    if (r.subjectMove === undefined || r.subjectMove < MOVE_LIMIT) return {};
    return { fail: `host moved or resized ${r.subjectMove.toFixed(6)}px; at least ${MOVE_LIMIT}px` };
  }
  if (r.subjectMove === undefined) return { fail: "missing known subject" };
  const failures: string[] = [];
  const notes: string[] = [];
  for (const pin of pins) {
    const verdict = pinned(`host ${r.subjectMove.toFixed(6)}px`, r.subjectMove, pin.value, pin.reason);
    if (verdict.fail) failures.push(verdict.fail);
    else if (verdict.note) notes.push(verdict.note);
  }
  return failures.length ? { fail: failures.join("; ") } : { note: notes.join("; ") };
};

/** Every present row uses the same policy, including in a filtered run. */
export const markOf = (r: MoveResult, checkMoves: boolean): Mark => {
  const known = r.knownMoves ?? KNOWN_MOVES[r.name] ?? [];
  const subject = checkMoves ? subjectCheck(r, known) : {};
  if (r.score >= THRESHOLD) {
    return {
      mark: "FAIL",
      note: subject.fail ? `  (layout-shift score over threshold; ${subject.fail})` : "  (layout-shift score over threshold)",
    };
  }
  if (!checkMoves) return { mark: "ok", note: "" };
  const siblings = r.siblings ?? SIBLINGS;
  const failures: string[] = [];
  const notes: string[] = [];
  for (const expected of known) {
    if (!isSiblingMove(expected)) continue;
    if (!siblings.includes(expected.sibling) || !r.moves[siblings.indexOf(expected.sibling)]) {
      failures.push(`missing known sibling ${expected.sibling}`);
    }
  }
  r.moves.forEach((move, i) => {
    const sibling = siblings[i] ?? `sibling ${i}`;
    for (const axis of ["x", "y"] as const) {
      const value = axis === "x" ? move.dx : move.dy;
      const expected = known.find((k): k is KnownSiblingMove =>
        isSiblingMove(k) && k.sibling === sibling && k.axis === axis);
      const where = `${sibling} ${axis} ${value.toFixed(6)}px`;
      if (expected) {
        const verdict = pinned(where, value, expected.value, expected.reason);
        if (verdict.fail) failures.push(verdict.fail);
        else if (verdict.note) notes.push(verdict.note);
      } else if (Math.abs(value) > MOVE_LIMIT) failures.push(`${where}: over ${MOVE_LIMIT}px`);
    }
  });
  if (subject.fail) failures.push(subject.fail);
  else if (subject.note) notes.push(subject.note);
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
