// test/scripts/package-name.test.ts
//
// The unit test for scripts/package-name.ts: one changing input and expected
// output per import form the script renames, one non-changing input per
// allowlist entry, both directions, idempotence, and the proof that the naive
// `replaceAll("mtrl", "material")` fails on the strings the allowlist exists
// to protect. No build, no network: the pair's data file is the fixture.
//
// This file is itself allowlisted (`package-name-test` in the data file): its
// inputs and expectations are the mapping's literal data and must survive a
// rename of the tree they run in.

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ENTRIES, keepSpans, pairFor, rewrite, scanText } from "../../scripts/package-name";
import type { NameSpec, Pair, Span } from "../../scripts/package-name";

const ROOT = join(import.meta.dir, "..", "..");
const pair: Pair = pairFor("mtrl");
const mtrl = pair.names.find((name) => name.name === "mtrl") as NameSpec;
const material = pair.names.find((name) => name.name === "material") as NameSpec;

/** Rename `text` the way the script does — and throw on anything unclassified. */
const rename = (text: string, from: NameSpec = mtrl, to: NameSpec = material, file = "unit.ts", handled: Span[] = []): string =>
  rewrite(text, file, from, to, pair, handled);

// ---------------------------------------------------------------------------
// One changing input per import form (plan 1.2 plus the forms it misses).

const CHANGES: { form: string; text: string; expected: string }[] = [
  { form: "from import", text: `import { createButton } from 'mtrl';`, expected: `import { createButton } from 'material';` },
  { form: "side-effect import", text: `import "mtrl/elements";`, expected: `import "material/elements";` },
  { form: "require", text: `const m = require("mtrl");`, expected: `const m = require("material");` },
  { form: "dynamic import", text: `const m = await import("mtrl");`, expected: `const m = await import("material");` },
  { form: "resolve", text: `resolve("mtrl")`, expected: `resolve("material")` },
  { form: "declare module", text: `declare module "mtrl/core" {`, expected: `declare module "material/core" {` },
  { form: "createRequire", text: `createRequire(import.meta.url)('mtrl')`, expected: `createRequire(import.meta.url)('material')` },
  { form: "node_modules", text: `node_modules/mtrl/dist/index.js`, expected: `node_modules/material/dist/index.js` },
  { form: "npm install", text: `npm install mtrl`, expected: `npm install material` },
  { form: "npm view", text: `npm view mtrl version`, expected: `npm view material version` },
  { form: "npmjs.com link", text: `https://www.npmjs.com/package/mtrl/v/0.10.4`, expected: `https://www.npmjs.com/package/material/v/0.10.4` },
  { form: "release tag", text: "`mtrl@${version}`", expected: "`material@${version}`" },
  { form: "repository link", text: `[CHANGELOG](https://github.com/floor/mtrl/blob/main/CHANGELOG.md)`, expected: `[CHANGELOG](https://github.com/floor/material/blob/main/CHANGELOG.md)` },
  { form: "quoted subpath", text: "`mtrl/styles/base`", expected: "`material/styles/base`" },
  { form: "bare subpath", text: `mtrl/core/compose`, expected: `material/core/compose` },
];

describe("the import forms", () => {
  for (const { form, text, expected } of CHANGES) {
    test(`${form}: ${JSON.stringify(text)}`, () => {
      expect(rename(text)).toBe(expected);
      // The other direction, from the expected text back.
      expect(rename(expected, material, mtrl)).toBe(text);
    });
  }
});

// ---------------------------------------------------------------------------
// Non-changing inputs: every allowlist entry's examples, the forms the brief
// names, and the keep entries.

/** The brief's own non-changing list, over and above the data file's examples. */
const EXTRA_KEEPS = [
  `"mtrl-addons"`,
  `floor/mtrl-addons`,
  `.mtrl-button`,
  `--mtrl-sys-color-primary`,
  `config.prefix || "mtrl"`,
  `@layer mtrl.base`,
];

describe("the allowlist", () => {
  for (const entry of pair.allowlist) {
    for (const example of entry.examples) {
      test(`${entry.id}: ${JSON.stringify(example.text)}`, () => {
        const file = example.file ?? "unit.ts";
        expect(rename(example.text, mtrl, material, file)).toBe(example.text);
        expect(rename(example.text, material, mtrl, file)).toBe(example.text);
      });
    }
  }
  for (const text of EXTRA_KEEPS) {
    test(`the brief's list: ${JSON.stringify(text)}`, () => {
      expect(rename(text)).toBe(text);
      expect(rename(text, material, mtrl)).toBe(text);
    });
  }
});

