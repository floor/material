import assert from "node:assert/strict";
import { optionalStyleProfiles } from "./style-manifest";
import { filledSmallRoundCss } from "./button-style-profile";
import { bottomAppBarToolbarCss, bottomAppBarToolbarStyle, bottomAppBarToolbarDependencies } from "./bottom-app-bar-toolbar-style";

export const optionalStyleFiles = [...Object.keys(optionalStyleProfiles), bottomAppBarToolbarStyle]
  .flatMap(name => [`styles/${name}.js`, `styles/${name}.css`]);

export function profileStyleModule(name: string, dependencies: string[]): string {
  return dependencies.map(dependency => `import "./${dependency}.js";`).join("\n") +
    `\nimport "./${name}.css";\n`;
}

/** Check the new pair independently of the frozen general-asset inventory. */
export function validateOptionalStyleProfiles(files: Map<string, string>, required = true): void {
  const css = files.get(`styles/${bottomAppBarToolbarStyle}.css`);
  const js = files.get(`styles/${bottomAppBarToolbarStyle}.js`);
  if (required || css !== undefined || js !== undefined) {
    const legacy = files.get("styles/bottom-app-bar.css");
    assert(legacy !== undefined && css !== undefined && js !== undefined, "Incomplete opt-in bottom app bar styles");
    assert.equal(css, bottomAppBarToolbarCss(legacy), "Opt-in compatibility styles differ from the scoped legacy projection");
    assert.equal(js, profileStyleModule(bottomAppBarToolbarStyle, bottomAppBarToolbarDependencies));
    for (const dependency of bottomAppBarToolbarDependencies) assert(files.has(`styles/${dependency}.css`) && files.has(`styles/${dependency}.js`));
  }
  for (const [name, entry] of Object.entries(optionalStyleProfiles)) {
    const css = files.get(`styles/${name}.css`), js = files.get(`styles/${name}.js`);
    if (!required && css === undefined && js === undefined) continue;
    assert(css !== undefined && js !== undefined, `${name}: both optional CSS and JS files must ship`);
    const parent = files.get(`styles/${entry.parent}.css`);
    assert(parent !== undefined, `${name}: missing general stylesheet`);
    assert.equal(css, filledSmallRoundCss(parent), `${name}: CSS differs from the reviewed projection`);
    assert.equal(js, profileStyleModule(name, entry.dependencies), `${name}: dependency imports changed`);
    for (const dependency of entry.dependencies) {
      assert(files.has(`styles/${dependency}.js`) && files.has(`styles/${dependency}.css`), `${name}: missing ${dependency} dependency`);
    }
  }
}
