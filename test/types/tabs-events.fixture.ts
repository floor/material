// test/types/tabs-events.fixture.ts
import type { TabsComponent } from "../../src/components/tabs/types";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export const modelGetter: Equals<ReturnType<TabsComponent["getValue"]>, string | null> = true;
