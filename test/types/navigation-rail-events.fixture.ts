// test/types/navigation-rail-events.fixture.ts
import type { NavigationRailComponent } from "../../src/components/navigation-rail/types";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

export const modelGetter: Equals<ReturnType<NavigationRailComponent["getValue"]>, string | null> = true;
