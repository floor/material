import { expect, test } from "bun:test";

const { YAML } = Bun as unknown as { YAML: { parse(text: string): unknown } };

test("the warmer covers every browser set in the test matrix", async () => {
  const ci = YAML.parse(await Bun.file(".github/workflows/ci.yml").text()) as {
    jobs: { browser: { strategy: { matrix: { include: { browsers: string }[] } } } };
  };
  const cache = YAML.parse(await Bun.file(".github/workflows/cache.yml").text()) as {
    jobs: { browsers: { strategy: { matrix: { browsers: string[] } } } };
  };
  const required = new Set(ci.jobs.browser.strategy.matrix.include.map(row => row.browsers));
  expect(new Set(cache.jobs.browsers.strategy.matrix.browsers)).toEqual(required);
});

// Isolate the retry from apt so outcomes are deterministic and no host packages change.
const mirror = (...outcomes: string[]) => {
  const run = Bun.spawnSync(["bash", "-c", `
    source .github/actions/browsers/install-deps.sh
    DEPS_TIMEOUT=4m
    statuses="$*"
    install_attempt() {
      local status
      read -r status statuses <<< "$statuses"
      return "$status"
    }
    install_from_mirror
  `, "bash", ...outcomes]);
  return { status: run.exitCode, output: run.stdout.toString() };
};

test("a successful dependency install runs only once", () => {
  const result = mirror("0");
  expect(result.status).toBe(0);
  expect(result.output).toContain("mirror attempt 1 succeeded");
  expect(result.output).not.toContain("attempt 2");
});

test("a timed-out dependency install retries once", () => {
  const result = mirror("124", "0");
  expect(result.status).toBe(0);
  expect(result.output).toContain("exited 124");
  expect(result.output).toContain("mirror attempt 2 succeeded");
});

test("a second dependency install failure fails setup", () => {
  const result = mirror("124", "100");
  expect(result.status).toBe(100);
  expect(result.output).toContain("exited 100");
  expect(result.output).toContain("on its second attempt");
  expect(result.output).not.toContain("attempt 3");
});
