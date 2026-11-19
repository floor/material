import { expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const { YAML } = Bun as unknown as { YAML: { parse(text: string): unknown } };

interface WorkflowStep {
  name?: string;
  uses?: string;
  if?: string;
  run?: string;
  with?: { browsers?: string };
}

const ci = YAML.parse(await Bun.file(".github/workflows/ci.yml").text()) as {
  jobs: { browser: {
    container: { image: string };
    env: { PLAYWRIGHT_CONTAINER: string };
    steps: WorkflowStep[];
    strategy: { matrix: { include: { browsers: string }[] } };
  } };
};
const browser = ci.jobs.browser;

test("only native browser sets use the warmer and browser install action", async () => {
  const cache = YAML.parse(await Bun.file(".github/workflows/cache.yml").text()) as {
    jobs: { browsers: { steps: WorkflowStep[] } };
  };
  const action = "./.github/actions/browsers";
  const native = browser.strategy.matrix.include
    .map(row => row.browsers)
    .filter(browsers => !/\b(?:firefox|webkit)\b/.test(browsers));
  const warmed = cache.jobs.browsers.steps.find(step => step.uses === action)?.with?.browsers;
  expect(new Set(native)).toEqual(new Set(["chromium"]));
  expect(warmed).toBe("chromium");
  expect(browser.steps.find(step => step.uses === action)?.if).toBe("env.PLAYWRIGHT_CONTAINER != 'true'");
});

test("Firefox and WebKit use an immutable Playwright image", () => {
  const needsImage = "(contains(matrix.browsers, 'firefox') || contains(matrix.browsers, 'webkit'))";
  expect(browser.container.image).toStartWith(`\${{ ${needsImage} && '`);
  expect(browser.container.image).toMatch(/'mcr\.microsoft\.com\/playwright@sha256:[a-f0-9]{64}' \|\| '' \}\}$/);
  expect(browser.env.PLAYWRIGHT_CONTAINER).toBe(`\${{ ${needsImage} && 'true' || 'false' }}`);
});

test("the Playwright version check rejects a mismatched container before browsers launch", () => {
  const step = browser.steps.find(step => step.name === "Check Playwright container version");
  expect(step?.if).toBe("env.PLAYWRIGHT_CONTAINER == 'true'");
  if (!step?.run) throw new Error("Missing Playwright version check");
  const scratch = mkdtempSync(join(tmpdir(), "browser-container-version-"));
  try {
    const pkg = join(scratch, "node_modules", "playwright");
    mkdirSync(pkg, { recursive: true });
    writeFileSync(join(pkg, "package.json"), JSON.stringify({ version: "1.63.1" }));
    for (const driverVersion of ["1.63.1", "1.63.0"]) {
      writeFileSync(join(scratch, ".docker-info"), JSON.stringify({ driverVersion }));
      const result = Bun.spawnSync(["bash", "-c", step.run], {
        cwd: scratch,
        env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: scratch },
        stderr: "pipe",
      });
      if (driverVersion === "1.63.1") {
        expect(result.exitCode, result.stderr.toString()).toBe(0);
      } else {
        expect(result.exitCode).toBe(1);
        expect(result.stderr.toString()).toContain("container is 1.63.0, but bun.lock installs 1.63.1");
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
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
