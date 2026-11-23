import { describe, expect, test } from "bun:test";
import { styleManifestDependenciesOnly } from "../../scripts/catalogue-scope";

const manifest = `"fab-menu": { source: "components/fab-menu", dependencies: ["fab", "menu"] },
  button: { source: "components/button", dependencies: ["progress"] },
`;

describe("catalogue identity scope", () => {
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
});
