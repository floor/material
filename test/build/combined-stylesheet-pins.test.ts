// test/build/combined-stylesheet-pins.test.ts
import { describe, expect, test } from "bun:test";

import { defaultPayloadDrift } from "../../scripts/stylesheet-pins";

const pinned = {
  "elements/styles.js": "combined elements",
  "styles.css": "combined CSS",
  "styles/menu.css": "menu CSS",
  "components/menu/features/keyboard.js": "menu keyboard",
};

describe("pull request stylesheet pins", () => {
  test("allows both combined payloads to change", () => {
    expect(defaultPayloadDrift({
      ...pinned, "elements/styles.js": "updated elements", "styles.css": "updated CSS",
    }, pinned)).toEqual([]);
  });

  test("still checks component hashes and the default payload inventory", () => {
    const changed = {
      "elements/styles.js": "updated elements",
      "styles/menu.css": "updated menu",
      "components/menu/features/keyboard.js": "updated keyboard",
      "styles/new.css": "added payload",
    };
    expect(defaultPayloadDrift(changed, pinned)).toEqual([
      "~ components/menu/features/keyboard.js: updated keyboard",
      "- styles.css",
      "~ styles/menu.css: updated menu",
      "+ styles/new.css: added payload",
    ]);
  });
});

type Step = { run?: string; if?: string; "continue-on-error"?: boolean };
type Job = {
  if?: string;
  needs?: string | string[];
  steps: Step[];
  "continue-on-error"?: boolean;
};
type Workflow = { on: Record<string, unknown>; jobs: Record<string, Job> };

const { YAML } = Bun as unknown as { YAML: { parse(text: string): unknown } };
const readWorkflow = async (name: string): Promise<Workflow> =>
  YAML.parse(await Bun.file(`.github/workflows/${name}.yml`).text()) as Workflow;
const command = "bun run combined-stylesheet-pins:check";

const expectStrictCheck = (job: Job) => {
  const steps = job.steps.filter(step => step.run === command);
  expect(steps).toHaveLength(1);
  const step = steps[0]!;
  const buildIndex = job.steps.findIndex(candidate => candidate.run === "bun run build");
  expect(buildIndex).toBeGreaterThanOrEqual(0);
  expect(job.steps.indexOf(step)).toBeGreaterThan(buildIndex);
  expect(step.if).toBeUndefined();
  expect(step["continue-on-error"]).toBeUndefined();
  expect(job["continue-on-error"]).toBeUndefined();
};

describe("combined stylesheet pin workflows", () => {
  test("checks nightly or on demand on main after building", async () => {
    const workflow = await readWorkflow("combined-stylesheet-pins");
    expect(Object.keys(workflow.on)).toEqual(["schedule", "workflow_dispatch"]);
    expect(workflow.on.schedule).toHaveLength(1);
    expect(workflow.jobs.verify!.if).toBe("github.ref == 'refs/heads/main'");
    expectStrictCheck(workflow.jobs.verify!);
  });

  test("requires the check in release verification before staging the package", async () => {
    const workflow = await readWorkflow("publish");
    const verify = workflow.jobs.verify!;
    expect(verify.if).toBeUndefined();
    expectStrictCheck(verify);
    const checkIndex = verify.steps.findIndex(step => step.run === command);
    const stageIndex = verify.steps.findIndex(step => step.run === "bun scripts/stage-package.ts");
    expect(stageIndex).toBeGreaterThan(checkIndex);
    expect(workflow.jobs.publish!.needs).toBe("verify");
  });

  test("keeps the packed Sass check in pull request CI", async () => {
    const workflow = await readWorkflow("ci");
    const runs = Object.values(workflow.jobs).flatMap(job => job.steps.map(step => step.run));
    expect(runs).toContain("bun run styles-package:check");
    expect(runs).not.toContain(command);
  });
});
