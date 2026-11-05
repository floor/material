// test/styles/density.test.ts
//
// Density is one integer custom property, --mtrl-density: 0 at rest and down to
// -5, that a container sets and the components the design lets densify read
// through abstract/_functions.scss. This file holds the shape of that contract
// in the source: the registration and its sugar classes, the exact set of
// sheets that read the property, the surfaces that stop it, and the option
// aliases that set it. The geometry each read produces is measured in the
// browser by scripts/check-density.ts and pinned by the component geometry
// tests beside this one.
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { compileString } from "sass";

const PROPERTY = "--mtrl-density";

const read = (path: string) => readFileSync(path, "utf8");
const compile = (entry: string) =>
  compileString(`@use '${entry}';`, { loadPaths: ["src/styles"], style: "expanded", logger: { warn() {} } }).css;

const sheets = (directory: string): string[] =>
  readdirSync(directory)
    .filter((name) => name.endsWith(".scss"))
    .map((name) => join(directory, name));
const nameOf = (file: string) => file.slice(file.lastIndexOf("/") + 1).replace(/^_/, "").replace(/\.scss$/, "");

// A read is a helper call or the raw var() an expression hands to calc().
const READS = /f\.density(?:-visible|-offset)?\(|var\(--mtrl-density/g;
const reads = (text: string) => text.match(READS) ?? [];

// The components the design lets densify. Everything else — menus, dialogs,
// snackbars, pickers, tooltips, cards, FABs and sheets — is fixed, and the
// exhaustive scan below keeps a new sheet from joining this list by accident.
const DENSIFYING: Record<string, string[]> = {
  components: ["button", "button-group", "drawer", "icon-button", "list", "text-field", "toolbar"],
  elements: ["button", "button-group", "drawer", "field", "icon-button", "list", "text-field"],
};

// A fixed surface pins the property at its root, so a page-wide value cannot
// shrink a control inside it. The key is the sheet, the value its root class.
const PINNED: Record<string, string> = {
  menu: "mtrl-menu",
  dialog: "mtrl-dialog",
  snackbar: "mtrl-snackbar",
  datepicker: "mtrl-datepicker",
  timepicker: "mtrl-time-picker",
  "bottom-sheet": "mtrl-bottom-sheet",
  "side-sheet": "mtrl-side-sheet",
};

describe("the density property", () => {
  const css = compile("base/tokens");

  test("is registered as an inherited integer that starts at 0", () => {
    expect(css).toContain('@property --mtrl-density {\n  syntax: "<integer>";\n  inherits: true;\n  initial-value: 0;\n}');
  });

  test("is registered exactly once, in the tokens sheet", () => {
    const registered = sheets("src/styles/base")
      .filter((file) => /@property --#\{base\.\$prefix\}-density\b/.test(read(file)))
      .map(nameOf);
    expect(registered).toEqual(["tokens"]);
  });

  test("ships one sugar class per step, and none for the default", () => {
    for (const step of [1, 2, 3, 4, 5]) {
      expect(css).toContain(`.mtrl-density--${step} {\n  ${PROPERTY}: -${step};\n}`);
    }
    expect(css).not.toContain(".mtrl-density--0");
  });
});

describe("which sheets read the property", () => {
  for (const directory of Object.keys(DENSIFYING)) {
    test(`only the ${directory} that densify read it`, () => {
      const reading = sheets(`src/styles/${directory}`)
        .filter((file) => reads(read(file)).length > 0)
        .map(nameOf)
        .sort();
      expect(reading).toEqual(DENSIFYING[directory]);
    });
  }

  test("every raw read falls back to 0", () => {
    // Without base or base-lite the property is unregistered, and a read must
    // still resolve: the fallback is what makes the sheets stand alone.
    const missing: string[] = [];
    for (const directory of ["components", "elements"]) {
      for (const file of sheets(`src/styles/${directory}`)) {
        for (const occurrence of read(file).match(/var\(--mtrl-density[^)]*\)/g) ?? []) {
          if (occurrence !== "var(--mtrl-density, 0)") missing.push(`${file}: ${occurrence}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("a fixed surface stops the scale at its root", () => {
  for (const [name, selector] of Object.entries(PINNED)) {
    test(`${name} pins the property at 0 and never reads it`, () => {
      const css = compile(`components/${name}`);
      const start = css.indexOf(`.${selector} {`);
      expect(start, `${name} has no .${selector} rule`).toBeGreaterThanOrEqual(0);
      const block = css.slice(start, css.indexOf("\n}", start));
      expect(block).toContain(`${PROPERTY}: 0;`);
      expect(css).not.toContain(`var(${PROPERTY}`);
    });
  }

  test("only the pinned surfaces and the two aliases set the property", () => {
    // The sugar in base/_tokens.scss interpolates its step, so it is not a
    // literal here; these are the only sheets that name a value.
    const declaring = [...sheets("src/styles/components"), ...sheets("src/styles/elements")]
      .filter((file) => /prefix\}-density: -?\d/.test(read(file)))
      .map(nameOf)
      .sort();
    expect(declaring).toEqual([
      "bottom-sheet", "datepicker", "dialog", "drawer", "menu",
      "side-sheet", "snackbar", "text-field", "timepicker",
    ]);
  });
});

describe("the option aliases set the property and nothing else", () => {
  test("a compact text field is the scale's fourth step", () => {
    const css = compile("components/text-field");
    expect(css).toContain(`.mtrl-text-field--density-compact {\n  ${PROPERTY}: -4;\n}`);
  });

  test("a dense drawer is the last step", () => {
    const css = compile("components/drawer");
    expect(css).toContain(`.mtrl-drawer--dense {\n  ${PROPERTY}: -5;\n}`);
  });

  test("the deprecated menu dense stays literal and sets no step", () => {
    // Deprecated, not migrated: the menu is a fixed surface, and its dense
    // option keeps the literal item box it always had.
    const css = compile("components/menu");
    expect(css).toContain(".mtrl-menu--dense {");
    expect(css).not.toContain(`.mtrl-menu--dense {\n  ${PROPERTY}`);
  });
});

describe("the floors", () => {
  test("a button stops at the 32px visible target", () => {
    const css = compile("components/button");
    expect(css).toContain(`height: max(32px, 40px + 4px * var(${PROPERTY}, 0));`);
    expect(css).toContain(`height: max(32px, 56px + 4px * var(${PROPERTY}, 0));`);
    expect(css).toContain(`border-radius: var(--mtrl-button-shape, max(16px, 20px + 2px * var(${PROPERTY}, 0)));`);
  });

  test("a list row stops at 36px", () => {
    const css = compile("components/list");
    expect(css).toContain(`min-height: max(36px, 56px + 4px * var(${PROPERTY}, 0));`);
  });

  test("a field stops at 40px and its multiline box at 84px", () => {
    const css = compile("components/text-field");
    expect(css).toContain(`height: max(40px, 56px + 4px * var(${PROPERTY}, 0));`);
    expect(css).toContain(`min-height: max(84px, 100px + 4px * var(${PROPERTY}, 0));`);
  });

  test("a button group scales its height and derives the radius from it", () => {
    const css = compile("components/button-group");
    expect(css).toContain(`--mtrl-button-group-height-scale: max(32px, var(--mtrl-button-group-height) + 4px * var(${PROPERTY}, 0));`);
    expect(css).toContain("--mtrl-button-group-radius: calc(var(--mtrl-button-group-height-scale) / 2);");
  });
});
