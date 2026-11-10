/**
 * scripts/token-catalogue/schema.ts
 *
 * The emitted JSON Schema for the catalogue, and the strict validator the
 * checks run against it. The schema is JSON Schema draft 2020-12; the
 * validator implements the subset the schema uses — types, enums, required
 * fields, array items, object properties, patterns — and rejects anything the
 * schema marks invalid. Unknown properties are tolerated (forward
 * compatibility), but the status and evidence enums are exact: a misspelled
 * `verfied` is an error, never an ignored extra field.
 */
import { REASONS } from "./types";

const enumOf = (values: string[]) => ({ enum: values });

/** The schema of the packed catalogue document, emitted beside the data. */
export function catalogueSchema(): Record<string, unknown> {
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://floor.github.io/material/token-catalogue.schema.json",
    title: "Material token catalogue",
    description: "The versioned inventory of the package's emitted design tokens: the mapping to Material's taxonomy and the verification state of every row, with its reason. Verification states are claims with evidence, never a certificate of conformance.",
    type: "object",
    required: ["schemaVersion", "catalogueRevision", "packageVersion", "sourceCommit", "inputsDigest", "emissionsDigest", "reasons", "sources", "tokens", "gaps"],
    properties: {
      schemaVersion: { type: "integer", enum: [2] },
      catalogueRevision: { type: "integer", minimum: 1 },
      packageVersion: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+(?:-[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?$" },
      sourceCommit: { type: "string", pattern: "^[0-9a-f]{40}$" },
      inputsDigest: { type: "string", pattern: "^[0-9a-f]{64}$" },
      emissionsDigest: { type: "string", pattern: "^[0-9a-f]{64}$" },
      reasons: {
        type: "array",
        items: {
          type: "object",
          required: ["code", "text"],
          properties: {
            code: { type: "string", pattern: "^[a-z0-9-]+$" },
            text: { type: "string" },
          },
        },
      },
      sources: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "url", "section", "readDate", "generation", "status", "digest", "digestSha256"],
          properties: {
            id: { type: "string" },
            url: { type: "string" },
            section: { type: "string" },
            readDate: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            generation: { type: "string" },
            status: enumOf(["read", "context-only", "unavailable"]),
            digest: { type: "string" },
            digestSha256: { type: "string", pattern: "^[0-9a-f]{64}$" },
          },
        },
      },
      tokens: {
        type: "array",
        items: {
          type: "object",
          required: ["cssName", "m3Id", "family", "group", "verification", "reason", "source"],
          properties: {
            cssName: { type: "string", pattern: "^--mtrl-[a-z0-9-]+$" },
            m3Id: { type: ["string", "null"] },
            family: enumOf(["reference", "system", "library"]),
            group: enumOf(["typeface", "shape", "typescale", "color", "state", "density", "component-hook", "consumer-provided"]),
            verification: enumOf(["verified", "unverified", "not-applicable"]),
            reason: enumOf(REASONS.map(reason => reason.code)),
            source: { type: ["string", "null"] },
          },
        },
      },
      gaps: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "m3Id", "source", "support", "supportReason", "emissions"],
          properties: {
            id: { type: "string" },
            m3Id: { type: ["string", "null"] },
            source: { type: ["string", "null"] },
            support: enumOf(["unsupported"]),
            supportReason: { type: "string" },
            emissions: { type: "array", maxItems: 0 },
          },
        },
      },
    },
  };
}

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

const typeOf = (value: Json): string =>
  Array.isArray(value) ? "array" : value === null ? "null" : typeof value;

/** Validate a JSON value against a schema node; every failure, with its path. */
export function validateAgainst(value: Json, schema: Json, path = "$"): string[] {
  if (typeof schema !== "object" || schema === null || Array.isArray(schema)) return [`${path}: schema node is not an object`];
  const failures: string[] = [];
  const types = schema.type instanceof Array ? schema.type : typeof schema.type === "string" ? [schema.type] : null;
  if (types) {
    const actual = typeOf(value);
    const ok = types.some(expected =>
      expected === actual
      || (expected === "integer" && actual === "number" && Number.isInteger(value))
      || (expected === "number" && actual === "number"));
    if (!ok) {
      failures.push(`${path}: expected ${types.join("|")}, found ${actual}`);
      return failures;
    }
  }
  if ("enum" in schema && Array.isArray(schema.enum)) {
    if (!schema.enum.some(option => JSON.stringify(option) === JSON.stringify(value))) {
      failures.push(`${path}: ${JSON.stringify(value)} is not one of ${schema.enum.map(option => JSON.stringify(option)).join(", ")}`);
    }
  }
  if (typeof schema.pattern === "string" && typeof value === "string") {
    if (!new RegExp(schema.pattern).test(value)) failures.push(`${path}: ${JSON.stringify(value)} does not match ${schema.pattern}`);
  }
  if (typeof schema.minimum === "number" && typeof value === "number" && value < schema.minimum) {
    failures.push(`${path}: ${value} is below the minimum ${schema.minimum}`);
  }
  if (typeof schema.minItems === "number" && Array.isArray(value) && value.length < schema.minItems) {
    failures.push(`${path}: fewer than ${schema.minItems} item(s)`);
  }
  if (typeof schema.maxItems === "number" && Array.isArray(value) && value.length > schema.maxItems) {
    failures.push(`${path}: more than ${schema.maxItems} item(s)`);
  }
  if (Array.isArray(schema.required) && typeof value === "object" && value !== null && !Array.isArray(value)) {
    for (const key of schema.required) {
      if (typeof key === "string" && !(key in value)) failures.push(`${path}: missing required property ${key}`);
    }
  }
  if (schema.properties && typeof value === "object" && value !== null && !Array.isArray(value)) {
    for (const [key, property] of Object.entries(schema.properties as Record<string, Json>)) {
      if (key in value) failures.push(...validateAgainst((value as Record<string, Json>)[key]!, property, `${path}.${key}`));
    }
  }
  if (schema.items && Array.isArray(value)) {
    value.forEach((item, index) => failures.push(...validateAgainst(item, schema.items as Json, `${path}[${index}]`)));
  }
  return failures;
}
