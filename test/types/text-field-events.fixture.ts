// Public text field event names and the payloads its input feature emits.
import createTextField, {
  type TextFieldComponent,
  type TextFieldEvents,
  type TextFieldValuePayload,
  type TextFieldFocusPayload,
  type TextFieldTrailingPayload,
} from "../../src/components/text-field";
import { TEXT_FIELD_EVENTS } from "../../src/components/text-field/constants";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

const field = createTextField();
export const eventNames: Equals<keyof TextFieldEvents, "input" | "change" | "focus" | "blur" | "trailing"> = true;
// The trailing icon button carries the value, as the house's events do, and the click
export const trailingShape: Equals<TextFieldTrailingPayload, { value: string; event: MouseEvent }> = true;
export const trailingPayload: Equals<Parameters<Parameters<typeof field.on<"trailing">>[1]>[0], TextFieldTrailingPayload> = true;
export const valueShape: Equals<TextFieldValuePayload, { value: string; isEmpty: boolean; isAutofilled: boolean }> = true;
export const focusShape: Equals<TextFieldFocusPayload, { isEmpty: boolean }> = true;
export const inputPayload: Equals<Parameters<Parameters<typeof field.on<"input">>[1]>[0], TextFieldValuePayload> = true;
export const changePayload: Equals<Parameters<Parameters<typeof field.on<"change">>[1]>[0], TextFieldValuePayload> = true;
export const focusPayload: Equals<Parameters<Parameters<typeof field.on<"focus">>[1]>[0], TextFieldFocusPayload> = true;
export const blurPayload: Equals<Parameters<Parameters<typeof field.on<"blur">>[1]>[0], TextFieldFocusPayload> = true;

const onValue: TextFieldEvents["input"] = ({ value, isEmpty, isAutofilled }) => {
  const text: string = value;
  const flags: boolean[] = [isEmpty, isAutofilled];
  void text;
  void flags;
};
const onFocus: TextFieldEvents["focus"] = ({ isEmpty }) => { const empty: boolean = isEmpty; void empty; };
export const chained: TextFieldComponent = field
  .on(TEXT_FIELD_EVENTS.INPUT, onValue).off("input", onValue)
  .on(TEXT_FIELD_EVENTS.CHANGE, onValue).off("change", onValue)
  .on(TEXT_FIELD_EVENTS.FOCUS, onFocus).off("focus", onFocus)
  .on(TEXT_FIELD_EVENTS.BLUR, onFocus).off("blur", onFocus);
field.on("input", () => {});

// @ts-expect-error these are payload objects, not raw DOM events
field.on("input", (event: InputEvent) => event.preventDefault());
// @ts-expect-error off checks the same payload
field.off("change", (event: Event) => event.preventDefault());
// @ts-expect-error focus does not forward a FocusEvent
field.on("focus", (event: FocusEvent) => event.preventDefault());
// @ts-expect-error misspelled events are rejected
field.on("chnage", () => {});
// @ts-expect-error off uses the same closed map
field.off("chnage", () => {});
// @ts-expect-error keyboard events belong to input.addEventListener
field.on(TEXT_FIELD_EVENTS.KEYDOWN, () => {});
// @ts-expect-error keyup is not forwarded either
field.on(TEXT_FIELD_EVENTS.KEYUP, () => {});
// @ts-expect-error enter has no emitter path
field.on(TEXT_FIELD_EVENTS.ENTER, () => {});
// @ts-expect-error the programmatic setter is silent
field.on("value", () => {});
// @ts-expect-error lifecycle events are not forwarded
field.on("destroy", () => {});
// @ts-expect-error payloads have no DOM target
field.on("input", payload => payload.target.value);
// @ts-expect-error focus carries only the empty state
field.on("focus", payload => payload.value);
// @ts-expect-error autofill state is required on every value event
export const missingAutofill: TextFieldValuePayload = { value: "x", isEmpty: false };
