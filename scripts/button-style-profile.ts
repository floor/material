import assert from "node:assert/strict";
import postcss from "postcss";

// A projection of the existing rules, not a second set of button values.
// Keep common/interaction/content rules; omit only the other visual profiles.
const outside = new Set(["xs", "m", "l", "xl", "square", "circular", "elevated", "tonal", "outlined", "text"]);
const retained = new Set(["s", "round", "filled", "active", "icon", "toggle", "selected", "progress"]);
const modifiers = /\.mtrl-button--([a-z][\w-]*)/g;

export function filledSmallRoundCss(css: string): string {
  const root = postcss.parse(css, { from: undefined });
  let removed = 0;
  root.walkRules(rule => {
    const kept = rule.selectors.filter(selector => {
      const names = [...selector.matchAll(modifiers)].map(([, name]) => name);
      for (const name of names) assert(outside.has(name) || retained.has(name), `Unreviewed button modifier: ${name}`);
      const excluded = names.some(name => outside.has(name));
      // Such a selector could still match this profile. Require a reviewed
      // projection if the upstream stylesheet introduces that construction.
      if (excluded) assert(!/:(?:not|is|where|has)\([^)]*\.mtrl-button--/.test(selector),
        `Cannot project a visual modifier inside a functional selector: ${selector}`);
      return !excluded;
    });
    if (!kept.length) { rule.remove(); removed++; }
    else if (kept.length !== rule.selectors.length) rule.selectors = kept;
  });
  root.walkAtRules(rule => {
    // Unlayered rules inside mtrl.button (the general sheet) outrank this
    // nested layer, in either import order. Mixed apps keep the full contract.
    if (rule.name === "layer" && rule.nodes && rule.params === "mtrl.button") rule.params = "mtrl.button.fixed";
    if (rule.nodes && !rule.nodes.length) rule.remove();
  });
  assert(removed > 0, "The full button sheet must contain other visual profiles");
  return root.toString();
}
