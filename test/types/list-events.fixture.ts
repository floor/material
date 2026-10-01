// test/types/list-events.fixture.ts
// FLO-384: the list's event map matches what it emits. keydown and scroll are
// forwarded from the root; scroll's component was declared but never sent, so
// on 0.10 it is optional and deprecated (1.0 removes it, FLO-380).
import type { ListComponent, ListEvents } from "../../src/components/list/types";
import type { ForwardedEventPayload } from "../../src/core/dom";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
declare const list: ListComponent;
export const names: Equals<keyof ListEvents, "select" | "load" | "scroll" | "keydown"> = true;
export const scroll: Equals<Omit<Parameters<ListEvents["scroll"]>[0], "component">, ForwardedEventPayload<Event, HTMLElement>> = true;
export const scrollComponent: Equals<Parameters<ListEvents["scroll"]>[0]["component"], ListComponent | undefined> = true;
export const keydown: Equals<Parameters<ListEvents["keydown"]>[0], ForwardedEventPayload<KeyboardEvent, HTMLElement>> = true;
list.on("keydown", payload => payload.originalEvent.key).off("scroll", payload => payload.element.scrollTop);
// @ts-expect-error off checks the payload too
list.off("keydown", (event: KeyboardEvent) => event.key);
// @ts-expect-error event names remain closed
list.on("change", () => {});
