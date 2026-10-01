// test/types/tabs-events.fixture.ts
import type { TabsComponent, TabChangeEventData } from "../../src/components/tabs/types";
import type { ElementEvents, TabsSpec } from "../../src/elements";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export const modelGetter: Equals<ReturnType<TabsComponent["getValue"]>, string | null> = true;
export const changeValue: Equals<TabChangeEventData["value"], string> = true;
export const elementValue: Equals<ElementEvents<TabsSpec>["change"]["detail"]["value"], ReturnType<TabsComponent["getValue"]>> = true;
declare const tabs: TabsComponent;
tabs.on("change", (event: TabChangeEventData) => { const value: string = event.value; void value; });
