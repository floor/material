// test/types/split-button-events.fixture.ts
//
// <m-split-button> reports menu opening and closing via `open` and `close`
// host events (detail: {}), alongside `select` ({ value: string | null }).
// The component wraps `on` and `off` to alias `open` -> `expand` and
// `close` -> `collapse`, while preserving chaining and other subscriptions.
//
// Compiled by `bun run tooling:check` via test/types/tsconfig.json.
import type { ComponentProps as ReactProps } from "react";
import type { ElementEvents, SplitButtonElementComponent, SplitButtonElementEventType, SplitButtonSpec } from "../../src/elements";
import type { SplitButton } from "../../src/react";
import type { SplitButton as SolidSplitButton } from "../../src/solid";
import type { VueEmits } from "../../src/vue";
import type { SplitButtonEvent } from "../../src/components/split-button/types";

/** true when A and B are the same type */
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const assert = <T extends true>(): T => true as T;

// --- Element events -------------------------------------------------------

export const elementOpenEvent: Equals<ElementEvents<SplitButtonSpec>["open"]["detail"], {}> = true;
export const elementCloseEvent: Equals<ElementEvents<SplitButtonSpec>["close"]["detail"], {}> = true;
export const elementSelectEvent: Equals<ElementEvents<SplitButtonSpec>["select"]["detail"]["value"], string | null> = true;

// --- Component on / off and chaining --------------------------------------

declare const component: SplitButtonElementComponent;

export const elementEventTypes: Equals<
  SplitButtonElementEventType,
  "click" | "expand" | "collapse" | "change" | "select" | "open" | "close"
> = true;

// on and off accept "open" and "close" and return SplitButtonElementComponent for chaining
const chained = component
  .on("open", (event: SplitButtonEvent) => {
    const expanded: boolean = event.expanded;
    void expanded;
  })
  .on("close", (event: SplitButtonEvent) => {
    void event.splitButton;
  })
  .off("open", () => {})
  .off("close", () => {})
  .on("select", (event: SplitButtonEvent) => {
    void event.value;
  });
assert<Equals<typeof chained, SplitButtonElementComponent>>();

// @ts-expect-error -- "unknown" is not a valid event name
component.on("unknown", () => {});

// --- Framework adapters ---------------------------------------------------

// React
type ReactSplitProps = ReactProps<typeof SplitButton>;
assert<Equals<ReactSplitProps["onOpen"], ((event: CustomEvent<{}>) => void) | undefined>>();
assert<Equals<ReactSplitProps["onClose"], ((event: CustomEvent<{}>) => void) | undefined>>();
assert<Equals<ReactSplitProps["onSelect"], ((event: CustomEvent<{ value: string | null }>) => void) | undefined>>();

// Solid
type SolidSplitProps = Parameters<typeof SolidSplitButton>[0];
assert<Equals<SolidSplitProps["onOpen"], ((event: CustomEvent<{}>) => void) | undefined>>();
assert<Equals<SolidSplitProps["onClose"], ((event: CustomEvent<{}>) => void) | undefined>>();
assert<Equals<SolidSplitProps["onSelect"], ((event: CustomEvent<{ value: string | null }>) => void) | undefined>>();

// Vue
type VueSplitEmits = VueEmits<SplitButtonSpec>;
assert<Equals<Parameters<VueSplitEmits["open"]>[0], CustomEvent<{}>>>();
assert<Equals<Parameters<VueSplitEmits["close"]>[0], CustomEvent<{}>>>();
assert<Equals<Parameters<VueSplitEmits["select"]>[0], CustomEvent<{ value: string | null }>>>();
