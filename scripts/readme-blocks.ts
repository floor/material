// scripts/readme-blocks.ts
/**
 * The fenced examples of README.md and npm-readme.md, and the mark a fence can
 * carry on the line above it:
 *
 *   <!-- example: run, shows "Sign up" -->
 *     The fence is a whole example. readme-browser:check builds it with Vite from
 *     the packed package, opens it in Chromium and waits for that text to be
 *     visible. A reader who copies the fence gets the same page.
 *   <!-- example: continues -->
 *     The fence goes on from the one before it (it uses its names). readme:check
 *     compiles the two together; it is not run.
 *
 * A fence with no mark is a fragment: compiled when it is TypeScript, not run.
 */
import assert from "node:assert/strict";

export const FILES = ["README.md", "npm-readme.md"] as const;

export interface Block {
  file: string;
  line: number;
  lang: string;
  code: string;
  /** The text that must be visible when the example has run; undefined when it is not run. */
  shows?: string;
  /** Goes on from the previous fence. */
  continues: boolean;
}

export interface Doc { file: string; text: string; blocks: Block[]; prose: string; spans: string[]; links: string[]; slugs: Set<string> }

/** GitHub's heading anchor: lower case, punctuation dropped, spaces to hyphens. */
const slug = (heading: string): string =>
  heading.trim().toLowerCase().replace(/[^\p{L}\p{N} _-]/gu, "").replace(/ /g, "-");

export const headingSlugs = (text: string): Set<string> =>
  new Set([...text.replace(/^```[\s\S]*?^```/gm, "").matchAll(/^#{1,6} (.+)$/gm)].map(match => slug(match[1])));

export const parse = async (file: string): Promise<Doc> => {
  const text = await Bun.file(file).text();
  const blocks: Block[] = [];
  const lines = text.split("\n");
  const proseLines: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const open = /^```(\w+)\s*$/.exec(lines[index]);
    if (!open) { proseLines.push(lines[index]); continue; }
    const start = index;
    const code: string[] = [];
    for (index++; index < lines.length && lines[index] !== "```"; index++) code.push(lines[index]);
    assert(index < lines.length, `${file}:${start + 1}: the code block is not closed`);
    const mark = /^<!-- example: (.+) -->$/.exec(lines[start - 1] ?? "")?.[1];
    const shows = mark === undefined ? undefined : /^run, shows "([^"]+)"$/.exec(mark)?.[1];
    assert(mark === undefined || mark === "continues" || shows !== undefined,
      `${file}:${start}: the mark is \`example: run, shows "<visible text>"\` or \`example: continues\`, not "${mark}"`);
    assert(mark !== "continues" || blocks.length > 0, `${file}:${start}: nothing for this fence to continue`);
    blocks.push({ file, line: start + 1, lang: open[1], code: code.join("\n"), shows, continues: mark === "continues" });
  }
  const prose = proseLines.join("\n");
  return {
    file, text, blocks, prose,
    spans: [...prose.matchAll(/`([^`\n]+)`/g)].map(match => match[1]),
    links: [...prose.matchAll(/\]\(([^)\s]+)\)/g)].map(match => match[1]),
    slugs: headingSlugs(text),
  };
};
