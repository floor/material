// The module of each element and declaration child in src/elements, read from
// the registry's imports in src/elements/index.ts, so the generated adapters
// can import one component without the registry (FLO-327).

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { elements, declarations } from "../src/elements";

const index = readFileSync(resolve(import.meta.dir, "../src/elements/index.ts"), "utf8");
const moduleOf = new Map<string, string>();
for (const [, names, from] of index.matchAll(/^import \{([^}]+)\} from "\.\/([a-z-]+)";$/gm)) {
  for (const name of names.split(",")) moduleOf.set(name.trim(), from);
}

const find = (identifier: string): string => {
  const module = moduleOf.get(identifier);
  if (!module) throw new Error(`${identifier} is not imported by src/elements/index.ts`);
  return module;
};

/**
 * Identifiers that write a word boundary the element's name does not (FLO-383):
 * the element `textfield` (tag `m-textfield`) is `TextField` in every exported
 * identifier, as M3 writes "text field" as two words. Tags, module files and the
 * registry key keep the element's name.
 */
const CANONICAL: Record<string, string> = { textfield: "TextField" };

/** `navigationRail` → `NavigationRail`; `textfield` → `TextField` (FLO-383). */
export const pascal = (name: string): string =>
  CANONICAL[name] ?? name.replace(/(^|-)([a-z])/g, (_, __: string, c: string) => c.toUpperCase());

/** `navigationRail` → `navigationRail`; `textfield` → `textField`, as the element's exports are named. */
export const camel = (name: string): string => pascal(name).replace(/^[A-Z]/, (c) => c.toLowerCase());

/** Each element: its registry name, its module in src/elements, and its CSS modules. */
export const elementModules = Object.entries(elements).map(([name, element]) => ({
  name,
  module: find(`${camel(name)}Element`),
  styles: [...element.spec.styles],
}));

/** Each declaration child: its registry name and its module in src/elements. */
export const declarationModules = Object.keys(declarations).map((name) => ({ name, module: find(`${name}Declaration`) }));

/** `navigationRailItem` → `navigation-rail-item`: the file name of a generated adapter module. */
export const kebab = (name: string): string => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

