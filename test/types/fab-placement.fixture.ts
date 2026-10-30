import type { ElementProps, FabSpec, ExtendedFabSpec, FabMenuSpec } from "../../src/elements";
import type { ComponentProps } from "../../src/react/create";
import type { SolidProps } from "../../src/solid/create";
import type { VueProps } from "../../src/vue/create";
import type { SvelteProps } from "../../src/svelte/runtime";
import type { FabConfig } from "../../src/components/fab";
import type { ExtendedFabConfig } from "../../src/components/extended-fab";

export const fab: FabConfig = { ariaLabel: "Compose", placement: "bottom-end", position: "bottom-right" };
export const extended: ExtendedFabConfig = { placement: "top-start" };
export const element: ElementProps<FabSpec> = { placement: "bottom-end" };
export const extendedElement: ElementProps<ExtendedFabSpec> = { placement: "top-end" };
export const menu: ElementProps<FabMenuSpec> = { placement: "bottom-start" };
export const react: ComponentProps<FabSpec> = { placement: "none" };
export const solid: SolidProps<ExtendedFabSpec, HTMLElement> = { placement: "top-start" };
export const vue: VueProps<FabSpec> = { placement: "bottom-start" };
export const svelte: SvelteProps<ExtendedFabSpec> = { placement: "bottom-end" };
