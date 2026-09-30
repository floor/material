// src/components/fab-menu/stagger.ts

/**
 * The stagger of the FAB menu's items, from Compose: the number of visible
 * items animates on the SlowEffects spring (damping ratio 1, stiffness 800;
 * ExpressiveMotionTokens), as an Int with a visibility threshold of 1, and an
 * item shows while `index >= count - visible` (FloatingActionButtonMenu.kt).
 * Opening, the items appear nearest the FAB first; closing, the top one
 * leaves first.
 *
 * A critically damped spring from `from` to `to` is
 *   x(t) = to + (from - to)(1 + ωt)e^(-ωt),  ω = √stiffness.
 * The Int count is x truncated, and reaches its target once the spring is
 * within the threshold (1) of it.
 */
const OMEGA = Math.sqrt(800);

/** The fraction (1 + ωt)e^(-ωt) of the distance still to go, as a function of t in seconds. */
const remaining = (t: number): number => (1 + OMEGA * t) * Math.exp(-OMEGA * t);

/** The time, in ms, at which the remaining fraction falls to `fraction` (0 < fraction ≤ 1). */
const timeFor = (fraction: number): number => {
  if (fraction >= 1) return 0;
  let low = 0;
  let high = 1;
  for (let i = 0; i < 40; i++) {
    const mid = (low + high) / 2;
    if (remaining(mid) > fraction) low = mid;
    else high = mid;
  }
  return Math.round(high * 1000);
};

/**
 * Each item's delay in ms, in list order (index 0 is the top item, the last
 * one is nearest the FAB).
 *
 * Opening (0 → n): the item j places from the FAB (0 nearest) shows once the
 * count reaches j + 1, and the count reaches n with n - 1, within the
 * threshold. Closing (n → 0): the item j places from the FAB hides once the
 * count falls below j + 1, the last within the threshold of 0.
 */
export const staggerDelays = (count: number, opening: boolean): number[] =>
  Array.from({ length: count }, (_, index) => {
    const fromFab = count - 1 - index;
    if (opening) {
      const reached = Math.min(fromFab + 1, Math.max(count - 1, 1));
      return timeFor(1 - reached / count);
    }
    return timeFor(Math.min(fromFab + 1, count) / count);
  });
