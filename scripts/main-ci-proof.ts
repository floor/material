// scripts/main-ci-proof.ts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { appendFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const artifact = "pr-merge-proof";
const receiptFile = `${artifact}.json`;
const sha = /^[0-9a-f]{40}$/;
const positiveId = (id: number): boolean => Number.isSafeInteger(id) && id > 0;
const bodyHash = (body: string | null): string => createHash("sha256").update(body ?? "").digest("hex");

interface Commit {
  sha: string;
  tree: { sha: string };
  parents: { sha: string }[];
}

interface Pull {
  number: number;
  merged_at: string | null;
  merge_commit_sha: string;
  base: { ref: string; repo: { id: number } };
  head: { sha: string; ref: string; repo: { id: number } | null };
  body: string | null;
}

export interface MainPush {
  ref: string;
  before: string;
  after: string;
  created: boolean;
  deleted: boolean;
  forced: boolean;
  repository: { id: number; full_name: string };
}

interface Run {
  id: number;
  event: string;
  path: string;
  status: string;
  conclusion: string | null;
  head_sha: string;
  head_branch: string;
  head_repository?: { id: number };
  repository: { id: number };
  updated_at: string;
}

export interface MergeProof {
  run: number;
  pull: number;
  head: string;
  merge: string;
  body: string;
  sizeTag: string;
  sizeBase: string;
}

interface Evidence {
  api<T>(path: string): Promise<T>;
  receipt(run: number): Promise<MergeProof>;
  sizeBase(before: string): Promise<{ tag: string; commit: string }>;
}

const parentsMatch = (commit: Commit, before: string, head: string): boolean =>
  commit.parents.length === 2 && commit.parents[0].sha === before && commit.parents[1].sha === head;

/** Reuse the final PR CI only when the push and size check have the same inputs. */
export async function verifyMainCi(push: MainPush, evidence: Evidence) {
  try {
    assert(push.ref === "refs/heads/main" && push.created === false && push.deleted === false && push.forced === false,
      "this is not a regular push to main");
    assert(sha.test(push.before) && sha.test(push.after) && positiveId(push.repository.id), "push identity is missing");
    const root = `repos/${push.repository.full_name}`;
    const pulls = await evidence.api<Pull[]>(`${root}/commits/${push.after}/pulls?per_page=100`);
    const candidates = pulls.filter(pull => pull.merge_commit_sha === push.after && pull.merged_at &&
      pull.base.ref === "main" && pull.base.repo.id === push.repository.id);
    assert(candidates.length === 1, "no unique merged pull request for the push");
    const [pull] = candidates;
    assert(positiveId(pull.number) && sha.test(pull.head.sha) && pull.head.repo && positiveId(pull.head.repo.id),
      "the final PR head is missing");
    assert(pull.body === null || typeof pull.body === "string", "the PR body is missing");

    const commit = await evidence.api<Commit>(`${root}/git/commits/${push.after}`);
    assert(commit.sha === push.after && sha.test(commit.tree.sha) && parentsMatch(commit, push.before, pull.head.sha),
      "the push is not a single merge of the PR's final head");

    const query = new URLSearchParams({
      event: "pull_request", branch: pull.head.ref, head_sha: pull.head.sha,
      created: `<=${pull.merged_at}`, per_page: "1",
    });
    const { workflow_runs: [run] } = await evidence.api<{ workflow_runs: Run[] }>(`${root}/actions/workflows/ci.yml/runs?${query}`);
    assert(run && positiveId(run.id) && run.event === "pull_request" && run.path === ".github/workflows/ci.yml" &&
      run.repository.id === push.repository.id && run.head_sha === pull.head.sha && run.head_branch === pull.head.ref &&
      run.head_repository?.id === pull.head.repo.id && run.status === "completed" && run.conclusion === "success" &&
      Date.parse(run.updated_at) <= Date.parse(pull.merged_at ?? ""), "the latest CI on the final PR head was not green before merge");

    const proof = await evidence.receipt(run.id);
    assert(proof.run === run.id && proof.pull === pull.number && proof.head === pull.head.sha && sha.test(proof.merge),
      "the size proof is not for this PR and run");
    const tested = await evidence.api<Commit>(`${root}/git/commits/${proof.merge}`);
    assert(tested.sha === proof.merge && parentsMatch(tested, push.before, pull.head.sha) && tested.tree.sha === commit.tree.sha,
      "the tested PR merge tree does not match main");
    const { tag, commit: sizeBase } = await evidence.sizeBase(push.before);
    assert(tag === proof.sizeTag && sha.test(sizeBase) && sizeBase === proof.sizeBase && proof.body === bodyHash(pull.body),
      "the size gate inputs have changed");
    return { covered: true as const, run: run.id, pull: pull.number, tree: tested.tree.sha };
  } catch (error) {
    return { covered: false as const, reason: error instanceof Error ? error.message : "proof unavailable" };
  }
}

