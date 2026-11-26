#!/usr/bin/env bun
// scripts/conformance-issues.ts
/**
 * The public export of the conformance issues: Linear project "material" in,
 * `conformance/issues.json` out.
 *
 * The export is every issue of the project, curated for publication: one
 * entry per issue, with a public slug, its type and kind, component, aspects,
 * rows, status, target, the version it was fixed in, and the date it changed.
 * `rows` is plain data — the matrix row ids an issue names — and this script
 * neither reads the matrix nor checks the ids against it.
 *
 * No description text, comment, URL, person or tracker id leaves Linear. The
 * slug is derived from the first matrix row the issue names, so it survives a
 * title change; an issue that names no row gets the component and a kebab of
 * its title.
 *
 * The output passes the repository's own guards before it is written:
 * `internalIdRefs` from scripts/internal-ids.ts and `publicNameRefs` from
 * scripts/public-names.ts, so a tracker id or a team name in a title fails the
 * run instead of reaching the page.
 *
 *   LINEAR_API_KEY=… bun run scripts/conformance-issues.ts
 *   bun run scripts/conformance-issues.ts --from analysis/linear-issues.json
 *
 * With no `LINEAR_API_KEY` and no `--from`, it exits 2 and names the variable.
 * `--from` reads a saved GraphQL response instead of the network.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { internalIdRefs } from "./internal-ids";
import { publicNameRefs } from "./public-names";

const ROOT = new URL("..", import.meta.url).pathname;
const OUTPUT = resolve(ROOT, "conformance/issues.json");

/** The Conformance label group the export keeps. A bug carries none of them. */
export const KINDS = ["drift-spec", "drift-compose", "drift-both", "reference-conflict", "deviation", "api-gap"] as const;
export type Kind = (typeof KINDS)[number];

export type Status = "open" | "in-progress" | "fixed" | "decision-needed" | "kept";
export type Target = "next-patch" | "next-minor" | null;

/** One Linear issue, as much of it as the mapping reads. */
export interface LinearIssue {
  /** The tracker's own id; a key for ordering duplicate slugs, never published. */
  id: string;
  title: string;
  description: string | null;
  updatedAt: string;
  state: { name: string; type: string };
  labels: string[];
  milestone: string | null;
}

export type Type = "bug" | "conformance" | "improvement" | "feature";

/** One entry of `conformance/issues.json`. */
export interface IssueEntry {
  id: string;
  title: string;
  type: Type;
  kind: Kind | null;
  component: string;
  aspects: string[];
  rows: string[];
  status: Status;
  target: Target;
  fixed: { version: string | null } | null;
  decision: null;
  reference: null;
  github: null;
  updated: string;
}

export interface IssueFile {
  schema: 1;
  generated: string;
  material: string;
  counts: { types: Record<string, number>; kinds: Record<string, number>; statuses: Record<string, number>; aspects: Record<string, number> };
  issues: IssueEntry[];
}

/** The repository's package version, for the file's `material` field. */
export const materialVersion = async (): Promise<string> => {
  const manifest = JSON.parse(await readFile(resolve(ROOT, "package.json"), "utf8")) as { version?: string };
  return manifest.version ?? "unknown";
};

/** The label names an issue carries that belong to the Conformance group. */
export const kindsOf = (issue: LinearIssue): Kind[] =>
  issue.labels.filter((label): label is Kind => (KINDS as readonly string[]).includes(label));

/** The first Conformance label in the group's own order, so the kind is stable. */
export const kindOf = (issue: LinearIssue): Kind | null => kindsOf(issue)[0] ?? null;

/** What kind of issue it is: a conformance one keeps its kind; the rest fall to their label. */
export const typeOf = (issue: LinearIssue): Type => {
  if (kindOf(issue) !== null) return "conformance";
  const labels = issue.labels.map((label) => label.toLowerCase());
  if (labels.includes("bug")) return "bug";
  if (labels.includes("feature") || labels.includes("enhancement")) return "feature";
  return "improvement";
};

