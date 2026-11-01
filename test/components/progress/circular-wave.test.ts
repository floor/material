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
});
