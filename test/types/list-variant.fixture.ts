// test/types/list-variant.fixture.ts
//
// The list's `variant` is a contract: the option, its type, the constant, the
// element's attribute and property, and the React prop derived from it.
// Nothing here runs; the assertions are the test.
import type { ComponentProps as ReactProps } from "react";
import { createList, type ListConfig, type ListVariant } from "../../src";
import { createList as fromSubpath, LIST_VARIANTS, type ListVariant as SubpathVariant } from "../../src/components/list";
import { LIST_VARIANTS as CONSTANTS } from "../../src/components/list/constants";
import type { ElementProps, ListElement, ListSpec } from "../../src/elements";
import type { List } from "../../src/react";

/** true when A and B are the same type */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assert = <T extends true>(): T => true as T;

assert<Equals<ListVariant, "standard" | "segmented">>();
assert<Equals<SubpathVariant, ListVariant>>();
assert<Equals<ListConfig["variant"], ListVariant | undefined>>();
assert<Equals<typeof LIST_VARIANTS, { readonly STANDARD: "standard"; readonly SEGMENTED: "segmented" }>>();
assert<Equals<typeof CONSTANTS, typeof LIST_VARIANTS>>();
assert<Equals<(typeof LIST_VARIANTS)[keyof typeof LIST_VARIANTS], ListVariant>>();

createList({ items: [] });
createList({ items: [], variant: "standard" });
createList({ items: [], variant: "segmented" });
fromSubpath({ items: [], variant: LIST_VARIANTS.SEGMENTED });
// @ts-expect-error the list has two variants
createList({ items: [], variant: "expressive" });

// <m-list variant>: a string attribute, reflected by the property.
assert<Equals<ElementProps<ListSpec>["variant"], string | undefined>>();
declare const list: ListElement;
list.variant = "segmented";
assert<Equals<ReactProps<typeof List>["variant"], string | undefined>>();