/** `Matrix rows: a, b, c` on a line of the description. */
export const rowsOf = (issue: LinearIssue): string[] => {
  const match = /^[ \t]*Matrix rows:[ \t]*([^\n]+)$/im.exec(issue.description ?? "");
  if (!match) return [];
  return match[1]!
    .split(",")
    .map((row) => row.trim())
    .filter(Boolean);
};

/** A `component/<name>` label, or `all`. */
export const componentOf = (issue: LinearIssue): string => {
  if (issue.labels.includes("all")) return "all";
  const component = issue.labels.find((label) => label.startsWith("component/"));
  return component ? component.slice("component/".length) : "all";
};

export const aspectsOf = (issue: LinearIssue): string[] =>
  issue.labels
    .filter((label) => label.startsWith("aspect/"))
    .map((label) => label.slice("aspect/".length))
    .sort();

/** The release version in a `release/3.16.8` or `v3.16.8` label, or in the milestone. */
export const releaseOf = (issue: LinearIssue): string | null => {
  const version = /^(?:release\/)?v?(\d+\.\d+\.\d+(?:-[a-z]+\.\d+)?)$/i;
  for (const label of issue.labels) {
    const match = version.exec(label);
    if (match) return match[1]!;
  }
  const milestone = version.exec(issue.milestone ?? "");
  return milestone ? milestone[1]! : null;
};

/** A canceled issue names no work that remains, so it is dropped from the export. */
export const canceled = (issue: LinearIssue): boolean =>
  ["canceled", "cancelled"].includes(issue.state.type.toLowerCase()) || issue.state.name.toLowerCase() === "canceled";

export const statusOf = (issue: LinearIssue, kind: Kind): Status => {
  const state = issue.state;
  const type = state.type.toLowerCase();
  const name = state.name.toLowerCase();
  if (type === "completed" || name === "done") return "fixed";
  if (kind === "reference-conflict" && /decision/.test(name)) return "decision-needed";
  if (kind === "deviation") return "kept";
  if (type === "started" || name === "in progress") return "in-progress";
  return "open";
};

export const targetOf = (issue: LinearIssue): Target => {
  const milestone = (issue.milestone ?? "").toLowerCase();
  if (milestone.startsWith("next patch")) return "next-patch";
  if (milestone.startsWith("next minor")) return "next-minor";
  return null;
};

const kebab = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** The slug base: the first matrix row's component and property, else the title. */
export const slugBaseOf = (issue: LinearIssue, rows: string[]): string => {
  const first = rows[0];
  if (first) {
    const parts = first.split("/");
    if (parts.length >= 2 && parts[0] && parts[1]) return `${kebab(parts[0])}/${kebab(parts[1])}`;
  }
  const component = componentOf(issue);
  const title = issue.title.includes(":") ? issue.title.slice(issue.title.indexOf(":") + 1) : issue.title;
  return `${kebab(component)}/${kebab(title)}`;
};

/** Maps the kept issues to entries, with slugs deduplicated in tracker-id order. */
export const mapIssues = (issues: LinearIssue[]): IssueEntry[] => {
  const kept = issues
    .filter((issue) => !canceled(issue))
    .sort((a, b) => a.id.localeCompare(b.id));

  const used = new Map<string, number>();
  const entries: IssueEntry[] = [];
  for (const issue of kept) {
    const rows = rowsOf(issue);
    const kind = kindOf(issue);
    const base = slugBaseOf(issue, rows);
    const seen = (used.get(base) ?? 0) + 1;
    used.set(base, seen);
    const status = kind === null ? (issue.state.type.toLowerCase() === "completed" ? "fixed" : "open") : statusOf(issue, kind);
    entries.push({
      id: seen === 1 ? base : `${base}-${seen}`,
      title: issue.title,
      type: typeOf(issue),
      kind,
      component: componentOf(issue),
      aspects: aspectsOf(issue),
      rows: [...rows].sort(),
      status,
      target: targetOf(issue),
      fixed: status === "fixed" ? { version: releaseOf(issue) } : null,
      decision: null,
      reference: null,
      github: null,
      updated: issue.updatedAt.slice(0, 10),
    });
  }
  return entries;
};

const count = (values: string[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const value of [...values].sort()) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
};

