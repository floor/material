// test/types/tag-map.fixture.ts
//
// FLO-328: the `m-*` tags are in HTMLElementTagNameMap, so a query returns the
// element's type. Nothing here runs; the assertions are the test.
//
// Compiled by `bun run tooling:check` via test/types/tsconfig.json.
import type { declarations, elements, SwitchElement, TabAttributes, TextFieldElement } from "../../src/elements";

/** true when A and B are the same type */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assert = <T extends true>(): T => true as T;

// A query is typed by its tag.
const checked: boolean | undefined = document.querySelector("m-switch")!.checked;
void checked;
const found = document.querySelector("m-switch");
assert<Equals<typeof found, SwitchElement | null>>();
const created = document.createElement("m-textfield");
assert<Equals<typeof created, TextFieldElement>>();
created.select();
// @ts-expect-error -- the switch's `value` is a string
const wrong: number = document.querySelector("m-switch")!.value;
void wrong;

// Declarations are their attributes on an HTMLElement.
assert<Equals<HTMLElementTagNameMap["m-tab"], HTMLElement & TabAttributes>>();

// Every element and declaration key, kebab-cased, is a mapped tag.
type Kebab<S extends string> = S extends `${infer H}${infer T}`
  ? `${H extends Lowercase<H> ? H : `-${Lowercase<H>}`}${Kebab<T>}`
  : S;
type Tags = `m-${Kebab<keyof typeof elements | keyof typeof declarations>}`;
assert<Equals<Exclude<Tags, keyof HTMLElementTagNameMap>, never>>();
// None of them falls back to a bare HTMLElement.
type Untyped = { [T in Tags]: Equals<HTMLElementTagNameMap[T], HTMLElement> extends true ? T : never }[Tags];
assert<Equals<Untyped, never>>();
