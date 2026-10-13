// test/types/chips-elements.fixture.ts
// PR 4: the element and adapters expose the remaining selection after removal.
import type { ElementEvents, ChipsSpec } from "../../src/elements";
import type { Chips as ReactChips } from "../../src/react";
import type { Chips as SolidChips } from "../../src/solid";
import type { ComponentProps as ReactProps } from "react";
import type { ComponentProps as SolidProps } from "solid-js";
import type { SvelteProps } from "../../src/svelte/runtime";
import type { VueEmits } from "../../src/vue";

type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Remove = CustomEvent<{ value: string | string[] | null; chipValue: string | null }>;

export const elementRemove: Equals<ElementEvents<ChipsSpec>["remove"], Remove> = true;
export const reactRemove: Equals<ReactProps<typeof ReactChips>["onRemove"], ((event: Remove) => void) | undefined> = true;
export const solidRemove: Equals<SolidProps<typeof SolidChips>["onRemove"], ((event: Remove) => void) | undefined> = true;
export const svelteRemove: Equals<SvelteProps<ChipsSpec>["onremove"], ((event: Remove) => void) | undefined> = true;
export const vueRemove: Equals<Parameters<VueEmits<ChipsSpec>["remove"]>[0], Remove> = true;
