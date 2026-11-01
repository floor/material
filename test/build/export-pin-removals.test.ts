// test/build/export-pin-removals.test.ts
//
// A name cannot leave the surface silently: if the last release pinned it as
// public, it has to be deprecated in a release before it goes. Each pin is
// compared with the same pin at the latest release tag.
import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import {
  readPinned as readPinnedComponents,
  type ComponentExports,
} from "../../scripts/component-exports";
import {
  readPinned as readPinnedRoot,
  type RootExport,
  unannouncedRemovals as rootRemovals,
} from "../../scripts/root-exports";
import { unannouncedRemovals as componentRemovals } from "../../scripts/component-exports";

const ROOT = join(import.meta.dir, "../..");
const NOTE = "was public in the release pin and is gone";

/** The latest release tag in this checkout, or undefined when it has none */
const releaseTag = (): string | undefined => {
  try {
    return execFileSync("git", ["describe", "--tags", "--abbrev=0", "--match", "v[0-9]*"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return undefined;
  }
};

/** A pin file as the release tag recorded it */
const pinnedAt = <T>(tag: string, path: string): T =>
  JSON.parse(execFileSync("git", ["show", `${tag}:${path}`], { cwd: ROOT, encoding: "utf8" }));

describe("unannounced removals from the root pin", () => {
  test("a public name that is gone is reported; a deprecated or renamed one is not", () => {
    const released: RootExport[] = [
      { name: "kept", kind: "value", status: "public" },
      { name: "announced", kind: "value", status: "deprecated", path: "dom" },
      { name: "moved", kind: "value", status: "renamed", to: "dom" },
    ];
    const now: RootExport[] = [{ name: "announced", kind: "value", status: "deprecated", path: "dom" }];
    expect(rootRemovals(released, now)).toEqual([`kept (value) ${NOTE}: deprecate it first, then remove it in a later release`]);
  });
});

describe("unannounced removals from a component pin", () => {
  test("a public name that is gone is reported; a deprecated one is not", () => {
    const released: ComponentExports = {
      button: [
        { name: "Button", kind: "class", status: "public" },
        { name: "Old", kind: "value", status: "deprecated", note: "Use Button." },
      ],
    };
    const now: ComponentExports = {
      button: [{ name: "Old", kind: "value", status: "deprecated", note: "Use Button." }],
    };
    expect(componentRemovals(released, now)).toEqual([`button: Button (class) ${NOTE}: deprecate it first, then remove it in a later release`]);
  });

  test("a subpath that is gone takes its public names with it", () => {
    const released: ComponentExports = { snackbar: [{ name: "Snackbar", kind: "class", status: "public" }] };
    expect(componentRemovals(released, {})).toEqual([`snackbar: Snackbar (class) ${NOTE}: deprecate it first, then remove it in a later release`]);
  });
});

describe("the pins against the latest release tag", () => {
  const tag = releaseTag();

  test("a CI checkout has the release tag, so the comparison cannot skip there", () => {
    if (!process.env.CI) {
      console.warn(`export-pin removals: comparing against ${tag ?? "no tag (a local checkout without tags skips this comparison)"}`);
      return;
    }
    expect(tag).toBeDefined();
  });

  test("no root name left the surface without a deprecation in the release pin", async () => {
    if (!tag) return;
    const released = pinnedAt<RootExport[]>(tag, "scripts/fixtures/root-exports.json");
    expect(rootRemovals(released, await readPinnedRoot())).toEqual([]);
  });

  test("no component name left the surface without a deprecation in the release pin", async () => {
    if (!tag) return;
    const released = pinnedAt<ComponentExports>(tag, "scripts/fixtures/component-exports.json");
    expect(componentRemovals(released, await readPinnedComponents())).toEqual([]);
  });
});
