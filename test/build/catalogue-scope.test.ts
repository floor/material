import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { changedComponentNames, styleManifestDependenciesOnly } from "../../scripts/catalogue-scope";

const manifest = `"fab-menu": { source: "components/fab-menu", dependencies: ["fab", "menu"] },
  button: { source: "components/button", dependencies: ["progress"] },
`;

describe("catalogue identity scope", () => {
  test("only factory sources and registered element modules establish component scope", () => {
    const sources = new Set([
      "src/components/text-field/features/chips.ts",
      "src/elements/slider.ts",
      "src/elements/define.ts",
      "src/styles/components/_listbox.scss",
    ]);
    expect(changedComponentNames(sources, new Set(["text-field", "slider"]))).toEqual(new Set(["text-field", "slider"]));
  });

  test("a dependency edge is not catalogue data", () => {
    const next = manifest.replace('["fab", "menu"]', '["button", "fab", "menu"]');
    expect(styleManifestDependenciesOnly(manifest, next)).toBe(true);
  });

  test("any other manifest change stays catalogue data", () => {
    expect(styleManifestDependenciesOnly(manifest, manifest.replace("components/fab-menu", "components/other"))).toBe(false);
    expect(styleManifestDependenciesOnly(manifest, `${manifest}  extra: { source: "components/extra", dependencies: [] },\n`)).toBe(false);
  });

  test("an optional profile dependency stays catalogue data", () => {
    const withProfile = `${manifest}export const optionalStyleProfiles = {\n  "button-filled-small-round": { parent: "button", dependencies: ["progress"] },\n};\n`;
    const changedProfile = withProfile.replace(
      '{ parent: "button", dependencies: ["progress"] }',
      '{ parent: "button", dependencies: ["menu"] }',
    );
    expect(styleManifestDependenciesOnly(withProfile, changedProfile)).toBe(false);
    const changedEdge = withProfile.replace('["fab", "menu"]', '["button", "fab", "menu"]');
    expect(styleManifestDependenciesOnly(withProfile, changedEdge)).toBe(true);
  });

  test("an opt-in component dependency stays catalogue data", () => {
    const withListbox = `${manifest}  listbox: { source: "components/listbox", dependencies: [], optIn: true, sharedLeaves: ["menu/features/registry"] },\n`;
    const changed = withListbox.replace(
      'listbox: { source: "components/listbox", dependencies: []',
      'listbox: { source: "components/listbox", dependencies: ["menu"]',
    );
    expect(styleManifestDependenciesOnly(withListbox, changed)).toBe(false);
    const changedEdge = withListbox.replace('["fab", "menu"]', '["button", "fab", "menu"]');
    expect(styleManifestDependenciesOnly(withListbox, changedEdge)).toBe(true);
    const manifestFile = readFileSync(new URL("../../scripts/style-manifest.ts", import.meta.url), "utf8");
    const listbox = manifestFile.replace(
      'listbox: { source: "components/listbox", dependencies: []',
      'listbox: { source: "components/listbox", dependencies: ["menu"]',
    );
    expect(listbox).not.toBe(manifestFile);
    expect(styleManifestDependenciesOnly(manifestFile, listbox)).toBe(false);
  });
});
