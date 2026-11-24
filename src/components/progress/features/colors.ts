// src/components/progress/features/colors.ts
//
// The indicator's colours, read once and kept. Every frame used to resolve
// four theme colours, and each of those ran getComputedStyle on the body: at
// 60fps, with a few indicators on the page, that is a lot of style
// recalculation for values that only change with the theme.
//
// They are read on the indicator's own element, so a theme set on a section,
// a card or a shadow host reaches the canvas too, not only the page's
// A detached element has no theme yet: the fallbacks stand until
// it is in a document.

import { getThemeColor } from "../../../core/utils";
import { onThemeChange } from "../../../core/utils/theme";
import { PROGRESS_COLORS } from "../constants";

export interface ProgressColors {
  indicator: string;
  track: string;
  stop: string;
  buffer: string;
}

/** How much of the on-surface role the buffer carries over the track */
const BUFFER_TINT = 0.22;

/** A colour as `#rrggbb`, or null when it is a form this mix does not read */
const parseHex = (color: string): [number, number, number] | null => {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!hex) return null;
  const digits = hex[1]!.length === 3 ? hex[1]!.split("").map((c) => c + c).join("") : hex[1]!;
  return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)) as [number, number, number];
};

/** `tint` of over mixed into under, opaque: the buffer's read on the track */
const mix = (over: string, under: string, tint: number): string => {
  const a = parseHex(over);
  const b = parseHex(under);
  if (!a || !b) return over;
  const channel = (i: number): string => Math.round(a[i]! * tint + b[i]! * (1 - tint)).toString(16).padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
};

const FALLBACKS: ProgressColors = {
  indicator: "#6750A4",
  track: "#E8DEF8",
  stop: "#6750A4",
  buffer: mix("#1D1B20", "#E8DEF8", BUFFER_TINT),
};

const read = (element: Element): ProgressColors => {
  const track = getThemeColor(PROGRESS_COLORS.TRACK, { element, fallback: FALLBACKS.track });
  return {
    indicator: getThemeColor(PROGRESS_COLORS.INDICATOR, { element, fallback: FALLBACKS.indicator }),
    track,
    stop: getThemeColor(PROGRESS_COLORS.STOP, { element, fallback: FALLBACKS.stop }),
    // The buffer's tint is painted over the track: the opaque equivalent keeps
    // the canvas free of alpha compositing when the bar is drawn.
    buffer: mix(getThemeColor(PROGRESS_COLORS.BUFFER, { element, fallback: "#1D1B20" }), track, BUFFER_TINT),
  };
};

/**
 * Keeps the palette for one indicator, refreshed when the theme changes.
 * @param element - the indicator's element, where its theme is read
 * @param onChange - called after the colours change, to redraw
 * @returns the palette getter and a cleanup function
 */
export const createColors = (
  element: Element,
  onChange: () => void
): { get: () => ProgressColors; refresh: () => void; destroy: () => void } => {
  let colors = FALLBACKS;
  let read_ = false;

  const refresh = (): void => {
    if (!element.isConnected) return;
    try {
      colors = read(element);
      read_ = true;
    } catch {
      // No document to read from: the fallbacks stand
    }
  };

  const update = (): void => {
    refresh();
    onChange();
  };
  const offThemeChange = onThemeChange(update);

  // The element enters a document, or another part of it, with a size: the
  // theme where it lands is read then. A circular indicator drawn before it
  // was attached would otherwise keep the fallbacks.
  const observer = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(update)
    : null;
  observer?.observe(element);

  return {
    get: (): ProgressColors => {
      if (!read_) refresh();
      return colors;
    },
    refresh,
    destroy: (): void => {
      observer?.disconnect();
      offThemeChange();
    },
  };
};
