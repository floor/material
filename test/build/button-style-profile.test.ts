import { describe, expect, test } from "bun:test";
import { filledSmallRoundCss } from "../../scripts/button-style-profile";

const other = ".mtrl-button--xl{height:96px}";
describe("the fixed button CSS projection", () => {
  test("keeps common, focus, press, loading and selected rules byte for byte", () => {
    const kept = '.mtrl-button{height:40px}.mtrl-button:focus-visible{outline:3px solid red}.mtrl-button--active{border-radius:12px}.mtrl-button[disabled].mtrl-button--progress{opacity:.7}.mtrl-button--toggle.mtrl-button--selected.mtrl-button--filled{color:red}';
    expect(filledSmallRoundCss(kept + other)).toBe(kept);
  });
  test("keeps only the filled selector in a shared variant rule", () => {
    expect(filledSmallRoundCss('.mtrl-button--toggle.mtrl-button--filled,.mtrl-button--toggle.mtrl-button--tonal{box-shadow:none}' + other))
      .toBe('.mtrl-button--toggle.mtrl-button--filled{box-shadow:none}');
  });
  test("drops every unsupported size, colour and shape while keeping small/round", () => {
    const omitted = ["xs", "m", "l", "xl", "square", "circular", "elevated", "tonal", "outlined", "text"].map(name => `.mtrl-button--${name}{color:red}`).join("");
    const kept = '.mtrl-button--s{height:40px}.mtrl-button--round{border-radius:20px}';
    expect(filledSmallRoundCss(omitted + kept)).toBe(kept);
  });
  test("retains reduced-motion, direction and container override hooks", () => {
    const kept = '@layer mtrl.button{@media(prefers-reduced-motion:reduce){.mtrl-button{transition:none}}[dir=rtl] .mtrl-button--s{padding-left:12px}.mtrl-button{border-radius:var(--mtrl-button-shape,20px)}}';
    expect(filledSmallRoundCss(kept + other)).toBe(kept.replace("@layer mtrl.button{", "@layer mtrl.button.fixed{"));
  });
  test("handles selector commas inside pseudo-classes and strings", () => {
    const kept = '.mtrl-button:has(.mtrl-ripple,[data-x="a,b"]){opacity:1}';
    expect(filledSmallRoundCss(kept + other)).toBe(kept);
  });
  test("rejects an unreviewed future visual modifier", () => {
    expect(() => filledSmallRoundCss(".mtrl-button--xxl{height:120px}" + other)).toThrow("Unreviewed button modifier");
  });
  test("rejects an ambiguous functional visual selector rather than losing a valid state", () => {
    expect(() => filledSmallRoundCss('.mtrl-button:not(.mtrl-button--tonal){color:red}' + other)).toThrow("Cannot project");
  });
});
