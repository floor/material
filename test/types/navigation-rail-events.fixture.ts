// test/types/navigation-rail-events.fixture.ts
import type { NavigationRailComponent, NavigationRailSelectEvent } from "../../src/components/navigation-rail/types";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export const modelGetter: Equals<ReturnType<NavigationRailComponent["getValue"]>, string | null> = true;
export const selectValue: Equals<NavigationRailSelectEvent["value"], string> = true;
declare const rail: NavigationRailComponent;
rail.on("select", event => { const value: string = event.value; void value; });
// @ts-expect-error an item selection always carries the selected value
export const oldSelect: NavigationRailSelectEvent = { id: "a", index: 0, originalEvent: new MouseEvent("click") };