describe("the keeps with a reason", () => {
  // In the run, a keep's span is protected before the rules see it (keepSpans).
  // Here: the real file, the real spans, and no edit inside the kept text.
  for (const keep of pair.keeps) {
    test(`${keep.id}: ${JSON.stringify(keep.text)}`, () => {
      const text = readFileSync(join(ROOT, keep.file), "utf8");
      const spans = keepSpans(pair).get(keep.file) ?? [];
      const kept = spans.find((span) => text.slice(span.start, span.end) === keep.text) as Span;
      expect(kept).toBeDefined();
      const scan = scanText(text, keep.file, mtrl, material, pair, spans);
      expect(scan.problems).toEqual([]);
      expect(scan.edits.filter((edit) => edit.start < kept.end && edit.end > kept.start)).toEqual([]);
      // And the kept text is still there in what a rename would write.
      expect(rename(text, mtrl, material, keep.file, spans)).toContain(keep.text);
    });
  }
});

// ---------------------------------------------------------------------------
// Idempotence and the round trip.

describe("idempotence", () => {
  const sample = `import { createButton } from "mtrl";\n.button { color: var(--mtrl-sys-color-primary); }\nconst p = config.prefix || "mtrl";\n`;

  test("a renamed tree is not renamed again", () => {
    const once = rename(sample);
    expect(rename(once)).toBe(once);
  });

  test("there and back returns the input", () => {
    expect(rename(rename(sample), material, mtrl)).toBe(sample);
  });
});

// ---------------------------------------------------------------------------
// The explicit entries: their find text is in the tree today, and applying
// them swaps the name and nothing else.

const fill = (template: string, from: NameSpec, to: NameSpec): string =>
  template.replaceAll("%s", from.name).replaceAll("%S", from.workflow).replaceAll("%t", to.name).replaceAll("%T", to.workflow);

describe("the explicit entries", () => {
  for (const entry of ENTRIES) {
    test(`${entry.id} is in the tree and only swaps the name`, () => {
      const find = fill(entry.find, mtrl, material);
      const replace = fill(entry.replace, mtrl, material);
      expect(readFileSync(join(ROOT, fill(entry.file, mtrl, material)), "utf8")).toContain(find);
      expect(replace).toBe(find.replaceAll(mtrl.name, material.name).replaceAll(mtrl.workflow, material.workflow));
    });
  }
});

// ---------------------------------------------------------------------------
// The naive `replaceAll("mtrl", "material")` proof.

describe("the naive replaceAll", () => {
  // How it fails: it is blind to context. It renames the class prefix
  // (`.mtrl-button` → `.material-button`), the cascade layers
  // (`@layer mtrl.base`), the process-wide symbols (`Symbol.for("mtrl.ssr")`),
  // the fallback prefix (`config.prefix || "mtrl"`), the addons' names
  // (`floor/mtrl-addons`), the warning tag and the temp folders — every string
  // the allowlist exists to keep. The classifier renames the specifiers and
  // leaves those alone.
  const MUST_FAIL = [
    ".mtrl-button",
    "--mtrl-sys-color-primary",
    `config.prefix || "mtrl"`,
    `@layer mtrl.base`,
    `Symbol.for("mtrl.ssr")`,
    `data-mtrl-ssr`,
    `floor/mtrl-addons`,
    `mtrl-addons`,
    "console.warn(`[mtrl] ${component}: ${message}`)",
  ];

  for (const text of MUST_FAIL) {
    test(`changes ${JSON.stringify(text)}`, () => {
      expect(text.replaceAll("mtrl", "material")).not.toBe(text);
      expect(rename(text)).toBe(text);
    });
  }

  test("and it changes most of the allowlist's own examples", () => {
    const examples = pair.allowlist.flatMap((entry) => entry.examples.map((example) => example.text));
    const broken = examples.filter((text) => text.replaceAll("mtrl", "material") !== text);
    expect(broken.length).toBeGreaterThanOrEqual(10);
  });
});
