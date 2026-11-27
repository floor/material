// test/build/main-ci-proof.test.ts
import { expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { verifyMainCi, type MainPush, type MergeProof } from "../../scripts/main-ci-proof";

const sha = (digit: string) => digit.repeat(40);

function fixture() {
  const push: MainPush = {
    ref: "refs/heads/main", before: sha("a"), after: sha("b"),
    created: false, deleted: false, forced: false, repository: { id: 7, full_name: "owner/library" },
  };
  const pull = {
    number: 42, merged_at: "2026-11-27T15:30:00Z", merge_commit_sha: push.after,
    base: { ref: "main", repo: { id: 7 } },
    head: { ref: "fix/example", sha: sha("c"), repo: { id: 7 } },
    body: "Size: generated wording explains the delta",
  };
  const run = {
    id: 85, repository: { id: 7 }, head_repository: { id: 7 },
    path: ".github/workflows/ci.yml", event: "pull_request",
    status: "completed", conclusion: "success", updated_at: "2026-11-27T15:29:00Z",
    head_sha: pull.head.sha, head_branch: pull.head.ref,
  };
  const sizeBase = { tag: "v3.16.10", commit: sha("d") };
  const proof: MergeProof = {
    run: run.id, pull: pull.number, head: pull.head.sha, merge: sha("e"),
    body: createHash("sha256").update(pull.body).digest("hex"), sizeTag: sizeBase.tag, sizeBase: sizeBase.commit,
  };
  const main = { sha: push.after, tree: { sha: sha("f") }, parents: [{ sha: push.before }, { sha: pull.head.sha }] };
  const tested = { ...main, sha: proof.merge, tree: { ...main.tree } };
  const state = { push, pull, run, main, tested, sizeBase, proof, receiptAvailable: true, apiAvailable: true, mergedPullAvailable: true };
  const evidence = {
    async api<T>(path: string): Promise<T> {
      if (!state.apiAvailable) throw new Error("GitHub API unavailable");
      const prefix = "repos/owner/library/";
      const [route, query] = path.slice(prefix.length).split("?");
      expect(path).toStartWith(prefix);
      switch (route) {
        case `commits/${push.after}/pulls`: return (state.mergedPullAvailable ? [pull] : []) as T;
        case `git/commits/${push.after}`: return main as T;
        case `git/commits/${proof.merge}`: return tested as T;
        case "actions/workflows/ci.yml/runs":
          expect(Object.fromEntries(new URLSearchParams(query))).toEqual({
            event: "pull_request", branch: pull.head.ref, head_sha: pull.head.sha,
            created: `<=${pull.merged_at}`, per_page: "1",
          });
          return { workflow_runs: [run] } as T;
        default: throw new Error(`Unexpected request ${path}`);
      }
    },
    async receipt(runId: number) {
      expect(runId).toBe(run.id);
      if (!state.receiptAvailable) throw new Error("expired artifact");
      return proof;
    },
    async sizeBase(before: string) {
      expect(before).toBe(push.before);
      return sizeBase;
    },
  };
  return { state, check: () => verifyMainCi(push, evidence) };
}

test("reuses green CI on the final PR merge ref with the same tree and size inputs", async () => {
  const { check } = fixture();
  expect(await check()).toEqual({ covered: true, run: 85, pull: 42, tree: sha("f") });
});

test.each<[string, (state: ReturnType<typeof fixture>["state"]) => void]>([
  ["the tested tree differs", state => { state.tested.tree.sha = sha("0"); }],
  ["the receipt is missing", state => { state.receiptAvailable = false; }],
  ["an API call fails", state => { state.apiAvailable = false; }],
  ["the push has no merged PR", state => { state.mergedPullAvailable = false; }],
  ["the push spans more than one merge", state => { state.push.before = sha("0"); }],
  ["the latest exact-head run was cancelled", state => { state.run.conclusion = "cancelled"; }],
  ["the latest run is still in progress", state => { state.run.status = "in_progress"; }],
  ["CI finished after the merge", state => { state.run.updated_at = "2026-11-27T15:30:01Z"; }],
  ["the run tested an older PR head", state => { state.run.head_sha = sha("0"); }],
  ["the PR and its successful run are from a fork", state => {
    state.pull.head.repo.id = 8;
    state.run.head_repository.id = 8;
  }],
  ["the workflow run head is from another repository", state => { state.run.head_repository.id = 8; }],
  ["the receipt is for a different PR", state => { state.proof.pull = 43; }],
  ["the size tag changed", state => { state.sizeBase.tag = "v3.16.11"; }],
  ["the size tag points to a different commit", state => { state.sizeBase.commit = sha("0"); }],
  ["the PR size explanation was removed", state => { state.pull.body = ""; }],
  ["the push was forced", state => { state.push.forced = true; }],
])("runs full CI when %s", async (_reason, invalidate) => {
  const { state, check } = fixture();
  invalidate(state);
  expect(await check()).toMatchObject({ covered: false });
});