export const buildFile = (issues: LinearIssue[], material: string, generated: string): IssueFile => {
  const entries = mapIssues(issues).sort((a, b) => a.id.localeCompare(b.id));
  return {
    schema: 1,
    generated,
    material,
    counts: {
      types: count(entries.map((entry) => entry.type)),
      kinds: count(entries.flatMap((entry) => (entry.kind === null ? [] : [entry.kind]))),
      statuses: count(entries.map((entry) => entry.status)),
      aspects: count(entries.flatMap((entry) => entry.aspects)),
    },
    issues: entries,
  };
};

/** Serializes deterministically: two runs on the same data differ only in `generated`. */
export const serialize = (file: IssueFile): string => `${JSON.stringify(file, null, 2)}\n`;

/** The repository's own public-text guards, run over the file before it is written. */
export const guard = (text: string): void => {
  const ids = internalIdRefs(text);
  if (ids.length > 0) throw new Error(`the export carries a tracker id: ${ids.join(", ")}`);
  const names = publicNameRefs(text);
  if (names.length > 0) throw new Error(`the export carries a team name: ${names.join(", ")}`);
};

/** Reads the issues out of a Linear GraphQL response, or a saved one. */
export const issuesFromResponse = (response: unknown): LinearIssue[] => {
  const data = response as { data?: { issues?: { nodes?: unknown[] } }; issues?: { nodes?: unknown[] } };
  const nodes = data.data?.issues?.nodes ?? data.issues?.nodes;
  if (!Array.isArray(nodes)) throw new Error("the response holds no issues.nodes array");
  return nodes.map((node) => {
    const record = node as {
      id: string;
      title?: string;
      description?: string | null;
      updatedAt?: string;
      state?: { name?: string; type?: string };
      labels?: { nodes?: { name?: string }[] } | string[];
      projectMilestone?: { name?: string } | null;
    };
    const labels = Array.isArray(record.labels)
      ? record.labels
      : (record.labels?.nodes ?? []).map((label) => label.name ?? "").filter(Boolean);
    return {
      id: record.id,
      title: record.title ?? "",
      description: record.description ?? null,
      updatedAt: record.updatedAt ?? new Date(0).toISOString(),
      state: { name: record.state?.name ?? "", type: record.state?.type ?? "" },
      labels,
      milestone: record.projectMilestone?.name ?? null,
    };
  });
};

const QUERY = `query ConformanceIssues($after: String) {
  issues(first: 100, after: $after, filter: { project: { name: { eq: "material" } } }) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id
      title
      description
      updatedAt
      state { name type }
      labels { nodes { name } }
      projectMilestone { name }
    }
  }
}`;

const fetchAll = async (key: string): Promise<LinearIssue[]> => {
  const all: unknown[] = [];
  let after: string | null = null;
  for (;;) {
    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: key },
      body: JSON.stringify({ query: QUERY, variables: { after } }),
    });
    if (!response.ok) throw new Error(`Linear answered ${response.status}`);
    const body = (await response.json()) as {
      data?: { issues?: { pageInfo?: { hasNextPage?: boolean; endCursor?: string }; nodes?: unknown[] } };
      errors?: { message?: string }[];
    };
    if (body.errors?.length) throw new Error(`Linear: ${body.errors.map((error) => error.message).join("; ")}`);
    const issues = body.data?.issues;
    all.push(...(issues?.nodes ?? []));
    if (!issues?.pageInfo?.hasNextPage) break;
    after = issues.pageInfo.endCursor ?? null;
  }
  return issuesFromResponse({ issues: { nodes: all } });
};

if (import.meta.main) {
  const fromIndex = process.argv.indexOf("--from");
  const from = fromIndex === -1 ? null : process.argv[fromIndex + 1];
  const key = process.env.LINEAR_API_KEY;
  if (!from && !key) {
    console.error("conformance-issues: set LINEAR_API_KEY (or pass --from <file>)");
    process.exit(2);
  }
  const issues = from
    ? issuesFromResponse(JSON.parse(await readFile(from, "utf8")))
    : await fetchAll(key!);
  const file = buildFile(issues, await materialVersion(), new Date().toISOString());
  const text = serialize(file);
  guard(text);
  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, text);
  console.log(`conformance-issues: ${file.issues.length} issue(s) written to conformance/issues.json`);
}
