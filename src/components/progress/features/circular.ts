// src/components/progress/features/circular.ts
//
// The circular indicator's geometry, after Compose ProgressIndicator.kt and
// WavyProgressIndicator.kt: an arc from 12 o'clock clockwise, a track around
// the rest with a gap at both ends of the arc, and, when indeterminate, an
// arc that grows and shrinks as it turns. The indeterminate indicator keeps
// its track too, as m3.material.io shows it ("indeterminate progress
// indicators move along a fixed track") and as the Expressive
// CircularWavyProgressIndicator draws it: around the rest of the circle,
// turning with the arc, never waved.
//
// Lengths come as fractions of the circumference in the same units a
// pathLength of 100 gives stroke-dasharray, so the same numbers place the
// geometry whether it is drawn to a context or expressed as dashes. The
// indeterminate motion itself is CSS keyframes; the formulas here are what
// those keyframes and the dash math must agree with, and what the tests
// check them against.

import { circularIndeterminateFrame } from "./motion";
import { PROGRESS_MEASUREMENTS, PROGRESS_WAVE } from "../constants";

const TWO_PI = Math.PI * 2;

/** The gap that clears both round caps of an arc, in pathLength-100 units */
export const circularGapUnits = (strokeWidth: number, size: number): number =>
  size > 0 ? (100 * circularGapPx(strokeWidth)) / (Math.PI * size) : 0;

/** The same gap in view pixels (TrackActiveSpace + stroke) */
export const circularGapPx = (strokeWidth: number): number =>
  PROGRESS_MEASUREMENTS.CIRCULAR.GAP + strokeWidth;

/** The radius the ring sits at: the box minus the stroke and the wave room */
export const circularRadius = (
  size: number,
  strokeWidth: number,
  waveAmplitude: number
): number => size / 2 - strokeWidth / 2 - waveAmplitude;

/** One drawn arc, as dash units of a pathLength-100 circle */
export interface Arc {
  /** The dash length */
  dash: number;
  /** Where the dash starts along the path; 0 is 12 o'clock */
  offset: number;
}

/** What a determinate circular indicator draws */
export interface CircularDeterminateGeometry {
  /** The active arc from 12 o'clock; null when nothing shows */
  indicator: Arc | null;
  /** The track around the rest; null when the arc leaves no room */
  track: Arc | null;
}

/**
 * The determinate circular indicator at a value: the arc from 12 o'clock,
 * and the track around the rest with a gap clearing each round cap. Both
 * guards are the canvas's own: nothing at 0, no track at full.
 */
export const circularDeterminate = (
  progress: number,
  strokeWidth: number,
  size: number
): CircularDeterminateGeometry => {
  const value = Math.min(1, Math.max(0, progress));
  const sweep = value * 100;
  const gap = Math.min(sweep, circularGapUnits(strokeWidth, size));
  const trackSweep = 100 - sweep - gap * 2;
  return {
    indicator: sweep > 0 ? { dash: sweep, offset: 0 } : null,
    track: trackSweep > 0 ? { dash: trackSweep, offset: -(sweep + gap) } : null,
  };
};

/** What an indeterminate circular indicator draws at a time */
export interface CircularIndeterminateGeometry {
  /** How far the whole ring has turned, in degrees from 12 o'clock */
  rotation: number;
  /** The active arc, as at a determinate value */
  indicator: Arc | null;
  /** The track around the rest, turning with the arc */
  track: Arc | null;
}

/**
 * The indeterminate circular indicator at a time, from the same
 * circularIndeterminateFrame the canvas drew by: the rotation the CSS
 * spin and kick keyframes compose to, and the two arcs as dashes.
 */
export const circularIndeterminate = (
  strokeWidth: number,
  size: number,
  time: number
): CircularIndeterminateGeometry => {
  const { rotation, sweep } = circularIndeterminateFrame(time);
  const arcSweep = sweep * 100;
  const gap = Math.min(arcSweep, circularGapUnits(strokeWidth, size));
  const trackSweep = 100 - arcSweep - gap * 2;
  return {
    rotation,
    indicator: { dash: arcSweep, offset: 0 },
    track: trackSweep > 0 ? { dash: trackSweep, offset: -(arcSweep + gap) } : null,
  };
};

/**
 * The wavy ring: a full circle of the radial sine the indicator draws,
 * starting at 3 o'clock, where a circle element's own stroke begins.
 * Flat at zero amplitude, the canvas's plain arc.
 * The phase is not baked in: the pattern stays put and a CSS rotation
 * travels it one wavelength per second, which over a circle is the same
 * sine of (arc - phase).
 */
export const circularWaveRing = (
  size: number,
  radius: number,
  amplitude: number,
  wavelength: number
): string => {
  const cx = size / 2;
  const cy = size / 2;
  const scale = size / PROGRESS_MEASUREMENTS.CIRCULAR.SIZE;
  const lambda = wavelength * scale;
  if (radius <= 0) return "";
  if (amplitude <= 0 || lambda <= 0) {
    // A plain circle in the two-arc form, from 3 o'clock — the base a
    // circle element's own stroke starts from, so the dial's rotation and
    // the dash conventions read the same on both. Both arcs bend about the
    // centre: their endpoints sit a diameter apart through it.
    const x = cx + radius;
    const y = cy;
    return `M ${x} ${y} A ${radius} ${radius} 0 1 1 ${cx - radius} ${y} A ${radius} ${radius} 0 1 1 ${x} ${y} Z`;
  }
  // One point every wavelength/24 of arc, as the canvas sampled the sine
  const arcLength = TWO_PI * radius;
  const steps = Math.max(8, Math.ceil(arcLength / Math.max(1, lambda / 24)));
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    // From 3 o'clock clockwise, as the circle element's stroke runs
    const angle = (TWO_PI * i) / steps;
    const along = (TWO_PI * radius * i) / steps;
    const r = radius + amplitude * Math.sin((TWO_PI * along) / lambda);
    points.push(`${(cx + Math.cos(angle) * r).toFixed(2)} ${(cy + Math.sin(angle) * r).toFixed(2)}`);
  }
  // The closing point is the first point of the next period; close there
  return `M ${points.join(" L ")} Z`;
};

/** The wavelength of the circular wave, in view pixels at this size */
export const circularWaveWavelength = (size: number): number =>
  PROGRESS_WAVE.CIRCULAR.WAVELENGTH * (size / PROGRESS_MEASUREMENTS.CIRCULAR.SIZE);

/**
 * How far round the wave pattern travels in its one-second loop, in
 * degrees: one wavelength of arc at the ring's radius.
 */
export const circularWaveRotation = (radius: number, size: number): number =>
  radius > 0 ? (circularWaveWavelength(size) / radius) * (180 / Math.PI) : 0;
