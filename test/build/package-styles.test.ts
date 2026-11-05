// test/build/package-styles.test.ts
//
// The publish packs normalized Sass (scripts/package-styles.ts): silent
// comments and ordinary indentation leave the shipped sources. A regex is not
// enough, and each test below is a trap it would fall into:
//
// - `//` inside a quoted SVG data string, an unquoted url() or a custom
//   property's raw value is content, not a comment (the icon maps and masks
//   carry an `http://www.w3.org/2000/svg`);
// - a loud comment's and a custom property's value are re-indented by Sass
//   relative to the line they start on, so their continuation lines lose
//   exactly what the opening line lost, never their own relative indentation.
//
// One silent comment stays: a generated theme's origin header, which md3.io
// reads from the installed package to show each built-in theme's seed and
// variant. Every other silent comment goes.
//
// Every expected string is exact, so a tokenizer that degrades to a regex
// fails here. The compiled-CSS guard over the real entries, which no fixture
// can replace, lives in scripts/check-styles-package.ts.
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeStyleSource } from "../../scripts/package-styles";

const normalize = (source: string): string => normalizeStyleSource(source);

describe("the publish-time Sass normalization", () => {
  test("keeps the http:// scheme in a quoted SVG data string", () => {
    const source = `$icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"%3E';\n`;
    expect(normalize(source)).toBe(source);
  });

  test("keeps the http:// scheme inside url(\"...\")", () => {
    const source = `a {\n  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E");\n}\n`;
    expect(normalize(source)).toBe(
      `a {\nmask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E");\n}\n`,
    );
  });

  test("keeps a protocol-relative URL in an unquoted url()", () => {
    const source = "a {\n  background: url(//cdn.example/x.png);\n}\n";
    expect(normalize(source)).toBe("a {\nbackground: url(//cdn.example/x.png);\n}\n");
  });

  test("keeps slashes inside an ordinary quoted string", () => {
    const source = `a {\n  content: "a // b";\n}\n`;
    expect(normalize(source)).toBe(`a {\ncontent: "a // b";\n}\n`);
  });

  test("keeps slashes inside a loud comment", () => {
    const source = "a {\n  /* http://x // y */\n}\n";
    expect(normalize(source)).toBe("a {\n/* http://x // y */\n}\n");
  });

  test("cuts a silent comment after code and keeps the code", () => {
    const source = "a {\n  color: red; // note\n  background: blue;\n}\n";
    expect(normalize(source)).toBe("a {\ncolor: red;\nbackground: blue;\n}\n");
  });

  test("drops a line that held nothing but a silent comment", () => {
    const source = "a {\n  // note\n  color: red;\n}\n";
    expect(normalize(source)).toBe("a {\ncolor: red;\n}\n");
  });

  test("keeps a loud comment's relative indentation", () => {
    // Sass re-indents the comment's continuation lines with the rule, so they
    // must lose exactly the four spaces the opening line lost: a naive dedent
    // would flatten them and change the emitted CSS.
    const source = "a {\n    /* line one\n       continuation\n     */\n  color: red;\n}\n";
    expect(normalize(source)).toBe("a {\n/* line one\n   continuation\n */\ncolor: red;\n}\n");
  });

  test("keeps a custom property's value byte for byte", () => {
    // Sass keeps the value as raw text and re-indents it relative to the
    // declaration's line, so the continuation lines lose the two spaces the
    // declaration line lost, not their own four.
    const source = "a {\n  --x: color-mix(\n    in srgb,\n    var(--y) 38%,\n    transparent\n  );\n  color: red;\n}\n";
    expect(normalize(source)).toBe("a {\n--x: color-mix(\n  in srgb,\n  var(--y) 38%,\n  transparent\n);\ncolor: red;\n}\n");
  });

  test("keeps reading a selector after interpolation closes", () => {
    // `.#{$layout}--stack` closes an interpolation and continues the selector.
    // A tokenizer that reads the `}` as a block end takes `--stack` for a
    // custom property and leaves every line after it indented and commented.
    const source = ".#{$layout}--stack {\n  display: flex;\n  // alignment\n  gap: 4px;\n}\n";
    expect(normalize(source)).toBe(".#{$layout}--stack {\ndisplay: flex;\ngap: 4px;\n}\n");
  });

  test("keeps reading a declaration value after an interpolation closes", () => {
    // Same trap one level in: the interpolation closes inside a property value,
    // a dashed token follows it, and the value continues on the next line. Read
    // depth-blind, the `}` starts a statement, `--fallback` opens a custom
    // property, and the continuation line and its comment stay raw.
    const source = "a {\n  font-family: #{$family}--fallback, // the stack\n    sans-serif;\n  color: red;\n}\n";
    expect(normalize(source)).toBe("a {\nfont-family: #{$family}--fallback,\nsans-serif;\ncolor: red;\n}\n");
  });

  test("keeps reading a selector after nested interpolation closes", () => {
    // Interpolation nests. If depth is not counted, the inner `}` closes the
    // outer interpolation early, the `--stack` after it opens a custom
    // property, and the rule body keeps its indentation and silent comment.
    const source = ".#{ if($compact, #{ $dense }, #{ $roomy }) }--stack {\n  // alignment\n  display: flex;\n}\n";
    expect(normalize(source)).toBe(".#{ if($compact, #{ $dense }, #{ $roomy }) }--stack {\ndisplay: flex;\n}\n");
  });

  test("keeps slashes inside a custom property's value", () => {
    // Sass emits this value as raw text: `//example.com` is not a comment, and
    // a regex strip would delete it from the shipped source.
    const source = "a {\n  --x: http://example.com;\n}\n";
    expect(normalize(source)).toBe("a {\n--x: http://example.com;\n}\n");
  });

  test("keeps a generated theme's origin header and drops its neighbours", () => {
    // md3.io reads this line from the installed package to show each built-in
    // theme's seed and variant (its server matches the parenthesized part), so
    // this one silent comment is content; the rest of the header block is not.
    const source = "// A theme.\n// Generated by scripts/generate-themes.ts (seed #6750A4, variant Content) with\n// material-color-utilities: do not edit, change the script and regenerate.\n@use \"x\";\n";
    expect(normalize(source)).toBe(
      "// Generated by scripts/generate-themes.ts (seed #6750A4, variant Content) with\n@use \"x\";\n",
    );
  });

  test("keeps the origin header in all fourteen generated theme files", () => {
    const directory = fileURLToPath(new URL("../../src/styles/themes/", import.meta.url));
    let generated = 0;
    for (const name of readdirSync(directory).filter(entry => entry.endsWith(".scss"))) {
      const source = readFileSync(join(directory, name), "utf8");
      const header = source.split("\n").find(line => line.startsWith("// Generated by scripts/generate-themes.ts ("));
      if (header === undefined) continue;
      generated += 1;
      const normalized = normalize(source);
      expect(normalized).toContain(`${header}\n`);
      expect(normalized).not.toContain("material-color-utilities: do not edit");
    }
    expect(generated).toBe(14);
  });

  test("is idempotent", () => {
    const source = "a {\n  /* one\n     two */\n  --x: color-mix(\n    in srgb,\n    red\n  );\n  color: red; // note\n}\n";
    const once = normalize(source);
    expect(normalize(once)).toBe(once);
  });
});
