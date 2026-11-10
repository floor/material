/**
 * scripts/token-catalogue/inventory.ts
 *
 * The emitted inventory: every custom-property declaration, reference and
 * @property registration across the declared final outputs, resolved
 * globally — a name declared anywhere is declared — with per-surface emission
 * contexts and consumer contexts kept apart. A reference with no declaration
 * anywhere is an external, consumer-provided property, never a missing row.
 */
import { createHash } from "node:crypto";
import type { Consumers, Emission } from "./types";
import { walkCss, type CssDeclaration, type CssReference, type CssRegistration } from "./css";

/** One parsed output file: its public export surface and its CSS text. */
export interface OutputFile {
  /** Public export path (`styles.css`, `styles/base`, `themes/ocean`). */
  export: string;
  css: string;
}

export interface Inventory {
  files: string[];
  /** Distinct declared names, including @property-registered ones. */
  declaredNames: string[];
  emissions: Map<string, Emission[]>;
  /** Registration by name (a registration also counts as declared). */
  registrations: Map<string, { syntax: string; inherits: boolean; initialValue: string; export: string }[]>;
  consumers: Map<string, Consumers>;
  /** Distinct referenced names. */
  referencedNames: string[];
  /** Referenced but declared nowhere: consumer-provided, with the fallback. */
  external: Map<string, { fallback: string | null; exports: string[]; selectors: string[] }>;
  declarationCount: number;
  referenceCount: number;
  /** sha256 over the sorted (file, content) pairs: the built-input identity. */
  digest: string;
}

const key = (emission: Emission): string =>
  `${emission.conditions.join(" ")}|${emission.selector}`;

const classifyConsumer = (references: CssReference[]): Consumers => {
  const selectors = [...new Set(references.map(reference => reference.selector))].sort();
  const exports = [...new Set(references.map(reference => reference.file))].sort();
  // Utility classes (`mtrl-display-large`) and components (`mtrl-card`) both
  // read tokens; a name referenced only inside another declaration, or not at
  // all, is declaration-only on these outputs.
  const reads = selectors.filter(selector => /[.:#[]/.test(selector));
  const kind = reads.some(selector => /^\.mtrl-(display|headline|title|body|label)-/.test(selector.trim()))
    ? "utility"
    : reads.length ? "component" : "declaration-only";
  // Both samples are bounded; the inventory the checker validates is complete.
  return { kind, selectors: selectors.slice(0, 8), exports: exports.slice(0, 6) };
};

/** Build the inventory from the declared final outputs. */
export function buildInventory(outputs: OutputFile[]): Inventory {
  const declarations: CssDeclaration[] = [];
  const references: CssReference[] = [];
  const registrations: CssRegistration[] = [];
  for (const output of outputs) {
    const walked = walkCss(output.export, output.css);
    declarations.push(...walked.declarations);
    references.push(...walked.references);
    registrations.push(...walked.registrations);
  }

  const emissions = new Map<string, Emission[]>();
  const push = (name: string, emission: Emission): void => {
    const list = emissions.get(name) ?? [];
    const identity = `${emission.export}|${key(emission)}|${emission.value}`;
    if (!list.some(entry => `${entry.export}|${key(entry)}|${entry.value}` === identity)) list.push(emission);
    emissions.set(name, list);
  };
  for (const declaration of declarations) {
    push(declaration.name, {
      export: declaration.file,
      selector: declaration.selector,
      conditions: declaration.at,
      value: declaration.value,
    });
  }
  const registrationMap = new Map<string, { syntax: string; inherits: boolean; initialValue: string; export: string }[]>();
  for (const registration of registrations) {
    push(registration.name, {
      export: registration.file,
      selector: registration.selector,
      conditions: registration.at,
      value: `@property initial ${registration.initialValue}`,
    });
    const list = registrationMap.get(registration.name) ?? [];
    list.push({ syntax: registration.syntax, inherits: registration.inherits, initialValue: registration.initialValue, export: registration.file });
    registrationMap.set(registration.name, list);
  }

  const referencesByName = new Map<string, CssReference[]>();
  for (const reference of references) {
    const list = referencesByName.get(reference.name) ?? [];
    list.push(reference);
    referencesByName.set(reference.name, list);
  }

  const declaredNames = [...emissions.keys()].sort();
  const consumers = new Map<string, Consumers>();
  const external = new Map<string, { fallback: string | null; exports: string[]; selectors: string[] }>();
  for (const [name, list] of referencesByName) {
    consumers.set(name, classifyConsumer(list));
    if (!emissions.has(name)) {
      external.set(name, {
        fallback: list.find(reference => reference.fallback !== null)?.fallback ?? null,
        exports: [...new Set(list.map(reference => reference.file))].sort().slice(0, 6),
        selectors: [...new Set(list.map(reference => reference.selector))].sort().slice(0, 6),
      });
    }
  }

  const canonical = outputs
    .map(output => `${output.export}\n${output.css}`)
    .sort()
    .join("\n\u0000\n");
  return {
    files: outputs.map(output => output.export).sort(),
    declaredNames,
    emissions,
    registrations: registrationMap,
    consumers,
    referencedNames: [...referencesByName.keys()].sort(),
    external,
    declarationCount: declarations.length,
    referenceCount: references.length,
    digest: createHash("sha256").update(canonical).digest("hex"),
  };
}
