// test/types/chip-events.fixture.ts
// Individual selectable chips have a nullable identifier, separate from selected.
import type { ChipComponent, ChipChangePayload, ChipEvents } from "../../src/components/chips";
import { chipDeclaration, type ElementEvents } from "../../src/elements";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
export const changeValue: Equals<ChipChangePayload["value"], ReturnType<ChipComponent["getValue"]>> = true;
export const changeEvent: Equals<Parameters<ChipEvents["change"]>[0], ChipChangePayload> = true;
export const declarationHasNoEmitter: Equals<keyof ElementEvents<typeof chipDeclaration>, never> = true;
declare const chip: ChipComponent;
chip.on("change", event => { const selected: boolean = event.selected; const value: string | null = event.value; void selected; void value; });
// @ts-expect-error an old selected/chip-only payload omits the model value
export const oldChange: ChipChangePayload = { selected: true, chip };
