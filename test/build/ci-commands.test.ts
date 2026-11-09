// test/build/ci-commands.test.ts
import { describe, expect, test } from "bun:test";

// What CI runs on every pull request. The jobs can be split, merged or reordered
// to make a run faster, and this list must come out the same: a check that moves
// stays in it, a check that is dropped fails here. Adding a check to CI adds it
// to this list in the same change.
const COMMANDS = [
  // static
  "ts:check", "lint", "test:naming", "test:types", "ids:check", "public-names:check", "name:check",
  // tests
  "bun test",
  // build, and the checks that read the built package
  "build", "dist-modules:check", "syntax:check", "elements-css:check", "tooling:check", "classes:check", "ssr-comments:check", "ssr-consumer:check", "declaration-docs:check", "declaration-exports:check", "size:check", "readme:check", "notice:check", "docs-imports:check", "styles-package:check", "size",
  "adapters:size",
  // the browser checks
  "elements:check:a", "elements:check:b", "shadow-styles:check",
  "react:check", "react-ssr:check", "vue:check", "svelte:check", "svelte-ssr:check", "vue-ssr:check", "solid-ssr:check", "solid:check",
  // the same SSR checks on the lowest peer version package.json allows
  "solid-ssr:floor", "vue-ssr:floor",
  "react-types:check", "vue-types:check", "solid-types:check", "svelte-types:check",
  "react-types:floor", "vue-types:floor", "solid-types:floor", "svelte-types:floor",
  "consumer:check", "tabs:check", "slider:check", "tooltip:check", "drawer:check", "navigation-bar:check", "navigation-rail:check", "carousel:check", "toolbar-card:check", "split-button:check", "select:check", "progress:check", "dialog-afteropen:check", "dialog-reduced-motion:check",
  "core:check", "a11y-svg:check", "readme-browser:check", "rtl:check", "switch-transition:check", "preupgrade:check", "tokens:check", "contrast-emit:check", "theme-root-scope:check", "theme-runtime:check", "base-lite:check", "component-sheets:check", "ssr:check:a", "ssr:check:b",
];

interface Step { name?: string; run?: string; if?: string; "continue-on-error"?: unknown; "timeout-minutes"?: unknown }
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
const manifest = await Bun.file("package.json").json() as { scripts: Record<string, string>; peerDependencies: Record<string, string> };
const { scripts, peerDependencies: peers } = manifest;

// The commands of one step: `bun test`, `bun run <script>`, and the scripts of a
// `for script in …` loop. A list written out counts once per step (the static step
// loops over it twice, to run and then to report). A list that comes from the
// matrix counts once per group it appears in, so a command in two groups, or twice
// in one, is two runs.
const commandsOf = (job: Job, step: Step): string[] => {
  const written = new Set<string>();
  const perGroup: string[] = [];
  const fromMatrix = new Set<string>();
  for (const line of (step.run ?? "").split("\n").map(text => text.trim())) {
    if (line === "bun test") written.add(line);
    const single = /^bun run ([\w:-]+)$/.exec(line);
    if (single) written.add(single[1]);
    const loop = /^for script in (.+); do$/.exec(line);
    if (!loop) continue;
    const key = /^\$\{\{ matrix\.(\w+) \}\}$/.exec(loop[1]);
    if (!key) for (const script of loop[1].split(/\s+/)) written.add(script);
    else if (!fromMatrix.has(key[1])) {
      fromMatrix.add(key[1]);
      for (const entry of job.strategy?.matrix?.include ?? []) perGroup.push(...entry[key[1]].split(/\s+/));
    }
  }
  return [...written, ...perGroup];
};

const ran = Object.values(workflow.jobs).flatMap(job => job.steps.flatMap(step => commandsOf(job, step)));

describe("CI (.github/workflows/ci.yml)", () => {
  test("runs every command of the list, each once", () => {
    expect([...ran].sort()).toEqual([...COMMANDS].sort());
  });

  // A floor run is the check's own script on another version of the peer, by a
  // script that restores the installed one: nothing a floor run could weaken.
  test("runs each peer-floor check through check-at-peer-floor.ts, on a check CI also runs as installed", () => {
    const floors = COMMANDS.filter(command => command.endsWith(":floor"));
    expect(floors.length).toBeGreaterThan(0);
    for (const floor of floors) {
      const match = /^bun run scripts\/check-at-peer-floor\.ts (\S+)(?: \S+)* -- ([\w:-]+)$/.exec(scripts[floor] ?? "");
      expect(match, `${floor} must run scripts/check-at-peer-floor.ts`).not.toBeNull();
      expect(match![2]).toBe(floor.replace(/:floor$/, ":check"));
      expect(COMMANDS).toContain(match![2]);
      expect(Object.keys(peers)).toContain(match![1]);
    }
  });

  test("runs only scripts that package.json defines", () => {
    expect(ran.filter(command => command !== "bun test" && !(command in scripts))).toEqual([]);
  });

  test("runs the keyboard-focus browser check inside core:check", () => {
    expect(scripts["keyboard-focus:check"]).toBe("bun run scripts/check-keyboard-focus.ts");
    expect(scripts["core:check"]).toContain("bun run scripts/check-keyboard-focus.ts");
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
        if (step.if !== undefined) loose.push(`${name} (${command}): if`);
        if (step["continue-on-error"] !== undefined) loose.push(`${name} (${command}): continue-on-error`);
      }
    }
    expect(loose).toEqual([]);
  });

  // A command that hangs runs until the run is cancelled. On 2026-11-03 the
  // adapters job's checks step held its job for 30 minutes, and the step's log
  // was gone afterwards, so nothing named the sub-check that hung. A step that
  // loops over a group of commands therefore carries a deadline that fails on
  // its own, and logs each sub-check's start and its end.
  test("bounds a hung group of checks, and names each sub-check it runs", () => {
    const unbounded: string[] = [];
    for (const [jobName, job] of Object.entries(workflow.jobs)) {
      for (const step of job.steps) {
        const run = step.run ?? "";
        if (!run.includes("for script in ${{ matrix.")) continue;
        const label = `${jobName}: ${step.name ?? "unnamed step"}`;
        const minutes = step["timeout-minutes"];
        if (typeof minutes !== "number" || minutes < 1 || minutes > 10) unbounded.push(`${label}: timeout-minutes is ${String(minutes)}`);
        if (!run.includes('echo "::group::$script (start)"')) unbounded.push(`${label}: no start line`);
        if (!run.includes('echo "$script: passed in $((SECONDS - start))s"')) unbounded.push(`${label}: no end line`);
      }
    }
    expect(unbounded).toEqual([]);
  });

  test("gates the required `check` status on every other job", () => {
    const { check, ...jobs } = workflow.jobs;
    expect([check.needs].flat().sort()).toEqual(Object.keys(jobs).sort());
    const gate = check.steps.map(step => step.run ?? "").join("\n");
    for (const job of Object.keys(jobs)) expect(gate).toContain(`[ '\${{ needs.${job}.result }}' = success ]`);
  });
});
