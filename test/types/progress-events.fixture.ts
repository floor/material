// test/types/progress-events.fixture.ts
// Progress emits a programmatic model change; completion is an action signal.
import type { ProgressComponent, ProgressEvents, ProgressEventPayload } from "../../src/components/progress";
import type { ElementEvents, ProgressSpec } from "../../src/elements";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
export const changeValue: Equals<ProgressEventPayload["value"], ReturnType<ProgressComponent["getValue"]>> = true;
export const changePayload: Equals<Parameters<ProgressEvents["change"]>[0], ProgressEventPayload> = true;
export const elementHasNoModelEvent: Equals<keyof ElementEvents<ProgressSpec>, never> = true;
declare const progress: ProgressComponent;
progress.on("change", event => { const value: number = event.value; void value; });
// @ts-expect-error the model notification includes the current value
export const oldChange: ProgressEventPayload = { max: 100 };
