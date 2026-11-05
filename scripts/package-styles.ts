// scripts/package-styles.ts
/**
 * The publish-time normalization of the Sass sources that ship: silent (`//`)
 * comments and ordinary indentation leave them before npm packs the tarball.
 * Neither reaches a consumer's compiled CSS. Sass drops silent comments, and
 * indentation is insignificant everywhere except in the regions below, which
 * stay byte for byte:
 *
 * - a loud (`/* *\/`) comment, which Sass emits into the consumer CSS, so its
 *   continuation lines carry their indentation with them;
 * - a custom property's value, which Sass keeps as raw text: its line breaks,
 *   indentation, `//` sequences (an `http://` scheme) and `/* *\/` are content.
 *
 * A `//` inside a quoted string or an unquoted `url(...)` is likewise content,
 * not a comment: the icon maps and masks in these files carry an SVG data
 * URL's `http://www.w3.org/2000/svg`. Interpolation is tracked too, so the `}`
 * that closes `#{...}` is text: in `.#{$layout}--stack {` the `--` continues a
 * selector, and reading it as a custom property would leave every following
 * line of that file indented and commented. That is why this is a tokenizer and
 * not a regex; the patterns sit in the same files a regex would eat (for
 * example abstract/_mixins.scss and components/_menu.scss). The compiled-CSS
 * guard over every public entry lives in scripts/check-styles-package.ts.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

type Mode = "normal" | "block" | "url" | "string";
type StringContext = "normal" | "url" | "custom";

const isIndent = (char: string): boolean => char === " " || char === "\t";

/**
 * Normalize one Sass source. Every change is invisible in the compiled CSS:
 * whole silent-comment lines are dropped, a silent comment after code is cut
 * to the newline, and lines outside a loud comment, a string, a `url()` or a
 * custom property's value lose their indentation. Inside those, a line of a
 * loud comment or of a custom property's value loses only what the line the
 * construct started on lost, since Sass re-indents the construct relative to
 * that line; a string or a url() is copied as it is.
 */
