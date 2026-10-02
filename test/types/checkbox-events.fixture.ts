// FLO-114: public checkbox event names and the actual native/programmatic payload.
import createCheckbox, {
  type CheckboxComponent,
  type CheckboxEvents,
  type CheckboxChangePayload,
} from "../../src/components/checkbox";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const checkbox = createCheckbox();
export const emittedEvents: Equals<keyof CheckboxEvents, "change" | "tap" | "swipe"> = true;
export const callbackPayload: Equals<
  Parameters<Parameters<typeof checkbox.on<"change">>[1]>[0],
  CheckboxChangePayload
> = true;
export const checkedIsBoolean: Equals<CheckboxChangePayload["checked"], boolean> = true;
export const valueMatchesGetter: Equals<CheckboxChangePayload["value"], ReturnType<CheckboxComponent["getValue"]>> = true;
export const tokenIsString: Equals<CheckboxChangePayload["valueAttribute"], string> = true;
export const nativeEventIsOptional: {} extends Pick<CheckboxChangePayload, "nativeEvent"> ? true : false = true;
export const nativeEventIsAnEvent: Equals<NonNullable<CheckboxChangePayload["nativeEvent"]>, Event> = true;

export const payloadWithoutNativeMetadata: CheckboxChangePayload = { checked: true, value: true, valueAttribute: "yes" };
export const inputPayload: CheckboxChangePayload = {
  checked: false, value: false, valueAttribute: "yes", nativeEvent: new Event("change"),
};

const onChange: CheckboxEvents["change"] = ({ checked, value, valueAttribute, nativeEvent }) => {
  const state: boolean = checked;
  const model: boolean = value;
  const htmlValue: string = valueAttribute;
  void model;
  nativeEvent?.preventDefault();
  void state;
  void htmlValue;
};
export const chained: CheckboxComponent = checkbox.on("change", onChange).off("change", onChange);
checkbox.on("change", () => {});

// @ts-expect-error the payload is not a raw DOM event
checkbox.on("change", (event: Event) => event.preventDefault());
// @ts-expect-error off checks the same payload
checkbox.off("change", (event: Event) => event.preventDefault());
// @ts-expect-error misspelled names are not registered silently
checkbox.on("chnage", () => {});
// @ts-expect-error off uses the same closed map
checkbox.off("chnage", () => {});
// @ts-expect-error click is available on the DOM input, not the emitter
checkbox.on("click", () => {});
// @ts-expect-error focus is available on the DOM input, not the emitter
checkbox.on("focus", () => {});
// @ts-expect-error checkbox overrides the input feature's value setter
checkbox.on("value", () => {});
// @ts-expect-error lifecycle events are not emitted through this API
checkbox.on("mount", () => {});
// @ts-expect-error the old documentation's target field does not exist
checkbox.on("change", payload => payload.target.checked);
// @ts-expect-error nativeEvent is an Event, not an arbitrary object
export const invalidNativeEvent: CheckboxChangePayload = { checked: true, value: true, valueAttribute: "yes", nativeEvent: {} };

// FLO-380: gestures are not model notifications and retain normalized metadata.
import type { NormalizedEvent, SwipePayload } from "../../src/core/utils/mobile";
export const tapShape: Equals<Parameters<CheckboxEvents["tap"]>[0], NormalizedEvent> = true;
export const swipeShape: Equals<Parameters<CheckboxEvents["swipe"]>[0], SwipePayload> = true;

// @ts-expect-error pre-3.0.0 string model values are rejected
export const oldValue: CheckboxChangePayload = { checked: true, value: "yes", valueAttribute: "yes" };
// @ts-expect-error the HTML token is a required, separate field
export const missingToken: CheckboxChangePayload = { checked: true, value: true };
