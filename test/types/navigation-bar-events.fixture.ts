// test/types/navigation-bar-events.fixture.ts
import type { NavigationBarComponent, NavigationBarEvents, NavigationBarSelectEvent } from "../../src/components/navigation-bar/types";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

// FLO-305, with FLO-380's value getter
export const modelGetter: Equals<ReturnType<NavigationBarComponent["getValue"]>, string | null> = true;
export const eventNames: Equals<keyof NavigationBarEvents, "select" | "visibility"> = true;
export const selectShape: Equals<NavigationBarSelectEvent, { id: string; value: string; index: number; originalEvent: MouseEvent }> = true;
export const visibilityShape: Equals<NavigationBarEvents["visibility"], { hidden: boolean }> = true;
