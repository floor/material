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
 * The wave's phase map round the ring, in cycles at each angle. The
 * measurements figure labels the wavelength itself — 15 at every size it
 * draws — and the amplitude 1.6, and names no period count or closure
 * rule; its own wave rides an open arc and never closes. So the page fixes
 * the wavelength and the amplitude, and how a closed ring meets itself is
 * this implementation's choice: the ring holds floor(2πR/λ) periods in
 * all — all but the last at the labelled wavelength, the last carrying
 * the circumference's remainder as extra length. The closing period
 * always runs long — a wavelength and change, never a squeezed one — so
 * the wave never oscillates faster there than its labelled wavelength
 * paints it anywhere else. The sine then completes whole cycles round the
 * ring and meets itself at the resting radius, where a ring of the
 * nominal wavelength alone would leave its last period torn open at the
 * seam.
 */
const circularWaveShape = (radius: number, size: number) => {
  const lambda = circularWaveWavelength(size);
  const periods = circularWavePeriods(radius, size);
  // The angle the whole nominal periods run through, and the angle left
  // for the closing period to fill.
  const nominal = (Math.max(1, periods - 1) * lambda) / radius;
  const closing = TWO_PI - nominal;
  const cyclesAt = (angle: number): number =>
    angle <= nominal
      ? (radius * angle) / lambda
      : periods - 1 + (angle - nominal) / closing;
  const rateAt = (angle: number): number =>
    angle <= nominal ? radius / lambda : 1 / closing;
  return { cyclesAt, rateAt };
};

/**
 * The wavy path's arc table: the distance travelled along the curve at each
 * of `samples` equal angles round the ring, and the total. The wave runs
 * longer where it climbs than where it rides the circle, so distance and
 * angle drift apart round the ring, and this table is the one translation
 * between them — the ring's own points and the slide's own steps both read
 * it back.
 */
const circularWaveArcTable = (
  radius: number,
  amplitude: number,
  size: number,
  samples: number
): { arcs: Float64Array; total: number } => {
  const { cyclesAt, rateAt } = circularWaveShape(radius, size);
  const radiusAt = (angle: number): number =>
    radius + amplitude * Math.sin(TWO_PI * cyclesAt(angle));
  const speedAt = (angle: number): number =>
    Math.hypot(
      radiusAt(angle),
      amplitude * TWO_PI * rateAt(angle) * Math.cos(TWO_PI * cyclesAt(angle))
    );
  const arcs = new Float64Array(samples + 1);
  let total = 0;
  for (let i = 1; i <= samples; i++) {
    const a = (TWO_PI * (i - 1)) / samples;
    const b = (TWO_PI * i) / samples;
    total += ((speedAt(a) + speedAt(b)) / 2) * (b - a);
    arcs[i] = total;
  }
  return { arcs, total };
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
  if (radius <= 0) return "";
  if (amplitude <= 0 || wavelength <= 0) {
    // A plain circle in the two-arc form, from 3 o'clock — the base a
    // circle element's own stroke starts from, so the dial's rotation and
    // the dash conventions read the same on both. Both arcs bend about the
    // centre: their endpoints sit a diameter apart through it.
    const x = cx + radius;
    const y = cy;
    return `M ${x} ${y} A ${radius} ${radius} 0 1 1 ${cx - radius} ${y} A ${radius} ${radius} 0 1 1 ${x} ${y} Z`;
  }
  // The token wavelength does not divide the ring: the circumference over
  // it is not a whole number, and a sine that stops mid-period leaves the
  // ring open where it meets itself, which the closing line would cut
  // straight across — a notch travelling round the ring once a second,
  // where the canvas, which draws the arc alone and never closes the ring,
  // has none. The page fixes the wavelength and the amplitude and names no
  // closure rule, so the closure is this implementation's choice: the ring
  // holds floor(2πR/λ) periods in all, all but the last at the labelled
  // wavelength, and the last carries the remainder as extra length —
  // running long, up to two wavelengths, rather than squeezed, so the ink
  // never crowds at the seam: the sine completes whole cycles and the
  // closing Z is a point, with the closing period's slope gentler through
  // its zero crossings than its neighbours', a kink the width of the
  // sample spacing and far below the ink's own thickness.
  // The canvas placed the arc's ends by angle; the sheet places them by dash
  // units, which the browser measures as fractions of the path's own length.
  // On a ring sampled at equal angles — as the canvas sampled the sine — a
  // unit spans more angle where the wave runs diagonal than where it runs
  // circular, so a window of dash units wobbled degrees off its rotation as
  // the wave traveled underneath it. Sampling the same curve at equal
  // distances along it makes one unit the same angle everywhere, which is
  // what the travel rotation and its dash slide cancel between them: the
  // canvas's angle math, held by the path itself.
  //
  // Cut the table's total into equal slices and read each point's angle back
  // at its slice line: the points sit equal arc apart to the table's own
  // precision, and the last lands on the first — the sine completes whole
  // periods now, so the closing Z is a point.
  const { cyclesAt } = circularWaveShape(radius, size);
  const { arcs, total } = circularWaveArcTable(radius, amplitude, size, 2048);
  const steps = Math.max(8, Math.round(total / Math.max(1, circularWaveWavelength(size) / 24)));
  const slice = total / steps;
  const points: string[] = [];
  let at = 0;
  for (let i = 0; i <= steps; i++) {
    // From 3 o'clock clockwise, as the circle element's stroke runs. The
    // last slice line is the table's total: slice * steps can round a hair
    // above it, which would walk the scan past the table's end and divide
    // by a cell that is not there, so the target clamps to the total.
    const target = Math.min(total, slice * i);
    while (arcs[at + 1]! < target) at++;
    const angle = (TWO_PI * (at + (target - arcs[at]!) / (arcs[at + 1]! - arcs[at]!))) / 2048;
    const r = radius + amplitude * Math.sin(TWO_PI * cyclesAt(angle));
    points.push(`${(cx + Math.cos(angle) * r).toFixed(2)} ${(cy + Math.sin(angle) * r).toFixed(2)}`);
  }
  return `M ${points.join(" L ")} Z`;
};

