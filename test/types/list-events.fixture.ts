// test/types/list-events.fixture.ts
import type { ListComponent, ListEvents } from "../../src/components/list/types";
import type { ForwardedEventPayload } from "../../src/core/dom";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
declare const list: ListComponent;
export const names: Equals<keyof ListEvents, "select" | "load" | "scroll" | "keydown"> = true;
export const scroll: Equals<Parameters<ListEvents["scroll"]>[0], ForwardedEventPayload<Event, HTMLElement>> = true;
export const keydown: Equals<Parameters<ListEvents["keydown"]>[0], ForwardedEventPayload<KeyboardEvent, HTMLElement>> = true;
list.on("keydown", payload => payload.originalEvent.key).off("scroll", payload => payload.element.scrollTop);
// @ts-expect-error scroll never carries a component
list.on("scroll", payload => payload.component);
// @ts-expect-error off checks the payload too
list.off("keydown", (event: KeyboardEvent) => event.key);
// @ts-expect-error event names remain closed
list.on("change", () => {});
