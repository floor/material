// test/types/search-events.fixture.ts
import type { SearchComponent, SearchEvent } from "../../src/components/search/types";
import type { ElementEvents, SearchSpec } from "../../src/elements";
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
export const eventValue: Equals<SearchEvent["value"], ReturnType<SearchComponent["getValue"]>> = true;
export const elementInputValue: Equals<ElementEvents<SearchSpec>["input"]["detail"]["value"], string> = true;
export const elementChangeValue: Equals<ElementEvents<SearchSpec>["change"]["detail"]["value"], string> = true;
export const elementSelectValue: Equals<ElementEvents<SearchSpec>["select"]["detail"]["value"], string> = true;
declare const search: SearchComponent;
for (const name of ["input", "clear", "submit", "suggestionSelect"] as const) {
  search.on(name, event => { const value: string = event.value; void value; });
}
