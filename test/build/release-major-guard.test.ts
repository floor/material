// test/build/release-major-guard.test.ts
//
// release.yml is also the release workflow of the `material` repository, whose
// npm package has an old 1.x line published from the v1 branch. npm's trusted
// publisher cannot tell the two lines apart (it knows the repository and this
// file's name, not the branch), so the file must refuse what is not its own:
// its step refuses a material version below 3. This runs the step's own text,
// extracted from the YAML, under `sh` against temporary package.json files.
import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const STEP_NAME = "A material release is 3.0.0 or later";

interface Step { name?: string; run?: string }
const { YAML } = Bun as unknown as { YAML: { parse(text: string): unknown } };
const workflow = YAML.parse(await Bun.file(".github/workflows/release.yml").text()) as { jobs: { publish: { steps: Step[] } } };
const step = workflow.jobs.publish.steps.find(candidate => candidate.name === STEP_NAME);

/** Runs the step's text under `sh`, with `name` and `version` written to a package.json in a fresh directory. */
const runStep = async (name: string, version: string): Promise<{ code: number; stdout: string; stderr: string }> => {
  const directory = await mkdtemp(join(tmpdir(), "release-major-"));
  try {
    await Bun.write(join(directory, "package.json"), JSON.stringify({ name, version }));
    await Bun.write(join(directory, "step.sh"), step!.run!);
    const child = Bun.spawn(["sh", join(directory, "step.sh")], { cwd: directory, stdout: "pipe", stderr: "pipe" });
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    return { code, stdout, stderr };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

describe("release.yml's material major guard", () => {
  test("the step is there", () => {
    expect(step, `release.yml has no step named "${STEP_NAME}"`).toBeDefined();
  });

  // The package name decides: `mtrl` publishes any version, `material` only 3
  // and later. 10.0.0 must pass too: only the majors 0, 1 and 2 are refused.
  const CASES = [
    { name: "mtrl", version: "1.0.0", publishes: true },
    { name: "mtrl", version: "0.10.7", publishes: true },
    { name: "material", version: "3.0.0", publishes: true },
    { name: "material", version: "3.0.0-next.0", publishes: true },
    { name: "material", version: "1.0.5", publishes: false },
    { name: "material", version: "2.9.9", publishes: false },
    { name: "material", version: "0.1.0", publishes: false },
    { name: "material", version: "10.0.0", publishes: true },
  ];

  for (const { name, version, publishes } of CASES) {
    test(`${name} ${version} ${publishes ? "publishes" : "is refused"}`, async () => {
      const { code, stdout, stderr } = await runStep(name, version);
      if (publishes) {
        expect(code).toBe(0);
        expect(stdout).toBe("");
        expect(stderr).toBe("");
      } else {
        expect(code).toBe(1);
        expect(stdout).toBe("");
        expect(stderr).toContain(name);
        expect(stderr).toContain(version);
        expect(stderr).toContain("the 1.x line is published from the v1 branch");
      }
    });
  }
});
