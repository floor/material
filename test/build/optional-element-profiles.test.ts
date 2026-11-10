import { expect, test } from "bun:test";
import { fixedButtonPreupgrade, fixedButtonStyleModule } from "../../scripts/optional-element-profiles";
import { buttonElement } from "../../src/elements/button";
import { buttonFilledSmallRoundElement } from "../../src/elements/button-filled-small-round";

test("fixed descriptor isolates both style keys without mutating the general spec", () => {
  const fixed = buttonFilledSmallRoundElement.spec;
  expect(fixed).not.toBe(buttonElement.spec);
  expect(fixed.name).toBe("button-filled-small-round");
  expect(fixed.styles).toEqual(["progress", "button-filled-small-round"]);
  expect(buttonElement.spec.name).toBe("button");
  expect(buttonElement.spec.styles).toEqual(["progress", "button"]);
  expect(fixed.ssr).toBe(false);
  expect(fixed.attributes?.variant.config).toBeUndefined();
  expect(fixed.attributes?.size.config).toBeUndefined();
  expect(fixed.attributes?.shape.config).toBeUndefined();
});
test("pre-upgrade projection keeps the absent-visual-attribute branch and icon placement", () => {
  const css = 'm-button:not(:defined){height:40px}m-button:not(:defined)[size=m]{height:56px}m-button:not(:defined)[icon]:not([size]),m-button:not(:defined)[icon][size=s]{padding:12px}m-button:not(:defined)[icon][icon-position=end]{color:red}';
  expect(fixedButtonPreupgrade(css)).toBe('m-button-filled-small-round:not(:defined){height:40px}m-button-filled-small-round:not(:defined)[icon]{padding:12px}m-button-filled-small-round:not(:defined)[icon][icon-position=end]{color:red}');
});
test("shadow module owns its projected string and retains ripple/progress imports", () => {
  const module = fixedButtonStyleModule('.mtrl-button{height:40px}.mtrl-button--xl{height:96px}');
  expect(module).toContain('import "./ripple.js"');
  expect(module).toContain('import "./progress.js"');
  expect(module).toContain('"button-filled-small-round":".mtrl-button{height:40px}"');
  expect(module).not.toContain("s_button");
});
