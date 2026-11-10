import assert from "node:assert/strict";
import postcss from "postcss";

export const bottomAppBarToolbarStyle = "bottom-app-bar-toolbar";
export const bottomAppBarToolbarDependencies = ["toolbar"];

/** Scope the shipped legacy values to the opt-in frame; never restyle old bars. */
export function bottomAppBarToolbarCss(legacy: string): string {
  const root = postcss.parse(legacy, { from: undefined });
  let scoped = 0;
  root.walkRules(rule => {
    rule.selectors = rule.selectors.map(selector => {
      scoped++;
      const frame = /\.mtrl-bottom-app-bar(?:--[\w-]+)?(?![\w-])/;
      if (frame.test(selector)) return selector.replace(frame, "$&.mtrl-bottom-app-bar-toolbar");
      assert(selector.includes(".mtrl-bottom-app-bar__"), `Unreviewed compatibility selector: ${selector}`);
      return selector.replace(/\.mtrl-bottom-app-bar__/, ".mtrl-bottom-app-bar-toolbar .mtrl-bottom-app-bar__");
    });
  });
  assert(scoped > 0, "Missing legacy bar rules");
  root.walkAtRules("layer", rule => {
    if (rule.nodes) {
      assert.equal(rule.params, "mtrl.bottom-app-bar");
      rule.replaceWith(...rule.nodes);
    }
  });
  // Existing toolbar layers remain intact. Only the explicitly marked facade
  // cancels the toolbar's density floor, item distribution and content color.
  root.append(postcss.parse(
    ".mtrl-bottom-app-bar-toolbar.mtrl-toolbar{min-height:0;gap:0;width:auto;max-width:none;margin:0;border-radius:0}" +
    ".mtrl-bottom-app-bar-toolbar.mtrl-toolbar>.mtrl-toolbar__bar{min-height:0;flex:0 1 auto;justify-content:normal;color:inherit;transition:none}",
  ));
  return root.toString();
}
