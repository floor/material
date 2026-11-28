// test/build/release-tag-branch.test.ts
import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface Step { run?: string }
const { YAML } = Bun as unknown as { YAML: { parse(text: string): unknown } };
const workflow = YAML.parse(await Bun.file(".github/workflows/publish.yml").text()) as {
  jobs: { verify: { steps: Step[] } };
};
const guard = workflow.jobs.verify.steps.find(step => step.run?.includes('git merge-base --is-ancestor "$GITHUB_SHA"'))?.run;

let root: string;
const commits: Record<string, string> = {};
const git = (args: string[]): string => {
  const result = Bun.spawnSync(["git", "-c", "commit.gpgsign=false", ...args], {
    cwd: root,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: "Release fixture",
      GIT_AUTHOR_EMAIL: "release@example.invalid",
      GIT_COMMITTER_NAME: "Release fixture",
      GIT_COMMITTER_EMAIL: "release@example.invalid",
    },
    stdin: Buffer.alloc(0),
  });
  if (result.exitCode !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
};

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "release-tag-branch-"));
  git(["init", "--quiet"]);
  const tree = git(["mktree"]);
  commits.main = git(["commit-tree", tree, "-m", "main"]);
  for (const ref of ["next", "other"]) {
    commits[ref] = git(["commit-tree", tree, "-p", commits.main, "-m", ref]);
  }
  for (const [ref, commit] of Object.entries(commits)) {
    git(["update-ref", `refs/remotes/origin/${ref}`, commit]);
  }
});

afterAll(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

for (const { tag, ref, expected } of [
  { tag: "v3.16.12", ref: "main", expected: 0 },
  { tag: "v3.16.12", ref: "next", expected: 1 },
  { tag: "v3.17.0-next.0", ref: "main", expected: 0 },
  { tag: "v3.17.0-next.0", ref: "next", expected: 0 },
  { tag: "v3.17.0-next.0", ref: "other", expected: 1 },
]) {
  test(`${tag} on ${ref} ${expected === 0 ? "passes" : "is refused by"} the release branch gate`, () => {
    expect(guard, "publish.yml must verify the tagged commit's ancestry").toBeDefined();
    const result = Bun.spawnSync(["bash", "--noprofile", "--norc", "-e", "-o", "pipefail", "-c", guard!], {
      cwd: root,
      env: { ...process.env, GITHUB_SHA: commits[ref], GITHUB_REF_NAME: tag },
    });
    if (result.exitCode !== expected) {
      throw new Error(`exit ${result.exitCode}, expected ${expected}\n${result.stdout}${result.stderr}`);
    }
  }, 30_000);
}