/**
 * The dash offsets the ring's slide passes through at equal steps of its
 * loop, `count` of them between zero and the full shift — the point list
 * the slide's linear() easing reads, each point tagged with its loop
 * fraction by the caller. The closing period breaks the pattern's
 * symmetry round the ring, so the loop is a whole revolution and the
 * slide runs the ring's full length: one pathLength unit returns exactly
 * where it began. Each step holds the window to an equal angle of that
 * turn, and equal angles are not equal distances on the wavy curve, so
 * each reads the arc table — measured backward from where the pattern
 * meets itself, which is the stretch the window's start has actually
 * slid through. The first stretch forward from 3 o'clock is not the same
 * arc any more: the closing period makes the ring asymmetric, and reading
 * the wrong way lagged the window three degrees behind its rotation. The
 * easing joins these with straight segments, which holds the window still
 * to a fifth of a degree at the worst size the factory admits.
 */
export const circularWaveDashSteps = (
  radius: number,
  amplitude: number,
  size: number,
  count: number
): number[] => {
  const { arcs, total } = circularWaveArcTable(radius, amplitude, size, 512);
  const arcAt = (angle: number): number => {
    const x = (angle / TWO_PI) * 512;
    const i = Math.min(511, Math.floor(x));
    return arcs[i]! + (arcs[i + 1]! - arcs[i]!) * (x - i);
  };
  const steps: number[] = [];
  for (let k = 1; k <= count; k++) {
    const angle = TWO_PI - (TWO_PI * k) / (count + 1);
    steps.push(Number((((100 * (total - arcAt(angle))) / total)).toFixed(3)));
  }
  return steps;
};

/** The nominal wavelength of the circular wave, in view pixels at this size */
export const circularWaveWavelength = (size: number): number =>
  PROGRESS_WAVE.CIRCULAR.WAVELENGTH * (size / PROGRESS_MEASUREMENTS.CIRCULAR.SIZE);

/**
 * The number of periods the ring holds in all: the circumference over the
 * nominal wavelength, floored — N−1 of them at the nominal wavelength and
 * one closing period that carries the remainder as extra length. The
 * closing period runs between one and two wavelengths, never less: a
 * remainder absorbed by squeezing (rounding up) would crowd the wave's
 * ink at the seam and bend its arc-length curve harder than the nominal
 * wavelength bends it anywhere, which the dash window's staged slide
 * could not follow; running long keeps the closing period's curvature
 * inside the nominal one's everywhere.
 */
export const circularWavePeriods = (radius: number, size: number): number =>
  Math.max(1, Math.floor((TWO_PI * radius) / circularWaveWavelength(size)));

/**
 * How long the wave pattern's whole loop takes, in milliseconds: the ring
 * holds 2πR/λ wavelengths and the travel crosses one wavelength per
 * second, so the loop is the ring's full revolution at that rate. The
 * closing period makes the pattern non-periodic round the ring — the loop
 * cannot shortcut to a wavelength's own angle — so the rotation and the
 * dash slide that cancels it share this one duration.
 */
export const circularWaveLoopMs = (radius: number, size: number): number =>
  radius > 0 ? (1000 * TWO_PI * radius) / circularWaveWavelength(size) : 1000;
