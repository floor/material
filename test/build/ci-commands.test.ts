// test/build/ci-commands.test.ts
import { describe, expect, test } from "bun:test";

// What CI runs on every pull request. The jobs can be split, merged or reordered
// to make a run faster, and this list must come out the same: a check that moves
// stays in it, a check that is dropped fails here. Adding a check to CI adds it
// to this list in the same change.
const COMMANDS = [
  // static
  "ts:check", "lint", "test:naming", "test:types",
  // tests
  "bun test",
  // build, and the checks that read the built package
  "build", "elements-css:check", "tooling:check", "classes:check", "ssr-consumer:check", "size:check", "size",
  "adapters:size",
  // the browser checks
  "elements:check", "shadow-styles:check",
  "react:check", "react-ssr:check", "vue:check", "svelte:check", "svelte-ssr:check", "vue-ssr:check", "solid-ssr:check", "solid:check",
  // A second Solid SSR run after installing the supported peer floor.
  "solid-ssr:check",
  // A second Vue SSR run after installing the supported peer floor.
  "vue-ssr:check",
  "consumer:check", "tabs:check", "slider:check", "drawer:check", "navigation-bar:check", "navigation-rail:check",
  "core:check", "preupgrade:check", "tokens:check", "ssr:check",
];

interface Step { name?: string; run?: string; if?: string; "continue-on-error"?: unknown }
interface Job {
  needs?: string | string[];
  if?: string;
  "continue-on-error"?: unknown;
  steps: Step[];
  strategy?: { matrix?: { include?: Record<string, string>[] } };
}

// Bun parses YAML; the installed @types/bun does not declare it yet.
const { YAML } = Bun as unknown as { YAML: { parse(text: string): unknown } };
const workflow = YAML.parse(await Bun.file(".github/workflows/ci.yml").text()) as { jobs: Record<string, Job> };
const scripts = (await Bun.file("package.json").json()).scripts as Record<string, string>;

// The commands of one step: `bun test`, `bun run <script>`, and the scripts of a
// `for script in …` loop, whose list is written out or comes from the matrix.
const commandsOf = (job: Job, step: Step): string[] => {
  const found = new Set<string>();
  for (const line of (step.run ?? "").split("\n").map(text => text.trim())) {
    if (line === "bun test") found.add(line);
    const single = /^bun run ([\w:-]+)$/.exec(line);
    if (single) found.add(single[1]);
    const loop = /^for script in (.+); do$/.exec(line);
    if (!loop) continue;
    const key = /^\$\{\{ matrix\.(\w+) \}\}$/.exec(loop[1]);
    const lists = key ? (job.strategy?.matrix?.include ?? []).map(entry => entry[key[1]]) : [loop[1]];
    for (const list of lists) for (const script of list.split(/\s+/)) found.add(script);
  }
  return [...found];
};

// These version-specific runs are intentionally scoped to one matrix group. Keep
// the exception narrow: the tests below pin each condition, install and ordering.
const solidFloor = workflow.jobs.browser.steps.find(step => step.name === "Solid SSR at the peer floor (1.8.0)");
const vueFloor = workflow.jobs.browser.steps.find(step => step.name === "Vue SSR at the peer floor (3.3.0)");
const floorSteps = new Set([solidFloor, vueFloor]);
const ran = Object.values(workflow.jobs).flatMap(job => job.steps.flatMap(step => commandsOf(job, step)));

describe("CI (.github/workflows/ci.yml)", () => {
  test("runs every command of the list with its expected count", () => {
    expect([...ran].sort()).toEqual([...COMMANDS].sort());
  });

  test("runs Solid SSR at the peer floor after the adapters' current-version checks", () => {
    const browser = workflow.jobs.browser;
    expect(browser.strategy?.matrix?.include?.filter(entry => entry.group === "adapters")).toHaveLength(1);
    const adapters = browser.strategy?.matrix?.include?.find(entry => entry.group === "adapters");
    expect(adapters?.checks.split(/\s+/)).toContain("solid-ssr:check");
    expect(solidFloor).toBeDefined();
    expect(solidFloor?.if).toBe("matrix.group == 'adapters'");
    expect(solidFloor?.run?.trim()).toBe(
      "bun add --no-save --ignore-scripts solid-js@1.8.0\nbun run solid-ssr:check",
    );
    const current = browser.steps.findIndex(step => step.run?.includes("for script in ${{ matrix.checks }}; do"));
    expect(current).toBeGreaterThanOrEqual(0);
    expect(browser.steps.indexOf(solidFloor!)).toBeGreaterThan(current);
  });

  test("runs Vue SSR at the peer floor after the adapters' current-version checks", () => {
    const browser = workflow.jobs.browser;
    expect(browser.strategy?.matrix?.include?.filter(entry => entry.group === "adapters")).toHaveLength(1);
    const adapters = browser.strategy?.matrix?.include?.find(entry => entry.group === "adapters");
    expect(adapters?.checks.split(/\s+/)).toContain("vue-ssr:check");
    expect(vueFloor).toBeDefined();
    expect(vueFloor?.if).toBe("matrix.group == 'adapters'");
    expect(vueFloor?.run?.trim()).toBe(
      "bun add --no-save --ignore-scripts vue@3.3.0 @vue/server-renderer@3.3.0\nbun run vue-ssr:check",
    );
    const current = browser.steps.findIndex(step => step.run?.includes("for script in ${{ matrix.checks }}; do"));
    expect(current).toBeGreaterThanOrEqual(0);
    expect(browser.steps.indexOf(vueFloor!)).toBeGreaterThan(current);
  });

  test("runs only scripts that package.json defines", () => {
    expect(ran.filter(command => command !== "bun test" && !(command in scripts))).toEqual([]);
  });

  // A command that may be skipped, or may fail without failing its job, still
  // appears in the list above and no longer checks anything.
  test("runs them unconditionally, and their failure fails the job", () => {
    const loose: string[] = [];
    for (const [name, job] of Object.entries(workflow.jobs)) {
      const steps = job.steps.filter(step => commandsOf(job, step).length);
      if (!steps.length) continue;
      if (job.if !== undefined) loose.push(`${name}: if`);
      if (job["continue-on-error"] !== undefined) loose.push(`${name}: continue-on-error`);
      for (const step of steps) {
        const command = commandsOf(job, step).join(" ");
        if (step.if !== undefined && !floorSteps.has(step)) loose.push(`${name} (${command}): if`);
        if (step["continue-on-error"] !== undefined) loose.push(`${name} (${command}): continue-on-error`);
      }
    }
    expect(loose).toEqual([]);
  });

  test("gates the required `check` status on every other job", () => {
    const { check, ...jobs } = workflow.jobs;
    expect([check.needs].flat().sort()).toEqual(Object.keys(jobs).sort());
    const gate = check.steps.map(step => step.run ?? "").join("\n");
    for (const job of Object.keys(jobs)) expect(gate).toContain(`[ '\${{ needs.${job}.result }}' = success ]`);
  });
});
