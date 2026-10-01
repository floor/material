// test/types/button-group-events.fixture.ts
import type { ButtonGroupComponent } from "../../src/components/button-group/types";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export const modelGetter: Equals<ReturnType<ButtonGroupComponent["getValue"]>, string | string[] | null> = true;
