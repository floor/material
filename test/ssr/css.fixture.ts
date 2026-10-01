// Register real source CSS in the same registry filled by build-generated modules.
import { resolve } from "node:path";
import * as sass from "sass";
import { registerStyles } from "../../src/elements/styles";
import { componentStyles, resolveStyleDependencies } from "../../scripts/style-manifest";
const entries = [["ripple", "utilities/ripple"], ...resolveStyleDependencies(Object.keys(componentStyles))
  .map(name => [name, componentStyles[name].source])];
registerStyles(Object.fromEntries(entries.map(([name, source]) => [name, sass.compileString(`@use "${source}";`, {
  loadPaths: [resolve("src/styles")], style: "compressed", logger: sass.Logger.silent,
}).css])));
