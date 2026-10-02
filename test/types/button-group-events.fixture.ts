// test/types/button-group-events.fixture.ts
import type { ButtonGroupComponent, ButtonGroupChangeEvent } from "../../src/components/button-group/types";
import type { ButtonGroupSpec, ElementEvents } from "../../src/elements";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export const modelGetter: Equals<ReturnType<ButtonGroupComponent["getValue"]>, string | string[] | null> = true;
export const changeValue: Equals<ButtonGroupChangeEvent["value"], ReturnType<ButtonGroupComponent["getValue"]>> = true;
export const elementValue: Equals<ElementEvents<ButtonGroupSpec>["change"]["detail"]["value"], ReturnType<ButtonGroupComponent["getValue"]>> = true;
declare const group: ButtonGroupComponent;
group.on("change", event => { const value: ReturnType<typeof group.getValue> = event.value; void value; });
// @ts-expect-error a selection change carries its model value
export const oldChange: ButtonGroupChangeEvent = { values: [], selected: [], buttonGroup: group };