export function normalizeStyleSource(source: string): string {
  let out = "";
  let mode: Mode = "normal";
  let stringContext: StringContext = "normal";
  let quote = "";
  let escaped = false;
  let urlParens = 0;
  let custom = false;
  let customParens = 0;
  let customBraces = 0;
  let interpolation = 0;
  let customShift = 0;
  let commentShift = 0;
  let statementStart = true;
  let lineHasContent = false;
  let lineShift = 0;
  let i = 0;
  const length = source.length;

  while (i < length) {
    const char = source[i];

    // Line-start indentation. It is formatting unless the line begins inside
    // something that ships its whitespace: a loud comment, a string, a url()
    // or a custom property's value. Sass re-indents a loud comment and a custom
    // property's value relative to the line the construct started on, so a
    // continuation line loses exactly what that opening line lost, never more:
    // the construct's own indentation stays intact.
    if ((i === 0 || source[i - 1] === "\n") && isIndent(char)) {
      let end = i;
      while (end < length && isIndent(source[end])) end += 1;
      const run = end - i;
      let shift = 0;
      if (mode === "normal" && custom) shift = Math.min(run, customShift);
      else if (mode === "normal") shift = run;
      else if (mode === "block") shift = Math.min(run, commentShift);
      out += source.slice(i + shift, end);
      lineShift = shift;
      i = end;
      continue;
    }

    if (mode === "block") {
      if (char === "*" && source[i + 1] === "/") {
        out += "*/";
        i += 2;
        mode = "normal";
        lineHasContent = true;
        continue;
      }
      out += char;
      i += 1;
      if (char === "\n") {
        lineHasContent = false;
        lineShift = 0;
      } else if (!isIndent(char)) lineHasContent = true;
      continue;
    }

    if (mode === "string") {
      out += char;
      i += 1;
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) mode = stringContext === "url" ? "url" : "normal";
      if (char === "\n") {
        lineHasContent = false;
        lineShift = 0;
      } else if (!isIndent(char)) lineHasContent = true;
      continue;
    }

    if (mode === "url") {
      if (char === '"' || char === "'") {
        quote = char;
        escaped = false;
        stringContext = "url";
        mode = "string";
        out += char;
        i += 1;
        lineHasContent = true;
        continue;
      }
      if (char === "(") urlParens += 1;
      if (char === ")") {
        urlParens -= 1;
        if (urlParens === 0) mode = "normal";
      }
      out += char;
      i += 1;
      if (char === "\n") {
        lineHasContent = false;
        lineShift = 0;
      } else if (!isIndent(char)) lineHasContent = true;
      continue;
    }

    if (custom) {
      if (char === '"' || char === "'") {
        quote = char;
        escaped = false;
        stringContext = "custom";
        mode = "string";
        out += char;
        i += 1;
        lineHasContent = true;
        continue;
      }
      if (char === "#" && source[i + 1] === "{") {
        customBraces += 1;
        out += "#{";
        i += 2;
        lineHasContent = true;
        continue;
      }
      if (char === "{") {
        customBraces += 1;
        out += char;
        i += 1;
        lineHasContent = true;
        continue;
      }
      if (char === "}") {
        if (customBraces > 0) customBraces -= 1;
        else {
          custom = false;
          statementStart = true;
        }
        out += char;
        i += 1;
        lineHasContent = true;
        continue;
      }
      if (char === "(") {
        customParens += 1;
        out += char;
        i += 1;
        lineHasContent = true;
        continue;
      }
      if (char === ")") {
        if (customParens > 0) customParens -= 1;
        out += char;
        i += 1;
        lineHasContent = true;
        continue;
      }
      if (char === ";") {
        if (customParens === 0 && customBraces === 0) {
          custom = false;
          statementStart = true;
        }
        out += char;
        i += 1;
        lineHasContent = true;
        continue;
      }
      out += char;
      i += 1;
      if (char === "\n") {
        lineHasContent = false;
        lineShift = 0;
      } else if (!isIndent(char)) lineHasContent = true;
      continue;
    }

    if (char === "\n") {
      out += char;
      i += 1;
      lineHasContent = false;
      lineShift = 0;
      continue;
    }

    if (char === "/" && source[i + 1] === "/") {
      let end = i + 2;
      while (end < length && source[end] !== "\n") end += 1;
      if (lineHasContent) {
        // Code precedes the comment: keep the code, cut the comment and the
        // spaces before it, keep the newline.
        out = out.replace(/[ \t]+$/, "");
        i = end;
      } else {
        // The line held nothing but the comment: drop the line and its newline.
        i = end < length ? end + 1 : end;
      }
      continue;
    }

    if (char === "/" && source[i + 1] === "*") {
      out += "/*";
      i += 2;
      mode = "block";
      commentShift = lineShift;
      lineHasContent = true;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      escaped = false;
      stringContext = "normal";
      mode = "string";
      out += char;
      i += 1;
      lineHasContent = true;
      statementStart = false;
      continue;
    }

    if (char === "(") {
      const prefix = source.slice(Math.max(0, i - 3), i).toLowerCase();
      const boundary = i < 4 || !/[A-Za-z0-9_-]/.test(source[i - 4]);
      if (prefix === "url" && boundary) {
        mode = "url";
        urlParens = 1;
      }
      out += char;
      i += 1;
      lineHasContent = true;
      statementStart = false;
      continue;
    }

    if (char === "#" && source[i + 1] === "{") {
      // Interpolation. Its braces are text, not a block, and the closing `}` is
      // not a statement start: in `.#{$layout}--stack {` the `--` that follows
      // is part of a selector, not a custom property. Reading it as one would
      // keep every line after it indented and every `//` after it raw.
      out += "#{";
      i += 2;
      interpolation += 1;
      lineHasContent = true;
      statementStart = false;
      continue;
    }

    if (interpolation > 0 && (char === "{" || char === "}")) {
      // A brace nested in interpolation pairs with its own kind and never
      // touches the block state.
      out += char;
      i += 1;
      interpolation += char === "{" ? 1 : -1;
      lineHasContent = true;
      continue;
    }

    if (char === "-" && source[i + 1] === "-" && statementStart) {
      // A declaration whose value Sass keeps as raw text: no comment is
      // recognized inside it, and its continuation lines keep their indentation
      // relative to the line the declaration started on.
      custom = true;
      customParens = 0;
      customBraces = 0;
      customShift = lineShift;
      statementStart = false;
      out += "--";
      i += 2;
      lineHasContent = true;
      continue;
    }

    if (char === "{" || char === "}" || char === ";") statementStart = true;
    else if (!isIndent(char)) statementStart = false;
    out += char;
    i += 1;
    if (!isIndent(char)) lineHasContent = true;
  }

  return out;
}

/** The bytes and file count of one tree normalization. */
export interface StyleNormalization {
  files: number;
  bytesBefore: number;
  bytesAfter: number;
}

async function scssFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await scssFiles(path));
    else if (entry.isFile() && entry.name.endsWith(".scss")) files.push(path);
  }
  return files;
}

/** Normalize every Sass source under `directory`, in place. */
export async function normalizeStyleTree(directory: string): Promise<StyleNormalization> {
  const files = await scssFiles(directory);
  let bytesBefore = 0;
  let bytesAfter = 0;
  for (const file of files) {
    const source = await readFile(file, "utf8");
    const normalized = normalizeStyleSource(source);
    bytesBefore += Buffer.byteLength(source);
    bytesAfter += Buffer.byteLength(normalized);
    if (normalized !== source) await writeFile(file, normalized);
  }
  return { files: files.length, bytesBefore, bytesAfter };
}
