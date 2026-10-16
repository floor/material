// test/styles/typescale-classes.test.ts
//
// The typescale classes (.mtrl-display-large ….mtrl-label-small) and
// the document rules (h1–h6, p) read their role's custom properties, so a
// typeface or size set on the tokens reaches them. They hardcoded Roboto and
// pixel values before.
import { describe, test, expect } from "bun:test";
import { compileString } from "sass";

const css = compileString(`@use 'base/tokens'; @use 'base/typography';`, { loadPaths: ["src/styles"], style: "expanded" }).css;

/** A rule's declarations, by property */
const rule = (selector: string): Record<string, string> => {
  const match = css.match(new RegExp(`(?:^|\\n)${selector.replace(/[.]/g, "\\.")} \\{([^}]*)\\}`));
  if (!match) throw new Error(`no rule for ${selector}`);
  return Object.fromEntries(match[1].split(";").map((line) => line.trim()).filter(Boolean).map((line) => {
    const at = line.indexOf(":");
    return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
  }));
};

/** The roles the tokens are emitted for, read back from the compiled :root */
const roles = [...new Set([...css.matchAll(/--mtrl-sys-typescale-([a-z]+-(?:large|medium|small))-font:/g)].map(([, role]) => role))];

const reads = (role: string) => ({
  "font-family": `var(--mtrl-sys-typescale-${role}-font)`,
  "font-size": `var(--mtrl-sys-typescale-${role}-font-size)`,
  "line-height": `var(--mtrl-sys-typescale-${role}-line-height)`,
  "letter-spacing": `var(--mtrl-sys-typescale-${role}-letter-spacing)`,
  "font-weight": `var(--mtrl-sys-typescale-${role}-font-weight)`,
});

describe("typescale classes", () => {
  test("one class per role, fifteen", () => {
    expect(roles).toHaveLength(15);
  });

  test("each class reads its own role's five tokens, and nothing hardcoded", () => {
    for (const role of roles) expect({ role, declarations: rule(`.mtrl-${role}`) }).toEqual({ role, declarations: reads(role) });
    expect(css.includes("Roboto")).toBe(true); // only in the reference typeface tokens
    expect(/\.mtrl-[a-z]+-(large|medium|small) \{[^}]*Roboto/.test(css)).toBe(false);
  });

  test("h1–h6 and p read the roles they wear", () => {
    const document = { h1: "headline-large", h2: "headline-medium", h3: "headline-small", h4: "title-large", h5: "title-medium", h6: "title-small", p: "body-medium" };
    for (const [tag, role] of Object.entries(document)) {
      const declarations = rule(tag);
      expect({ tag, reads: Object.fromEntries(Object.keys(reads(role)).map((property) => [property, declarations[property]])) }).toEqual({ tag, reads: reads(role) });
    }
  });
});
