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
// Every expected string is exact, so a tokenizer that degrades to a regex
// fails here. The compiled-CSS guard over the real entries, which no fixture
// can replace, lives in scripts/check-styles-package.ts.
import { describe, expect, test } from "bun:test";
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

  test("keeps slashes inside a custom property's value", () => {
    // Sass emits this value as raw text: `//example.com` is not a comment, and
    // a regex strip would delete it from the shipped source.
    const source = "a {\n  --x: http://example.com;\n}\n";
    expect(normalize(source)).toBe("a {\n--x: http://example.com;\n}\n");
  });

  test("is idempotent", () => {
    const source = "a {\n  /* one\n     two */\n  --x: color-mix(\n    in srgb,\n    red\n  );\n  color: red; // note\n}\n";
    const once = normalize(source);
    expect(normalize(once)).toBe(once);
  });
});
