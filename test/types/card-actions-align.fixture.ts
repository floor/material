import type { CardSpec, ElementProps } from "../../src/elements";
import type { ComponentProps } from "../../src/react/create";
import type { SolidProps } from "../../src/solid/create";
import type { VueProps } from "../../src/vue/create";
import type { SvelteProps } from "../../src/svelte/runtime";

// A dashed element attribute becomes the same camelCase prop in every adapter.
export const element: ElementProps<CardSpec> = { actionsAlign: "end" };
export const react: ComponentProps<CardSpec> = { actionsAlign: "start" };
export const solid: SolidProps<CardSpec, HTMLElement> = { actionsAlign: "center" };
export const vue: VueProps<CardSpec> = { actionsAlign: "space-between" };
export const svelte: SvelteProps<CardSpec> = { actionsAlign: "end" };
