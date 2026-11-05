import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { printDeclarationModule } from "../../scripts/build-modules";
import {
  assertImportableDeclarationDocs,
  stripInternalDeclarationDocs,
} from "../../scripts/strip-internal-declaration-docs";

// What a published declaration keeps: its `@deprecated` JSDoc, whole and where
// it was written, so a typed consumer's editor reports the note and names the
// replacement. Every other comment was source documentation and goes.
const text = `/**
 * A documented constant.
 * @example
 * documented + 1;
 */
export declare const documented: number;

/**
 * The old constant.
 *
 * @deprecated Use documented. Removal in 4.0.
 */
export declare const old: number;

// A line comment.
/* A plain block comment. */
/*! Not a JSDoc block. */
export declare function make(config: {
    /** Plain documentation for an option. */
    first?: string;
    /** @deprecated Use first. Removal in 4.0. */
    second?: string;
}): void;

export declare const trailing: number; // A trailing line comment.
`;

test("a declaration keeps its @deprecated JSDoc, whole, on the declaration it documents", () => {
  const output = printDeclarationModule("fixture.d.ts", text);
  // Whole: the prose above the tag is part of the note the consumer reads.
  expect(output).toMatch(/\/\*\*\n \* The old constant\.\n \*\n \* @deprecated Use documented\. Removal in 4\.0\.\n \*\/\s*export declare const old: number;/);
  expect(output).toContain("/** @deprecated Use first. Removal in 4.0. */");
  // The tag stays on its own declaration, not moved to the file or the next one.
  expect(output).toMatch(/\/\*\* @deprecated Use first\. Removal in 4\.0\. \*\/\s*second\?: string;/);
  expect(output.match(/@deprecated/g)).toHaveLength(2);
});

test("every other comment still goes", () => {
  const output = printDeclarationModule("fixture.d.ts", text);
  for (const prose of ["A documented constant.", "Plain documentation for an option.", "A line comment.", "A plain block comment.", "A trailing line comment.", "Not a JSDoc block."]) {
    expect(output).not.toContain(prose);
  }
  expect(output).toContain("export declare const documented: number;");
  expect(output).toContain("export declare const trailing: number;");
});

async function makeTree(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "mtrl-decl-docs-"));
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(join(dir, rel, ".."), { recursive: true });
    await writeFile(join(dir, rel), content);
  }
  return dir;
}

const EXPORTS_FIXTURE = {
  ".": { types: "./index.d.ts", import: "./index.js" },
  "./components/widget": {
    types: "./components/widget/index.d.ts",
    import: "./components/widget/index.js",
  },
};

const TYPES_DTS = `/** Base visibility methods inherited by the public widget. */
interface WidgetVisibility {
    /** Shows the widget. */
    show(): void;
}

/** Nested item configuration referenced in the public signature. */
interface NestedItem {
    /** Item numeric value. */
    value: number;
}

/** Public widget configuration. */
export interface WidgetConfig {
    /** Primary label text. */
    label: string;
    /** Optional nested item. */
    nested?: NestedItem;
}

/** Re-exported option type. */
export interface ReexportedOption {
    /** Option identifier. */
    key: string;
}

/** Public widget instance. */
export interface WidgetComponent extends WidgetVisibility {
    /** Destroys the widget. */
    destroy(): void;
}

/** Creates a widget instance. */
export declare function createWidget(config: WidgetConfig): WidgetComponent;

/** Internal DOM structure not reachable from exports. */
export interface InternalWidgetStructure {
    /** Internal root element. */
    root: HTMLElement;
}

/** Internal helper not reachable from exports. */
declare function computeInternalOffset(): number;

/**
 * Legacy internal state.
 * @deprecated Use WidgetConfig instead. Removal in 4.0.
 */
export interface LegacyInternalState {
    /** @deprecated Old active flag. */
    active?: boolean;
}
`;

const FIXTURE_FILES: Record<string, string> = {
  "package.json": JSON.stringify({ name: "material", exports: EXPORTS_FIXTURE }, null, 2),
  "index.d.ts": 'export * from "./components/widget/index.js";\n',
  "components/widget/index.d.ts": [
    'export { createWidget } from "./types.js";',
    'export type { WidgetComponent, WidgetConfig, ReexportedOption } from "./types.js";',
    "",
  ].join("\n"),
  "components/widget/types.d.ts": TYPES_DTS,
};

test("stripInternalDeclarationDocs keeps JSDoc on direct exports, re-exports, heritage bases, and signature-referenced types while stripping true internals", async () => {
  const dir = await makeTree(FIXTURE_FILES);
  const refDir = await makeTree(FIXTURE_FILES);
  try {
    const result = await stripInternalDeclarationDocs(dir, EXPORTS_FIXTURE);
    expect(result.files).toBe(1);
    expect(result.declarations).toBe(2);
    expect(result.bytes).toBeGreaterThan(0);

    const stripped = await readFile(join(dir, "components/widget/types.d.ts"), "utf8");
    // Direct exports, re-exports, heritage base interfaces, and signature-referenced types keep their JSDoc.
    for (const kept of [
      "Base visibility methods inherited by the public widget.",
      "Shows the widget.",
      "Nested item configuration referenced in the public signature.",
      "Item numeric value.",
      "Public widget configuration.",
      "Primary label text.",
      "Re-exported option type.",
      "Option identifier.",
      "Public widget instance.",
      "Destroys the widget.",
      "Creates a widget instance.",
      "Use WidgetConfig instead. Removal in 4.0.",
      "Old active flag.",
    ]) {
      expect(stripped).toContain(kept);
    }

    // Unreferenced internal declarations lose their non-@deprecated JSDoc.
    for (const internalProse of [
      "Internal DOM structure not reachable from exports.",
      "Internal root element.",
      "Internal helper not reachable from exports.",
    ]) {
      expect(stripped).not.toContain(internalProse);
    }

    // Audit against the unstripped reference tree passes with zero failures.
    const failures = await assertImportableDeclarationDocs(dir, refDir, EXPORTS_FIXTURE);
    expect(failures).toEqual([]);

    // Removing JSDoc from a direct export, a heritage base interface, or a
    // signature-referenced interface fails the check naming the declaration.
    await writeFile(
      join(dir, "components/widget/types.d.ts"),
      stripped
        .replace("/** Primary label text. */", "")
        .replace("/** Shows the widget. */", "")
        .replace("/** Item numeric value. */", ""),
    );
    const broken = await assertImportableDeclarationDocs(dir, refDir, EXPORTS_FIXTURE);
    expect(broken.some(msg => msg.includes("components/widget/types.d.ts#WidgetConfig.label"))).toBe(true);
    expect(broken.some(msg => msg.includes("components/widget/types.d.ts#WidgetVisibility.show"))).toBe(true);
    expect(broken.some(msg => msg.includes("components/widget/types.d.ts#NestedItem.value"))).toBe(true);
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(refDir, { recursive: true, force: true });
  }
});
