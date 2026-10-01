// A corner as the stylesheets write it since FLO-330: the M3 corner token, with the
// compiled radius as the fallback. The steps are M3's shape scale (ShapeTokens).
const STEPS: Record<number, string> = {
  0: 'none', 4: 'extra-small', 8: 'small', 12: 'medium',
  16: 'large', 20: 'large-increased', 28: 'extra-large', 32: 'extra-large-increased',
  48: 'extra-extra-large', 9999: 'full',
};

/** `var(--mtrl-sys-shape-corner-<step>, <px>px)` for a radius on the scale */
export const corner = (px: number): string => {
  const step = STEPS[px];
  if (!step) throw new Error(`${px}px is not on the shape scale`);
  return `var(--mtrl-sys-shape-corner-${step}, ${px}px)`;
};
