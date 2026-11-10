// test/token-catalogue/css-walker.test.ts
//
// The catalogue's inventory rests on this walker: it must find declarations
// and references through layers, media queries, nesting and strings, and it
// must not confuse selectors or parenthesised values for declarations.
import { describe, expect, test } from "bun:test";
import { walkCss } from "../../scripts/token-catalogue/css";

const css = `@layer mtrl.base,mtrl.utilities;
@layer mtrl.base{
  :root{--mtrl-sys-shape-corner-large:16px;--mtrl-ref-typeface-brand:Roboto,sans-serif}
  .mtrl-theme-ocean{--mtrl-sys-color-primary:#0061a4;color:var(--mtrl-sys-color-primary,var(--mtrl-sys-color-on-primary,#fff))}
}
@media (prefers-contrast:more){
  .mtrl-theme-ocean{--mtrl-sys-color-primary:#000}
}
@supports (corner:1px){
  @media (min-width:600px){
    .card{border-radius:var(--mtrl-sys-shape-corner-large,16px) var(--mtrl-sys-shape-corner-none,0px)}
  }
}
@property --mtrl-density{syntax:'<integer>';inherits:true;initial-value:0}
.mtrl-density--1{--mtrl-density:-1}
a:hover{color:rgb(0 0 0/ var(--mtrl-sys-state-hover,0.08))}
.mtrl-nested{color:red;&:hover{--mtrl-nested-inner:1px;border-radius:var(--mtrl-nested-inner)}}
@keyframes mtrl-in{from{opacity:0}to{opacity:1}}
/* a comment with --mtrl-fake:1 and var(--mtrl-also-fake) */
.mtrl-string{font-family:"--mtrl-not-a:decl";content:'var(--mtrl-not-a-ref)';--mtrl-plain:var(--mtrl-a, var(--mtrl-b, 2px))}
`;

describe("walkCss", () => {
  const walked = walkCss("test.css", css);

  test("finds every custom-property declaration with its context", () => {
    const names = walked.declarations.map(declaration => declaration.name);
    expect(names).toContain("--mtrl-sys-shape-corner-large");
    expect(names).toContain("--mtrl-ref-typeface-brand");
    expect(names).toContain("--mtrl-sys-color-primary"); // theme context
    expect(names).toContain("--mtrl-density");
    expect(names).toContain("--mtrl-nested-inner"); // inside nesting
    expect(names).not.toContain("--mtrl-fake");
    expect(names).not.toContain("--mtrl-not-a:decl");
    const primary = walked.declarations.filter(declaration => declaration.name === "--mtrl-sys-color-primary");
    expect(primary.map(entry => entry.at.join("|"))).toEqual(["@layer mtrl.base", "@media (prefers-contrast:more)"]);
  });

  test("records the selector a nested declaration sits in", () => {
    const nested = walked.declarations.find(declaration => declaration.name === "--mtrl-nested-inner");
    expect(nested?.selector).toContain(".mtrl-nested");
    expect(nested?.selector).toContain("&:hover");
  });

  test("finds every var() reference, fallbacks included, quotes respected", () => {
    const names = new Set(walked.references.map(reference => reference.name));
    for (const name of [
      "--mtrl-sys-color-on-primary", "--mtrl-sys-shape-corner-large", "--mtrl-sys-shape-corner-none",
      "--mtrl-sys-state-hover", "--mtrl-nested-inner", "--mtrl-a", "--mtrl-b",
    ]) expect(names.has(name), name).toBe(true);
    expect(names.has("--mtrl-not-a-ref")).toBe(false);
  });

  test("captures the fallback chain of a reference", () => {
    const outer = walked.references.find(reference => reference.name === "--mtrl-a");
    expect(outer?.fallback).toBe("var(--mtrl-b, 2px)");
    const inner = walked.references.find(reference => reference.name === "--mtrl-b");
    expect(inner?.fallback).toBe("2px");
  });

  test("reads @property registrations", () => {
    expect(walked.registrations).toHaveLength(1);
    expect(walked.registrations[0]).toMatchObject({
      name: "--mtrl-density", syntax: "'<integer>'", inherits: true, initialValue: "0",
    });
  });

  test("a declaration inside @keyframes is still inventoried", () => {
    // keyframes cannot declare custom properties, but if one appears the
    // inventory must see it rather than silently drop it.
    const keyframe = walkCss("k.css", "@keyframes m{from{--mtrl-in-frame:1}to{opacity:1}}");
    expect(keyframe.declarations.map(declaration => declaration.name)).toEqual(["--mtrl-in-frame"]);
  });
});
