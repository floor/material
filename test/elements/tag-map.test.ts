// test/elements/tag-map.test.ts
//
// Every tag the elements define has an HTMLElementTagNameMap entry,
// so `document.querySelector("m-switch")` is typed. The entries live beside
// each element's type; this reads every defined tag from the specs and finds
// its entry, so a new element without one fails here. The types themselves
// are pinned in test/types/tag-map.fixture.ts.
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { declarations, elements } from "../../src/elements";

const ROOT = new URL("../../", import.meta.url).pathname;
const sources = new Map<string, string>();
const source = (file: string): string => {
  if (!sources.has(file)) sources.set(file, readFileSync(`${ROOT}src/elements/${file}.ts`, "utf8"));
  return sources.get(file) as string;
};

/** The HTMLElementTagNameMap entries a module declares, tag to type. */
const entries = (file: string): Map<string, string> => {
  const block = /interface HTMLElementTagNameMap \{([^}]*)\}/.exec(source(file))?.[1] ?? "";
  return new Map(Array.from(block.matchAll(/"([a-z-]+)": ([^;]+);/g), ([, tag, type]) => [tag, type]));
};

describe("HTMLElementTagNameMap", () => {
  test("every element's tag maps to its element type", () => {
    for (const definition of Object.values(elements)) {
      const { name } = definition.spec;
      const type = entries(name).get(`m-${name}`);
      expect({ name, type }).toEqual({ name, type: expect.stringMatching(/^\w+Element$/) });
    }
  });

  test("every declaration's tag maps to its attributes, in its parent's module", () => {
    const modules = Object.values(elements).map((definition) => definition.spec.name);
    for (const declaration of Object.values(declarations)) {
      const tag = `m-${declaration.name}`;
      const type = modules.map((file) => entries(file).get(tag)).find(Boolean);
      expect({ tag, type }).toEqual({ tag, type: expect.stringMatching(/^HTMLElement & \w+Attributes$/) });
    }
  });

  test("covers exactly the defined tags", () => {
    const defined = [
      ...Object.values(elements).map((definition) => `m-${definition.spec.name}`),
      ...Object.values(declarations).map((declaration) => `m-${declaration.name}`),
    ].sort();
    const mapped = Object.values(elements)
      .flatMap((definition) => Array.from(entries(definition.spec.name).keys()))
      .sort();
    expect(mapped).toEqual(defined);
  });
});
