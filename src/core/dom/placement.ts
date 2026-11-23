// src/core/dom/placement.ts
//
// One vertical placement decision, shared by the surfaces that hang a list
// from an anchor: a menu, a select's menu, and the FAB menu's list.
//
// The rule is Material's: keep the side the caller asked for while the list
// fits there; when it does not, take the side with more room; then cap the
// height so the list scrolls inside the viewport, never below a minimum that
// keeps a few rows visible. Callers pass measurements and margins only, so
// the decision is pure and testable without a DOM.

/** Which side of its anchor a list opens on. */
export type VerticalSide = "top" | "bottom";

export interface VerticalFitInput {
  /** The side the caller asked for. */
  preferred: VerticalSide;
  /** The height the list needs, uncapped. */
  height: number;
  /** The room on the side above the anchor, margin and offset already taken. */
  above: number;
  /** The room on the side below the anchor, margin and offset already taken. */
  below: number;
  /**
   * A list never shrinks below this to fit, so a few rows always show. A side
   * with less room than this is still taken when it is the roomier one.
   */
  minHeight?: number;
  /**
   * `false` keeps the preferred side and caps the list there, even when the
   * other side has more room. `true` (the default) flips.
   */
  autoFlip?: boolean;
}

export interface VerticalFit {
  /** The side the list opens on. */
  side: VerticalSide;
  /**
   * The height to cap the list at, or `null` when it fits as it is and no cap
   * applies.
   */
  maxHeight: number | null;
}

/** The default minimum a list is capped at, so a short window still shows rows. */
export const MIN_VERTICAL_FIT = 100;

/**
 * Chooses the side a list opens on and the height it is capped at.
 *
 * A list that fits on its preferred side keeps it, and gets no cap. A list
 * that does not fit keeps its preferred side when `autoFlip` is `false`, and
 * otherwise takes the side with more room; either way it is capped to the
 * room on that side, never below `minHeight`.
 */
export const fitVertically = ({
  preferred,
  height,
  above,
  below,
  minHeight = MIN_VERTICAL_FIT,
  autoFlip = true,
}: VerticalFitInput): VerticalFit => {
  const room = (side: VerticalSide): number => (side === "top" ? above : below);

  if (height <= room(preferred)) return { side: preferred, maxHeight: null };

  // The roomier side; equal room keeps the side the caller asked for.
  const side: VerticalSide = !autoFlip || above === below
    ? preferred
    : below > above ? "bottom" : "top";
  const available = Math.max(room(side), minHeight);

  // A list is capped only when its side cannot hold it at its own height.
  return { side, maxHeight: available < height ? available : null };
};
