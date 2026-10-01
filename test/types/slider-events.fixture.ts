// test/types/slider-events.fixture.ts
import type { SliderComponent, SliderEvents, SliderEvent } from "../../src/components/slider";
import type { ForwardedEventPayload } from "../../src/core/dom";
import type { NormalizedEvent, SwipePayload } from "../../src/core/utils/mobile";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
declare const slider: SliderComponent;
export const names: Equals<keyof SliderEvents, "change" | "input" | "start" | "end" | "focus" | "blur" | "click" | "keydown" | "mousedown" | "mousemove" | "mouseup" | "touchstart" | "touchmove" | "touchend" | "tap" | "swipe"> = true;
export const model: Equals<SliderEvent["value"], ReturnType<SliderComponent["getValue"]>> = true;
export const touchStart: Equals<Parameters<SliderEvents["touchstart"]>[0], ForwardedEventPayload<TouchEvent, HTMLElement> | NormalizedEvent> = true;
export const touchEnd: Equals<Parameters<SliderEvents["touchend"]>[0], ForwardedEventPayload<TouchEvent, HTMLElement> | NormalizedEvent> = true;
export const touchMove: Equals<Parameters<SliderEvents["touchmove"]>[0], ForwardedEventPayload<TouchEvent, HTMLElement> | (NormalizedEvent & { deltaX: number; deltaY: number })> = true;
export const tap: Equals<Parameters<SliderEvents["tap"]>[0], NormalizedEvent> = true;
export const swipe: Equals<Parameters<SliderEvents["swipe"]>[0], SwipePayload> = true;
slider.on("touchstart", payload => { if ("originalEvent" in payload) payload.originalEvent.touches; else payload.clientX; });
slider.off("keydown", payload => payload.event.key);
// @ts-expect-error native keyboard events are wrapped
slider.on("keydown", (event: KeyboardEvent) => event.key);
// @ts-expect-error touch notifications have no model value
slider.on("touchend", payload => payload.value);
// @ts-expect-error on/off share a closed map
slider.off("chnage", () => {});