async function command(args: string[]): Promise<string> {
  const child = Bun.spawn(args, { stdout: "pipe", stderr: "ignore", signal: AbortSignal.timeout(15_000) });
  const [output, code] = await Promise.all([new Response(child.stdout).text(), child.exited]);
  assert.equal(code, 0, `${args[0]} could not read the evidence`);
  return output.trim();
}

async function recordProof(): Promise<void> {
  const { GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_RUN_ID, GITHUB_SHA, MTRL_SIZE_TAG, MTRL_SIZE_BASE_SHA } = process.env;
  assert(GITHUB_EVENT_NAME === "pull_request" && GITHUB_EVENT_PATH);
  assert(MTRL_SIZE_TAG && MTRL_SIZE_BASE_SHA && sha.test(MTRL_SIZE_BASE_SHA));
  const event = await Bun.file(GITHUB_EVENT_PATH).json() as { number: number; pull_request: Pull };
  const merge = await command(["git", "rev-parse", "HEAD"]);
  const run = Number(GITHUB_RUN_ID);
  assert(positiveId(run) && positiveId(event.number) && merge === GITHUB_SHA && sha.test(event.pull_request.head.sha));
  const proof: MergeProof = {
    run, pull: event.number, head: event.pull_request.head.sha, merge, body: bodyHash(event.pull_request.body),
    sizeTag: MTRL_SIZE_TAG, sizeBase: MTRL_SIZE_BASE_SHA,
  };
  await Bun.write(`analysis/${receiptFile}`, JSON.stringify(proof));
}

async function checkPush(): Promise<void> {
  const { GITHUB_EVENT_NAME, GITHUB_EVENT_PATH, GITHUB_OUTPUT, GITHUB_REPOSITORY, GITHUB_SHA, GITHUB_STEP_SUMMARY } = process.env;
  assert(GITHUB_EVENT_NAME === "push" && GITHUB_EVENT_PATH && GITHUB_OUTPUT && GITHUB_REPOSITORY);
  const event = await Bun.file(GITHUB_EVENT_PATH).json() as MainPush;
  assert(event.after === GITHUB_SHA && event.repository.full_name === GITHUB_REPOSITORY, "push does not match the workflow");
  const result = await verifyMainCi(event, {
    async api<T>(path: string): Promise<T> {
      return JSON.parse(await command(["gh", "api", path])) as T;
    },
    async receipt(run): Promise<MergeProof> {
      const dir = await mkdtemp(join(tmpdir(), "material-main-ci-"));
      try {
        await command(["gh", "run", "download", String(run), "--repo", GITHUB_REPOSITORY, "--name", artifact, "--dir", dir]);
        return await Bun.file(join(dir, receiptFile)).json() as MergeProof;
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    },
    async sizeBase(before) {
      if (await command(["git", "rev-parse", "--is-shallow-repository"]) === "true") {
        await command(["git", "fetch", "--quiet", "--unshallow", "--tags", "origin"]);
      }
      const tag = await command(["git", "describe", "--tags", "--match", "v*", "--abbrev=0", before]);
      const commit = await command(["git", "rev-parse", `${tag}^{commit}`]);
      return { tag, commit };
    },
  });
  if (!result.covered) {
    console.log(`Full CI: ${result.reason}`);
    return;
  }
  const note = `Reusing green CI [${result.run}](https://github.com/${GITHUB_REPOSITORY}/actions/runs/${result.run}) for PR #${result.pull}. Tree \`${result.tree}\` and size gate inputs match.`;
  console.log(note);
  if (GITHUB_STEP_SUMMARY) await appendFile(GITHUB_STEP_SUMMARY, `${note}\n`);
  await appendFile(GITHUB_OUTPUT, "covered=true\n");
}

if (import.meta.main) {
  try {
    await (process.argv[2] === "record" ? recordProof() : checkPush());
  } catch (error) {
    console.log(`CI proof unavailable: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}
