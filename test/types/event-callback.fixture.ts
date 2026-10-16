// test/types/event-callback.fixture.ts
//
// Item 9: the emitter's fallback handler type, and typed event maps.
//
// `EventCallback` was `(...args: never[]) => void`, so a handler passed to an
// untyped `on()` had its parameter inferred as `never`: every payload was
// unusable without a cast. That is the root of the problem (mtrl-addons'
// form handlers). An untyped channel now hands its handlers `unknown`, and a
// factory can name its events with `withEvents<Events>()`.
//
// Compiled by `bun run tooling:check` via test/types/tsconfig.json.
import { createBase, pipe } from "../../src/core/compose";
import { withEvents, type EventComponent } from "../../src/core/compose/features/events";
import { createEmitter, type EventCallback } from "../../src/core/state/emitter";

/** true when A and B are the same type */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

// Untyped: a handler's payload is unknown, to narrow, not never.
const plain = pipe(createBase, withEvents())({});
export const fallback: Equals<Parameters<EventCallback>, unknown[]> = true;
plain.on("anything", (payload) => {
  const seen: Equals<typeof payload, unknown> = true;
  if (typeof payload === "object" && payload !== null && "value" in payload) void payload.value;
  return seen;
});
// A handler that declares its payload is still accepted.
plain.on("change", (event: { value: string }) => event.value.toUpperCase());
export const chained: typeof plain = plain.on("a", () => {}).off("a", () => {}).emit("a", 1);
// @ts-expect-error an unknown payload must be narrowed before use
plain.on("change", (payload) => payload.value);

// The emitter's own listeners get the same fallback.
createEmitter().on("x", (payload) => {
  const seen: Equals<typeof payload, unknown> = true;
  return seen;
});

// Typed: the factory names its events, and on/off check both names and payloads.
interface FormEvents {
  change: (event: { name: string; value: unknown }) => void;
  submit: (data: Record<string, unknown>) => void;
}
const form = pipe(createBase, withEvents<FormEvents>())({});
export const typed: Equals<typeof form, typeof form & EventComponent<FormEvents>> = true;
form.on("change", ({ name }) => name.toUpperCase());
form.on("submit", (data) => Object.keys(data));
const onSubmit = (data: Record<string, unknown>): void => void data;
export const typedChain: typeof form = form.on("submit", onSubmit).off("submit", onSubmit);
// @ts-expect-error event names are closed
form.on("chnage", () => {});
// @ts-expect-error off shares the closed map
form.off("chnage", () => {});
// @ts-expect-error payloads are checked
form.on("submit", (data: string) => data.length);
// @ts-expect-error change carries { name, value }, not a raw value
form.on("change", (value: number) => value.toFixed());
