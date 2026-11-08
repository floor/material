import { describe, expect, test } from "bun:test";
import { snackbarElement } from "../../src/elements/snackbar";

// The element class runs in a browser (scripts/check-elements.ts, where F8
// reaches the shadow root's action and focus-shortcut="false" turns it off);
// what is tested here is the spec: the attribute maps onto the config key the
// factory reads, and the focus event is re-dispatched without a payload.
describe("<m-snackbar> focus shortcut", () => {
  test("focus-shortcut is read into focusShortcut", () => {
    expect(snackbarElement.spec.attributes["focus-shortcut"]).toEqual({ type: "string", config: "focusShortcut" });
  });

  test("the focus event is re-dispatched with no detail", () => {
    expect(snackbarElement.spec.events.focus.detail({} as never)).toBeNull();
  });
});
