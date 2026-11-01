// src/components/progress/features/linear.ts
//
// The linear indicator's geometry, after Compose ProgressIndicator.kt and
// WavyProgressIndicator.kt: an active indicator from the leading edge, a
// track after it with a gap between the two, a stop indicator at the
// trailing end, and, when indeterminate, two bars running the track on
// keyframes. The canvas port drew these fractions straight to the context;
// here they resolve to the same pixels as windows the drawing elements
// place themselves by, so the two can be compared frame by frame.
// Everything is in view pixels, leading edge at 0; a right-to-left
// container mirrors the whole view in CSS, as the canvas mirrored each
// fraction, so none of this knows the direction.

import { linearIndeterminateFrame } from "./motion";
import { PROGRESS_MEASUREMENTS } from "../constants";

/** The gap that clears both round caps of a bar (TrackActiveSpace + stroke) */
export const linearGapPx = (strokeWidth: number): number =>
  PROGRESS_MEASUREMENTS.LINEAR.GAP + strokeWidth;

/**
 * A bar's window in view pixels, already widened by its round caps:
 * [x0 - cap, x1 + cap], with x clamped inside the track as the canvas
 * clamped it. `null` is every case where the canvas drew nothing.
 */
export interface BarWindow {
  from: number;
  to: number;
}

const barWindow = (
  width: number,
  cap: number,
  from: number,
  to: number
): BarWindow | null => {
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  if (end - start <= 0) return null;
  const clamp = (x: number): number => Math.min(Math.max(x, cap), width - cap);
  const x0 = clamp(start * width);
  const x1 = clamp(end * width);
  if (Math.abs(x1 - x0) < 1e-6) return null;
  return { from: x0 - cap, to: x1 + cap };
};

/** What a frame of the linear indicator needs */
export interface LinearFrame {
  /** Progress from 0 to 1; ignored when indeterminate */
  progress: number;
  /** Buffer from 0 to 1, this library's own extension; 0 for none */
  buffer: number;
  /** Track and indicator thickness in pixels */
  strokeWidth: number;
  /** The view's measured width in pixels */
  width: number;
  /** The view's height in pixels: the stroke, or the stroke in its wave box */
  height: number;
  /** Whether to mark the end of the track with a dot */
  showStopIndicator: boolean;
}

/** The parts of a determinate linear indicator, as windows and a dot */
export interface LinearDeterminateGeometry {
  indicator: BarWindow | null;
  track: BarWindow | null;
  buffer: BarWindow | null;
  stop: { x: number; size: number } | null;
}

/**
 * The determinate linear indicator at a value: the indicator from the
 * leading edge, the track after it with the gap taken out, the buffer over
 * the track, and the stop dot at the trailing end.
 */
export const linearDeterminate = (frame: LinearFrame): LinearDeterminateGeometry => {
  const { width, height, strokeWidth } = frame;
  const cap = strokeWidth / 2;
  const gap = linearGapPx(strokeWidth);
  const progress = Math.min(1, Math.max(0, frame.progress));

  // Track after the active indicator, starting half a gap further along
  // while the value is low, so low values keep a gap at all
  const trackStart = progress + Math.min(progress, gap / width);

  const geometry: LinearDeterminateGeometry = {
    indicator: barWindow(width, cap, 0, progress),
    track: trackStart <= 1 ? barWindow(width, cap, trackStart, 1) : null,
    buffer: null,
    stop: null,
  };

  // The buffer sits over the track, past its start
  if (frame.buffer > progress) {
    const bufferEnd = Math.min(1, frame.buffer);
    if (bufferEnd > trackStart) {
      geometry.buffer = barWindow(width, cap, trackStart, bufferEnd);
    }
  }

  // The dot that marks the end of the track. It is required whenever the
  // track has less than 3:1 contrast with its surroundings, so it is drawn
  // by default (M3 progress indicator accessibility).
  if (frame.showStopIndicator) {
    const size = Math.min(PROGRESS_MEASUREMENTS.LINEAR.STOP_INDICATOR, height);
    const offset = Math.min(
      (height - size) / 2,
      PROGRESS_MEASUREMENTS.LINEAR.STOP_TRAILING_SPACE
    );
    geometry.stop = { x: width - size / 2 - offset, size };
  }

  return geometry;
};

/** The five parts of an indeterminate linear indicator, as windows */
export interface LinearIndeterminateGeometry {
  trackAhead: BarWindow | null;
  barFirst: BarWindow | null;
  trackBetween: BarWindow | null;
  barSecond: BarWindow | null;
  trackBehind: BarWindow | null;
}

/**
 * The indeterminate linear indicator at a time: the two bars on the Compose
 * keyframes, with the track ahead, between and behind them. The guards are
 * the canvas's own: a part missing from this list is a part it did not
 * draw at that time.
 */
export const linearIndeterminate = (
  width: number,
  strokeWidth: number,
  time: number
): LinearIndeterminateGeometry => {
  const cap = strokeWidth / 2;
  const gap = linearGapPx(strokeWidth);
  const gapFraction = width > 0 ? gap / width : 0;
  const { firstHead, firstTail, secondHead, secondTail } =
    linearIndeterminateFrame(time);

  return {
    // Track ahead of the leading bar
    trackAhead:
      firstHead < 1 - gapFraction
        ? barWindow(width, cap, firstHead > 0 ? firstHead + gapFraction : 0, 1)
        : null,
    // Leading bar
    barFirst:
      firstHead - firstTail > 0
        ? barWindow(width, cap, firstTail, firstHead)
        : null,
    // Track between the two bars
    trackBetween:
      firstTail > gapFraction
        ? barWindow(
            width,
            cap,
            secondHead > 0 ? secondHead + gapFraction : 0,
            firstTail < 1 ? firstTail - gapFraction : 1
          )
        : null,
    // Trailing bar
    barSecond:
      secondHead - secondTail > 0
        ? barWindow(width, cap, secondTail, secondHead)
        : null,
    // Track behind the trailing bar
    trackBehind:
      secondTail > gapFraction
        ? barWindow(width, cap, 0, secondTail - gapFraction)
        : null,
  };
};

/**
 * The wave the indicator draws, as one open path across the view and a
 * wavelength past each side, so the traveling window never runs off the
 * pattern. Flat at zero amplitude, the canvas's straight bar. The phase is
 * not baked in: the path stays put and a CSS transform travels it one
 * wavelength per second, which is the same sine of (x - phase).
 */
export const linearWavePath = (
  width: number,
  height: number,
  amplitude: number,
  wavelength: number,
  wavelengthExtra = 2
): string => {
  const centerY = height / 2;
  if (amplitude <= 0 || wavelength <= 0) {
    return `M ${-wavelengthExtra * wavelength} ${centerY} L ${width + wavelengthExtra * wavelength} ${centerY}`;
  }
  // One point every wavelength/24, as the canvas sampled the sine
  const step = Math.max(1, wavelength / 24);
  const y = (x: number): number =>
    centerY +
    amplitude * Math.sin((2 * Math.PI * x) / wavelength);
  const points: string[] = [];
  for (
    let x = -wavelengthExtra * wavelength;
    x <= width + wavelengthExtra * wavelength;
    x += step
  ) {
    points.push(`${x.toFixed(2)} ${y(x).toFixed(2)}`);
  }
  return `M ${points.join(" L ")}`;
};
