// Source tests emulate the build-generated registering module, using real Sass.
import { mock } from "bun:test";
import { resolve } from "node:path";
import * as sass from "sass";
import { registerStyles } from "../../src/elements/styles";
import { componentStyles, resolveStyleDependencies } from "../../scripts/style-manifest";
const entries = [["ripple", "utilities/ripple"], ...resolveStyleDependencies(Object.keys(componentStyles))
  .map(name => [name, componentStyles[name].source])];
mock.module("mtrl/elements/css", () => {
  registerStyles(Object.fromEntries(entries.map(([name, source]) => [name, sass.compileString(`@use "${source}";`, {
    loadPaths: [resolve("src/styles")], style: "compressed", logger: sass.Logger.silent,
  }).css])));
  return {};
});
