import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
    DEPS_TIMEOUT=23m
    DEPS_RETRY_TIMEOUT=10m
    statuses="$*"
    install_attempt() {
      local status
      echo "attempt $1 budget $2"
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
  expect(result.output).toContain("attempt 1 budget 23m");
  expect(result.output).toContain("attempt 2 budget 10m");
  expect(result.output).toContain("mirror attempt 2 succeeded");
});

test("the HTTPS fallback preserves suites, security keys and other repositories", () => {
  const scratch = mkdtempSync(join(tmpdir(), "browser-apt-sources-"));
  try {
    const source = join(scratch, "original");
    const dest = join(scratch, "fallback");
    mkdirSync(join(source, "sources.list.d"), { recursive: true });
    const ubuntu = [
      "Types: deb",
      "URIs: mirror+file:/etc/apt/apt-mirrors.txt",
      "Suites: noble noble-updates noble-security",
      "Components: main universe",
      "Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg",
      "",
    ].join("\n");
    const cloud = "deb http://us-east-2.ec2.archive.ubuntu.com/ubuntu/ noble main\n";
    const other = "deb https://example.org/packages stable main\n";
    const sourceFile = join(source, "sources.list.d", "ubuntu.sources");
    writeFileSync(sourceFile, ubuntu);
    writeFileSync(join(source, "sources.list"), cloud);
    writeFileSync(join(source, "sources.list.d", "other.list"), other);

    const result = Bun.spawnSync(["bash", "-c",
      'source .github/actions/browsers/install-deps.sh; make_https_sources "$1" "$2"',
      "bash", source, dest], { stderr: "pipe" });
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    const archive = "https://archive.ubuntu.com/ubuntu/";
    expect(readFileSync(join(dest, "sources.list"), "utf8")).toBe(`deb ${archive} noble main\n`);
    expect(readFileSync(join(dest, "sources.list.d", "ubuntu.sources"), "utf8"))
      .toBe(ubuntu.replace("mirror+file:/etc/apt/apt-mirrors.txt", archive));
    expect(readFileSync(join(dest, "sources.list.d", "other.list"), "utf8")).toBe(other);
    expect(readFileSync(sourceFile, "utf8")).toBe(ubuntu);
    expect(readFileSync(join(dest, "apt.conf"), "utf8")).toContain(`"${dest}/sources.list.d"`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("a second dependency install failure fails setup", () => {
  const result = mirror("124", "100");
  expect(result.status).toBe(100);
  expect(result.output).toContain("exited 100");
  expect(result.output).toContain("on its second attempt");
  expect(result.output).not.toContain("attempt 3");
});
