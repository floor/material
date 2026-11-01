// test/components/progress/circular-wave.test.ts
//
// The wavy circular ring is built by slicing the arc table into equal
// distances; the last slice line can round a hair past the table's total,
// which once walked the scan past the table's end and emitted a trailing
// "L NaN NaN" — a vertex Chromium drops, leaving the seam open. The sweep
// covers every integer size the factory admits (the config clamps to
// MIN_SIZE..MAX_SIZE) against every integer thickness 2..12, which spans the
// named thin and thick choices and the numeric values the corpus samples,
// and asserts two things per pair: the path data holds only finite
// coordinates, and the ring closes — the final point lands on the first.
import { describe, test, expect } from "bun:test";
import {
  circularWaveRing,
  circularRadius,
} from "../../../src/components/progress/features/circular";
import { getWaveAmplitude } from "../../../src/components/progress/features/view";
import {
  PROGRESS_MEASUREMENTS,
  PROGRESS_WAVE,
} from "../../../src/components/progress/constants";

describe("the wavy circular ring's path", () => {
  test("is finite and closed at every integer size and thickness", () => {
    const { MIN_SIZE, MAX_SIZE } = PROGRESS_MEASUREMENTS.CIRCULAR;
    const nonFinite: string[] = [];
    const openSeams: string[] = [];
    for (let size = MIN_SIZE; size <= MAX_SIZE; size++) {
      for (let stroke = 2; stroke <= 12; stroke++) {
        const amplitude = getWaveAmplitude(true, stroke, size);
        const radius = circularRadius(size, stroke, amplitude);
        const d = circularWaveRing(
          size,
          radius,
          amplitude,
          PROGRESS_WAVE.CIRCULAR.WAVELENGTH
        );
        if (/NaN|Infinity/.test(d)) {
          nonFinite.push(`size ${size} stroke ${stroke}`);
          continue;
        }
        // The first two numbers are the M point, the last two the final
        // vertex before Z, in both the wavy polyline and the flat two-arc
        // form (an arc command's last two numbers are its endpoint).
        const n = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
        const seam = Math.hypot(n[0]! - n.at(-2)!, n[1]! - n.at(-1)!);
        if (seam > 0.05) openSeams.push(`size ${size} stroke ${stroke}: ${seam.toFixed(3)}px`);
      }
    }
    expect(nonFinite, `${nonFinite.length} sizes emit non-finite path data: ${nonFinite.slice(0, 5).join(", ")}`).toEqual([]);
    expect(openSeams, `${openSeams.length} sizes leave the seam open: ${openSeams.slice(0, 5).join(", ")}`).toEqual([]);
  });

  // The measurements figure labels the wavelength itself — 15 at every size
  // it draws — and names no period count, so the wavelength is the fixed
  // thing: every crest must sit one labelled wavelength of arc from the
  // last, all the way round, except the one closing period that absorbs the
  // circumference's remainder so the sine can complete whole cycles and
  // close. The whole-period snap instead re-pitched every period to
  // 2πR/N — at size 240 / thickness 2 that dragged the last nominal crest
  // 25.6 px round the ring — which is what this catches.
  test("holds the labelled wavelength at every crest but the closing period", () => {
    const { MIN_SIZE, MAX_SIZE, SIZE } = PROGRESS_MEASUREMENTS.CIRCULAR;
    const TWO_PI = Math.PI * 2;
    const bad: string[] = [];
    for (let size = MIN_SIZE; size <= MAX_SIZE; size++) {
      for (let stroke = 2; stroke <= 12; stroke++) {
        const amplitude = getWaveAmplitude(true, stroke, size);
        const radius = circularRadius(size, stroke, amplitude);
        // The labelled wavelength and the ring it must close on, from the
        // constants the figure states, not from the ring builder's own math
        const lambda = PROGRESS_WAVE.CIRCULAR.WAVELENGTH * (size / SIZE);
        const periods = Math.max(1, Math.floor((TWO_PI * radius) / lambda));
        const nominal = ((periods - 1) * lambda) / radius;
        const closing = TWO_PI - nominal;
        // Where crest j belongs: cycles j + 0.25 through the shape — inside
        // the nominal stretch while that is a whole cycle away, into the
        // closing period for the last one
        const crestAngle = (j: number): number => {
          const cycles = j + 0.25;
          return cycles <= periods - 1
            ? (cycles * lambda) / radius
            : nominal + (cycles - (periods - 1)) * closing;
        };

        const d = circularWaveRing(size, radius, amplitude, PROGRESS_WAVE.CIRCULAR.WAVELENGTH);
        const pts = [...d.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((m) => [
          Number(m[1]),
          Number(m[2]),
        ]);
        // The path repeats its first point before the closing Z; drop it
        if (pts.length > 1) pts.pop();
        const cx = size / 2;
        const cy = size / 2;
        const radii = pts.map(([x, y]) => Math.hypot(x - cx, y - cy));
        const crests: number[] = [];
        for (let i = 1; i < radii.length - 1; i++) {
          if (radii[i]! > radii[i - 1]! && radii[i]! >= radii[i + 1]!) crests.push(i);
        }
        if (crests.length !== periods) {
          bad.push(`size ${size} stroke ${stroke}: ${crests.length} crests, expected ${periods}`);
          continue;
        }
        crests.forEach((i, j) => {
          // The crest's own place, refined through its neighbours: the
          // samples sit a wavelength's twenty-fourth apart, so the sampled
          // maximum alone is coarse by more than the tolerance
          const r0 = radii[i - 1]!;
          const r1 = radii[i]!;
          const r2 = radii[i + 1]!;
          const denom = r0 - 2 * r1 + r2;
          const t = denom === 0 ? 0 : (0.5 * (r0 - r2)) / denom;
          const u = (1 + t) / 2;
          const x = pts[i - 1]![0] + (pts[i + 1]![0] - pts[i - 1]![0]) * u;
          const y = pts[i - 1]![1] + (pts[i + 1]![1] - pts[i - 1]![1]) * u;
          const angle = Math.atan2(y - cy, x - cx);
          const off = Math.abs(angle - crestAngle(j));
          const arc = radius * Math.min(off, TWO_PI - off);
          if (arc > 1) bad.push(`size ${size} stroke ${stroke}: crest ${j} off by ${arc.toFixed(2)}px`);
        });
      }
    }
    expect(bad, `${bad.length} rings misplace a crest: ${bad.slice(0, 5).join("; ")}`).toEqual([]);
  });
});
