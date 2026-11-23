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
});
