import assert from "node:assert/strict";
import postcss from "postcss";
import { filledSmallRoundCss } from "./button-style-profile";

export const fixedButtonName = "button-filled-small-round";
export const optionalElementFiles = [
  `elements/${fixedButtonName}.js`, `elements/${fixedButtonName}.d.ts`,
  `elements/css/${fixedButtonName}.js`, `elements/preupgrade/${fixedButtonName}.css`,
];

/** Visual attributes are inert: project the parent's absent-attribute branch. */
export function fixedButtonPreupgrade(css: string): string {
  const root = postcss.parse(css);
  root.walkRules(rule => {
    const selectors = rule.selectors.map(selector => selector.replace(/:not\(\[(?:variant|size|shape)\]\)/g, ""))
      .filter(selector => !/\[(?:variant|size|shape)(?:[=\]])/.test(selector))
      .map(selector => selector.replace(/\bm-button(?=[:\s.[#>+~]|$)/g, `m-${fixedButtonName}`));
    if (selectors.length) rule.selectors = selectors;
    else rule.remove();
  });
  return root.toString();
}

/** The optional string lives here, never in the shared styles module. */
export function fixedButtonStyleModule(css: string): string {
  return 'import "./ripple.js";\nimport "./progress.js";\nimport { registerStyles } from "../styles.js";\n' +
    `registerStyles({${JSON.stringify(fixedButtonName)}:${JSON.stringify(filledSmallRoundCss(css))}});\n`;
}

export function validateOptionalElementProfiles(files: Map<string, string>): void {
  const general = files.get("elements/css/button.css");
  const preupgrade = files.get("elements/preupgrade/button.css");
  assert(general && preupgrade, "Fixed button requires its unchanged source sheets");
  assert.equal(files.get(`elements/css/${fixedButtonName}.js`), fixedButtonStyleModule(general));
  assert.equal(files.get(`elements/preupgrade/${fixedButtonName}.css`), fixedButtonPreupgrade(preupgrade));
  for (const file of optionalElementFiles) assert(files.has(file), `Missing optional element asset ${file}`);
}
