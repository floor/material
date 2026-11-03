import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The public-text rule: the team never names itself in the repository everyone
 * reads. check-internal-ids.ts keeps the tracker's ids out of the tracked
 * files; this keeps the team's own names out of them too.
 *
 * The list below is public, so it holds only names this repository has already
 * published — in its commit history — and generic seat forms. A name that has
 * not appeared publicly stays out: listing it here would publish it.
 *
 * The plain role words (reviewer, tester, implementer, builder) are ordinary
 * English and stay legal anywhere. The numbered and hyphenated forms are not:
 * `reviewer-2` names a seat, while "a reviewer reads those" names a role.
 * `operator` and `orchestrator` are ordinary English too (a language operator,
 * a theatre's orchestrator), so only the forms that point at a seat match —
 * a determiner right before the word, a possessive, a seat suffix, or a team
 * address. The role word of the standard `**Agent:** <model> · <role>`
 * trailer is always allowed.
 */

/** Persona names, whole words. Case-sensitive: they are proper nouns. */
export const personaNames = ["Priam", "Atlas", "Argus", "Helenus", "Teucer", "Orion", "Hermes"];

const PERSONA = new RegExp(`\\b(?:${personaNames.join("|")})\\b`, "g");

/** Seat names: a role with a suffix, e.g. reviewer-2 or implementer-kimi. */
const SEAT = /\b(?:reviewer|tester|implementer|builder)-[a-z0-9][a-z0-9-]*\b/gi;

/**
 * The role words used as seat names. `\s+` between the determiner and the word
 * is what keeps "the spread operator" out: only a bare "the operator" matches,
 * and only the seat forms carry a suffix or an address.
 */
const ROLE_SEATS = [
  /\b(?:the|a|an)\s+(?:Floor\s+)?(?:operator|orchestrator)\b/gi,
  /\b(?:operator|orchestrator)'s\b/gi,
  /\b(?:operator|orchestrator)[-@][a-z0-9][a-z0-9-]*\b/gi,
];

/** The standard agent signature: `**Agent:** <model> · <role>`. */
const AGENT_LINE = /^\*\*Agent:\*\*/;
const AGENT_ROLE = /\s·\s*[\w-]+\s*$/;

/** The file that must spell the names to do its job. */
export const exemptFiles = ["scripts/public-names.ts"];

export interface NameFinding {
  file: string;
  line: number;
  text: string;
}

/** Every name in `text`, in the order they appear. */
export function publicNameRefs(text: string): string[] {
  const refs: Array<{ at: number; text: string }> = [];
  for (const match of text.matchAll(PERSONA)) refs.push({ at: match.index ?? 0, text: match[0] });
  for (const match of text.matchAll(SEAT)) refs.push({ at: match.index ?? 0, text: match[0] });
  // The trailer's role word is part of the signature, not a seat reference.
  const roles = AGENT_LINE.test(text) ? text.replace(AGENT_ROLE, "") : text;
  for (const pattern of ROLE_SEATS) {
    for (const match of roles.matchAll(pattern)) refs.push({ at: match.index ?? 0, text: match[0] });
  }
  return refs.sort((a, b) => a.at - b.at).map(ref => ref.text);
}

/** Names in one file's text. */
export function scanPublicNames(file: string, text: string): NameFinding[] {
  const findings: NameFinding[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (publicNameRefs(lines[i]).length === 0) continue;
    findings.push({ file, line: i + 1, text: lines[i].trim() });
  }
  return findings;
}

/**
 * Names in every tracked file under `root`. The repository is its tracked
 * files: `.git` and the build output (dist/, node_modules/) are not part of it.
 */
export function scanTrackedTree(root: string): NameFinding[] {
  const files = execFileSync("git", ["-C", root, "ls-files", "-z"], { encoding: "utf8" })
    .split("\0")
    .filter(Boolean);
  const findings: NameFinding[] = [];
  for (const file of files) {
    if (exemptFiles.includes(file)) continue;
    const bytes = readFileSync(resolve(root, file));
    if (bytes.includes(0)) continue; // a binary file
    findings.push(...scanPublicNames(file, bytes.toString("utf8")));
  }
  return findings;
}
