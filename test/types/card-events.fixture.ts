// test/types/card-events.fixture.ts
//
// FLO-323: the card composes withEvents and emits click (clickable), the
// interactive events, and dragstart/dragend (draggable), but its public type
// declared no on/off, so none of them could be listened to from TypeScript.
import createCard, { type CardComponent, type CardEvents } from "../../src/components/card";
import type { ForwardedEventPayload } from "../../src/core/dom";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const card = createCard({ clickable: true, draggable: true });
export const names: Equals<keyof CardEvents, "click" | "mouseenter" | "mouseleave" | "keydown" | "focus" | "blur" | "dragstart" | "dragend" | "expandedChanged"> = true;
export const clickPayload: Equals<Parameters<CardEvents["click"]>[0], ForwardedEventPayload<MouseEvent, HTMLElement>> = true;
const onDrag = ({ event }: { event: DragEvent }): void => void event.dataTransfer;
export const chained: CardComponent = card.on("click", ({ event }) => event.clientX).on("dragstart", onDrag).off("dragstart", onDrag);
card.on("keydown", ({ event }) => event.key);
// @ts-expect-error event names are closed
card.on("clik", () => {});
// @ts-expect-error dragstart carries { event }, not the DragEvent itself
card.on("dragstart", (event: DragEvent) => event.dataTransfer);

// FLO-384: the expandable feature emits expandedChanged; the map declares it.
export const expanded: Equals<Parameters<CardEvents["expandedChanged"]>[0], { expanded: boolean }> = true;
card.on("expandedChanged", payload => payload.expanded).off("expandedChanged", payload => payload.expanded);
// @ts-expect-error expansion is presentation state, not a model value
card.on("expandedChanged", payload => payload.value);
