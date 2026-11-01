// test/build/publish-dist-tag.test.ts
//
// A stable publish moves `latest` only, so publish.yml's `publish` job moves
// `next` to the version it just published when the tag sorts below it (npm's
// trusted publishing, no token). Two things must hold whatever npm answers:
// the move happens when it is needed, and nothing about it can fail a job
// whose publish already happened — a refusal is a line in the run summary and
// a warning annotation, never a red run. This runs the step's own text,
// extracted from the YAML, under bash against stubbed `npm` and `curl`, on a
// throwaway tarball.
import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STEP_NAME = "Move the next dist-tag after a stable publish";

interface Step { name?: string; run?: string }
const { YAML } = Bun as unknown as { YAML: { parse(text: string): unknown } };
const workflow = YAML.parse(await Bun.file(".github/workflows/publish.yml").text()) as {
  jobs: { publish: { steps: Step[] } };
};
const step = workflow.jobs.publish.steps.find(candidate => candidate.name === STEP_NAME);

// What the network and npm would answer, as shell functions: `npm view` prints
// the version list, `npm dist-tag add` returns NPM_ADD_EXIT, curl prints
// CURL_TAGS or returns CURL_EXIT. Every call is logged for the assertions.
const PRELUDE = [
  'npm() {',
  '  echo "npm $*" >> "$STUB_LOG"',
  '  if [ "$1" = "view" ]; then',
  '    [ "${NPM_VIEW_EXIT:-0}" = "0" ] || return "$NPM_VIEW_EXIT"',
  '    printf "%s" "$NPM_VIEW"',
  '    return 0',
  '  fi',
  '  if [ "$1" = "dist-tag" ]; then',
  '    return "${NPM_ADD_EXIT:-0}"',
  '  fi',
  '  return 0',
  '}',
  'curl() {',
  '  echo "curl $*" >> "$STUB_LOG"',
  '  [ "${CURL_EXIT:-0}" = "0" ] || return "$CURL_EXIT"',
  '  printf "%s" "$CURL_TAGS"',
  '  return 0',
  '}',
].join("\n");

interface Answers {
  /** The tarball's version, and the tag that started the run. */
  version?: string;
  /** What the dist-tags endpoint answers. */
  tags?: string;
  /** What curl exits with (a registry error). */
  curlExit?: number;
  /** What `npm view material@<version> version --json` answers. */
  view?: string;
  /** What `npm view` exits with. */
  viewExit?: number;
  /** What `npm dist-tag add` exits with: 0 moves the tag, anything else is a refusal. */
  addExit?: number;
}

/** Up: the step's text under the shell GitHub runs it with, against a fresh tarball and empty logs. */
const runStep = async (answers: Answers = {}): Promise<{ code: number; stdout: string; log: string; summary: string }> => {
  const directory = await mkdtemp(join(tmpdir(), "publish-dist-tag-"));
  const version = answers.version ?? "3.3.0";
  await mkdir(join(directory, "package"));
  await Bun.write(join(directory, "package", "package.json"), JSON.stringify({ name: "material", version }));
  const tar = Bun.spawnSync(["tar", "-czf", join(directory, "material-1.tgz"), "package"], { cwd: directory });
  if (tar.exitCode !== 0) throw new Error(`tar failed: ${new Response(tar.stderr).text()}`);
  const log = join(directory, "calls.log");
  const summary = join(directory, "summary.md");
  await Bun.write(log, "");
  await Bun.write(summary, "");
  await Bun.write(join(directory, "step.sh"), `${PRELUDE}\n${step!.run!}`);
  const child = Bun.spawn(["bash", "--noprofile", "--norc", "-e", "-o", "pipefail", join(directory, "step.sh")], {
    cwd: directory,
    env: {
      ...process.env,
      STUB_LOG: log,
      GITHUB_STEP_SUMMARY: summary,
      CURL_TAGS: answers.tags ?? '{"legacy":"1.0.4","latest":"3.3.0"}',
      CURL_EXIT: String(answers.curlExit ?? 0),
      NPM_VIEW: answers.view ?? '["3.1.0","3.2.7"]',
      NPM_VIEW_EXIT: String(answers.viewExit ?? 0),
      NPM_ADD_EXIT: String(answers.addExit ?? 0),
    },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [code, stdout] = await Promise.all([child.exited, new Response(child.stdout).text()]);
  return { code, stdout, log: await Bun.file(log).text(), summary: await Bun.file(summary).text() };
};

describe("publish.yml's next dist-tag move", () => {
  test("the step is there", () => {
    expect(step, `publish.yml has no step named "${STEP_NAME}"`).toBeDefined();
  });

  test("a next below the published version is moved to it", async () => {
    const { code, stdout, log, summary } = await runStep({
      tags: '{"legacy":"1.0.4","latest":"3.2.7","next":"3.1.0"}',
      view: '["3.0.0","3.1.0","3.2.0","3.2.7"]',
    });
    expect(code).toBe(0);
    expect(log).toContain("npm view material@<3.3.0 version --json");
    expect(log).toContain("npm dist-tag add material@3.3.0 next");
    expect(summary).toContain("Moved next from 3.1.0 to 3.3.0");
    expect(stdout).not.toContain("::warning");
  });

  test("a refused move does not fail the job: it is reported in the summary and as a warning", async () => {
    const { code, stdout, log, summary } = await runStep({
      tags: '{"legacy":"1.0.4","latest":"3.2.7","next":"3.1.0"}',
      view: '["3.0.0","3.1.0","3.2.0","3.2.7"]',
      addExit: 1,
    });
    expect(code).toBe(0);
    expect(log).toContain("npm dist-tag add material@3.3.0 next");
    expect(stdout).toContain("::warning title=next dist-tag::");
    expect(summary).toContain("npm refused to move the next dist-tag from 3.1.0 to 3.3.0");
    expect(summary).toContain("Allow npm dist-tag");
  });

  test("a next above the published version is left alone", async () => {
    const { code, log, summary } = await runStep({
      tags: '{"legacy":"1.0.4","latest":"3.2.7","next":"3.4.0-next.0"}',
      view: '["3.0.0","3.1.0","3.2.0","3.2.7"]',
    });
    expect(code).toBe(0);
    expect(log).toContain("npm view material@<3.3.0 version --json");
    expect(log).not.toContain("npm dist-tag add");
    expect(summary).not.toContain("Moved next");
  });

  test("no next tag at all is nothing to do, and npm is not asked", async () => {
    const { code, log, summary } = await runStep({ tags: '{"legacy":"1.0.4","latest":"3.3.0"}' });
    expect(code).toBe(0);
    expect(log).toContain("curl");
    expect(log).not.toContain("npm ");
    expect(summary).toBe("");
  });

  test("a prerelease publish never touches the tag", async () => {
    const { code, log, summary } = await runStep({ version: "3.4.0-next.0" });
    expect(code).toBe(0);
    expect(log).toBe("");
    expect(summary).toBe("");
  });

  test("an unreadable registry is reported, not failed", async () => {
    const { code, log, summary } = await runStep({ curlExit: 22 });
    expect(code).toBe(0);
    expect(summary).toContain("could not be read");
    expect(log).not.toContain("npm ");
  });

  test("an unreadable version list is reported, not failed", async () => {
    const { code, log, summary } = await runStep({
      tags: '{"legacy":"1.0.4","latest":"3.2.7","next":"3.1.0"}',
      viewExit: 1,
    });
    expect(code).toBe(0);
    expect(summary).toContain("could not list");
    expect(log).not.toContain("npm dist-tag add");
  });
});
