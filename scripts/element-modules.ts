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

/** `navigationRail` → `NavigationRail`. A camelCase key such as `textField` becomes `TextField`. */
export const pascal = (name: string): string =>
  name.replace(/(^|-)([a-z])/g, (_, __: string, c: string) => c.toUpperCase());

/** `navigationRail` → `navigationRail`. */
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

