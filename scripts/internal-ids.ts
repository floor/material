/**
 * The public-history rule: internal ticket references never ship. Comments in
 * src are copied into dist's .d.ts, .svelte and .scss files, so the guard that
 * keeps them out walks the packed files (see check-package-size.ts).
 */
const INTERNAL_ID = /FLO-\d+/g;

/** Every internal ticket reference in `text`, in the order they appear. */
export function internalIdRefs(text: string): string[] {
  return text.match(INTERNAL_ID) ?? [];
}
