#!/usr/bin/env bun
// scripts/conformance-issues.ts
/**
 * The public export of the conformance issues: Linear project "material" in,
 * `conformance/issues.json` out.
 *
 * The matrix (`conformance/matrix.json`) holds what each value is; this file
 * holds the work on those values — open, in progress, decided, fixed — and the
 * two join on the matrix row id. Everything here is curated for publication:
 * one entry per issue, with a public slug, its kind, component, aspects, rows,
 * status, target, the version it was fixed in, and the date it changed.
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
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { internalIdRefs } from "./internal-ids";
import { publicNameRefs } from "./public-names";

const ROOT = new URL("..", import.meta.url).pathname;
const MATRIX = resolve(ROOT, "conformance/matrix.json");
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

/** One entry of `conformance/issues.json`. */
export interface IssueEntry {
  id: string;
  title: string;
  kind: Kind;
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
  counts: { kinds: Record<string, number>; statuses: Record<string, number>; aspects: Record<string, number> };
  issues: IssueEntry[];
}

/** The row ids `conformance/matrix.json` holds, and its material version. */
export interface Matrix {
  material: string;
  rows: Set<string>;
}

export const readMatrix = async (path = MATRIX): Promise<Matrix> => {
  const text = await readFile(path, "utf8");
  return readMatrixText(text);
};

export const readMatrixText = (text: string): Matrix => {
  const data = JSON.parse(text) as { material?: string; components?: { id: string; properties?: unknown[] }[] };
  if (!Array.isArray(data.components)) throw new Error("conformance/matrix.json: no components array");
  const rows = new Set<string>();
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      if (typeof record.id === "string" && record.id.includes("/") && "property" in record) rows.add(record.id);
      for (const item of Object.values(record)) walk(item);
    }
  };
  for (const component of data.components) walk(component.properties ?? []);
  return { material: data.material ?? "unknown", rows };
};

/** The label names an issue carries that belong to the Conformance group. */
export const kindsOf = (issue: LinearIssue): Kind[] =>
  issue.labels.filter((label): label is Kind => (KINDS as readonly string[]).includes(label));

/** The first Conformance label in the group's own order, so the kind is stable. */
export const kindOf = (issue: LinearIssue): Kind | null => kindsOf(issue)[0] ?? null;

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
export const mapIssues = (issues: LinearIssue[], matrix: Matrix): IssueEntry[] => {
  const kept = issues
    .filter((issue) => !canceled(issue))
    .map((issue) => ({ issue, kind: kindOf(issue) }))
    .filter((row): row is { issue: LinearIssue; kind: Kind } => row.kind !== null)
    .sort((a, b) => a.issue.id.localeCompare(b.issue.id));

  const used = new Map<string, number>();
  const entries: IssueEntry[] = [];
  for (const { issue, kind } of kept) {
    const rows = rowsOf(issue);
    const missing = rows.filter((row) => !matrix.rows.has(row));
    if (missing.length > 0) throw new Error(`${issue.id}: matrix row(s) not in conformance/matrix.json: ${missing.join(", ")}`);
    const base = slugBaseOf(issue, rows);
    const seen = (used.get(base) ?? 0) + 1;
    used.set(base, seen);
    const status = statusOf(issue, kind);
    entries.push({
      id: seen === 1 ? base : `${base}-${seen}`,
      title: issue.title,
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

export const buildFile = (issues: LinearIssue[], matrix: Matrix, generated: string): IssueFile => {
  const entries = mapIssues(issues, matrix).sort((a, b) => a.id.localeCompare(b.id));
  return {
    schema: 1,
    generated,
    material: matrix.material,
    counts: {
      kinds: count(entries.map((entry) => entry.kind)),
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
  const matrix = await readMatrix();
  const issues = from
    ? issuesFromResponse(JSON.parse(await readFile(from, "utf8")))
    : await fetchAll(key!);
  const file = buildFile(issues, matrix, new Date().toISOString());
  const text = serialize(file);
  guard(text);
  await writeFile(OUTPUT, text);
  console.log(`conformance-issues: ${file.issues.length} issue(s) written to conformance/issues.json`);
}
