// scripts/stylesheet-pins.ts
import { createHash } from "node:crypto";

export const combinedStylesheetPayloads = ["elements/styles.js", "styles.css"] as const;

export const stylesheetPayloadDigest = (text: string): string =>
  createHash("sha256").update(text.replace(/^\/\*! material v[^\n]*\*\/\n?/, "")).digest("hex");

/** Compare the packed inventory and the hashes checked on every pull request. */
export const defaultPayloadDrift = (
  payloads: Record<string, string>,
  pinned: Record<string, string>,
): string[] => {
  const drifted: string[] = [];
  for (const path of [...new Set([...Object.keys(pinned), ...Object.keys(payloads)])].sort()) {
    const actual = payloads[path];
    const expected = pinned[path];
    if (actual === expected) continue;
    if (actual !== undefined && expected !== undefined &&
      combinedStylesheetPayloads.some(combined => combined === path)) continue;
    drifted.push(actual === undefined ? `- ${path}` : expected === undefined ? `+ ${path}: ${actual}` : `~ ${path}: ${actual}`);
  }
  return drifted;
};
