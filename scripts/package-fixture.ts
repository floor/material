import assert from "node:assert/strict";
import { cp, mkdtemp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function run(command: string[], cwd = process.cwd()) {
  const child = Bun.spawn(command, { cwd, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  assert.equal(code, 0, `${command.join(" ")} failed:\n${stdout}\n${stderr}`);
  return stdout;
}

/** The step of publish.yml that turns the checkout into what npm packs. */
export const PUBLISH_STEP = "The published manifest and README";

// Bun parses YAML; the installed @types/bun does not declare it yet.
const { YAML } = Bun as unknown as { YAML: { parse(text: string): unknown } };

/** The commands of that step, as the workflow file has them. */
export async function publishStepCommands(): Promise<string> {
  const workflow = YAML.parse(await Bun.file(".github/workflows/publish.yml").text()) as {
    jobs: { publish: { steps: { name?: string; run?: string }[] } };
  };
  const step = workflow.jobs.publish.steps.find(candidate => candidate.name === PUBLISH_STEP);
  assert(step?.run, `publish.yml has no step named "${PUBLISH_STEP}" with a run script`);
  return step.run;
}

/**
 * Install the npm tarball without dependencies or network access.
 *
 * The tarball is the one a release publishes, not the working tree's: what npm
 * packs from the root (the manifest's `files`, package.json, README.md and
 * LICENSE) is copied to a staging directory, publish.yml's own step runs there
 * (it strips the manifest and puts npm-readme.md in README.md's place), and
 * npm packs the result. The working tree is never written.
 */
export async function createPackageFixture() {
  const directory = await realpath(await mkdtemp(join(tmpdir(), "mtrl-consumer-")));
  const cleanup = () => rm(directory, { recursive: true, force: true });
  try {
    const stage = join(directory, "stage");
    const manifest = await Bun.file("package.json").json() as { files: string[] };
    for (const path of [...manifest.files, "package.json", "README.md", "npm-readme.md", "LICENSE"]) {
      await cp(path, join(stage, path), { recursive: true });
    }
    // As GitHub runs a step: bash, stopping at the first failing command.
    await run(["bash", "--noprofile", "--norc", "-eo", "pipefail", "-c", await publishStepCommands()], stage);
    const [pack] = JSON.parse(await run([
      "npm", "pack", "--ignore-scripts", "--json", "--pack-destination", directory,
      "--cache", join(directory, "npm-cache"),
    ], stage));
    const installed = join(directory, "node_modules/material");
    await mkdir(installed, { recursive: true });
    await run(["tar", "-xzf", join(directory, pack.filename), "-C", installed, "--strip-components=1"]);
    await writeFile(join(directory, "package.json"), '{"type":"module"}');
    return { directory, installed, pack, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
